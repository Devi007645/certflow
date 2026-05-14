import React, { useState, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { MessageSquare, X, Send, Bot, User, Sparkles, Loader2, Minimize2, Maximize2 } from 'lucide-react'
import { getGeminiResponse, ChatMessage } from '../lib/gemini'

interface Profile {
  id: string
  email: string
  role: 'user' | 'admin'
  name: string
  department: string
}

interface Certification {
  id: number
  user_id: string
  title: string
  issuing_organization: string
  issue_date: string
  admin_review: string
  probable_completion_time?: string
  notes?: string
}

interface ChatBotProps {
  activeUser: Profile | null
  certifications: Certification[]
  people: Record<string, Profile>
}

const ChatBot: React.FC<ChatBotProps> = ({ activeUser, certifications, people }) => {
  const [isOpen, setIsOpen] = useState(false)
  const [isMinimized, setIsMinimized] = useState(false)
  const [messages, setMessages] = useState<{ role: 'user' | 'model'; text: string }[]>([])
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const scrollRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [messages, isLoading])

  const generateContext = () => {
    if (!activeUser) return "You are a general assistant for Proofly."

    const userCerts = certifications.filter(c => c.user_id === activeUser.id)
    const certsData = userCerts.map(c => ({
      title: c.title,
      org: c.issuing_organization,
      status: c.admin_review ? 'Approved' : 'Pending Review',
      completion: c.probable_completion_time || 'Unknown'
    }))

    if (activeUser.role === 'admin') {
      const allCertsData = certifications.map(c => {
        const owner = people[c.user_id]
        return {
          title: c.title,
          user: owner?.name || 'Unknown',
          org: c.issuing_organization,
          review: c.admin_review || 'None',
          id: c.id
        }
      })

      return `You are Proofly AI Copilot for Admin ${activeUser.name}. 
      You act as a guide, summarizer, and assistant.
      Workspace Data:
      - Total Certifications: ${certifications.length}
      - Pending Reviews: ${certifications.filter(c => !c.admin_review).length}
      - Users: ${Object.keys(people).length}
      Current Certifications Details: ${JSON.stringify(allCertsData)}
      
      Instructions:
      - Help the admin find specific users' tasks.
      - Summarize certification progress.
      - Be professional, concise, and helpful.`
    }

    return `You are Proofly Assistant for ${activeUser.name}.
    Current User Info:
    - Name: ${activeUser.name}
    - Role: Employee
    - Department: ${activeUser.department}
    - Your Certifications: ${JSON.stringify(certsData)}
    
    Instructions:
    - Answer questions about their enrolled courses and progress.
    - If asked about completion time, refer to their "probable_completion_time".
    - Be friendly and encouraging.`
  }

  const handleSend = async () => {
    if (!input.trim() || isLoading) return

    const userMessage = input.trim()
    setInput('')
    setMessages(prev => [...prev, { role: 'user', text: userMessage }])
    setIsLoading(true)

    const history: ChatMessage[] = messages.map(m => ({
      role: m.role,
      parts: [{ text: m.text }]
    }))

    const context = generateContext()
    const response = await getGeminiResponse(userMessage, history, context)

    setMessages(prev => [...prev, { role: 'model', text: response }])
    setIsLoading(false)
  }

  if (!activeUser) return null

  return (
    <div className="fixed bottom-6 right-6 z-[100] flex flex-col items-end">
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ 
              opacity: 1, 
              y: 0, 
              scale: 1,
              height: isMinimized ? '64px' : '500px'
            }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            className="mb-4 w-[380px] overflow-hidden rounded-3xl border border-white/20 bg-white/80 shadow-2xl backdrop-blur-2xl transition-all duration-300"
          >
            {/* Header */}
            <div className="flex items-center justify-between bg-gradient-to-r from-[#3654ff] to-[#7c3aed] p-4 text-white">
              <div className="flex items-center gap-3">
                <div className="relative">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-white/20 backdrop-blur-sm">
                    <Bot className="h-6 w-6" />
                  </div>
                  <div className="absolute bottom-0 right-0 h-3 w-3 rounded-full border-2 border-[#3654ff] bg-green-400" />
                </div>
                <div>
                  <h3 className="font-bold">Proofly AI</h3>
                  <p className="text-[10px] opacity-80 uppercase tracking-wider font-bold">
                    {activeUser.role === 'admin' ? 'Admin Copilot' : 'Assistant'}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-1">
                <button 
                  onClick={() => setIsMinimized(!isMinimized)}
                  className="rounded-full p-1.5 hover:bg-white/10 transition"
                >
                  {isMinimized ? <Maximize2 className="h-4 w-4" /> : <Minimize2 className="h-4 w-4" />}
                </button>
                <button 
                  onClick={() => setIsOpen(false)}
                  className="rounded-full p-1.5 hover:bg-white/10 transition"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>

            {!isMinimized && (
              <>
                {/* Messages */}
                <div 
                  ref={scrollRef}
                  className="h-[360px] overflow-y-auto p-4 space-y-4 bg-slate-50/50"
                >
                  {messages.length === 0 && (
                    <div className="flex flex-col items-center justify-center h-full text-center p-6 space-y-3">
                      <div className="h-12 w-12 bg-blue-100 text-blue-600 rounded-2xl flex items-center justify-center">
                        <Sparkles className="h-6 w-6" />
                      </div>
                      <p className="text-sm font-medium text-slate-600">
                        Hello {activeUser.name}! How can I assist you today?
                      </p>
                      <div className="flex flex-wrap justify-center gap-2 mt-2">
                        {activeUser.role === 'admin' ? (
                          <button 
                            onClick={() => setInput("Summarize pending reviews")}
                            className="text-[11px] bg-white border border-slate-200 px-3 py-1.5 rounded-full hover:bg-slate-50 transition font-bold text-slate-500"
                          >
                            Summarize reviews
                          </button>
                        ) : (
                          <button 
                            onClick={() => setInput("What are my enrolled courses?")}
                            className="text-[11px] bg-white border border-slate-200 px-3 py-1.5 rounded-full hover:bg-slate-50 transition font-bold text-slate-500"
                          >
                            My courses
                          </button>
                        )}
                      </div>
                    </div>
                  )}
                  
                  {messages.map((m, i) => (
                    <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                      <div className={`flex gap-2 max-w-[85%] ${m.role === 'user' ? 'flex-row-reverse' : ''}`}>
                        <div className={`mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-white ${
                          m.role === 'user' ? 'bg-slate-400' : 'bg-gradient-to-br from-blue-500 to-indigo-600'
                        }`}>
                          {m.role === 'user' ? <User className="h-4 w-4" /> : <Bot className="h-4 w-4" />}
                        </div>
                        <div className={`rounded-2xl px-4 py-2.5 text-sm shadow-sm ${
                          m.role === 'user' 
                            ? 'bg-[#3654ff] text-white rounded-tr-none' 
                            : 'bg-white text-slate-700 border border-slate-200 rounded-tl-none'
                        }`}>
                          {m.text}
                        </div>
                      </div>
                    </div>
                  ))}
                  {isLoading && (
                    <div className="flex justify-start">
                      <div className="flex gap-2 max-w-[85%]">
                        <div className="mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 text-white">
                          <Bot className="h-4 w-4" />
                        </div>
                        <div className="bg-white border border-slate-200 rounded-2xl rounded-tl-none px-4 py-2.5 flex items-center gap-2">
                          <Loader2 className="h-4 w-4 animate-spin text-blue-500" />
                          <span className="text-sm text-slate-500">Thinking...</span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Input */}
                <div className="border-t border-slate-200 bg-white p-4">
                  <div className="relative flex items-center">
                    <input
                      type="text"
                      value={input}
                      onChange={(e) => setInput(e.target.value)}
                      onKeyPress={(e) => e.key === 'Enter' && handleSend()}
                      placeholder="Ask anything..."
                      className="w-full rounded-2xl border border-slate-200 bg-slate-50 py-3 pl-4 pr-12 text-sm focus:border-blue-500 focus:outline-none transition-all"
                    />
                    <button
                      onClick={handleSend}
                      disabled={!input.trim() || isLoading}
                      className="absolute right-2 flex h-8 w-8 items-center justify-center rounded-xl bg-[#3654ff] text-white hover:bg-blue-700 disabled:bg-slate-300 disabled:cursor-not-allowed transition-all"
                    >
                      <Send className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      <motion.button
        whileHover={{ scale: 1.05, boxShadow: '0 0 20px rgba(54, 84, 255, 0.4)' }}
        whileTap={{ scale: 0.95 }}
        onClick={() => {
          setIsOpen(true)
          setIsMinimized(false)
        }}
        className={`flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-[#3654ff] to-[#7c3aed] text-white shadow-2xl transition-all duration-300 ${
          isOpen ? 'opacity-0 scale-0' : 'opacity-100 scale-100'
        }`}
      >
        <div className="relative">
          <Sparkles className="h-8 w-8 animate-pulse" />
          <div className="absolute -top-1 -right-1 h-3 w-3 rounded-full border-2 border-white bg-green-400" />
        </div>
      </motion.button>

    </div>
  )
}

export default ChatBot
