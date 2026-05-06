import { GoogleGenAI, Modality, Type } from "@google/genai";
import { AnalysisResult, FlashCard, UserCrop, WeatherData, CropDiseaseReport, AgriQuizQuestion, Language, MarketPrice } from "../types";
import { AEZInfo } from "./locationService";
import { queryQwenVL } from "./huggingfaceService";

/**
 * Helper to extract JSON from model output.
 */
const extractJSON = <T>(text: string, defaultValue: T): T => {
  if (!text) return defaultValue;
  try {
    // Try to find markdown json block
    const markdownMatch = text.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
    if (markdownMatch && markdownMatch[1]) {
      return JSON.parse(markdownMatch[1].trim()) as T;
    }
    
    // Fallback: try parsing { ... }
    const firstBrace = text.indexOf('{');
    const lastBrace = text.lastIndexOf('}');
    if (firstBrace !== -1 && lastBrace !== -1 && firstBrace < lastBrace) {
      try {
        return JSON.parse(text.substring(firstBrace, lastBrace + 1)) as T;
      } catch {
      // Ignore and try array
    }
  }
  
  // Fallback: try parsing [ ... ]
  const firstBracket = text.indexOf('[');
  const lastBracket = text.lastIndexOf(']');
  if (firstBracket !== -1 && lastBracket !== -1 && firstBracket < lastBracket) {
    try {
      return JSON.parse(text.substring(firstBracket, lastBracket + 1)) as T;
    } catch {
      // Ignore
    }
  }
  
  return defaultValue;
} catch {
  return defaultValue;
}
};

/**
 * Helper to handle Gemini generation with automatic fallback for grounding quota errors.
 */
const safeGenerateContent = async (ai: any, model: string, params: any) => { // eslint-disable-line @typescript-eslint/no-explicit-any
  try {
    return await ai.models.generateContent({
      model,
      ...params
    });
  } catch (error: any) { // eslint-disable-line @typescript-eslint/no-explicit-any
    const errorMessage = error?.message || "";
    const errorStatus = error?.status || (error?.error?.code);
    
    // Specifically handle search/maps grounding quota exhaustion (429)
    if ((errorStatus === 429 || errorStatus === 'RESOURCE_EXHAUSTED') && 
        (errorMessage.includes('search_grounding') || errorMessage.includes('google_search') || errorMessage.includes('google_maps'))) {
      console.warn("Grounding quota exceeded, retrying without tools...");
      const { ...restConfig } = params.config || {};
      delete (restConfig as any).tools;
      delete (restConfig as any).toolConfig;
      return await ai.models.generateContent({
        model,
        ...params,
        config: restConfig
      });
    }
    throw error;
  }
};

/**
 * Robust retry logic for API calls.
 */
const withRetry = async <T>(fn: () => Promise<T>, maxRetries = 3): Promise<T> => {
  let lastError: any;
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fn();
    } catch (error: any) {
      lastError = error;
      const errorStatus = error?.status || (error?.error?.code);
      if (errorStatus === 500 || errorStatus === 429 || errorStatus === 503) {
        const delay = Math.pow(2, i) * 1000;
        await new Promise(resolve => setTimeout(resolve, delay));
        continue;
      }
      throw error;
    }
  }
  throw lastError;
};

/**
 * Extract raw base64 from a data URL or return the string as-is.
 */
const getRawBase64 = (data: string | null | undefined): string => {
  if (!data) return "";
  if (data.includes('base64,')) {
    const parts = data.split('base64,');
    return parts.length > 1 ? parts[1] : parts[0];
  }
  return data;
};

export const decodeBase64 = (base64: string): Uint8Array => {
  if (!base64) return new Uint8Array(0);
  const raw = getRawBase64(base64);
  const binaryString = atob(raw);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) bytes[i] = binaryString.charCodeAt(i);
  return bytes;
};

export const decodeAudioData = async (data: Uint8Array, ctx: AudioContext, sampleRate: number, numChannels: number): Promise<AudioBuffer> => {
  const dataInt16 = new Int16Array(data.buffer);
  const frameCount = dataInt16.length / numChannels;
  const buffer = ctx.createBuffer(numChannels, frameCount, sampleRate);
  for (let channel = 0; channel < numChannels; channel++) {
    const channelData = buffer.getChannelData(channel);
    for (let i = 0; i < frameCount; i++) channelData[i] = dataInt16[i * numChannels + channel] / 32768.0;
  }
  return buffer;
};

const BD_GOVT_GROUNDING_INSTRUCTION = `
Role: Senior Scientific Officer, Ministry of Agriculture, Bangladesh.
Primary Objectives: Provide precise, localized, and actionable agricultural advice to Bangladeshi farmers. Do not use generic filler words.
Response Strategy:
1. STRICTLY NO INTRODUCTIONS OR PLEASANTRIES.
2. Structure format: Use square brackets for headers like [রোগ শনাক্তকরণ], [ওষুধের নাম ও মাত্রা], [বর্তমান বাজার দর], [আবহাওয়ার প্রভাব].
3. Sourcing: Grounded in BARI (Bangladesh Agricultural Research Institute), BRRI (Bangladesh Rice Research Institute), DAE (Department of Agricultural Extension), and BARC 2024-2026 standards.
4. Measurements: Use local metrics (Bigha, Decimal, Katha) and standard metric units.
5. Language: Primarily Bangla (বাংলা). Keep it easily understandable for rural farmers. Use scientific names only when necessary.
`;

export const analyzeCropImage = async (
  base64Data: string, 
  mimeType: string, 
  options?: { 
    cropFamily?: string, 
    userRank?: string, 
    query?: string, 
    lang?: Language, 
    weather?: WeatherData,
    hfHint?: string 
  }
): Promise<AnalysisResult> => {
  const lang = options?.lang || 'bn';
  const rawBase64 = getRawBase64(base64Data);

  const systemInstruction = `${BD_GOVT_GROUNDING_INSTRUCTION}
  TASK: Detailed Agri-Diagnostic Audit.
  MANDATORY SECTIONS: [শনাক্তকরণ (লক্ষণসহ)], [কারণ (Cause)], [সমন্বিত বালাই ব্যবস্থাপনা (IPM)], [রাসায়নিক প্রতিকার (MoA নম্বরসহ)], [সতর্কতা].
  IMPORTANT: You must also output a JSON block at the very end of your response in this exact format:
  \`\`\`json
  {
    "confidence": <number 0-100>,
    "isComplex": <boolean true if multiple symptoms or unclear>,
    "category": "<Pest|Disease|Deficiency|Other>"
  }
  \`\`\``;

  const promptText = `Crop: ${options?.cropFamily}. Hint: ${options?.hfHint}. Query: ${options?.query}.`;

  const callGemini = async (modelName: string) => {
    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
    return await safeGenerateContent(ai, modelName, {
      contents: [{ 
        parts: [
          { inlineData: { data: rawBase64, mimeType } }, 
          { text: promptText }
        ] 
      }],
      config: { systemInstruction, tools: [{ googleSearch: {} }] }
    });
  };

  try {
    // Tier 1: Gemini 3 Flash Preview
    let response;
    try {
      console.log("Trying Gemini 3 Flash Preview...");
      response = await callGemini('gemini-3-flash-preview');
    } catch (err: any) {
      const status = err?.status || err?.error?.code;
      if (status === 429) {
        throw new Error("QUOTA_EXCEEDED");
      }
      throw new Error("API_FAILED");
    }

    let text = response.text || "";
    let meta = extractJSON(text, { confidence: 90, isComplex: false, category: 'Other' });

    // Tier 2: Gemini 2.5 Pro (Upgrade if complex or low confidence)
    if (meta.confidence < 80 || meta.isComplex) {
      console.log("Upgrading to Gemini 2.5 Pro due to complexity or low confidence...");
      try {
        response = await callGemini('gemini-2.5-pro');
        text = response.text || "";
        meta = extractJSON(text, { confidence: 95, isComplex: false, category: 'Other' });
      } catch (err: any) {
        const status = err?.status || err?.error?.code;
        if (status === 429) {
          throw new Error("QUOTA_EXCEEDED");
        }
        throw new Error("API_FAILED");
      }
    }

    const diagnosis = text.match(/\[শনাক্তকরণ.*?\]:\s*(.*)/i)?.[1]?.split('\n')[0]?.trim() || "শনাক্তকরণ সম্পন্ন";
    
    return {
      diagnosis,
      category: (meta.category as any) || 'Other',
      confidence: meta.confidence,
      advisory: text.replace(/```json[\s\S]*?```/, '').trim(),
      fullText: text,
      officialSource: "BARI/BRRI Grounded",
      groundingChunks: (response.candidates?.[0]?.groundingMetadata?.groundingChunks as any) || []
    };

  } catch (error: any) {
    console.warn("Gemini API failed or quota exceeded:", error.message);
    
    // Tier 3: OpenRouter Free Models Cascade (If quota exceeded OR API failed)
    if (error.message === "QUOTA_EXCEEDED" || error.message === "API_FAILED") {
      try {
        console.log("Trying OpenRouter fallback cascade...");
        const openRouterKey = process.env.OPENROUTER_API_KEY;
        if (openRouterKey) {
          // Cascade of the best free vision models on OpenRouter
          const orModels = [
            "meta-llama/llama-3.2-90b-vision-instruct:free",
            "qwen/qwen-2-vl-72b-instruct:free",
            "google/gemini-2.5-flash:free"
          ];

          for (const orModel of orModels) {
            try {
              console.log(`Trying OpenRouter model: ${orModel}`);
              const orResponse = await fetch("https://openrouter.ai/api/v1/chat/completions", {
                method: "POST",
                headers: {
                  "Authorization": `Bearer ${openRouterKey}`,
                  "Content-Type": "application/json"
                },
                body: JSON.stringify({
                  model: orModel,
                  messages: [
                    {
                      role: "user",
                      content: [
                        { type: "text", text: systemInstruction + "\n\n" + promptText },
                        { type: "image_url", image_url: { url: `data:${mimeType};base64,${rawBase64}` } }
                      ]
                    }
                  ]
                })
              });
              
              if (orResponse.ok) {
                const orData = await orResponse.json();
                const text = orData.choices?.[0]?.message?.content || "";
                let meta = extractJSON(text, { confidence: 85, isComplex: false, category: 'Other' });
                const diagnosis = text.match(/\[শনাক্তকরণ.*?\]:\s*(.*)/i)?.[1]?.split('\n')[0]?.trim() || "শনাক্তকরণ সম্পন্ন";
                return {
                  diagnosis,
                  category: (meta.category as any) || 'Other',
                  confidence: meta.confidence,
                  advisory: text.replace(/```json[\s\S]*?```/, '').trim(),
                  fullText: text,
                  officialSource: `OpenRouter (${orModel})`,
                  groundingChunks: []
                };
              } else {
                console.warn(`OpenRouter model ${orModel} returned status ${orResponse.status}`);
              }
            } catch (e) {
              console.warn(`OpenRouter model ${orModel} failed, trying next...`);
            }
          }
        } else {
          console.warn("No OPENROUTER_API_KEY found, skipping OpenRouter tier.");
        }
      } catch (orError) {
        console.warn("OpenRouter fallback cascade failed:", orError);
      }
    }

    // Tier 4: Hugging Face (If API failed or OpenRouter failed/exhausted)
    try {
      console.log("Trying Hugging Face fallback...");
      const hfText = await queryQwenVL(promptText, `data:${mimeType};base64,${rawBase64}`, lang);
      if (hfText) {
        return {
          diagnosis: "শনাক্তকরণ (Hugging Face)",
          category: 'Other',
          confidence: 75,
          advisory: hfText,
          fullText: hfText,
          officialSource: "Hugging Face Vision",
          groundingChunks: []
        };
      }
    } catch (hfError) {
      console.warn("Hugging Face fallback failed:", hfError);
    }

    // Tier 5: Rule-based fallback
    console.log("All APIs failed. Using rule-based fallback.");
    const isRice = options?.cropFamily?.toLowerCase().includes('rice') || options?.cropFamily?.includes('ধান');
    const fallbackAdvisory = isRice 
      ? "[শনাক্তকরণ]: সাধারণ ধানের রোগ বা পুষ্টির অভাব হতে পারে।\n[সমন্বিত বালাই ব্যবস্থাপনা (IPM)]: সুষম সার ব্যবহার করুন এবং জমি পরিষ্কার রাখুন।\n[সতর্কতা]: নিকটস্থ কৃষি কর্মকর্তার পরামর্শ নিন।"
      : "[শনাক্তকরণ]: ফসলের সাধারণ সমস্যা।\n[সমন্বিত বালাই ব্যবস্থাপনা (IPM)]: আক্রান্ত অংশ ধ্বংস করুন।\n[সতর্কতা]: নিকটস্থ কৃষি কর্মকর্তার পরামর্শ নিন।";

    return {
      diagnosis: "সাধারণ সমস্যা (Rule-based)",
      category: 'Other',
      confidence: 50,
      advisory: fallbackAdvisory,
      fullText: fallbackAdvisory,
      officialSource: "Rule-based Fallback",
      groundingChunks: []
    };
  }
};

export const getCropDiseaseInfo = async (crop: string) => {
  const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
  const isRice = crop.includes('ধান') || crop.toLowerCase().includes('rice');
  
    const prompt = `Generate a highly detailed Pest & Disease Report for the crop: ${crop}.
  
  MANDATORY GROUNDING RULES:
  1. If Rice (ধান), use BRRI standards. For others, use BARI standards.
  2. All pesticides must follow DAE national protocols (2024-2026) including MoA (Mode of Action) numbers.
  
  Return strictly valid JSON in ${isRice ? 'Bangla (বাংলা)' : 'the requested language'}.
  JSON Structure:
  {
    "cropName": "string",
    "summary": "string",
    "varieties": [
      { "name": "string", "description": "string (brief discussion about the variety performance in BD)" }
    ],
    "diseases": [
      {
        "name": "string",
        "symptoms": "string",
        "imageDescription": "string (Detailed visual description of how this looks for AI image generation)",
        "favorableEnvironment": "string",
        "bioControl": "string (IPM methods)",
        "chemControl": "string (Chemical methods with MoA number and DAE dosage)",
        "severity": "Low/Medium/High"
      }
    ],
    "pests": [
      {
        "name": "string",
        "damageSymptoms": "string",
        "imageDescription": "string (Detailed visual description of the pest and its damage for AI image generation)",
        "favorableEnvironment": "string",
        "bioControl": "string (IPM methods)",
        "chemControl": "string (Chemical methods with MoA number and DAE dosage)",
        "severity": "Low/Medium/High"
      }
    ],
    "sourceUsed": "${isRice ? 'BRRI' : 'BARI'} & DAE Official 2026"
  }`;

  const response = await ai.models.generateContent({
    model: 'gemini-3-flash-preview',
    contents: [{ role: 'user', parts: [{ text: prompt }] }],
    config: { 
      systemInstruction: BD_GOVT_GROUNDING_INSTRUCTION,
      responseMimeType: "application/json" 
    }
  });
  
  return { data: extractJSON<CropDiseaseReport & { sourceUsed: string }>(response.text || "{}", {} as any) };
};

export const analyzeLeafColorAI = async (base64Data: string, mimeType: string): Promise<{ lccValue: number, confidence: number }> => {
  return await withRetry(async () => {
    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: [
        { inlineData: { data: getRawBase64(base64Data), mimeType } },
        { text: "Act as an IRRI Rice expert. Analyze this rice leaf image based on the standard 1-5 panel Leaf Color Chart (LCC). Determine the color index score. Respond strictly in JSON: { \"lccValue\": number, \"confidence\": number }. The lccValue must be between 1 and 5." }
      ],
      config: { responseMimeType: "application/json" }
    });
    return extractJSON<{ lccValue: number, confidence: number }>(response.text || "{}", { lccValue: 3, confidence: 70 });
  });
};

export const getLiveWeather = async (lat: number, lng: number, force = false, lang: Language = 'bn'): Promise<WeatherData> => {
   // Use force to trigger cache bypass if needed in future
   if (force) console.log("Force refresh requested for weather at", lat, lng);
  try {
    // Open-Meteo API for agricultural weather
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lng}&current=temperature_2m,relative_humidity_2m,weather_code,wind_speed_10m&daily=weather_code,temperature_2m_max,temperature_2m_min,et0_fao_evapotranspiration&hourly=soil_temperature_0cm,direct_radiation&timezone=auto`;
    const res = await fetch(url);
    if (!res.ok) throw new Error("Weather API failed");
    const data = await res.json();

    const current = data.current;
    const daily = data.daily;
    const hourly = data.hourly;

    const weatherCodeToCondition = (code: number) => {
      if (code <= 3) return lang === 'bn' ? "পরিষ্কার আকাশ" : "Clear/Partly Cloudy";
      if (code <= 48) return lang === 'bn' ? "কুয়াশা" : "Foggy";
      if (code <= 67) return lang === 'bn' ? "বৃষ্টি" : "Rainy";
      if (code <= 77) return lang === 'bn' ? "তুষারপাত" : "Snow";
      return lang === 'bn' ? "ঝড়ো আবহাওয়া" : "Stormy";
    };

    const forecast = daily.time.slice(0, 7).map((dateStr: string, i: number) => ({
      date: dateStr,
      maxTemp: daily.temperature_2m_max[i],
      minTemp: daily.temperature_2m_min[i],
      condition: weatherCodeToCondition(daily.weather_code[i])
    }));

    return {
      upazila: lang === 'bn' ? "বর্তমান অবস্থান" : "Current Location",
      district: "",
      temp: current.temperature_2m,
      condition: weatherCodeToCondition(current.weather_code),
      description: lang === 'bn' ? "ওপেন-মেটিও লাইভ ডেটা" : "Open-Meteo Live Data",
      humidity: current.relative_humidity_2m,
      windSpeed: current.wind_speed_10m,
      rainProbability: daily.weather_code[0] > 50 ? 80 : 10,
      evapotranspiration: daily.et0_fao_evapotranspiration[0] || 1.2,
      soilTemperature: hourly.soil_temperature_0cm[0] || 24,
      solarRadiation: hourly.direct_radiation[0] || 400,
      forecast
    };
  } catch (error) {
    console.warn("Weather API fallback used due to network error or adblocker.");
    // Fallback
    return { 
      upazila: lang === 'bn' ? "অজানা" : "Unknown", 
      district: lang === 'bn' ? "বাংলাদেশ" : "Bangladesh", 
      temp: 25, 
      condition: lang === 'bn' ? "রৌদ্রোজ্জ্বল" : "Sunny", 
      description: lang === 'bn' ? "পরিষ্কার আকাশ" : "Clear Sky", 
      humidity: 60, 
      windSpeed: 10, 
      rainProbability: 0,
      evapotranspiration: 1.2,
      soilTemperature: 24,
      solarRadiation: 400,
      forecast: []
    };
  }
};

export const getTrendingMarketPrices = async (lang: Language = 'bn'): Promise<MarketPrice[]> => {
  try {
    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
    const today = new Date().toISOString().split('T')[0];
    const response = await safeGenerateContent(ai, 'gemini-3-flash-preview', {
      contents: `Today is ${today}. Search Google for the latest official market prices of major agricultural crops in Bangladesh from Department of Agricultural Marketing (DAM) (dam.gov.bd).
      Focus on: Rice, Potato, Onion, Green Chili, Pulse, Egg, and seasonal vegetables.
      Return strictly as a JSON array of objects.
      Mandatory Keys: name, price (number, BDT per unit), unit (e.g., কেজি, ডজন, লিটার), trend (string: "up", "down", or "stable"), change (string: e.g. "+5%", "-2%", or "0%"), category (string).
      All string values must be in ${lang === 'bn' ? 'Bangla (বাংলা)' : 'English'}.`,
      config: { 
        systemInstruction: "You are an agricultural market analyst for Bangladesh. Use official grounding from dam.gov.bd only. NO INTRODUCTIONS.",
        tools: [{ googleSearch: {} }],
        responseMimeType: "application/json"
      }
    });
    return extractJSON<MarketPrice[]>(response.text || "[]", []);
  } catch (error) {
    console.warn("Market fetch failed, using fallback data:", error);
    return [
      { name: lang === 'bn' ? 'চাল (মিনিকেট)' : 'Rice (Miniket)', price: 68, unit: lang === 'bn' ? 'কেজি' : 'kg', trend: 'stable', change: '0%', category: lang === 'bn' ? 'শস্য' : 'Grain' },
      { name: lang === 'bn' ? 'আলু' : 'Potato', price: 45, unit: lang === 'bn' ? 'কেজি' : 'kg', trend: 'up', change: '+5%', category: lang === 'bn' ? 'সবজি' : 'Vegetable' },
      { name: lang === 'bn' ? 'পেঁয়াজ (দেশি)' : 'Onion (Local)', price: 120, unit: lang === 'bn' ? 'কেজি' : 'kg', trend: 'down', change: '-2%', category: lang === 'bn' ? 'মসলা' : 'Spice' },
      { name: lang === 'bn' ? 'কাঁচা মরিচ' : 'Green Chili', price: 160, unit: lang === 'bn' ? 'কেজি' : 'kg', trend: 'up', change: '+10%', category: lang === 'bn' ? 'মসলা' : 'Spice' },
      { name: lang === 'bn' ? 'ডিম (ফার্ম)' : 'Egg (Farm)', price: 140, unit: lang === 'bn' ? 'ডজন' : 'dozen', trend: 'stable', change: '0%', category: lang === 'bn' ? 'পোল্ট্রি' : 'Poultry' }
    ];
  }
};

export const getLCCAnalysisSummary = async (lcc: number, tsr: number, dose: string, lang: 'en' | 'bn' = 'bn') => {
  const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
  const response = await ai.models.generateContent({
    model: 'gemini-3-flash-preview',
    contents: `LCC Summary: Value ${lcc}, TSR ${tsr}%, Dose ${dose}. Respond in ${lang === 'bn' ? 'Bangla' : 'English'}. START DIRECTLY WITH [${lang === 'bn' ? 'এলসিসি বিশ্লেষণ' : 'LCC Analysis'}].`,
    config: { systemInstruction: BD_GOVT_GROUNDING_INSTRUCTION }
  });
  return response.text;
};

export const generateSpeech = async (text: string): Promise<string> => {
  return await withRetry(async () => {
    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
    const speechText = text.replace(/[*#_~]/g, '').slice(0, 1000);
    
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash-preview-tts",
      contents: [{ parts: [{ text: speechText }] }],
      config: {
        responseModalities: [Modality?.AUDIO || 'AUDIO' as any],
        speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Kore' } } },
      },
    });
    const candidates = response.candidates || [];
    if (candidates.length > 0) {
      const parts = candidates[0].content?.parts || [];
      for (const part of parts) {
        if (part.inlineData?.data) return part.inlineData.data;
      }
    }
    throw new Error("No audio data");
  });
};

export const searchNearbySellers = async (lat: number, lng: number, query: string, lang: Language = 'bn') => {
  const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
  // Maps grounding requires gemini-2.5 series
  const response = await safeGenerateContent(ai, 'gemini-2.5-flash', {
    contents: `Find closest ${query} near ${lat}, ${lng} in Bangladesh. Answer in ${lang === 'bn' ? 'Bangla' : 'English'}.`,
    config: {
      tools: [{ googleMaps: {} }, { googleSearch: {} }],
      toolConfig: { retrievalConfig: { latLng: { latitude: lat, longitude: lng } } }
    }
  });
  return {
    text: response.text || "",
    groundingChunks: (response.candidates?.[0]?.groundingMetadata?.groundingChunks as any) || []
  };
};

export const sendChatMessage = async (history: any[], message: string, persona: string, role: string, weather?: WeatherData, crops?: UserCrop[]) => {
  const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
  const weatherContext = weather ? `Current Weather at ${weather.upazila}: ${weather.temp}°C, ${weather.condition}.` : '';
  const cropsContext = crops && crops.length > 0 ? `User's crops: ${crops.map(c => c.name).join(', ')}.` : '';
  const context = `UserRole: ${role}. Persona: ${persona}. ${weatherContext} ${cropsContext} Answer directly. Use square bracket headers.`;
  const response = await safeGenerateContent(ai, 'gemini-3-flash-preview', {
    contents: [...history, { role: 'user', parts: [{ text: `${context}\n\nQ: ${message}` }] }],
    config: { tools: [{ googleSearch: {} }] }
  });
  return {
    text: response.text || "দুঃখিত, উত্তর দিতে পারছি না।",
    groundingChunks: (response.candidates?.[0]?.groundingMetadata?.groundingChunks as any) || []
  };
};

export const searchAgriculturalInfo = async (query: string) => {
  const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
  const response = await safeGenerateContent(ai, 'gemini-3-flash-preview', {
    contents: `Official advice for: ${query}. Answer directly with square bracket headers.`,
    config: { systemInstruction: BD_GOVT_GROUNDING_INSTRUCTION, tools: [{ googleSearch: {} }] }
  });
  return {
    text: response.text || "",
    groundingChunks: (response.candidates?.[0]?.groundingMetadata?.groundingChunks as any) || []
  };
};

export const requestPrecisionParameters = async (base64Data: string, mimeType: string, cropFamily: string, lang: Language = 'bn') => {
  const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
  const response = await ai.models.generateContent({
    model: 'gemini-3-flash-preview',
    contents: [
      { inlineData: { data: getRawBase64(base64Data), mimeType } },
      { text: `Identify followup questions for ${cropFamily}. JSON array. Language: ${lang === 'bn' ? 'Bangla' : 'English'}.` }
    ],
    config: { systemInstruction: BD_GOVT_GROUNDING_INSTRUCTION, responseMimeType: "application/json" }
  });
  return extractJSON<any[]>(response.text || "[]", []);
};

export const requestPesticidePrecisionParameters = async (query: string, lang: Language = 'bn') => {
  const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
  const response = await ai.models.generateContent({
    model: 'gemini-3-flash-preview',
    contents: `Followup spray questions for ${query}. Return strictly as JSON array. Language: ${lang === 'bn' ? 'Bangla' : 'English'}.`,
    config: { systemInstruction: BD_GOVT_GROUNDING_INSTRUCTION, responseMimeType: "application/json" }
  });
  return extractJSON<any[]>(response.text || "[]", []); // eslint-disable-line @typescript-eslint/no-explicit-any
};

export const requestSoilPrecisionParameters = async (inputs: any, aezName: string, lang: Language = 'bn') => {
  const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
  const response = await ai.models.generateContent({
    model: 'gemini-3-flash-preview',
    contents: `Soil followup questions for ${aezName} considering inputs ${JSON.stringify(inputs)}. JSON array. ${lang === 'bn' ? 'Bangla' : 'English'}.`,
    config: { systemInstruction: BD_GOVT_GROUNDING_INSTRUCTION, responseMimeType: "application/json" }
  });
  return extractJSON<any[]>(response.text || "[]", []);
};

export const performDeepPesticideAudit = async (query: string, dynamicData: Record<string, string>, lang: Language = 'bn') => {
  const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
  const response = await safeGenerateContent(ai, 'gemini-3-flash-preview', {
    contents: `Final Spray Audit: ${query} with additional data: ${JSON.stringify(dynamicData)}. Language: ${lang === 'bn' ? 'Bangla' : 'English'}. START DIRECTLY WITH [${lang === 'bn' ? 'চূড়ান্ত অডিট রিপোর্ট' : 'Final Audit Report'}].`,
    config: { systemInstruction: BD_GOVT_GROUNDING_INSTRUCTION, tools: [{ googleSearch: {} }] }
  });
  return {
    text: response.text || "",
    groundingChunks: (response.candidates?.[0]?.groundingMetadata?.groundingChunks as any) || [] // eslint-disable-line @typescript-eslint/no-explicit-any
  };
};

export const performSoilHealthAudit = async (inputs: any, aez?: AEZInfo, lang: Language = 'bn') => { // eslint-disable-line @typescript-eslint/no-explicit-any
  const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
  const response = await safeGenerateContent(ai, 'gemini-3-flash-preview', {
    contents: `Soil Audit: ${JSON.stringify(inputs)} in AEZ ${aez?.name || 'Unknown'}. Language: ${lang === 'bn' ? 'Bangla' : 'English'}. Start with [${lang === 'bn' ? 'পুষ্টি বিশ্লেষণ' : 'Nutrient Analysis'}].`,
    config: { systemInstruction: BD_GOVT_GROUNDING_INSTRUCTION, tools: [{ googleSearch: {} }] }
  });
  return response.text;
};

export const performDeepSoilAudit = async (inputs: any, aezName: string, dynamicData: Record<string, string>, lang: Language = 'bn') => { // eslint-disable-line @typescript-eslint/no-explicit-any
  const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
  const response = await safeGenerateContent(ai, 'gemini-3-flash-preview', {
    contents: `Deep Soil Audit for ${aezName} with inputs ${JSON.stringify(inputs)} and dynamic data ${JSON.stringify(dynamicData)}. Language: ${lang === 'bn' ? 'Bangla' : 'English'}. Start with [${lang === 'bn' ? 'বিস্তারিত অডিট ফলাফল' : 'Detailed Audit Results'}].`,
    config: { systemInstruction: BD_GOVT_GROUNDING_INSTRUCTION, tools: [{ googleSearch: {} }] }
  });
  return response.text;
};

export const getAIYieldPrediction = async (
  crop: string, aez: string, soilStatus: string, practice: string, water: string, notes: string, rank?: string, dynamicInputs?: Record<string, string>, lang: Language = 'bn'
) => {
  const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
  const context = `Crop: ${crop}, AEZ: ${aez}, Soil: ${soilStatus}, Practice: ${practice}, Water: ${water}, Notes: ${notes}, Rank: ${rank || 'N/A'}, Extra: ${JSON.stringify(dynamicInputs || {})}`;
  const response = await safeGenerateContent(ai, 'gemini-3-flash-preview', {
    contents: `Predict yield prediction. Context: ${context}. Language: ${lang === 'bn' ? 'Bangla' : 'English'}. Start with [${lang === 'bn' ? 'ফলন পূর্বাভাস' : 'Yield Prediction'}].`,
    config: { systemInstruction: BD_GOVT_GROUNDING_INSTRUCTION, tools: [{ googleSearch: {} }] }
  });
  return {
    text: response.text || (lang === 'bn' ? "পূর্বাভাস জেনারেট করা যায়নি।" : "Prediction unavailable."),
    groundingChunks: (response.candidates?.[0]?.groundingMetadata?.groundingChunks as any) || [] // eslint-disable-line @typescript-eslint/no-explicit-any
  };
};

export const getAIPlantNutrientAdvice = async (crop: string, aez: string, soil: string, area: number, unit: string, lang: Language = 'bn') => {
  const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
  const response = await ai.models.generateContent({
    model: 'gemini-3-flash-preview',
    contents: `BARC Fertilizer Guide 2024 for ${crop} in ${aez}. Area: ${area} ${unit}. START DIRECTLY WITH [সার সুপারিশ].`,
    config: { systemInstruction: BD_GOVT_GROUNDING_INSTRUCTION, tools: [{ googleSearch: {} }] }
  });
  return response.text;
};

export const getBiocontrolExpertAdvice = async (query: string) => {
  const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
  const response = await ai.models.generateContent({
    model: 'gemini-3-flash-preview',
    contents: `Biocontrol measures for ${query}. START DIRECTLY WITH [জৈবিক পদ্ধতি].`,
    config: { systemInstruction: BD_GOVT_GROUNDING_INSTRUCTION, tools: [{ googleSearch: {} }] }
  });
  return response.text;
};

export const interpretSoilReportAI = async (inputs: any) => {
  const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
  const response = await ai.models.generateContent({
    model: 'gemini-3-flash-preview',
    contents: `Interpret soil lab result: ${JSON.stringify(inputs)}. START DIRECTLY WITH [ল্যাব রিপোর্ট বিশ্লেষণ].`,
    config: { systemInstruction: BD_GOVT_GROUNDING_INSTRUCTION, tools: [{ googleSearch: {} }] }
  });
  return response.text;
};

export const getFieldMonitoringData = async (lat: number, lng: number, areaName: string) => {
  const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
  const response = await ai.models.generateContent({
    model: 'gemini-3-flash-preview',
    contents: `Satellite Health Monitoring for ${areaName}. START DIRECTLY WITH [স্যাটেলাইট পর্যবেক্ষণ].`,
    config: { systemInstruction: BD_GOVT_GROUNDING_INSTRUCTION, tools: [{ googleSearch: {} }] }
  });
  return { text: response.text || "" };
};

export const detectCropFromImage = async (base64Data: string, mimeType: string, cropList: string[]): Promise<string | null> => {
  try {
    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: [
        { inlineData: { data: getRawBase64(base64Data), mimeType } },
        { text: `Identify the crop in this image. It must be one of the following: ${cropList.join(', ')}. Respond ONLY with the exact crop name from the list. If you cannot identify it, respond with "Unknown".` }
      ]
    });
    const detected = response.text?.trim() || "";
    if (cropList.includes(detected)) {
      return detected;
    }
    return null;
  } catch (error) {
    console.error("Crop detection failed:", error);
    return null;
  }
};

export const identifyPlantSpecimen = async (base64Data: string, mimeType: string, lang: Language = 'bn') => {
  const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
  const response = await ai.models.generateContent({
    model: 'gemini-3-flash-preview',
    contents: [
      { inlineData: { data: getRawBase64(base64Data), mimeType } },
      { text: `Identify this botanical specimen. START DIRECTLY WITH [উদ্ভিদ পরিচয়].` }
    ],
    config: { systemInstruction: BD_GOVT_GROUNDING_INSTRUCTION, tools: [{ googleSearch: {} }] }
  });
  return {
    text: response.text || "",
    groundingChunks: (response.candidates?.[0]?.groundingMetadata?.groundingChunks as any) || []
  };
};

export const getAgriFlashCards = async (topic: string) => {
  const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
  const response = await ai.models.generateContent({
    model: 'gemini-3-flash-preview',
    contents: `Flashcards for ${topic}. JSON.`,
    config: { systemInstruction: BD_GOVT_GROUNDING_INSTRUCTION, responseMimeType: "application/json" }
  });
  return extractJSON<FlashCard[]>(response.text || "[]", []);
};

export const getAICropSchedule = async (crop: string, _date: string, _season: string) => {
  const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
  const response = await ai.models.generateContent({
    model: 'gemini-3-flash-preview',
    contents: `Crop schedule for ${crop}. JSON.`,
    config: { systemInstruction: BD_GOVT_GROUNDING_INSTRUCTION, responseMimeType: "application/json" }
  });
  return extractJSON<any[]>(response.text || "[]", []);
};

export const getAgriMetaExplanation = async (query: string) => {
  const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
  const response = await ai.models.generateContent({
    model: 'gemini-3-flash-preview',
    contents: `Explain logic for: ${query}. START DIRECTLY WITH [ব্যাখ্যা].`,
    config: { systemInstruction: BD_GOVT_GROUNDING_INSTRUCTION }
  });
  return response.text;
};

export const generateAgriQuiz = async (topic: string, lang: Language = 'bn') => {
  const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
  const response = await ai.models.generateContent({
    model: 'gemini-3-flash-preview',
    contents: `5 agri questions on ${topic}. JSON.`,
    config: { systemInstruction: BD_GOVT_GROUNDING_INSTRUCTION, responseMimeType: "application/json" }
  });
  return extractJSON<AgriQuizQuestion[]>(response.text || "[]", []);
};

export const searchEncyclopedia = async (query: string, lang: Language = 'bn') => {
  const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
  const response = await ai.models.generateContent({
    model: 'gemini-3-flash-preview',
    contents: `Detail ${query}. START DIRECTLY WITH [তথ্যসারসংক্ষেপ].`,
    config: { systemInstruction: BD_GOVT_GROUNDING_INSTRUCTION, tools: [{ googleSearch: {} }] }
  });
  return {
    text: response.text || "",
    groundingChunks: (response.candidates?.[0]?.groundingMetadata?.groundingChunks as any) || []
  };
};

export const getPersonalizedAgriAdvice = async (crops: UserCrop[], rank: string) => {
  const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
  const response = await ai.models.generateContent({
    model: 'gemini-3-flash-preview',
    contents: `Advise for a ${rank} growing: ${crops.map(c => c.name).join(', ')}. START DIRECTLY WITH [পরামর্শ].`,
    config: { systemInstruction: BD_GOVT_GROUNDING_INSTRUCTION, tools: [{ googleSearch: {} }] }
  });
  return response.text || "";
};

export const getWeatherSmartAgriPlan = async (crops: UserCrop[], weather: WeatherData, location: string, lang: Language = 'bn') => {
  const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
  const today = new Date().toLocaleDateString('en-US');
  const cropList = crops.map(c => `${c.name} (Variety: ${c.variety}, Sown: ${c.sowingDate})`).join(', ');
  const forecastText = weather.forecast?.map(f => `${f.date}: ${f.condition}, Max ${f.maxTemp}C`).join('; ');
  
  const prompt = `Today is ${today}. 
  Location: ${location}. 
  Current Weather: ${weather.condition}, ${weather.temp}C.
  7-Day Forecast: ${forecastText}.
  Managed Crops: ${cropList}.
  
  TASK:
  1. ANALYZE the 7-day forecast specifically for these crops.
  2. Identify the OPTIMAL specific dates/times for:
     - [রোপণ/বপনের আদর্শ সময়]: Suggest dates with stable temp and no immediate heavy rain.
     - [সেচ ব্যবস্থাপনা]: Cross-reference rain probability in forecast to suggest skipping or starting irrigation.
     - [সার ও বালাইনাশক প্রয়োগ]: Identify windows with wind < 12km/h and NO rain for 24h post-application.
  3. Search Google for historical hazards in ${location} for this month.
  
  Format: Use square bracket headers in ${lang === 'bn' ? 'Bangla (বাংলা)' : 'English'}.
  Headers: [৭ দিনের স্মার্ট ক্যালেন্ডার], [আবহাওয়া ভিত্তিক বিশেষ নির্দেশনা], [ঐতিহাসিক ঝুঁকি বিশ্লেষণ], [সতর্কতা ও টিপস].`;

  const response = await safeGenerateContent(ai, 'gemini-3-flash-preview', {
    contents: prompt,
    config: { 
      systemInstruction: BD_GOVT_GROUNDING_INSTRUCTION,
      tools: [{ googleSearch: {} }]
    }
  });
  return {
    text: response.text || "",
    groundingChunks: (response.candidates?.[0]?.groundingMetadata?.groundingChunks as any) || []
  };
};

export const getAgriNews = async (lang: Language = 'bn') => {
  try {
    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
    const today = new Date().toLocaleDateString('en-US');
    const response = await safeGenerateContent(ai, 'gemini-3-flash-preview', {
      contents: `Today is ${today}. Find the 5 most recent and breaking agricultural news headlines from Bangladesh published strictly within the last 24 hours. Do not return any archived news. Prioritize authentic sources like DAE, BARI, BRRI, or top news portals. Return a JSON array of objects.`,
      config: { 
        systemInstruction: "You are a news aggregator. Strictly ignore any news older than 24 hours from today. Do not return empty results if possible, find the latest available.",
        tools: [{ googleSearch: {} }],
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              text: { type: Type.STRING, description: "The news headline." },
              url: { type: Type.STRING, description: "Direct link to the news source." },
              time: { type: Type.STRING, description: "How many minutes or hours ago was this published (e.g., '১০ মিনিট আগে' or '২ ঘণ্টা আগে')." }
            },
            required: ["text", "url", "time"]
          }
        }
      }
    });
    return extractJSON<{text: string, url: string, time: string}[]>(response.text || "[]", []);
  } catch (error) {
    console.warn("News fetch failed, using fallback data:", error);
    return [
      { text: lang === 'bn' ? "বিএআরআই উদ্ভাবিত নতুন প্রযুক্তির ব্যবহার শুরু" : "New technology from BARI introduced", url: "#", time: lang === 'bn' ? "১ ঘণ্টা আগে" : "1 hour ago" },
      { text: lang === 'bn' ? "সুষম সার প্রয়োগে কৃষকদের উদ্বুদ্ধকরণ" : "Farmers encouraged to use balanced fertilizers", url: "#", time: lang === 'bn' ? "২ ঘণ্টা আগে" : "2 hours ago" },
      { text: lang === 'bn' ? "কৃষি প্রণোদনা বিতরণের নতুন ধাপ শুরু" : "New phase of agricultural incentives distribution starts", url: "#", time: lang === 'bn' ? "৩ ঘণ্টা আগে" : "3 hours ago" },
      { text: lang === 'bn' ? "স্মার্ট কৃষি প্রযুক্তিতে কৃষকদের আগ্রহ বাড়ছে" : "Farmers' interest in smart agriculture technology is growing", url: "#", time: lang === 'bn' ? "৫ ঘণ্টা আগে" : "5 hours ago" },
      { text: lang === 'bn' ? "বন্যা পরবর্তী কৃষি পুনর্বাসন কর্মসূচি" : "Post-flood agricultural rehabilitation program", url: "#", time: lang === 'bn' ? "৬ ঘণ্টা আগে" : "6 hours ago" }
    ];
  }
};

export const getAgriPodcastSummary = async (topic: string) => {
  const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
  const response = await safeGenerateContent(ai, 'gemini-3-flash-preview', {
    contents: `Podcast script for: ${topic}. START DIRECTLY WITH [পডকাস্ট স্ক্রিপ্ট].`,
    config: { systemInstruction: BD_GOVT_GROUNDING_INSTRUCTION, tools: [{ googleSearch: {} }] }
  });
  return {
    text: response.text || "",
    groundingChunks: (response.candidates?.[0]?.groundingMetadata?.groundingChunks as any) || []
  };
};

export const generateAgriImage = async (prompt: string): Promise<string> => {
  const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
  const response = await ai.models.generateContent({
    model: 'gemini-2.5-flash-image',
    contents: [{ parts: [{ text: prompt }] }],
    config: { imageConfig: { aspectRatio: "16:9" } }
  });
  for (const part of response.candidates?.[0]?.content?.parts || []) {
    if (part.inlineData) return `data:image/png;base64,${part.inlineData.data}`;
  }
  throw new Error("Image generation failed");
};

export const performDeepAudit = async (base64Data: string, mimeType: string, cropFamily: string, dynamicData: Record<string, string>, lang: Language = 'bn', weather?: WeatherData): Promise<AnalysisResult> => {
  const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
  const systemInstruction = `${BD_GOVT_GROUNDING_INSTRUCTION}
  Perform Deep Audit. START DIRECTLY WITH [অডিট ফলাফল].`;
  
  const response = await safeGenerateContent(ai, 'gemini-3-flash-preview', {
    contents: [
      { inlineData: { data: getRawBase64(base64Data), mimeType } },
      { text: `Field Data: ${JSON.stringify(dynamicData)}. Weather: ${JSON.stringify(weather)}.` }
    ],
    config: { systemInstruction, tools: [{ googleSearch: {} }] }
  });
  
  const text = response.text || "";
  return {
    diagnosis: "গভীর অডিট রিপোর্ট",
    category: 'Other',
    confidence: 100,
    advisory: text,
    fullText: text,
    groundingChunks: (response.candidates?.[0]?.groundingMetadata?.groundingChunks as any) || []
  };
};

export const getPesticideExpertAdvice = async (query: string, lang: Language = 'bn') => {
  const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
  const response = await safeGenerateContent(ai, 'gemini-3-flash-preview', {
    contents: `Official DAE dosage for: ${query}. Sections: [ডোজ], [নিরাপত্তা], [গ্রুপ].`,
    config: { systemInstruction: BD_GOVT_GROUNDING_INSTRUCTION, tools: [{ googleSearch: {} }] }
  });
  return {
    text: response.text || "",
    groundingChunks: (response.candidates?.[0]?.groundingMetadata?.groundingChunks as any) || []
  };
};

export const getAISprayAdvisory = async (crop: string, pest: string, weather: WeatherData, lang: Language = 'bn') => {
  const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
  const response = await safeGenerateContent(ai, 'gemini-3-flash-preview', {
    contents: `Spray decision for ${pest} on ${crop}. Weather: ${JSON.stringify(weather)}. Use [সিদ্ধান্ত] header.`,
    config: { systemInstruction: BD_GOVT_GROUNDING_INSTRUCTION, tools: [{ googleSearch: {} }] }
  });
  return {
    text: response.text || "",
    groundingChunks: (response.candidates?.[0]?.groundingMetadata?.groundingChunks as any) || []
  };
};

export const analyzePesticideMixing = async (items: any[], weather?: WeatherData, lang: Language = 'bn') => {
  const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
  const response = await safeGenerateContent(ai, 'gemini-3-flash-preview', {
    contents: `Mixing safety for: ${items.map(i => i.text).join(', ')}. Start with [নিরাপত্তা বিশ্লেষণ].`,
    config: { systemInstruction: BD_GOVT_GROUNDING_INSTRUCTION, tools: [{ googleSearch: {} }] }
  });
  return {
    text: response.text || "",
    groundingChunks: (response.candidates?.[0]?.groundingMetadata?.groundingChunks as any) || []
  };
};
