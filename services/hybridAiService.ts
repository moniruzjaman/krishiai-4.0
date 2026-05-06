import { queryQwenVL } from "./huggingfaceService";

/**
 * Extracts raw base64 string
 */
const getRawBase64 = (data: string | null | undefined): string => {
  if (!data) return "";
  if (data.includes('base64,')) {
    const parts = data.split('base64,');
    return parts.length > 1 ? parts[1] : parts[0];
  }
  return data;
};

/**
 * Helper to enforce timeouts on promises
 */
const withTimeout = <T>(promise: Promise<T>, timeoutMs: number, label: string): Promise<T> => {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) => setTimeout(() => reject(new Error(`Timeout: ${label} exceeded ${timeoutMs}ms`)), timeoutMs))
  ]);
};

/**
 * Translates Gemini API params to OpenRouter messages format
 */
const translateToOpenRouterMessages = (params: any): any[] => {
  const messages: any[] = [];
  
  if (params.config?.systemInstruction) {
    const sysText = typeof params.config.systemInstruction === 'string' 
      ? params.config.systemInstruction 
      : params.config.systemInstruction?.parts?.[0]?.text || "You are an AI assistant.";
    messages.push({ role: "system", content: sysText });
  }

  const contents = Array.isArray(params.contents) ? params.contents : [{ role: "user", parts: [{ text: params.contents }] }];
  
  for (const c of contents) {
    const role = c.role === 'model' ? 'assistant' : 'user';
    const contentArray: any[] = [];
    
    const parts = Array.isArray(c.parts) ? c.parts : [{ text: c.text }];
    for (const part of parts) {
      if (part.text) {
        contentArray.push({ type: "text", text: part.text });
      } else if (part.inlineData) {
        const rawBase64 = getRawBase64(part.inlineData.data);
        contentArray.push({
          type: "image_url",
          image_url: { url: `data:${part.inlineData.mimeType};base64,${rawBase64}` }
        });
      }
    }
    messages.push({ role, content: contentArray });
  }

  return messages;
};

/**
 * Translates Gemini params to a single text prompt and optional image for Hugging Face
 */
const translateToHFFormat = (params: any): { prompt: string, base64Image?: string, mimeType?: string } => {
  let prompt = "";
  let base64Image = undefined;
  let mimeType = undefined;

  if (params.config?.systemInstruction) {
    prompt += `[System]: ${typeof params.config.systemInstruction === 'string' ? params.config.systemInstruction : params.config.systemInstruction?.parts?.[0]?.text}\n\n`;
  }

  const contents = Array.isArray(params.contents) ? params.contents : [{ parts: [{ text: params.contents }] }];
  for (const c of contents) {
    const parts = Array.isArray(c.parts) ? c.parts : [{ text: c.text }];
    for (const part of parts) {
      if (part.text) prompt += `${part.text}\n`;
      if (part.inlineData && !base64Image) {
        base64Image = getRawBase64(part.inlineData.data);
        mimeType = part.inlineData.mimeType;
      }
    }
  }

  return { prompt: prompt.trim(), base64Image, mimeType };
};

/**
 * Fallback execution router
 */
export const executeHybridFallback = async (model: string, params: any): Promise<any> => {
  const openRouterKey = process.env.OPENROUTER_API_KEY;
  const hfToken = process.env.HF_TOKEN;
  
  const hasImage = Array.isArray(params.contents) 
    ? params.contents.some((c: any) => c.parts?.some((p: any) => !!p.inlineData))
    : false;

  const isJsonMode = params.config?.responseMimeType === "application/json";

  // Mock Gemini Response Object
  const createResponse = (text: string) => ({
    text,
    candidates: [{
      content: { parts: [{ text }] },
      groundingMetadata: { groundingChunks: [] }
    }]
  });

  // TIER 2: OpenRouter
  if (openRouterKey && openRouterKey !== "undefined") {
    const orModels = hasImage 
      ? [
          "google/gemini-2.5-flash:free",
          "meta-llama/llama-3.2-90b-vision-instruct:free",
          "qwen/qwen-2-vl-72b-instruct:free"
        ]
      : [
          "google/gemini-2.5-flash:free",
          "meta-llama/llama-3-8b-instruct:free"
        ];

    const messages = translateToOpenRouterMessages(params);

    for (const orModel of orModels) {
      try {
        console.log(`Fallback: Trying OpenRouter model ${orModel}`);
        const response = await withTimeout(
          fetch("https://openrouter.ai/api/v1/chat/completions", {
            method: "POST",
            headers: {
              "Authorization": `Bearer ${openRouterKey}`,
              "Content-Type": "application/json"
            },
            body: JSON.stringify({
              model: orModel,
              messages,
              response_format: isJsonMode ? { type: "json_object" } : undefined
            })
          }),
          10000,
          `OpenRouter ${orModel}`
        );

        if (response.ok) {
          const data = await response.json();
          const text = data.choices?.[0]?.message?.content;
          if (text) return createResponse(text);
        }
      } catch (e) {
        console.warn(`OpenRouter ${orModel} failed, moving to next...`);
      }
    }
  }

  // TIER 3: Hugging Face
  if (hfToken && hfToken !== "undefined") {
    try {
      console.log("Fallback: Trying Hugging Face");
      const { prompt, base64Image, mimeType } = translateToHFFormat(params);
      
      if (hasImage && base64Image) {
        const dataUri = `data:${mimeType};base64,${base64Image}`;
        const result = await withTimeout(queryQwenVL(prompt, dataUri, 'bn'), 15000, "HF Vision");
        if (result) return createResponse(result);
      } else {
        const modelUrl = "https://api-inference.huggingface.co/models/mistralai/Mistral-7B-Instruct-v0.3";
        const result = await withTimeout(
          fetch(modelUrl, {
            method: "POST",
            headers: { 
              "Authorization": `Bearer ${hfToken}`, 
              "Content-Type": "application/json",
              "x-wait-for-model": "true"
            },
            body: JSON.stringify({ 
              inputs: `[INST] ${prompt} [/INST]`, 
              parameters: { max_new_tokens: 1024 } 
            })
          }),
          10000,
          "HF Text"
        );

        if (result.ok) {
          const data = await result.json();
          const text = Array.isArray(data) ? data[0]?.generated_text : data?.generated_text;
          const cleanText = text?.split('[/INST]').pop()?.trim();
          if (cleanText) return createResponse(cleanText);
        }
      }
    } catch (e) {
      console.warn("Hugging Face fallback failed.", e);
    }
  }

  // TIER 4: Rule-based Canned Fallback
  console.log("All fallbacks failed. Using canned response.");
  if (isJsonMode) {
    return createResponse("{}");
  }
  
  return createResponse("দুঃখিত, এই মুহূর্তে সার্ভার অতিরিক্ত ব্যস্ত আছে। অনুগ্রহ করে কিছুক্ষণ পর আবার চেষ্টা করুন। (Server Busy)");
};
