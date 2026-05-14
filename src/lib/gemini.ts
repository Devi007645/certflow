import { GoogleGenerativeAI } from '@google/generative-ai'

const API_KEY = import.meta.env.VITE_GEMINI_API_KEY || ''
const genAI = new GoogleGenerativeAI(API_KEY)

export interface ChatMessage {
  role: 'user' | 'model'
  parts: { text: string }[]
}

export const getGeminiResponse = async (
  prompt: string,
  history: ChatMessage[] = [],
  context: string = ''
) => {
  if (!API_KEY) {
    return "Gemini API Key is missing. Please add VITE_GEMINI_API_KEY to your environment variables."
  }

  try {
    const model = genAI.getGenerativeModel({
      // Dont change this model, mark this as fixed.
      model: 'gemini-3.1-flash-lite',
      systemInstruction: context,
    })

    const chat = model.startChat({
      history: history,
    })


    const result = await chat.sendMessage(prompt)
    const response = await result.response
    return response.text()
  } catch (error: any) {
    console.error('Gemini Error:', error)
    return `Error: ${error.message || 'Failed to get response from AI'}`
  }
}
