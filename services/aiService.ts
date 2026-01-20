
import { GoogleGenAI, Type } from "@google/genai";
import { AIAnalysisResult } from "../types.ts";

const getAI = () => new GoogleGenAI({ apiKey: process.env.API_KEY! });

export const analyzeConstructionTask = async (
  taskTitle: string,
  taskDescription: string,
  imagesBase64: string[]
): Promise<AIAnalysisResult> => {
  const ai = getAI();
  
  const prompt = `
    Как эксперт в области технического надзора и строительства (ГОСТ, СНиП), проанализируй выполнение задачи:
    Заголовок: ${taskTitle}
    Описание: ${taskDescription}
    
    Изучи прикрепленные фотографии (если они есть) и дай оценку качества.
    Твоя задача:
    1. Определить, соответствует ли выполненная работа описанию.
    2. Выявить возможные нарушения строительных норм.
    3. Выставить статус: 'passed' (всё отлично), 'warning' (есть мелкие недочеты), 'failed' (серьезные нарушения).
    
    Ответ верни в формате JSON.
  `;

  const response = await ai.models.generateContent({
    model: 'gemini-3-flash-preview',
    contents: [
      {
        parts: [
          { text: prompt },
          ...imagesBase64.map(data => ({
            inlineData: {
              mimeType: 'image/jpeg',
              data: data.split(',')[1] || data
            }
          }))
        ]
      }
    ],
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          status: { type: Type.STRING, enum: ['passed', 'warning', 'failed'] },
          feedback: { type: Type.STRING },
          detectedIssues: { type: Type.ARRAY, items: { type: Type.STRING } }
        },
        required: ['status', 'feedback', 'detectedIssues']
      }
    }
  });

  const result = JSON.parse(response.text || '{}');
  return {
    ...result,
    timestamp: new Date().toISOString()
  };
};

export const getAITechnicalAdvice = async (query: string, context: string): Promise<string> => {
  const ai = getAI();
  const response = await ai.models.generateContent({
    model: 'gemini-3-flash-preview',
    contents: `
      Ты — ЗОДЧИЙ AI, интеллектуальный помощник строителя.
      Твоя специализация: технические стандарты, СНиП, ГОСТ и технологии строительства.
      Контекст текущего проекта: ${context}
      
      Отвечай кратко, профессионально и по существу.
      Вопрос пользователя: ${query}
    `,
  });
  return response.text || "Извините, не удалось получить совет от ИИ.";
};
