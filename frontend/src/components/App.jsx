import { useState, useEffect } from 'react'
import { Routes, Route, Outlet, Navigate, useLocation, useNavigate } from 'react-router-dom'
import { AppProvider } from '../context/AppContext'
import { ThemeProvider } from '../context/ThemeContext'
import { SignedIn, SignedOut, useAuth, useUser } from '@clerk/clerk-react'
import { AuthModal } from './auth/AuthModal'
import { UserDropdown } from './auth/UserDropdown'
import { SSOCallback } from './auth/SSOCallback'
import ThemeToggle from './ui/ThemeToggle'
import LandingPage from './LandingPage'
import Dashboard from './Dashboard'
import ImageAnalysis from './ImageAnalysis'
import VideoAnalysis from './VideoAnalysis'
import TextAnalysis from './TextAnalysis'
import Settings from './Settings'
import { Menu, X } from 'lucide-react'
import './App.css'

// Protected Route Component
function ProtectedRoute({ children }) {
  const { isSignedIn, isLoaded } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()

  useEffect(() => {
    if (isLoaded && !isSignedIn) {
      // User is not authenticated, redirect to landing page
      navigate('/', { replace: true })
    }
  }, [isSignedIn, isLoaded, navigate])

  // Show loading state while checking authentication
  if (!isLoaded) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 dark:border-gray-100 mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">Loading...</p>
        </div>
      </div>
    )
  }

  // If not signed in, don't render children (redirect will happen)
  if (!isSignedIn) {
    return null
  }

  return children
}

function AppContent() {
  const location = useLocation()
  const navigate = useNavigate()
  const { isSignedIn, isLoaded } = useAuth()
  const [authModalOpen, setAuthModalOpen] = useState(false)
  const [authMode, setAuthMode] = useState('login')
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  // Global authentication check
  useEffect(() => {
    if (isLoaded && !isSignedIn && location.pathname.startsWith('/app')) {
      // User is not authenticated but trying to access protected routes
      navigate('/', { replace: true })
    }
  }, [isSignedIn, isLoaded, location.pathname, navigate])

  const openSignIn = () => {
    setAuthMode('login')
    setAuthModalOpen(true)
  }

  const openSignUp = () => {
    setAuthMode('signup')
    setAuthModalOpen(true)
  }

  const handleSettingsClick = () => {
    navigate('/app/settings')
  }

  // Derive active tab from route
  const path = location.pathname
  const activeTab =
    path.startsWith('/app/dashboard') ? 'dashboard' :
    path.startsWith('/app/video-analysis') ? 'video' :
    path.startsWith('/app/text-analysis') ? 'text' :
    path.startsWith('/app/settings') ? 'settings' :
    'image'

  // When navigation tabs are clicked, push route
  const setActiveTab = (tabId) => {
    switch (tabId) {
      case 'dashboard':
        navigate('/app/dashboard')
        break
      case 'image':
        navigate('/app/image-analysis')
        break
      case 'video':
        navigate('/app/video-analysis')
        break
      case 'text':
        navigate('/app/text-analysis')
        break
      case 'settings':
        navigate('/app/settings')
        break
      default:
        navigate('/app/dashboard')
    }
  }

  // Redirect signed-in users from root to app
  useEffect(() => {
    if (location.pathname === '/' || location.pathname === '') {
      // This will be handled by the route structure
    }
  }, [location.pathname, navigate])

  const renderActiveComponent = () => {
    switch (activeTab) {
      case 'image':
        return <ImageAnalysis />
      case 'video':
        return <VideoAnalysis />
      case 'text':
        return <TextAnalysis />
      case 'settings':
        return <Settings />
      default:
        return <ImageAnalysis />
    }
  }

  // Show loading state while authentication is being checked
  if (!isLoaded) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 dark:border-gray-100 mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">Loading...</p>
        </div>
      </div>
    )
  }

  return (
    <>
      <Routes>
        <Route path="/sso-callback" element={<SSOCallback />} />
        <Route path="/" element={
          <>
            <SignedOut>
              <LandingPage 
                onSignIn={openSignIn}
                onSignUp={openSignUp}
              />
            </SignedOut>
            <SignedIn>
              <Navigate to="/app" replace />
            </SignedIn>
          </>
        } />
        <Route path="/app" element={
        <ProtectedRoute>
          <div className="min-h-screen bg-gray-50 dark:bg-gray-900 transition-colors duration-300">
            {/* Fixed Header with Navigation */}
            <header className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 fixed top-0 left-0 right-0 z-50 transition-colors duration-300 shadow-sm">
              <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex justify-between items-center h-16">
                  {/* Logo and Title - Left Side */}
                  <button 
                    onClick={() => setActiveTab('dashboard')} 
                    className="flex items-center space-x-3 text-left"
                  >
                    <img
                      src="/logo (1).png"
                      alt="AI Keyword Generator Logo"
                      className="w-10 h-10 rounded-lg object-cover ring-2 ring-blue-200"
                    />
                    <div>
                      <h1 className="text-lg font-bold text-gray-900 dark:text-gray-100">AI Keyword Generator</h1>
                    </div>
                  </button>

                  {/* Navigation Tabs - Center */}
                  <div className="hidden md:flex items-center space-x-1">
                    {[
                      { id: 'dashboard', label: 'Dashboard' },
                      { id: 'image', label: 'Image' },
                      { id: 'video', label: 'Video' },
                      { id: 'text', label: 'Text' },
                      { id: 'settings', label: 'Settings' }
                    ].map((tab) => (
                      <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id)}
                        className={`
                          px-4 py-2 rounded-md text-sm font-medium transition-all duration-200
                          ${activeTab === tab.id
                            ? 'bg-white dark:bg-gray-800 text-blue-600 dark:text-blue-400 shadow-md border border-gray-200 dark:border-gray-700'
                            : 'text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white hover:bg-white dark:hover:bg-gray-800'
                          }
                        `}
                      >
                        {tab.label}
                      </button>
                    ))}
                  </div>

                  {/* Mobile Menu Button */}
                  <div className="md:hidden">
                    <button
                      onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                      className="p-2 rounded-md text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-800"
                    >
                      {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
                    </button>
                  </div>

                  {/* Theme Toggle and User Info - Right Side */}
                  <div className="flex items-center space-x-4">
                    <ThemeToggle />
                    <div className="flex items-center space-x-4">
                      <span className="text-sm text-gray-600 dark:text-gray-300 hidden sm:block">
                        Welcome, <span className="font-medium">User</span>
                      </span>
                      <UserDropdown onSettingsClick={handleSettingsClick} />
                    </div>
                  </div>
                </div>
              </div>
            </header>

            {/* Mobile Menu Dropdown */}
            {mobileMenuOpen && (
              <div className="mobile-menu md:hidden bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 shadow-lg fixed top-16 left-0 right-0 z-40">
                  <div className="px-4 py-2 space-y-1">
                  {[
                    { id: 'dashboard', label: 'Dashboard' },
                    { id: 'image', label: 'Image' },
                    { id: 'video', label: 'Video' },
                    { id: 'text', label: 'Text' },
                    { id: 'settings', label: 'Settings' }
                  ].map((tab) => (
                    <button
                      key={tab.id}
                      onClick={() => {
                        setActiveTab(tab.id)
                        setMobileMenuOpen(false)
                      }}
                      className={`
                        w-full px-4 py-2 rounded-md text-sm font-medium transition-all duration-200
                        ${activeTab === tab.id
                          ? 'bg-white dark:bg-gray-800 text-blue-600 dark:text-blue-400 shadow-md border border-gray-200 dark:border-gray-700'
                          : 'text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white hover:bg-white dark:hover:bg-gray-700'
                        }
                      `}
                    >
                      {tab.label}
                    </button>
                  ))}
                  </div>
                </div>
            )}

            {/* Main Content with top padding for fixed header */}
            <div className={`pt-16 bg-gray-50 dark:bg-gray-900 transition-colors duration-300 ${mobileMenuOpen ? 'pt-32' : ''}`}>
              <div className="container mx-auto px-4 py-8">
                <div className="max-w-6xl mx-auto">
                  <Outlet />
                </div>
              </div>
            </div>
          </div>
        </ProtectedRoute>
        }>
          <Route index element={<Navigate to="/app/dashboard" replace />} />
          <Route path="dashboard" element={<Dashboard />} />
          <Route path="image-analysis" element={<ImageAnalysis />} />
          <Route path="video-analysis" element={<VideoAnalysis />} />
          <Route path="text-analysis" element={<TextAnalysis />} />
          <Route path="settings" element={<Settings />} />
        </Route>
      </Routes>

      {/* Authentication Modal */}
      <AuthModal
        isOpen={authModalOpen}
        onClose={() => setAuthModalOpen(false)}
        initialMode={authMode}
      />
    </>
  )
}

function App() {
  return (
    <ThemeProvider>
      <AppProvider>
        <AppContent />
      </AppProvider>
    </ThemeProvider>
  )
}

export default App

