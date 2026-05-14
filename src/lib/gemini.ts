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
      model: 'gemini-1.5-flash',
    })

    const chatHistory = [...history]
    if (context && chatHistory.length === 0) {
      chatHistory.push({
        role: 'user',
        parts: [{ text: `Instructions: ${context}\n\nPlease acknowledge and start the conversation.` }]
      }, {
        role: 'model',
        parts: [{ text: "I understand. I am ready to assist you in the Proofly workspace." }]
      })
    }

    const chat = model.startChat({
      history: chatHistory,
    })


    const result = await chat.sendMessage(prompt)
    const response = await result.response
    return response.text()
  } catch (error: any) {
    console.error('Gemini Error:', error)
    return `Error: ${error.message || 'Failed to get response from AI'}`
  }
}
