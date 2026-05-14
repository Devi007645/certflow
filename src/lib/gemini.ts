import { GoogleGenerativeAI } from '@google/generative-ai'

const API_KEY = import.meta.env.VITE_GEMINI_API_KEY || ''
const genAI = new GoogleGenerativeAI(API_KEY)

export interface ChatMessage {
  role: 'user' | 'model'
  parts: { text: string }[]
}

export const getGeminiStreamResponse = async (
  prompt: string,
  history: ChatMessage[] = [],
  context: string = '',
  onChunk: (text: string) => void
) => {
  if (!API_KEY) {
    onChunk("Gemini API Key is missing. Please add VITE_GEMINI_API_KEY to your environment variables.")
    return
  }

  try {
    const model = genAI.getGenerativeModel({
      model: 'gemini-3.1-flash-lite', // Dont change this model
      systemInstruction: context,
    })

    const chat = model.startChat({
      history: history,
    })

    const result = await chat.sendMessageStream(prompt)
    let fullText = ''
    for await (const chunk of result.stream) {
      const chunkText = chunk.text()
      fullText += chunkText
      onChunk(fullText)
    }
  } catch (error: any) {
    console.error('Gemini Error:', error)
    onChunk(`Error: ${error.message || 'Failed to get response from AI'}`)
  }
}

