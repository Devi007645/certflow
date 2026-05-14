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
      scrollRef.current.scrollTo({
        top: scrollRef.current.scrollHeight,
        behavior: 'smooth'
      })
    }
  }, [messages, isLoading])

  const generateContext = () => {
    if (!activeUser) return "You are a general assistant for Proofly."

    const allPeople = Object.values(people);
    const adminIds = allPeople.filter(p => p.role === 'admin').map(p => p.id);
    
    // For employees, they can see teammates' certs but not admin certs
    const visibleCerts = activeUser.role === 'admin' 
      ? certifications 
      : certifications.filter(c => !adminIds.includes(c.user_id));

    const certsData = visibleCerts.map(c => {
      const owner = people[c.user_id];
      return {
        title: c.title,
        owner: owner?.name || 'Unknown',
        org: c.issuing_organization,
        status: c.admin_review ? 'Approved' : 'Pending Review',
        completion: c.probable_completion_time || 'N/A',
        isMine: c.user_id === activeUser.id
      };
    });

    return `
      You are Proofly AI, a highly proficient workspace assistant.
      User: ${activeUser.name} (${activeUser.role})
      Department: ${activeUser.department}
      
      ROLE-SPECIFIC INSTRUCTIONS:
      ${activeUser.role === 'admin' 
        ? "You are the Admin Copilot. Act as a 'second hand' to manage tasks, summarize data, and assist with reviews. You have access to all data." 
        : "You are the Employee Assistant. Help the user track their progress and see what teammates are working on. You can see teammate certifications but not admin tasks."}
      
      STRICT CONSTRAINTS:
      - Responses MUST be very brief (maximum 2-3 lines). Be direct and concise.
      - If asked where to see teammates' certifications or progress, tell them: "It's listed at the end of the dashboard page."
      - Maintain a premium, professional, and helpful tone.
      - Never reveal any data about admin-specific certifications to non-admin users.
      
      WORKSPACE DATA:
      - Visible records: ${certsData.length}
      - Teammates: ${allPeople.filter(p => p.role === 'user' && p.id !== activeUser.id).map(p => p.name).join(', ')}
      - Data: ${JSON.stringify(certsData)}
    `;
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
            layout
            initial={{ opacity: 0, y: 50, scale: 0.9, filter: 'blur(10px)' }}
            animate={{ 
              opacity: 1, 
              y: 0, 
              scale: 1,
              filter: 'blur(0px)',
              height: isMinimized ? '80px' : '520px',
              width: '400px'
            }}
            exit={{ opacity: 0, y: 50, scale: 0.9, filter: 'blur(10px)' }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="mb-4 overflow-hidden rounded-[2.5rem] border border-white/40 bg-white/70 shadow-[0_20px_50px_rgba(0,0,0,0.15)] backdrop-blur-3xl"
          >
            {/* Header */}
            <div className="flex items-center justify-between bg-gradient-to-r from-[#3654ff] to-[#7c3aed] p-5 text-white shadow-lg">
              <div className="flex items-center gap-3">
                <div className="relative">
                  <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white/20 backdrop-blur-md shadow-inner">
                    <Bot className="h-6 w-6" />
                  </div>
                  <div className="absolute -bottom-1 -right-1 h-3.5 w-3.5 rounded-full border-2 border-[#4158f6] bg-green-400 shadow-sm" />
                </div>
                <div>
                  <h3 className="text-sm font-bold tracking-tight">Proofly Copilot</h3>
                  <div className="flex items-center gap-1.5">
                    <div className="h-1.5 w-1.5 rounded-full bg-white/60 animate-pulse" />
                    <p className="text-[10px] font-black uppercase tracking-widest text-white/80">
                      {activeUser.role === 'admin' ? 'Admin Intelligence' : 'Workspace Guide'}
                    </p>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-1">
                <button 
                  onClick={() => setIsMinimized(!isMinimized)}
                  className="rounded-xl p-2 hover:bg-white/20 transition-all active:scale-90"
                >
                  {isMinimized ? <Maximize2 className="h-4 w-4" /> : <Minimize2 className="h-4 w-4" />}
                </button>
                <button 
                  onClick={() => setIsOpen(false)}
                  className="rounded-xl p-2 hover:bg-red-500/80 transition-all active:scale-90"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>

            {!isMinimized && (
              <div className="flex flex-col h-[440px]">
                {/* Messages Container */}
                <div 
                  ref={scrollRef}
                  className="flex-1 overflow-y-auto p-5 space-y-6 scrollbar-thin scrollbar-thumb-slate-200"
                >
                  {messages.length === 0 && (
                    <motion.div 
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="flex flex-col items-center justify-center h-full text-center space-y-4 px-4"
                    >
                      <div className="h-16 w-16 bg-gradient-to-br from-blue-50 to-indigo-50 text-blue-600 rounded-[2rem] flex items-center justify-center shadow-sm border border-blue-100">
                        <Sparkles className="h-8 w-8 text-blue-500 animate-pulse" />
                      </div>
                      <div>
                        <p className="text-base font-bold text-slate-800">
                          How can I help you, {activeUser.name.split(' ')[0]}?
                        </p>
                        <p className="text-xs text-slate-500 mt-1 font-medium">
                          Ask about certifications, teammates, or progress.
                        </p>
                      </div>
                      <div className="flex flex-wrap justify-center gap-2 pt-2">
                        {activeUser.role === 'admin' ? (
                          <button 
                            onClick={() => setInput("Summarize pending reviews")}
                            className="group flex items-center gap-2 text-[11px] bg-white border border-slate-200 px-4 py-2 rounded-2xl hover:border-blue-300 hover:text-blue-600 transition-all font-bold text-slate-600 shadow-sm"
                          >
                            <Loader2 className="h-3 w-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                            Summarize reviews
                          </button>
                        ) : (
                          <button 
                            onClick={() => setInput("What are my current certifications?")}
                            className="group flex items-center gap-2 text-[11px] bg-white border border-slate-200 px-4 py-2 rounded-2xl hover:border-blue-300 hover:text-blue-600 transition-all font-bold text-slate-600 shadow-sm"
                          >
                            <Sparkles className="h-3 w-3 text-blue-400" />
                            My progress
                          </button>
                        )}
                        <button 
                          onClick={() => setInput("Where can I see my teammates' work?")}
                          className="text-[11px] bg-white border border-slate-200 px-4 py-2 rounded-2xl hover:border-blue-300 hover:text-blue-600 transition-all font-bold text-slate-600 shadow-sm"
                        >
                          Team activity
                        </button>
                      </div>
                    </motion.div>
                  )}
                  
                  {messages.map((m, i) => (
                    <motion.div 
                      key={i}
                      initial={{ opacity: 0, x: m.role === 'user' ? 20 : -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}
                    >
                      <div className={`flex gap-3 max-w-[85%] ${m.role === 'user' ? 'flex-row-reverse' : ''}`}>
                        <div className={`mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-xl text-white shadow-md transition-transform hover:scale-110 ${
                          m.role === 'user' ? 'bg-slate-800' : 'bg-gradient-to-br from-[#3654ff] to-[#7c3aed]'
                        }`}>
                          {m.role === 'user' ? <User className="h-4 w-4" /> : <Bot className="h-4 w-4" />}
                        </div>
                        <div className={`relative rounded-[1.5rem] px-4 py-3 text-sm font-medium leading-relaxed shadow-sm ${
                          m.role === 'user' 
                            ? 'bg-[#3654ff] text-white rounded-tr-none' 
                            : 'bg-white text-slate-700 border border-slate-100 rounded-tl-none'
                        }`}>
                          {m.text}
                          {m.role === 'model' && (
                            <div className="absolute -left-1 top-2 h-2 w-2 rotate-45 border-l border-t border-slate-100 bg-white" />
                          )}
                        </div>
                      </div>
                    </motion.div>
                  ))}
                  {isLoading && (
                    <motion.div 
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      className="flex justify-start"
                    >
                      <div className="flex gap-3 max-w-[85%]">
                        <div className="mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-[#3654ff] to-[#7c3aed] text-white shadow-md">
                          <Bot className="h-4 w-4" />
                        </div>
                        <div className="bg-white/80 border border-slate-100 rounded-[1.5rem] rounded-tl-none px-5 py-3 flex items-center gap-3 shadow-sm backdrop-blur-sm">
                          <div className="flex gap-1">
                            <motion.div animate={{ scale: [1, 1.5, 1] }} transition={{ repeat: Infinity, duration: 1 }} className="h-1.5 w-1.5 rounded-full bg-blue-400" />
                            <motion.div animate={{ scale: [1, 1.5, 1] }} transition={{ repeat: Infinity, duration: 1, delay: 0.2 }} className="h-1.5 w-1.5 rounded-full bg-indigo-400" />
                            <motion.div animate={{ scale: [1, 1.5, 1] }} transition={{ repeat: Infinity, duration: 1, delay: 0.4 }} className="h-1.5 w-1.5 rounded-full bg-purple-400" />
                          </div>
                          <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">Processing</span>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </div>

                {/* Input Area */}
                <div className="p-5 bg-white/50 backdrop-blur-md border-t border-slate-100">
                  <div className="relative flex items-center">
                    <input
                      type="text"
                      value={input}
                      onChange={(e) => setInput(e.target.value)}
                      onKeyPress={(e) => e.key === 'Enter' && handleSend()}
                      placeholder="Ask copilot..."
                      className="w-full rounded-2xl border border-slate-200 bg-white/80 py-4 pl-5 pr-14 text-sm font-medium focus:border-[#3654ff] focus:ring-2 focus:ring-[#3654ff]/10 focus:outline-none transition-all shadow-inner"
                    />
                    <motion.button
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={handleSend}
                      disabled={!input.trim() || isLoading}
                      className="absolute right-2.5 flex h-10 w-10 items-center justify-center rounded-xl bg-[#3654ff] text-white hover:bg-blue-700 disabled:bg-slate-200 disabled:text-slate-400 disabled:cursor-not-allowed transition-all shadow-md"
                    >
                      <Send className="h-4 w-4" />
                    </motion.button>
                  </div>
                  <p className="text-[10px] text-center text-slate-400 mt-3 font-bold uppercase tracking-tighter">
                    Powered by Proofly AI • Gemini 1.5 Flash
                  </p>
                </div>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      <motion.button
        layout
        whileHover={{ 
          scale: 1.1, 
          rotate: 5,
          boxShadow: '0 20px 40px rgba(54, 84, 255, 0.4)' 
        }}
        whileTap={{ scale: 0.9 }}
        onClick={() => {
          setIsOpen(true)
          setIsMinimized(false)
        }}
        className={`group relative flex h-16 w-16 items-center justify-center rounded-[1.8rem] bg-gradient-to-br from-[#3654ff] via-[#5d75ff] to-[#7c3aed] text-white shadow-[0_10px_30px_rgba(54,84,255,0.3)] transition-all duration-500 ${
          isOpen ? 'opacity-0 scale-0 rotate-90' : 'opacity-100 scale-100 rotate-0'
        }`}
      >
        <div className="absolute inset-0 rounded-[1.8rem] bg-white/20 opacity-0 group-hover:opacity-100 transition-opacity blur-md" />
        <div className="relative">
          <Sparkles className="h-8 w-8 transition-all group-hover:scale-110" />
          <div className="absolute -top-1 -right-1 h-4 w-4 rounded-full border-2 border-[#3654ff] bg-green-400 shadow-sm" />
        </div>
      </motion.button>
    </div>
  )
}

export default ChatBot
