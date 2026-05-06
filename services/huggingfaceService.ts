
import { HFClassificationResult } from "../types";

/**
 * Primary Engine: Qwen-2.5-VL (Hugging Face)
 * This is the first choice for all visual and text agricultural reasoning.
 */
export const queryQwenVL = async (
  prompt: string, 
  base64Image?: string, 
  lang: string = 'bn'
): Promise<string | null> => {
  const HF_TOKEN = (process.env.HF_TOKEN && process.env.HF_TOKEN !== "undefined") 
    ? process.env.HF_TOKEN 
    : "";
  
  try {
    const modelUrl = "https://api-inference.huggingface.co/models/Qwen/Qwen2.5-VL-7B-Instruct";
    
    // Structure enforced for BARI/BRRI authentic grounding
    const groundedPrompt = `[Authority: Senior Scientific Officer, Bangladesh Agriculture Research Council (BARC)]
    
    Request: ${prompt}
    
    Diagnostic Protocol:
    1. Reference BARI/BRRI/DAE 2024-2026 guidelines.
    2. Strictly NO introductions or greetings.
    3. Respond in ${lang === 'bn' ? 'Bangla (বাংলা)' : 'English'}.
    4. Include integrated pest management (IPM) and correct chemical dosages where applicable.`;

    const body: any = {
      inputs: base64Image ? {
        image: base64Image.includes('base64,') ? base64Image : `data:image/jpeg;base64,${base64Image}`,
        prompt: groundedPrompt
      } : groundedPrompt,
      parameters: { max_new_tokens: 1024, temperature: 0.1 }
    };

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 20000);

    const response = await fetch(modelUrl, {
      headers: { 
        "Authorization": `Bearer ${HF_TOKEN}`,
        "Content-Type": "application/json",
        "x-wait-for-model": "true"
      },
      method: "POST",
      body: JSON.stringify(body),
      signal: controller.signal
    });

    clearTimeout(timeoutId);
    if (!response.ok) return null;
    const result = await response.json();
    
    let text = "";
    if (Array.isArray(result)) {
      text = result[0]?.generated_text || result[0]?.text || "";
    } else {
      text = result?.generated_text || result?.text || "";
    }

    return text.replace(/<\|.*?\|>/g, '').trim() || null;
  } catch (error) {
    console.warn("Hugging Face Engine currently unavailable. Falling back to Gemini 3 Flash...");
    return null;
  }
};

/**
 * CropNet Intelligence for climate-based risk profiling.
 */
export const queryCropNetInsight = async (weatherData: any, lang: string = 'bn'): Promise<string | null> => {
  const HF_TOKEN = process.env.HF_TOKEN || "";

  try {
    const modelUrl = "https://api-inference.huggingface.co/models/mistralai/Mistral-7B-Instruct-v0.3";
    
    const prompt = `[INST] Act as an Agri-Data Scientist for Bangladesh. 
    Analyze weather: Temp ${weatherData.temp}C, Humidity ${weatherData.humidity}%, Wind ${weatherData.windSpeed}km/h.
    Predict: Disease risk, Pest surge, Spray suitability.
    Language: ${lang === 'bn' ? 'Bangla' : 'English'}. Concise points. [/INST]`;

    const response = await fetch(modelUrl, {
      headers: { "Authorization": `Bearer ${HF_TOKEN}`, "Content-Type": "application/json" },
      method: "POST",
      body: JSON.stringify({ inputs: prompt, parameters: { max_new_tokens: 250 } })
    });

    if (!response.ok) return null;
    const result = await response.json();
    const text = Array.isArray(result) ? result[0]?.generated_text : result?.generated_text;
    return text?.split('[/INST]').pop()?.trim() || null;
  } catch (e) { return null; }
};

export const classifyPlantDiseaseHF = async (base64Data: string): Promise<HFClassificationResult[] | null> => {
  const HF_TOKEN = process.env.HF_TOKEN || "";
  if (!base64Data) return null;
  try {
    const rawBase64 = base64Data.includes('base64,') ? base64Data.split(',')[1] : base64Data;
    const binaryString = atob(rawBase64);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) bytes[i] = binaryString.charCodeAt(i);

    const response = await fetch("https://api-inference.huggingface.co/models/linkv/plant-disease-classification", {
      headers: { "Authorization": `Bearer ${HF_TOKEN}`, "Content-Type": "application/octet-stream", "x-wait-for-model": "true" },
      method: "POST",
      body: bytes.buffer,
    });

    if (!response.ok) return null;
    const result = await response.json();
    return Array.isArray(result) ? result.sort((a: any, b: any) => b.score - a.score).slice(0, 5) : null;
  } catch (error) { return null; }
};
