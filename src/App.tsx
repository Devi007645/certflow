import { useMemo, useState, useEffect, useCallback, type ReactNode } from 'react'
import { z } from 'zod'
import {
  BadgeCheck,
  Bell,
  CalendarDays,
  CheckCircle2,
  ChevronRight,
  ClipboardCheck,
  Download,
  Eye,
  EyeOff,
  FileCheck2,
  FileText,
  FolderOpen,
  KeyRound,
  LayoutDashboard,
  LockKeyhole,
  LogIn,
  MessageSquareText,
  Plus,
  RefreshCw,
  Search,
  ShieldCheck,
  UploadCloud,
  UsersRound,
  X,
  Trash2,
  Pencil,
  TrendingUp,
  Activity,
  Award,
} from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { supabase } from './lib/supabase'
import { useFormStore } from './store/useFormStore'
import { useRealtimeForm } from './hooks/useRealtimeForm'
import { useCertifications, useCreateCertification, useUpdateCertification, useDeleteCertification } from './queries/useCertifications'
import { useRealtimeSync } from './hooks/useRealtimeSync'
import { useAuthStore } from './store/useAuthStore'
import { useDashboardStore } from './store/useDashboardStore'
import { HydrationManager } from './components/HydrationManager'
import { useOfflineSync } from './hooks/useOfflineSync'
import './App.css'
import ChatBot from './components/ChatBot'


type Role = 'user' | 'admin'
type Screen = 'landing' | 'login' | 'signup' | 'user' | 'admin'

type Profile = {
  id: string
  email: string
  role: Role
  name: string
  department: string
}

type Certification = {
  id: number
  user_id: string
  title: string
  issuing_organization: string
  issue_date: string
  file_url: string
  fileName: string
  admin_review: string
  created_at: string
  probable_completion_time?: string
  notes?: string
  emoji?: string
  tags?: string[]
  progress?: number
}

const formatDate = (dateStr: string | undefined) => {
  if (!dateStr) return 'N/A';
  try {
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return dateStr;
    return date.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
  } catch (e) {
    return dateStr;
  }
}

const adminUser: Profile = {
  id: 'adm_1Root',
  email: 'admin@proofly.app',
  role: 'admin',
  name: 'Avery Morgan',
  department: 'People Operations',
}

const people: Record<string, Profile> = {
  [adminUser.id]: adminUser,
}

const seededCertifications: Certification[] = []

const certSchema = z.object({
  title: z.string().min(3, 'Title must be at least 3 characters'),
  issuing_organization: z.string().min(2, 'Organization is required'),
  issue_date: z.string().min(1, 'Issue date is required'),
  fileName: z.string().optional(),
  probable_completion_time: z.string().optional(),
  progress: z.number().min(0).max(100).optional(),
})

function App() {
  const { screen, setScreen, activeUser, setActiveUser, logout } = useAuthStore()
  const { 
    searchQuery: query, 
    setSearchQuery: setQuery, 
    modalState, 
    setModalOpen,
    scrollPositions,
    setScrollPosition 
  } = useDashboardStore()
  
  const [isTransitioning, setIsTransitioning] = useState(false)
  const [isScrolled, setIsScrolled] = useState(false)
  const { data: certifications = [], refetch, isFetching } = useCertifications()

  const navigateTo = (targetScreen: Screen) => {
    setIsTransitioning(true)
    setTimeout(() => {
      setScreen(targetScreen)
      setIsTransitioning(false)
    }, 800)
  }
  const createCertificationMutation = useCreateCertification()
  const updateCertificationMutation = useUpdateCertification()
  const deleteCertificationMutation = useDeleteCertification()
  const [peopleState, setPeopleState] = useState<Record<string, Profile>>(people)
  
  const isModalOpen = modalState['add-certification'] || false
  const setIsModalOpen = (open: boolean) => setModalOpen('add-certification', open)
  
  const [selectedCert, setSelectedCert] = useState<Certification | null>(null)
  const [reviewText, setReviewText] = useState('')
  const [emoji, setEmoji] = useState('')
  const [editingCert, setEditingCert] = useState<Certification | null>(null)

  const { form, updateForm: setForm } = useRealtimeForm(activeUser?.id)
  const saveStatus = useFormStore((state) => state.saveStatus)
  const resetForm = useFormStore((state) => state.resetForm)

  const [viewingCert, setViewingCert] = useState<Certification | null>(null)
  const [formError, setFormError] = useState('')

  // Scroll restoration
  useEffect(() => {
    const handleScroll = (e: Event) => {
      const target = e.target as HTMLElement
      if (target && target.scrollTop !== undefined) {
        setScrollPosition(screen, target.scrollTop)
        setIsScrolled(target.scrollTop > 10)
      }
    }
    
    const mainElement = document.querySelector('main')
    if (mainElement) {
      mainElement.addEventListener('scroll', handleScroll)
      // Restore scroll
      if (scrollPositions[screen]) {
        mainElement.scrollTop = scrollPositions[screen]
        setIsScrolled(mainElement.scrollTop > 10)
      } else {
        setIsScrolled(false)
      }
    }
    
    return () => mainElement?.removeEventListener('scroll', handleScroll)
  }, [screen, setScrollPosition, scrollPositions])

  const handleDeleteCertification = async (id: number) => {
    if (window.confirm('Are you sure you want to delete this certification?')) {
      try {
        await deleteCertificationMutation.mutateAsync(id)
      } catch (error) {
        console.error("Error deleting certification:", error)
      }
    }
  }

  const handleEditCertification = (cert: Certification) => {
    setEditingCert(cert)
    setForm({
      title: cert.title,
      issuing_organization: cert.issuing_organization,
      issue_date: cert.issue_date,
      fileName: cert.fileName || '',
      fileData: cert.file_url || '',
      probable_completion_time: cert.probable_completion_time || '',
      tags: cert.tags || [],
      progress: cert.progress || 0,
    })
    setIsModalOpen(true)
  }

  // Initialize realtime sync
  useRealtimeSync()

  const fetchData = useCallback(async () => {
    try {
      const { data: employeesData, error: employeesError } = await supabase
        .from('employees')
        .select('*')
      const { data: adminsData, error: adminsError } = await supabase
        .from('admins')
        .select('*')

      if (employeesError) console.error("Error fetching employees:", employeesError)
      if (adminsError) console.error("Error fetching admins:", adminsError)

      const profilesMap: Record<string, Profile> = {}

      if (employeesData) {
        employeesData.forEach((profile: any) => {
          profilesMap[profile.id] = {
            id: profile.id,
            email: profile.email,
            role: 'user',
            name: profile.name,
            department: profile.department || 'General',
          }
        })
      }

      if (adminsData) {
        adminsData.forEach((profile: any) => {
          profilesMap[profile.id] = {
            id: profile.id,
            email: profile.email,
            role: 'admin',
            name: profile.name,
            department: profile.department || 'General',
          }
        })
      }

      // Ensure default admin is always there
      profilesMap[adminUser.id] = adminUser
      setPeopleState(profilesMap)

    } catch (err) {
      console.error("Failed to fetch data:", err)
    }
  }, [])

  useEffect(() => {
    fetchData()

    const channel = supabase
      .channel('public:employees')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'employees' },
        (payload) => {
          console.log('Realtime employee change received:', payload)
          fetchData()
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [fetchData])

  useEffect(() => {
    fetchData()
  }, [certifications, fetchData])

  const handleRefresh = async () => {
    await refetch()
    await fetchData()
  }

  const myCertifications = activeUser ? certifications.filter((cert) => cert.user_id === activeUser.id) : []
  const reviewedCount = certifications.filter((cert) => cert.admin_review).length
  const pendingCount = certifications.length - reviewedCount

  const filteredCertifications = useMemo(() => {
    const normalized = query.toLowerCase().trim()
    return certifications.filter((cert) => {
      const person = peopleState[cert.user_id]
      return [cert.title, cert.issuing_organization, person?.name, person?.email, person?.department, cert.admin_review]
        .filter(Boolean)
        .some((field) => field!.toLowerCase().includes(normalized))
    })
  }, [certifications, query, peopleState])

  const openDashboard = (user: Profile) => {
    setActiveUser(user)
    navigateTo(user.role === 'admin' ? 'admin' : 'user')
  }

  const handleLogin = (email: string) => {
    if (email === adminUser.email) {
      openDashboard(adminUser)
      return null
    }
    const found = Object.values(peopleState).find(p => p.email === email)
    if (found) {
      openDashboard(found)
      return null
    }
    return "User not found. Please sign up."
  }

  const handleSignup = async (user: Profile) => {
    setPeopleState(prev => ({ ...prev, [user.id]: user }))
    return null
  }

  const handleAddCertification = async () => {
    const parsed = certSchema.safeParse(form)
    if (!parsed.success) {
      setFormError(parsed.error.issues[0]?.message ?? 'Please check the form')
      return
    }

    const isDuplicate = myCertifications.some(
      (cert) =>
        cert.title.toLowerCase() === form.title.toLowerCase() &&
        cert.issuing_organization.toLowerCase() === form.issuing_organization.toLowerCase() &&
        cert.id !== editingCert?.id
    )
    if (isDuplicate) {
      setFormError('You have already added this course from this organization.')
      return
    }

    const certData = {
      user_id: activeUser?.id ?? '',
      title: form.title,
      issuing_organization: form.issuing_organization,
      issue_date: form.issue_date,
      file_url: form.fileData || '',
      fileName: form.fileName,
      probable_completion_time: form.probable_completion_time,
      tags: form.tags,
      progress: form.progress || 0,
    }

    try {
      if (editingCert) {
        await updateCertificationMutation.mutateAsync({ id: editingCert.id, ...certData })
      } else {
        await createCertificationMutation.mutateAsync({ ...certData, admin_review: '', notes: '' })
      }
      resetForm()
      setFormError('')
      setIsModalOpen(false)
      setEditingCert(null)
    } catch (error: any) {
      setFormError(error.message)
    }
  }

  const handleSaveReview = async () => {
    if (!selectedCert) return

    const updates: any = {}
    if (activeUser?.role === 'admin') {
      updates.admin_review = reviewText.trim()
      updates.emoji = emoji
    } else {
      updates.notes = reviewText.trim()
    }

    try {
      await updateCertificationMutation.mutateAsync({ id: selectedCert.id, ...updates })
      setSelectedCert(null)
      setReviewText('')
      setEmoji('')
    } catch (error) {
      console.error("Error updating review:", error)
    }
  }

  const handleUploadDocument = async (certId: number, fileName: string, fileData: string) => {
    try {
      await updateCertificationMutation.mutateAsync({ id: certId, fileName, file_url: fileData })
    } catch (error) {
      console.error("Error uploading document:", error)
    }
  }

  const handleRemoveDocument = async (certId: number) => {
    try {
      await updateCertificationMutation.mutateAsync({ id: certId, fileName: '', file_url: '' })
    } catch (error) {
      console.error("Error removing document:", error)
    }
  }

  return (
    <main className="h-screen bg-[#f7f3ea] text-slate-950 overflow-y-auto">
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute -left-32 top-16 h-80 w-80 rounded-full bg-[#f7c948]/50 blur-3xl" />
        <div className="absolute right-0 top-0 h-[32rem] w-[32rem] rounded-full bg-[#3654ff]/35 blur-3xl" />
        <div className="absolute bottom-0 left-1/2 h-96 w-96 rounded-full bg-[#ef6f6c]/40 blur-3xl" />
        <div className="absolute top-1/4 left-1/3 h-64 w-64 rounded-full bg-[#a855f7]/25 blur-3xl" />
      </div>

      <header className={`sticky top-0 z-40 border-b border-slate-900/10 transition-all duration-300 ${isScrolled ? 'bg-[#f7f3ea]/70 backdrop-blur-md' : 'bg-[#f7f3ea]'}`}>
        <div className={`mx-auto flex max-w-7xl items-center justify-between px-4 transition-all duration-300 ${isScrolled ? 'py-3' : 'py-4'} sm:px-6 lg:px-8`}>
          <div className="flex items-center gap-4">
            <svg width="64" height="64" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg" className="shrink-0">
              <defs>
                <linearGradient id="brandGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                  <stop offset="0%" stopColor="#38bdf8" />
                  <stop offset="50%" stopColor="#2563eb" />
                  <stop offset="100%" stopColor="#7c3aed" />
                </linearGradient>
              </defs>
              {/* Ribbons */}
              <path d="M35 65 L25 90 L40 80 L50 90 L45 65 Z" fill="url(#brandGradient)" opacity="0.9" />
              <path d="M65 65 L75 90 L60 80 L50 90 L55 65 Z" fill="url(#brandGradient)" opacity="0.9" />
              {/* Badge */}
              <circle cx="50" cy="45" r="25" fill="url(#brandGradient)" />
              {/* Checkmark */}
              <path d="M40 45 L47 52 L62 35" stroke="white" strokeWidth="6" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            <span className="text-left">
              <span className="block text-2xl font-bold tracking-tight flex items-center">
                <span className="text-transparent bg-clip-text bg-gradient-to-br from-[#38bdf8] to-[#7c3aed]">P</span>
                <span>roofly</span>
              </span>
              <span className="block text-sm font-semibold text-slate-500">Credential review workspace</span>
            </span>

            {/* Status Indicators */}
            <div className="ml-4 flex items-center gap-2 text-xs font-bold">
              {saveStatus === 'saving' && (
                <span className="rounded-full bg-yellow-100 px-2 py-1 text-yellow-700 border border-yellow-300 flex items-center gap-1">
                  <UploadCloud className="h-3 w-3 animate-pulse" /> Saving...
                </span>
              )}
              {saveStatus === 'saved' && (
                <span className="rounded-full bg-blue-100 px-2 py-1 text-blue-700 border border-blue-300 flex items-center gap-1">
                  <CheckCircle2 className="h-3 w-3" /> Saved
                </span>
              )}
              {saveStatus === 'error' && (
                <span className="rounded-full bg-red-100 px-2 py-1 text-red-700 border border-red-300 flex items-center gap-1">
                  <X className="h-3 w-3" /> Save Error
                </span>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2">
            {activeUser && screen !== 'login' && screen !== 'signup' ? (
              <>
                <button onClick={() => {
                  logout();
                }} className="hidden rounded-full px-4 py-2 text-sm font-bold text-slate-700 hover:bg-white sm:inline-flex" title="Log out">Log out</button>
                <button onClick={() => navigateTo('signup')} className="rounded-full bg-[#3654ff] px-5 py-2.5 text-sm font-bold text-white shadow-sm hover:bg-[#2541d8] transition" title="Create a new account">Sign up</button>
              </>
            ) : (
              <>
                <button onClick={() => navigateTo('login')} className="hidden rounded-full px-4 py-2 text-sm font-bold text-slate-700 hover:bg-white sm:inline-flex" title="Log in to your account">Login</button>
                <button onClick={() => navigateTo('signup')} className="rounded-full bg-[#3654ff] px-5 py-2.5 text-sm font-bold text-white shadow-sm hover:bg-[#2541d8] transition" title="Create a new account">Sign up</button>
              </>
            )}
          </div>
        </div>
      </header>

      <HydrationManager 
        fallback={
          <div className="flex h-screen items-center justify-center bg-[#f7f3ea]">
            <LoadingOverlay />
          </div>
        }
      >
        <div className="relative z-10">
          {screen === 'landing' && <LandingPage onLogin={() => navigateTo('login')} onSignup={() => navigateTo('signup')} />}
          {(screen === 'login' || screen === 'signup') && <AuthPanel key={screen} mode={screen} onLogin={handleLogin} onSignup={handleSignup} onSwitchMode={(m) => navigateTo(m)} />}
          {screen === 'user' && activeUser && activeUser.role === 'user' && (
            <UserDashboard
              user={activeUser}
              certifications={myCertifications}
              allCertifications={certifications}
              people={peopleState}
              onAdd={() => setIsModalOpen(true)}
              onView={setViewingCert}
              onUpload={handleUploadDocument}
              onRemove={handleRemoveDocument}
              onRefresh={handleRefresh}
              isRefreshing={isFetching}
              onEdit={handleEditCertification}
              onDelete={handleDeleteCertification}
            />
          )}
          {screen === 'admin' && activeUser && activeUser.role === 'admin' && (
            <AdminDashboard
              admin={activeUser}
              certifications={certifications}
              people={peopleState}
              query={query}
              setQuery={setQuery}
              reviewedCount={certifications.filter(c => c.admin_review).length}
              pendingCount={certifications.filter(c => !c.admin_review).length}
              onReview={(cert) => {
                setSelectedCert(cert)
                setReviewText(activeUser.role === 'admin' ? cert.admin_review : (cert.notes || ''))
                setEmoji(cert.emoji || '')
              }}
              onView={setViewingCert}
              onRefresh={handleRefresh}
              isRefreshing={isFetching}
            />
          )}
        </div>
      </HydrationManager>

      {isModalOpen && (
        <AddCertificationDialog
          form={form}
          setForm={setForm}
          error={formError}
          onClose={() => {
            setIsModalOpen(false)
            setEditingCert(null)
            resetForm()
          }}
          onSubmit={handleAddCertification}
          isEdit={Boolean(editingCert)}
        />
      )}

      {selectedCert && (
        <ReviewDialog
          cert={selectedCert}
          reviewText={reviewText}
          setReviewText={setReviewText}
          emoji={emoji}
          setEmoji={setEmoji}
          onClose={() => {
            setSelectedCert(null)
            setEmoji('')
          }}
          onSave={handleSaveReview}
          people={peopleState}
          role={activeUser?.role}
          onView={setViewingCert}
        />
      )}
      {viewingCert && (
        <DocumentViewer
          cert={viewingCert}
          onClose={() => setViewingCert(null)}
          allowDownload={activeUser?.role === 'admin' || viewingCert.user_id === activeUser?.id}
          uploaderName={peopleState[viewingCert.user_id]?.name}
        />
      )}
      {isTransitioning && <LoadingOverlay />}
      <ChatBot activeUser={activeUser} certifications={certifications} people={peopleState} />
    </main>

  )
}

function LoadingOverlay() {
  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-[#f7f3ea]/90 backdrop-blur-sm">
      <div className="rounded-[1.5rem] border border-slate-200 bg-white p-6 shadow-lg flex flex-col items-center gap-4 max-w-sm w-full mx-4">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-slate-200 border-t-[#3654ff]"></div>
        <p className="text-sm font-bold text-slate-500">Loading...</p>
      </div>
    </div>
  )
}

function LandingPage({ onLogin, onSignup }: { onLogin: () => void; onSignup: () => void }) {
  return (
    <section className="mx-auto flex max-w-4xl flex-col items-center justify-center gap-10 px-4 py-12 sm:px-6 lg:px-8 lg:py-24 text-center">
      <div className="rounded-[2rem] border border-slate-200 bg-white p-8 shadow-sm lg:p-12 w-full">
        <div className="mb-8 inline-flex items-center gap-2 rounded-full border border-slate-950 bg-[#f7c948] px-4 py-2 text-sm font-bold mx-auto">
          <BadgeCheck className="h-4 w-4" /> Simple certificate tracking for teams
        </div>
        <h1 className="mx-auto max-w-3xl text-3xl font-bold leading-tight tracking-tight sm:text-4xl lg:text-5xl">
          Collect, review, and approve credentials in one clean place.
        </h1>
        <p className="mt-6 mx-auto max-w-2xl text-lg leading-8 text-slate-650">
          A friendly certification portal where employees submit credentials and administrators keep every document organized, searchable, and review-ready.
        </p>
        <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
          <button onClick={onSignup} className="inline-flex w-full sm:w-auto items-center justify-center gap-2 rounded-xl bg-[#3654ff] px-8 py-4 font-bold text-white shadow-sm hover:bg-[#2541d8] transition">
            Start now <ChevronRight className="h-5 w-5" />
          </button>
          <button onClick={onLogin} className="inline-flex w-full sm:w-auto items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-8 py-4 font-bold text-slate-700 shadow-sm hover:bg-slate-50 transition">
            <LogIn className="h-5 w-5" /> Login
          </button>
        </div>
      </div>
    </section>
  )
}

function AuthPanel({ mode, onLogin, onSignup, onSwitchMode }: { mode: 'login' | 'signup'; onLogin: (email: string) => string | null; onSignup: (user: Profile) => Promise<string | null>; onSwitchMode: (mode: 'login' | 'signup') => void }) {
  const [role, setRole] = useState<Role>('user')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [name, setName] = useState('')
  const [secretCode, setSecretCode] = useState('')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const passwordStrength = useMemo(() => {
    let score = 0;
    if (!password) return 0;
    if (password.length > 6) score++;
    if (password.length > 10) score++;
    if (/[A-Z]/.test(password) && /[a-z]/.test(password)) score++;
    if (/[0-9]/.test(password) || /[^A-Za-z0-9]/.test(password)) score++;
    return score;
  }, [password]);

  const handleSubmit = async () => {
    setError('')
    setSuccess('')
    if (!email) {
      setError('Email is required')
      return
    }

    const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/
    if (!emailRegex.test(email)) {
      setError('Please enter a valid enterprise email address')
      return
    }

    if (mode === 'signup' && passwordStrength < 2) {
      setError('Password is too weak')
      return
    }

    if (mode === 'signup') {
      if (!name) {
        setError('Name is required')
        return
      }
      if (role === 'admin' && secretCode !== 'BIPROS_@_ADMIN_123') {
        setError('Invalid admin secret code')
        return
      }

      const { data, error: authError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            name: name,
            department: 'General',
            role: role,
          }
        }
      })

      if (authError) {
        if (authError.message.includes('row-level security') || authError.message.includes('policy')) {
          setError("We couldn't create your account due to a setup issue. Please contact support.")
        } else {
          setError(authError.message)
        }
        return
      }

      if (data.user) {
        const newUser: Profile = {
          id: data.user.id,
          email,
          role,
          name,
          department: 'General',
        }
        const err = await onSignup(newUser)
        if (err) {
          setError(err)
        } else {
          setEmail('')
          setPassword('')
          setName('')
          setSecretCode('')
          onSwitchMode('login')
          setSuccess('Account created successfully. Please log in.')
        }
      }
    } else {
      if (email === 'admin@proofly.app') {
        const err = onLogin(email)
        if (err) setError(err)
      } else {
        const { data, error: authError } = await supabase.auth.signInWithPassword({
          email,
          password,
        })

        if (authError) {
          setError(authError.message)
          return
        }

        if (data.user) {
          const err = onLogin(email)
          if (err) setError(err)
        }
      }
    }
  }

  return (
    <section className="mx-auto max-w-4xl px-4 py-6 sm:py-14 sm:px-6 lg:px-8">
      <div className="grid overflow-hidden rounded-[2rem] border border-slate-200 bg-white shadow-sm md:grid-cols-[0.8fr_1.2fr]">
        <div className="bg-slate-950 p-8 text-white">
          <div className="grid h-14 w-14 place-items-center rounded-2xl bg-[#f7c948] text-slate-950"><KeyRound /></div>
          <h1 className="mt-8 text-2xl font-bold capitalize">{mode}</h1>
          <p className="mt-3 text-slate-300">
            {mode === 'login' ? 'Welcome back! Sign in to continue.' : 'Create an account to start tracking credentials.'}
          </p>
          <div className="mt-8 space-y-3 text-sm text-slate-300">
            <p className="flex gap-2"><CheckCircle2 className="h-5 w-5 text-[#f7c948]" /> Email and password access</p>
            <p className="flex gap-2"><CheckCircle2 className="h-5 w-5 text-[#f7c948]" /> Separate user and admin journeys</p>
            <p className="flex gap-2"><CheckCircle2 className="h-5 w-5 text-[#f7c948]" /> Review feedback saved per record</p>
          </div>
        </div>
        <div className="p-6 sm:p-8">
          <div className="grid gap-5">
            {success && <p className="rounded-2xl bg-green-100 px-4 py-3 text-sm font-bold text-green-800">{success}</p>}
            {error && <p className="rounded-2xl bg-red-100 px-4 py-3 text-sm font-bold text-red-700">{error}</p>}

            {mode === 'signup' && (
              <TextInput label="Full Name" value={name} onChange={setName} placeholder="e.g. Alex Morgan" />
            )}

            <TextInput label="Email" value={email} onChange={setEmail} type="email" placeholder="e.g. email@example.com" />
            <TextInput label="Password" value={password} onChange={setPassword} type="password" placeholder="••••••••••••" />

            {mode === 'signup' && (
              <div className="mt-1">
                <div className="flex gap-1 h-1">
                  {[1, 2, 3, 4].map((level) => (
                    <div
                      key={level}
                      className={`h-full flex-1 rounded-full ${passwordStrength >= level
                        ? level === 1
                          ? 'bg-red-500'
                          : level === 2
                            ? 'bg-orange-500'
                            : level === 3
                              ? 'bg-yellow-500'
                              : 'bg-green-500'
                        : 'bg-slate-200'
                        }`}
                    />
                  ))}
                </div>
                <div className="flex justify-between text-xs text-slate-500 mt-1">
                  <span>Password Strength</span>
                  <span className="font-bold">
                    {passwordStrength === 0 && 'None'}
                    {passwordStrength === 1 && 'Weak'}
                    {passwordStrength === 2 && 'Fair'}
                    {passwordStrength === 3 && 'Good'}
                    {passwordStrength === 4 && 'Strong'}
                  </span>
                </div>
              </div>
            )}

            {mode === 'signup' && (
              <div>
                <p className="mb-2 text-sm font-bold uppercase tracking-wide text-slate-500">Account Type</p>
                <div className="grid grid-cols-2 gap-3">
                  {(['user', 'admin'] as Role[]).map((item) => (
                    <button key={item} onClick={() => setRole(item)} className={`rounded-xl border px-4 py-4 font-bold capitalize transition ${role === item ? 'bg-[#3654ff] text-white border-[#3654ff]' : 'bg-[#f8fafc] text-slate-700 border-slate-200 hover:bg-slate-50'}`}>
                      {item}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {mode === 'signup' && role === 'admin' && (
              <TextInput label="Admin Secret Code" value={secretCode} onChange={setSecretCode} type="password" placeholder="Enter code..." />
            )}

            <button onClick={handleSubmit} className="mt-2 rounded-xl bg-[#3654ff] px-6 py-4 font-bold text-white shadow-sm hover:bg-[#2541d8] transition">
              {mode === 'login' ? 'Sign in' : 'Create account'}
            </button>

            <div className="text-center mt-2">
              <button
                onClick={() => onSwitchMode(mode === 'login' ? 'signup' : 'login')}
                className="text-sm font-bold text-slate-500 hover:text-slate-950"
              >
                {mode === 'login' ? "Don't have an account? Sign up" : "Already have an account? Log in"}
              </button>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

function TeamProgressDashboard({ allCertifications, people, user, onView }: { allCertifications: Certification[]; people: Record<string, Profile>; user: Profile; onView: (cert: Certification) => void }) {
  const teamData = useMemo(() => {
    const groups = allCertifications.reduce((acc, cert) => {
      if (cert.user_id !== user.id) {
        if (!acc[cert.user_id]) acc[cert.user_id] = []
        acc[cert.user_id].push(cert)
      }
      return acc
    }, {} as Record<string, Certification[]>)

    const activeMembersCount = Object.keys(groups).length
    return { groups, activeMembersCount }
  }, [allCertifications, user.id])

  if (teamData.activeMembersCount === 0) return null

  return (
    <div className="mt-12 rounded-[2rem] border border-slate-200 bg-white/80 p-8 shadow-sm backdrop-blur-sm">
      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-xl font-bold text-slate-900">Teammates Progress</h2>
          <p className="text-sm font-medium text-slate-500">Ongoing certification journeys across the team</p>
        </div>
        
        <div className="flex items-center gap-2 rounded-full bg-slate-100 px-3 py-1 text-[10px] font-bold text-slate-500 uppercase tracking-widest border border-slate-200 shadow-sm">
          <UsersRound className="h-3 w-3" />
          {teamData.activeMembersCount} Active Members
        </div>
      </div>

      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        <AnimatePresence mode="popLayout">
          {Object.entries(teamData.groups).map(([userId, certs], idx) => {
            const person = people[userId]
            
            return (
              <motion.div
                key={userId}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: idx * 0.05 }}
                className="flex flex-col rounded-3xl border border-slate-100 bg-[#f8fafc]/50 p-6 transition-all hover:border-[#3654ff]/30 hover:shadow-md"
              >
                <div className="mb-5 flex items-center gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-950 text-white font-bold text-base shadow-sm">
                    {person?.name?.[0]?.toUpperCase()}
                  </div>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-bold text-slate-900 leading-tight">{person?.name}</p>
                    <p className="truncate text-[10px] font-bold text-slate-400 uppercase tracking-wider">{person?.department || 'General'}</p>
                  </div>
                </div>

                <div className="space-y-3">
                  {certs.map((cert) => (
                    <div key={cert.id} className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm transition-colors hover:bg-slate-50">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0 flex-1">
                          <p className="text-[9px] font-black uppercase tracking-widest text-[#3654ff] mb-0.5">{cert.issuing_organization}</p>
                          <p className="text-xs font-bold text-slate-800 leading-snug" title={cert.title}>{cert.title}</p>
                          <div className="mt-2 flex items-center gap-1.5 text-[10px] font-medium text-slate-400">
                            <CalendarDays className="h-3 w-3" />
                            <span>Ends: {formatDate(cert.probable_completion_time)}</span>
                          </div>
                        </div>
                        {cert.fileName && (
                          <button 
                            onClick={() => onView(cert)}
                            className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-50 text-slate-400 transition-all hover:bg-[#3654ff]/10 hover:text-[#3654ff]"
                            title="View document"
                          >
                            <FileText className="h-4 w-4" />
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </motion.div>
            )
          })}
        </AnimatePresence>
      </div>
    </div>
  )
}

function UserDashboard({ user, certifications, allCertifications, people, onAdd, onView, onUpload, onRemove, onRefresh, isRefreshing, onEdit, onDelete }: { user: Profile; certifications: Certification[]; allCertifications: Certification[]; people: Record<string, Profile>; onAdd: () => void; onView: (cert: Certification) => void; onUpload: (certId: number, fileName: string, fileData: string) => void; onRemove: (certId: number) => void; onRefresh: () => void; isRefreshing: boolean; onEdit: (cert: Certification) => void; onDelete: (id: number) => void }) {
  return (
    <section className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
      <DashboardHeader
        icon={<LayoutDashboard />}
        eyebrow="Employee workspace"
        title={`Welcome back, ${user.name}`}
        subtitle={`${user.department} · ${user.email}`}
        action={
          <div className="flex items-center gap-3">
            <button onClick={onRefresh} className="inline-flex items-center justify-center h-12 w-12 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 shadow-sm transition" title="Refresh data">
              <RefreshCw className={`h-5 w-5 ${isRefreshing ? 'animate-spin' : ''}`} />
            </button>
            <button onClick={onAdd} className="inline-flex items-center gap-2 rounded-xl bg-[#3654ff] px-5 py-3 font-bold text-white shadow-sm hover:bg-[#2541d8] transition" title="Add certificate"><Plus className="h-5 w-5" /> Add certificate</button>
          </div>
        }
      />
      <div className="mt-8 grid gap-4 md:grid-cols-4">
        <StatCard icon={<FileText />} label="My submissions" value={certifications.length.toString()} />
        <StatCard icon={<CheckCircle2 />} label="Approved / reviewed" value={certifications.filter((cert) => cert.admin_review).length.toString()} />
        <StatCard icon={<CalendarDays />} label="Newest upload" value={certifications[0]?.created_at ? certifications[0].created_at.slice(0, 10) : 'None'} />
        <StatCard
          icon={<RefreshCw />}
          label="Next Completion"
          value={
            certifications
              .filter(c => c.probable_completion_time && !c.admin_review)
              .sort((a, b) => (a.probable_completion_time || '').localeCompare(b.probable_completion_time || ''))[0]?.probable_completion_time || 'None'
          }
        />
      </div>
      <div className={`${isRefreshing ? 'opacity-50 pointer-events-none' : ''} transition-opacity`}>
        <CertificationGrid certifications={certifications} onView={onView} onUpload={onUpload} onRemove={onRemove} onEdit={onEdit} onDelete={onDelete} />
      </div>

      <TeamProgressDashboard
        allCertifications={allCertifications}
        people={people}
        user={user}
        onView={onView}
      />
    </section>
  )
}

function AdminDashboard({ admin, certifications, people, query, setQuery, reviewedCount, pendingCount, onReview, onView, onRefresh, isRefreshing }: { admin: Profile; certifications: Certification[]; people: Record<string, Profile>; query: string; setQuery: (value: string) => void; reviewedCount: number; pendingCount: number; onReview: (cert: Certification) => void; onView: (cert: Certification) => void; onRefresh: () => void; isRefreshing: boolean }) {
  const groupedCerts = useMemo(() => {
    const groups: Record<string, Certification[]> = {}
    certifications.forEach(cert => {
      if (!groups[cert.user_id]) groups[cert.user_id] = []
      groups[cert.user_id].push(cert)
    })
    return groups
  }, [certifications])

  return (
    <section className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
      <DashboardHeader
        icon={<UsersRound />}
        eyebrow="Admin review center"
        title="Team certification queue"
        subtitle={`${admin.name} · ${admin.department}`}
        action={
          <div className="flex items-center gap-3">
            <button onClick={onRefresh} className="inline-flex items-center justify-center h-12 w-12 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 shadow-sm transition" title="Refresh data">
              <RefreshCw className={`h-5 w-5 ${isRefreshing ? 'animate-spin' : ''}`} />
            </button>
            <div className="inline-flex items-center gap-2 rounded-xl border border-yellow-200 bg-yellow-50 px-5 py-3 font-bold text-yellow-700"><Bell className="h-5 w-5" /> {pendingCount} pending</div>
          </div>
        }
      />
      <div className="mt-8 grid gap-4 md:grid-cols-4">
        <StatCard icon={<FolderOpen />} label="Visible records" value={certifications.length.toString()} />
        <StatCard icon={<MessageSquareText />} label="Reviews written" value={reviewedCount.toString()} />
        <StatCard icon={<UsersRound />} label="Total Users" value={Object.values(people).filter(p => p.role === 'user').length.toString()} />
        <StatCard
          icon={<Bell />}
          label="Pending completions"
          value={certifications.filter(c => c.probable_completion_time && !c.admin_review).length.toString()}
        />
      </div>
      <div className="mt-8 rounded-[2rem] border border-[#3654ff]/40 bg-white p-6 shadow-sm">
        <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-lg font-bold">Submissions</h2>
            <p className="text-sm font-medium text-slate-500">Search by employee, department, certificate, issuer, or feedback.</p>
          </div>
          <div className="relative w-full sm:max-w-md">
            <Search className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
            <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search records..." className="w-full rounded-2xl border-2 border-slate-200 bg-[#f8fafc] py-3 pl-12 pr-4 font-bold outline-none focus:border-[#3654ff]" />
          </div>
        </div>
        <div className={`grid gap-6 ${isRefreshing ? 'opacity-50 pointer-events-none' : ''} transition-opacity`}>
          {Object.entries(groupedCerts).map(([userId, certs]) => {
            const person = people[userId]
            return (
              <div key={userId} className="rounded-3xl border-2 border-slate-200 bg-[#f8fafc] p-5">
                <div className="flex gap-3 mb-4 items-center">
                  <div className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-slate-950 text-white font-bold text-xl">{person?.name?.[0]?.toUpperCase() || '?'}</div>
                  <div>
                    <p className="font-bold text-lg">{person?.name || 'Unknown User'}</p>
                    <p className="text-sm text-slate-500">{person?.department} · {person?.email}</p>
                  </div>
                  <span className="ml-auto rounded-full bg-[#3654ff]/10 px-3 py-1 text-xs font-bold text-[#3654ff] border border-[#3654ff]/20">
                    {certs.length} {certs.length === 1 ? 'Entry' : 'Entries'}
                  </span>
                </div>
                <div className="grid gap-3">
                  {certs.map((cert) => (
                    <article key={cert.id} className="grid gap-4 rounded-2xl border border-[#3654ff]/20 bg-white p-4 lg:grid-cols-[1.2fr_1fr_auto] lg:items-center">
                      <div>
                        <p className="font-bold">{cert.title}</p>
                        <p className="text-sm text-slate-500">{cert.issuing_organization} · Completion: {formatDate(cert.probable_completion_time)}</p>
                        {cert.tags && cert.tags.length > 0 && (
                          <div className="mt-1 flex flex-wrap gap-1">
                            {cert.tags.map((tag) => (
                              <span key={tag} className="inline-flex items-center rounded-full bg-green-100 px-2 py-1 text-xs font-bold text-green-800 border border-green-300">
                                <CheckCircle2 className="h-3 w-3 mr-1" />
                                {tag}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                      <div className="flex flex-wrap items-center gap-2 lg:justify-end">
                        <StatusPill reviewed={Boolean(cert.admin_review)} delayed={cert.probable_completion_time ? new Date().toISOString().slice(0, 10) > cert.probable_completion_time : false} />
                        {cert.fileName && (
                          <button onClick={() => onView(cert)} className="inline-flex items-center gap-1 rounded-full bg-white px-3 py-2 text-sm font-bold text-slate-700 border border-slate-200" title="View document">
                            <Eye className="h-4 w-4" /> View
                          </button>
                        )}
                        <button onClick={() => onReview(cert)} className="rounded-full bg-slate-950 px-4 py-2 text-sm font-bold text-white" title={cert.admin_review ? 'Edit review' : 'Review certificate'}>
                          {admin.role === 'admin' ? (cert.admin_review ? 'Edit Review' : 'Review') : 'Add Notes'}
                        </button>
                      </div>
                    </article>
                  ))}
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </section>
  )
}

function DashboardHeader({ icon, eyebrow, title, subtitle, action }: { icon: ReactNode; eyebrow: string; title: string; subtitle: string; action: ReactNode }) {
  return (
    <div className="rounded-[2rem] border border-[#3654ff]/40 bg-white p-6 shadow-sm">
      <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex items-center gap-4">
          <div className="grid h-16 w-16 place-items-center rounded-3xl bg-[#f7c948] text-slate-950">{icon}</div>
          <div>
            <p className="text-sm font-bold uppercase tracking-wide text-[#3654ff]">{eyebrow}</p>
            <h1 className="text-xl font-bold lg:text-2xl">{title}</h1>
            <p className="mt-1 font-medium text-slate-500">{subtitle}</p>
          </div>
        </div>
        {action}
      </div>
    </div>
  )
}

function StatCard({ icon, label, value }: { icon: ReactNode; label: string; value: string }) {
  return (
    <div className="bg-white rounded-[1.5rem] border border-[#3654ff]/40 p-5 shadow-sm hover:shadow-md transition-shadow">
      <div className="mb-4 grid h-11 w-11 place-items-center rounded-2xl bg-[#3654ff]/10 text-[#3654ff]">{icon}</div>
      <p className="text-xs font-bold uppercase tracking-wide text-slate-500">{label}</p>
      <p className="text-2xl font-bold text-slate-900">{value}</p>
    </div>
  )
}

function CertificationGrid({ certifications, onView, onUpload, onRemove, onEdit, onDelete }: { certifications: Certification[]; onView: (cert: Certification) => void; onUpload: (certId: number, fileName: string, fileData: string) => void; onRemove: (certId: number) => void; onEdit: (cert: Certification) => void; onDelete: (id: number) => void }) {

  const groupedByOrg = useMemo(() => {
    const groups: Record<string, Certification[]> = {}
    certifications.forEach(cert => {
      if (!groups[cert.issuing_organization]) groups[cert.issuing_organization] = []
      groups[cert.issuing_organization].push(cert)
    })
    return groups
  }, [certifications])

  return (
    <div className="mt-8 grid gap-6">
      {Object.entries(groupedByOrg).map(([org, certs]) => (
        <div key={org} className="rounded-3xl border-2 border-slate-200 bg-[#f8fafc] p-5">
          <div className="flex gap-3 mb-4 items-center">
            <div className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-slate-950 text-white"><FolderOpen className="h-5 w-5" /></div>
            <div>
              <p className="font-bold text-lg">{org}</p>
              <p className="text-sm text-slate-500">{certs.length} {certs.length === 1 ? 'Certificate' : 'Certificates'}</p>
            </div>
          </div>
          <div className="grid gap-3">
            {certs.map((cert) => {
              const isReviewed = Boolean(cert.admin_review);

              if (isReviewed) {
                return (
                  <article key={cert.id} className="grid gap-4 rounded-2xl border-2 border-slate-100 bg-white p-4 lg:grid-cols-[1.5fr_1fr_1.5fr_auto] lg:items-center">
                    <div>
                      <p className="text-xs font-bold uppercase tracking-wide text-[#3654ff]">{cert.issuing_organization}</p>
                      <p className="font-bold text-lg text-slate-900">{cert.title}</p>
                    </div>
                    <div className="flex flex-col gap-1">
                      <div className="flex items-center gap-2">
                        <p className="text-xs font-bold text-slate-400">Start:</p>
                        <p className="text-sm font-bold text-slate-700">{formatDate(cert.issue_date)}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <p className="text-xs font-bold text-slate-400">Submitted:</p>
                        <p className="text-sm font-bold text-slate-700">{formatDate(cert.created_at ? cert.created_at.slice(0, 10) : '')}</p>
                      </div>
                    </div>
                    <div className="rounded-xl bg-[#f0fdf4] p-3 border border-[#bbf7d0]">
                      <p className="text-sm font-bold text-[#16a34a] flex items-center gap-2">
                        {cert.admin_review} {cert.emoji ? <span className="text-xl">{cert.emoji}</span> : <span className="text-xl">🎉</span>}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      {cert.fileName && (
                        <button onClick={() => onView(cert)} className="inline-flex items-center gap-2 rounded-xl bg-[#3654ff] px-4 py-2 text-sm font-bold text-white hover:bg-[#2541d8] transition" title="View document">
                          <Eye className="h-4 w-4" /> View
                        </button>
                      )}
                    </div>
                  </article>
                );
              }

              return (
                <article key={cert.id} className="rounded-[2rem] bg-white p-6 shadow-sm border border-slate-100 flex flex-col justify-between">
                  <div>
                    {/* Header */}
                    <div className="flex items-start justify-between mb-6">
                      <div className="flex items-center gap-4">
                        {/* Icon Box */}
                        <div className="grid h-12 w-12 place-items-center rounded-2xl bg-[#eef2ff] text-[#4f46e5]">
                          <FileText className="h-6 w-6" />
                        </div>
                        <div>
                          <p className="text-xs font-bold uppercase tracking-wide text-[#3654ff]">{cert.issuing_organization}</p>
                          <h3 className="mt-1 text-xl font-bold text-slate-900">{cert.title}</h3>
                          {/* Tags */}
                          {cert.tags && cert.tags.length > 0 && (
                            <div className="mt-2 flex flex-wrap gap-2">
                              {cert.tags.map((tag) => (
                                <span key={tag} className="inline-flex items-center rounded-full bg-[#ecfdf5] px-2.5 py-1 text-xs font-bold text-[#047857]">
                                  <span className="h-2 w-2 rounded-full bg-[#10b981] mr-1.5"></span>
                                  {tag}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        {cert.emoji && <span className="text-2xl" title="Admin reaction">{cert.emoji}</span>}
                        <span className="inline-flex items-center gap-1 rounded-full px-3 py-1.5 text-xs font-bold bg-[#fffbeb] text-[#b45309]">
                          Pending
                        </span>
                      </div>
                    </div>

                    {/* Dates Section */}
                    <div className="grid grid-cols-2 gap-4 rounded-2xl bg-[#f8fafc] p-4 mb-6">
                      <div className="flex items-center gap-3">
                        <div className="grid h-9 w-9 place-items-center rounded-xl bg-white shadow-sm text-[#4f46e5]">
                          <CalendarDays className="h-4 w-4" />
                        </div>
                        <div>
                          <p className="text-xs font-bold text-slate-400">Start</p>
                          <p className="text-sm font-bold text-slate-700">{formatDate(cert.issue_date)}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3 border-l border-slate-100 pl-4">
                        <div className="grid h-9 w-9 place-items-center rounded-xl bg-white shadow-sm text-[#4f46e5]">
                          <CalendarDays className="h-4 w-4" />
                        </div>
                        <div>
                          <p className="text-xs font-bold text-slate-400">Probable Completion</p>
                          <p className="text-sm font-bold text-slate-700">{formatDate(cert.probable_completion_time)}</p>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div>
                    {/* Actions */}
                    <div className="flex flex-wrap gap-2 mb-4">
                      {cert.fileName ? (
                        <>
                          <button onClick={() => onView(cert)} className="inline-flex items-center gap-2 rounded-xl bg-[#3654ff] px-4 py-2 text-sm font-bold text-white hover:bg-[#2541d8] transition" title="View document">
                            <Eye className="h-4 w-4" /> View Document
                          </button>
                          <button onClick={() => onRemove(cert.id)} className="inline-flex items-center gap-2 rounded-xl bg-[#fee2e2] px-4 py-2 text-sm font-bold text-[#ef4444] hover:bg-[#fecaca] transition" title="Remove document">
                            <Trash2 className="h-4 w-4" /> Remove Document
                          </button>
                        </>
                      ) : (
                        <label className="inline-flex items-center gap-2 rounded-xl bg-[#bfdbfe] px-4 py-2 text-sm font-bold text-slate-700 hover:bg-[#a5c4f7] cursor-pointer transition" title="Upload document">
                          <UploadCloud className="h-4 w-4" /> Upload Document
                          <input type="file" accept=".pdf" className="hidden" onChange={(event) => {
                            const file = event.target.files?.[0];
                            if (file) {
                              if (file.size > 5 * 1024 * 1024) {
                                alert('File size exceeds 5MB limit');
                                return;
                              }
                              const reader = new FileReader();
                              reader.onloadend = () => {
                                onUpload(cert.id, file.name, reader.result as string);
                              };
                              reader.readAsDataURL(file);
                            }
                          }} />
                        </label>
                      )}
                      <button onClick={() => onEdit(cert)} className="inline-flex items-center gap-2 rounded-xl bg-[#fef3c7] px-4 py-2 text-sm font-bold text-[#b45309] hover:bg-[#fde68a] transition" title="Edit certificate">
                        <Pencil className="h-4 w-4" /> Edit
                      </button>
                      <button onClick={() => onDelete(cert.id)} className="inline-flex items-center gap-2 rounded-xl bg-[#fee2e2] px-4 py-2 text-sm font-bold text-[#ef4444] hover:bg-[#fecaca] transition" title="Delete certificate">
                        <Trash2 className="h-4 w-4" /> Delete
                      </button>
                    </div>

                    {/* Admin Review Banner */}
                    <div className="flex items-center justify-between rounded-xl bg-[#fffbeb] p-4 border border-[#fef08a]">
                      <div className="flex items-center gap-3">
                        <div className="grid h-8 w-8 place-items-center rounded-full bg-[#f59e0b] text-white">
                          <Bell className="h-4 w-4" />
                        </div>
                        <div>
                          <p className="text-sm font-bold text-[#b45309]">Awaiting admin feedback</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  )
}

function StatusPill({ reviewed, delayed }: { reviewed: boolean; delayed?: boolean }) {
  if (delayed && !reviewed) {
    return <span className="inline-flex w-fit rounded-full px-3 py-1 text-xs font-bold bg-red-100 text-red-700 border border-red-200">Delayed</span>
  }
  return (
    <span className={`inline-flex w-fit rounded-full px-3 py-1 text-xs font-bold ${reviewed
      ? 'bg-green-100 text-green-700 border border-green-200'
      : 'bg-yellow-100 text-yellow-700 border border-yellow-200'
      }`}>
      {reviewed ? 'Reviewed' : 'Pending'}
    </span>
  )
}

const ORGANIZATION_DATA: Record<string, { courses: string[]; bestFor: string }> = {
  "Anthropic Academy": {
    courses: [
      "Claude 101",
      "Claude Code 101",
      "Claude Code in Action",
      "Introductions to Agent Skills",
      "Introductions to Subagents",
      "AI Capability and limitations",
      "AI Fluency: Framework and Foundation",
      "Building with the Claude API",
      "Introduction to Model Context Protocol (MCP)",
      "Model Context Protocol: Advanced Topics",
      "AI Fluency for Students",
      "AI Fluency for Educators"
    ],
    bestFor: "Claude AI development, AI agents, MCP server development, Prompt engineering, AI-assisted coding"
  },
  "OpenAI Academy": {
    courses: [
      "Prompt Engineering Fundamentals",
      "ChatGPT & Reasoning",
      "Deep Research with ChatGPT",
      "ChatGPT for Data Analysis",
      "ChatGPT for Writing & Coding",
      "Introduction to GPTs",
      "Advanced Prompt Engineering",
      "Multimodality Explained",
      "OpenAI API Fundamentals",
      "Building AI Agents with OpenAI SDK",
      "Fine-tuning OpenAI Models",
      "Realtime API Development"
    ],
    bestFor: "AI application development, GPT-based products, AI agents, API integration, Voice AI, Multimodal apps"
  },
  "Google AI & Google Cloud Skills Boost": {
    courses: [
      "Introduction to Generative AI",
      "Introduction to Large Language Models",
      "Introduction to Responsible AI",
      "Gemini for Developers",
      "Prompt Design in Vertex AI",
      "Image Generation with AI",
      "Generative AI Fundamentals",
      "Generative AI Leader Certification",
      "Build AI Apps with Gemini",
      "Vertex AI Learning Path",
      "AI Studio Fundamentals"
    ],
    bestFor: "Gemini AI, Vertex AI, Cloud AI engineering, Enterprise AI, Generative AI foundations"
  },
  "Microsoft Learn AI": {
    courses: [
      "AI-900: Azure AI Fundamentals",
      "AI-102: Azure AI Engineer Associate",
      "Generative AI with Azure OpenAI",
      "Build AI Apps with Copilot",
      "Azure Machine Learning Fundamentals",
      "Responsible Generative AI"
    ],
    bestFor: "Enterprise AI, Azure AI, Copilot development, Cloud AI engineering"
  },
  "NVIDIA Deep Learning Institute (DLI)": {
    courses: [
      "Fundamentals of Deep Learning",
      "Generative AI Explained",
      "Building RAG Applications",
      "AI Agent Development",
      "CUDA for Deep Learning",
      "LLM Optimization",
      "Accelerated Computing with GPUs"
    ],
    bestFor: "Deep learning, GPU computing, AI infrastructure, LLM optimization"
  },
  "DeepLearning.AI": {
    courses: [
      "ChatGPT Prompt Engineering for Developers",
      "AI Agents in LangGraph",
      "Building Systems with ChatGPT API",
      "LangChain for LLM Applications",
      "Generative AI with LLMs",
      "AI Python for Beginners",
      "Multi AI Agent Systems"
    ],
    bestFor: "AI engineering, Prompt engineering, LLM apps, LangChain, AI agents"
  },
  "Hugging Face Courses": {
    courses: [
      "Transformers Course",
      "NLP with Transformers",
      "Diffusion Models",
      "Open-source LLM Fine-tuning",
      "AI Agents Course",
      "Hugging Face Hub Fundamentals"
    ],
    bestFor: "Open-source AI, Transformers, NLP, Fine-tuning models"
  },
  "AWS Skill Builder AI Courses": {
    courses: [
      "AWS Certified AI Practitioner",
      "Generative AI Essentials",
      "Amazon Bedrock Fundamentals",
      "Building AI Apps on AWS",
      "Prompt Engineering with Bedrock"
    ],
    bestFor: "AWS AI stack, Bedrock, Cloud AI deployment"
  },
  "IBM SkillsBuild AI": {
    courses: [
      "AI Fundamentals",
      "Generative AI Basics",
      "AI Ethics",
      "Watsonx Fundamentals",
      "Machine Learning with Python"
    ],
    bestFor: "Enterprise AI, AI ethics, IBM Watson ecosystem"
  },
  "Meta AI Learning": {
    courses: [
      "Llama Model Development",
      "Open-source AI",
      "PyTorch Deep Learning",
      "AI Research Workflows"
    ],
    bestFor: "Open-source LLMs, PyTorch, Research-focused AI"
  },
  "Databricks Academy": {
    courses: [
      "Generative AI Fundamentals",
      "Machine Learning Professional",
      "Mosaic AI",
      "LLMOps"
    ],
    bestFor: "Data engineering + AI, Enterprise GenAI, LLMOps"
  },
  "Coursera AI Certifications": {
    courses: [
      "Google Generative AI Specialization",
      "IBM AI Engineering",
      "Deep Learning Specialization",
      "Generative AI for Everyone",
      "Machine Learning Specialization"
    ],
    bestFor: "Structured university-style learning, Recognized certifications"
  }
};

const findBestMatch = (source: string, targets: string[]) => {
  const s = source.toLowerCase();
  // First try exact inclusion
  let match = targets.find(t => t.toLowerCase().includes(s) || s.includes(t.toLowerCase()));
  if (match) return match;

  // Then try word overlap
  const words1 = s.split(/\s+/);
  let best = null;
  let max = 0;
  for (const t of targets) {
    const words2 = t.toLowerCase().split(/\s+/);
    const common = words1.filter(w => words2.includes(w));
    if (common.length > max) {
      max = common.length;
      best = t;
    }
  }
  return best;
};

function AddCertificationDialog({ form, setForm, error, onClose, onSubmit, isEdit }: { form: { title: string; issuing_organization: string; issue_date: string; fileName: string; fileData?: string; probable_completion_time?: string; tags: string[]; progress?: number }; setForm: (value: { title: string; issuing_organization: string; issue_date: string; fileName: string; fileData?: string; probable_completion_time?: string; tags: string[]; progress?: number }) => void; error: string; onClose: () => void; onSubmit: () => void; isEdit?: boolean }) {
  const orgs = Object.keys(ORGANIZATION_DATA);
  const selectedOrg = form.issuing_organization;
  const courses = selectedOrg ? ORGANIZATION_DATA[selectedOrg]?.courses || [] : [];
  const bestFor = selectedOrg ? ORGANIZATION_DATA[selectedOrg]?.bestFor : '';

  return (
    <Modal onClose={onClose} title={isEdit ? "Edit certification" : "Add certification"} icon={<UploadCloud />}>
      <div className="space-y-4">
        {/* Dropdown for Issuing Organization */}
        <label className="block text-sm font-bold uppercase tracking-wide text-slate-500">
          Issuing organization
          <div className="relative mt-2">
            <select
              value={form.issuing_organization}
              onChange={(event) => {
                const org = event.target.value;
                setForm({ ...form, issuing_organization: org, title: '' }); // Reset title when org changes
              }}
              className="w-full rounded-2xl border-2 border-slate-200 bg-[#f8fafc] px-4 py-3 font-semibold text-slate-950 outline-none focus:border-[#3654ff] appearance-none pr-12"
            >
              <option value="">Select Organization</option>
              {orgs.map((org) => (
                <option key={org} value={org}>{org}</option>
              ))}
            </select>
            <div className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-slate-400">
              <ChevronRight className="h-5 w-5 rotate-90" />
            </div>
          </div>
        </label>

        {/* Display Best For tags if org selected */}
        {bestFor && (
          <div className="flex flex-wrap gap-1 mt-1">
            {bestFor.split(',').map((tag) => {
              const trimmedTag = tag.trim();
              const isSelected = form.tags.includes(trimmedTag);
              return (
                <button
                  key={trimmedTag}
                  type="button"
                  onClick={() => {
                    const newTags = isSelected
                      ? form.tags.filter((t) => t !== trimmedTag)
                      : [...form.tags, trimmedTag];

                    let newTitle = form.title;
                    if (!isSelected) {
                      // Find similar course
                      const match = findBestMatch(trimmedTag, courses);
                      if (match) newTitle = match;
                    } else {
                      // If deselecting, clear title if it was the match
                      const match = findBestMatch(trimmedTag, courses);
                      if (match === form.title) newTitle = '';
                    }

                    setForm({ ...form, tags: newTags, title: newTitle });
                  }}
                  className={`inline-flex items-center rounded-full px-2 py-1 text-xs font-bold border border-slate-950 transition-colors ${isSelected
                    ? 'bg-green-400 text-slate-950'
                    : 'bg-[#bfdbfe] text-slate-700 hover:bg-[#a5c4f7]'
                    }`}
                >
                  {isSelected && <CheckCircle2 className="h-3 w-3 mr-1" />}
                  {trimmedTag}
                </button>
              );
            })}
          </div>
        )}

        {/* Dropdown for Certification Title */}
        <label className="block text-sm font-bold uppercase tracking-wide text-slate-500">
          Certification title
          <div className="relative mt-2">
            <select
              value={form.title}
              onChange={(event) => {
                const val = event.target.value;
                const tagsList = bestFor.split(',').map(t => t.trim());
                const match = findBestMatch(val, tagsList);
                let newTags = form.tags;
                if (val === '') {
                  // If cleared, maybe clear tags?
                  newTags = [];
                } else if (match) {
                  if (!newTags.includes(match)) {
                    newTags = [...newTags, match];
                  }
                }
                setForm({ ...form, title: val, tags: newTags });
              }}
              className="w-full rounded-2xl border-2 border-slate-200 bg-[#f8fafc] px-4 py-3 font-semibold text-slate-950 outline-none focus:border-[#3654ff] appearance-none pr-12"
              disabled={!selectedOrg}
            >
              <option value="">Select Certificate</option>
              {courses.map((course) => (
                <option key={course} value={course}>{course}</option>
              ))}
            </select>
            <div className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-slate-400">
              <ChevronRight className="h-5 w-5 rotate-90" />
            </div>
          </div>
        </label>

        <TextInput
          label="Issue date"
          type="date"
          value={form.issue_date}
          onChange={(value) => {
            const updates = { ...form, issue_date: value };
            if (form.probable_completion_time && form.probable_completion_time < value) {
              updates.probable_completion_time = value;
            }
            setForm(updates);
          }}
        />
        <TextInput label="Probable Completion Time" type="date" value={form.probable_completion_time || ''} onChange={(value) => setForm({ ...form, probable_completion_time: value })} min={form.issue_date} />
        
        <div className="space-y-3 rounded-2xl bg-slate-50 p-4 border border-slate-200">
          <div className="flex items-center justify-between">
            <label className="text-xs font-black uppercase tracking-widest text-slate-500">Current Progress</label>
            <span className="text-sm font-black text-[#3654ff]">{form.progress || 0}%</span>
          </div>
          <input 
            type="range" 
            min="0" 
            max="100" 
            step="5"
            value={form.progress || 0} 
            onChange={(e) => setForm({ ...form, progress: parseInt(e.target.value) })}
            className="h-2 w-full cursor-pointer appearance-none rounded-lg bg-slate-200 accent-[#3654ff]"
          />
          <div className="flex justify-between text-[10px] font-bold text-slate-400">
            <span>Started</span>
            <span>In Progress</span>
            <span>Completed</span>
          </div>
        </div>
        <label className="block cursor-pointer rounded-3xl border-2 border-dashed border-slate-950 bg-[#bfdbfe] p-6 text-center transition hover:bg-[#dbeafe]">
          <UploadCloud className="mx-auto mb-2 h-9 w-9" />
          <span className="block font-bold">{form.fileName || 'Choose PDF (Optional)'}</span>
          <span className="mt-1 block text-sm font-semibold text-slate-600">Accepted PDF document formats only</span>
          <input type="file" accept=".pdf" className="hidden" onChange={(event) => {
            const file = event.target.files?.[0];
            if (file) {
              if (file.size > 5 * 1024 * 1024) {
                alert('File size exceeds 5MB limit');
                return;
              }
              const reader = new FileReader();
              reader.onloadend = () => {
                setForm({ ...form, fileName: file.name, fileData: reader.result as string });
              };
              reader.readAsDataURL(file);
            }
          }} />
        </label>
        {error && <p className="rounded-2xl bg-red-100 px-4 py-3 text-sm font-bold text-red-700">{error}</p>}
        <button onClick={onSubmit} className="w-full rounded-xl bg-[#3654ff] px-6 py-4 font-bold text-white shadow-sm hover:bg-[#2541d8] transition">{isEdit ? 'Save changes' : 'Submit certificate'}</button>
      </div>
    </Modal>
  );
}

function ReviewDialog({ cert, reviewText, setReviewText, onClose, onSave, people, role, onView, emoji, setEmoji }: { cert: Certification; reviewText: string; setReviewText: (value: string) => void; onClose: () => void; onSave: () => void; people?: Record<string, Profile>; role?: Role; onView: (cert: Certification) => void; emoji: string; setEmoji: (value: string) => void }) {
  const person = people ? people[cert.user_id] : null
  const isAdmin = role === 'admin'
  return (
    <Modal onClose={onClose} title={isAdmin ? "Review submission" : "Add Notes"} icon={<ClipboardCheck />}>
      <div className="space-y-4">
        <div className="rounded-3xl bg-[#f8fafc] p-4">
          <p className="font-bold">{cert.title}</p>
          <p className="text-sm font-medium text-slate-500">{person?.name} · {cert.issuing_organization}</p>
          <button onClick={() => onView(cert)} className="mt-3 inline-flex items-center gap-2 rounded-full bg-white px-4 py-2 text-sm font-bold text-slate-950" title="View document"><Eye className="h-4 w-4" /> View document</button>
        </div>
        {isAdmin ? (
          <>
            {cert.notes && (
              <div className="rounded-2xl bg-[#fef3c7] p-4">
                <p className="text-xs font-bold uppercase text-slate-500">Employee Notes</p>
                <p className="text-sm font-semibold mt-1">{cert.notes}</p>
              </div>
            )}
            <label className="block text-sm font-bold uppercase tracking-wide text-slate-500">Reaction</label>
            <div className="flex gap-2 my-2">
              {['👍', '🎉', '👏', '🔥', '💯'].map((e) => (
                <button
                  key={e}
                  type="button"
                  onClick={() => setEmoji(e === emoji ? '' : e)}
                  className={`text-2xl p-2 rounded-xl border-2 transition-colors ${e === emoji ? 'border-slate-950 bg-[#f7c948]' : 'border-transparent bg-[#f8fafc] hover:bg-slate-100'}`}
                  title={`React with ${e}`}
                >
                  {e}
                </button>
              ))}
            </div>
            <label className="block text-sm font-bold uppercase tracking-wide text-slate-500">Feedback (Admin)</label>
            <textarea value={reviewText} onChange={(event) => setReviewText(event.target.value)} rows={5} className="w-full rounded-2xl border-2 border-slate-200 bg-white p-4 font-semibold outline-none focus:border-[#3654ff]" placeholder="Write approval notes or requested corrections..." />
          </>
        ) : (
          <>
            {cert.admin_review && (
              <div className="rounded-2xl bg-[#d9f99d] p-4">
                <p className="text-xs font-bold uppercase text-slate-500">Admin Feedback</p>
                <p className="text-sm font-semibold mt-1">{cert.admin_review}</p>
              </div>
            )}
            {cert.emoji && (
              <div className="rounded-2xl bg-[#bfdbfe] p-4 mb-2 flex items-center gap-2">
                <p className="text-xs font-bold uppercase text-slate-500">Admin Reaction:</p>
                <span className="text-2xl">{cert.emoji}</span>
              </div>
            )}
            <label className="block text-sm font-bold uppercase tracking-wide text-slate-500">My Notes</label>
            <textarea value={reviewText} onChange={(event) => setReviewText(event.target.value)} rows={5} className="w-full rounded-2xl border-2 border-slate-200 bg-white p-4 font-semibold outline-none focus:border-[#3654ff]" placeholder="Add notes to this certification..." />
          </>
        )}
        <button onClick={onSave} className="w-full rounded-xl bg-[#3654ff] px-6 py-4 font-bold text-white shadow-sm hover:bg-[#2541d8] transition">
          {isAdmin ? (cert.admin_review ? "Update feedback" : "Save feedback") : "Save notes"}
        </button>
      </div>
    </Modal>
  )
}

function TextInput({ label, value, onChange, placeholder, type = 'text', min }: { label: string; value: string; onChange: (value: string) => void; placeholder?: string; type?: string; min?: string }) {
  const [showPassword, setShowPassword] = useState(false)
  const isPassword = type === 'password'
  const inputType = isPassword ? (showPassword ? 'text' : 'password') : type

  return (
    <label className="block text-sm font-bold uppercase tracking-wide text-slate-500">
      {label}
      <div className="relative mt-2">
        <input
          type={inputType}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          placeholder={placeholder}
          min={min}
          className="w-full rounded-2xl border-2 border-slate-200 bg-[#f8fafc] px-4 py-3 font-semibold text-slate-950 outline-none focus:border-[#3654ff] pr-12"
        />
        {isPassword && (
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
          >
            {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
          </button>
        )}
      </div>
    </label>
  )
}

function Modal({ title, icon, children, onClose }: { title: string; icon: ReactNode; children: ReactNode; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-slate-950/70 p-4 backdrop-blur-sm">
      <div className="w-full max-w-xl rounded-[2rem] border border-slate-200 bg-white p-6 shadow-lg max-h-[90vh] flex flex-col">
        <div className="mb-6 flex items-center justify-between gap-4 flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="grid h-12 w-12 place-items-center rounded-2xl bg-[#f7c948]">{icon}</div>
            <h2 className="text-2xl font-bold">{title}</h2>
          </div>
          <button onClick={onClose} className="rounded-full bg-white p-2 text-slate-700 hover:bg-slate-950 hover:text-white"><X /></button>
        </div>
        <div className="overflow-y-auto flex-1 pr-2">
          {children}
        </div>
      </div>
    </div>
  )
}

function DocumentViewer({ cert, onClose, allowDownload, uploaderName }: { cert: Certification; onClose: () => void; allowDownload?: boolean; uploaderName?: string }) {
  const handleDownload = () => {
    if (!allowDownload) return;
    const link = document.createElement('a');
    link.href = cert.file_url;
    link.download = cert.fileName || 'document.pdf';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-slate-950/70 p-4 backdrop-blur-sm">
      <div className="relative w-full max-w-4xl h-[80vh] rounded-[2rem] border border-slate-200 bg-white p-6 shadow-lg flex flex-col">
        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div>
              <h2 className="text-2xl font-bold">{cert.title}</h2>
              <p className="text-sm font-medium text-slate-500">
                Uploaded by: <span className="font-bold text-slate-700">{uploaderName || 'Unknown'}</span>
              </p>
            </div>
            {allowDownload && cert.file_url && (
              <button
                onClick={handleDownload}
                className="inline-flex items-center gap-2 rounded-xl bg-slate-100 px-4 py-2 text-sm font-bold text-slate-700 hover:bg-slate-200 transition"
                title="Download document"
              >
                <Download className="h-4 w-4" /> Download
              </button>
            )}
          </div>
          <button onClick={onClose} className="rounded-full bg-white p-2 text-slate-700 hover:bg-slate-950 hover:text-white"><X /></button>
        </div>
        <div className="flex-1 bg-white rounded-2xl overflow-hidden border-2 border-slate-200 relative">
          {cert.file_url.startsWith('data:image/') ? (
            <img src={cert.file_url} alt={cert.title} className="w-full h-full object-contain" />
          ) : cert.file_url.startsWith('data:application/pdf') ? (
            <iframe
              src={allowDownload ? cert.file_url : `${cert.file_url}#toolbar=0&navpanes=0&scrollbar=0`}
              title={cert.title}
              className="w-full h-full"
            />
          ) : (
            <div className="flex items-center justify-center h-full text-slate-500">
              Preview not available for this file type.
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default App

