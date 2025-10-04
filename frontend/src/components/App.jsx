import { useState, useEffect } from 'react'
import { Routes, Route, Outlet, Navigate, useLocation, useNavigate } from 'react-router-dom'
import { AppProvider } from '../context/AppContext'
import { SignedIn, SignedOut } from '@clerk/clerk-react'
import { AuthModal } from './auth/AuthModal'
import { UserDropdown } from './auth/UserDropdown'
import { SSOCallback } from './auth/SSOCallback'
import Navigation from './Navigation'
import ImageAnalysis from './ImageAnalysis'
import VideoAnalysis from './VideoAnalysis'
import TextAnalysis from './TextAnalysis'
import Settings from './Settings'
import './App.css'

function AppContent() {
  const location = useLocation()
  const navigate = useNavigate()
  const [authModalOpen, setAuthModalOpen] = useState(false)
  const [authMode, setAuthMode] = useState('login')

  const openSignIn = () => {
    setAuthMode('login')
    setAuthModalOpen(true)
  }

  const openSignUp = () => {
    setAuthMode('signup')
    setAuthModalOpen(true)
  }

  const handleSettingsClick = () => {
    navigate('/settings')
  }

  // Derive active tab from route
  const path = location.pathname
  const activeTab =
    path.startsWith('/video-analysis') ? 'video' :
    path.startsWith('/text-analysis') ? 'text' :
    path.startsWith('/settings') ? 'settings' :
    'image'

  // When navigation tabs are clicked, push route
  const setActiveTab = (tabId) => {
    switch (tabId) {
      case 'image':
        navigate('/image-analysis')
        break
      case 'video':
        navigate('/video-analysis')
        break
      case 'text':
        navigate('/text-analysis')
        break
      case 'settings':
        navigate('/settings')
        break
      default:
        navigate('/image-analysis')
    }
  }

  // Redirect base path to image-analysis to keep URL meaningful
  useEffect(() => {
    if (location.pathname === '/' || location.pathname === '') {
      navigate('/image-analysis', { replace: true })
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

  return (
    <Routes>
      <Route path="/sso-callback" element={<SSOCallback />} />
      <Route path="/" element={
        <div className="min-h-screen bg-gray-50">
          <div className="container mx-auto px-4 py-8">
            <div className="max-w-6xl mx-auto">
              {/* Header */}
              <div className="flex items-center justify-between mb-8">
                {/* Logo and Title - Left Side */}
                <div className="flex items-center gap-3">
                  <img
                    src="/logo (1).png"
                    alt="AI Keyword Generator Logo"
                    className="w-14 h-14 rounded-xl object-cover ring-2 ring-blue-200"
                  />
                  <div className="hidden w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl flex items-center justify-center">
                    <span className="text-white text-xl font-bold">✨</span>
                  </div>
                  <div>
                    <h1 className="text-3xl font-bold text-gray-900">
                      AI Keyword Generator
                    </h1>
                    <p className="text-gray-900 text-sm">
                      Powered by multiple AI models for content creators
                    </p>
                  </div>
                </div>

                {/* Authentication - Right Side */}
                <div className="flex items-center gap-4">
                  <SignedOut>
                    <div className="flex items-center gap-3">
                      <button
                        onClick={openSignIn}
                        className="text-gray-600 hover:text-gray-900 font-medium transition-colors"
                      >
                        Sign In
                      </button>
                      <button
                        onClick={openSignUp}
                        className="bg-gradient-to-r from-blue-600 to-purple-600 text-white px-6 py-2 rounded-lg font-medium hover:from-blue-700 hover:to-purple-700 transition-all duration-200 shadow-lg hover:shadow-xl"
                      >
                        Get Started
                      </button>
                    </div>
                  </SignedOut>
                  <SignedIn>
                    <UserDropdown onSettingsClick={handleSettingsClick} />
                  </SignedIn>
                </div>
              </div>

              {/* Navigation */}
              <Navigation activeTab={activeTab} setActiveTab={setActiveTab} />

              {/* Main Content */}
              <div className="mt-8">
                <Outlet />
              </div>
            </div>
          </div>

          {/* Authentication Modal */}
          <AuthModal
            isOpen={authModalOpen}
            onClose={() => setAuthModalOpen(false)}
            initialMode={authMode}
          />
        </div>
      }>
        <Route index element={<Navigate to="/image-analysis" replace />} />
        <Route path="image-analysis" element={<ImageAnalysis />} />
        <Route path="video-analysis" element={<VideoAnalysis />} />
        <Route path="text-analysis" element={<TextAnalysis />} />
        <Route path="settings" element={<Settings />} />
      </Route>
    </Routes>
  )
}

function App() {
  return (
    <AppProvider>
      <AppContent />
    </AppProvider>
  )
}

export default App

