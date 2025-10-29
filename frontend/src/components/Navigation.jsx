import { useState } from 'react'
import { Button } from './ui/button.jsx'
import { useAppContext } from '../context/AppContext'
import { Image, Video, FileText, Settings, RotateCcw, AlertTriangle } from 'lucide-react'
import { motion } from 'framer-motion'

const Navigation = ({ activeTab, setActiveTab }) => {
  const { resetAllData } = useAppContext()
  const [showResetConfirm, setShowResetConfirm] = useState(false)

  const tabs = [
    {
      id: 'image',
      label: 'Image Analysis',
      icon: Image,
      color: 'bg-green-500',
      activeColor: 'bg-green-600'
    },
    {
      id: 'video',
      label: 'Video Analysis',
      icon: Video,
      color: 'bg-blue-500',
      activeColor: 'bg-blue-600'
    },
    {
      id: 'text',
      label: 'Text Analysis',
      icon: FileText,
      color: 'bg-purple-500',
      activeColor: 'bg-purple-600'
    },
    {
      id: 'settings',
      label: 'Settings',
      icon: Settings,
      color: 'bg-orange-500',
      activeColor: 'bg-orange-600'
    }
  ]

  const handleReset = () => {
    if (showResetConfirm) {
      resetAllData()
      setShowResetConfirm(false)
    } else {
      setShowResetConfirm(true)
      // Auto-hide confirmation after 3 seconds
      setTimeout(() => setShowResetConfirm(false), 3000)
    }
  }

  return (
    <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mb-6 sm:mb-8">
      {/* Tab Navigation */}
      <div className="flex flex-wrap items-center gap-1 sm:gap-2 w-full sm:w-auto">
        {tabs.map((tab) => {
          const Icon = tab.icon
          const isActive = activeTab === tab.id

          return (
            <motion.button
              key={tab.id}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => setActiveTab(tab.id)}
              className={`
                flex items-center gap-1 sm:gap-2 px-2 sm:px-4 py-2 rounded-lg font-medium transition-all duration-200 text-xs sm:text-sm
                ${isActive
                  ? `${tab.activeColor} text-white shadow-lg`
                  : `${tab.color} text-white hover:opacity-90`
                }
              `}
            >
              <Icon className="h-4 w-4" />
              <span className="hidden sm:inline">{tab.label}</span>
              <span className="sm:hidden">{tab.label.split(' ')[0]}</span>
            </motion.button>
          )
        })}
      </div>

      {/* Reset Button */}
      <div className="flex items-center gap-2 w-full sm:w-auto justify-center sm:justify-end">
        {showResetConfirm && (
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            className="flex items-center gap-2 text-sm text-amber-600 bg-amber-50 px-3 py-1 rounded-lg border border-amber-200"
          >
            <AlertTriangle className="h-4 w-4" />
            <span>Click again to confirm reset</span>
          </motion.div>
        )}

        <Button
          onClick={handleReset}
          variant={showResetConfirm ? "destructive" : "outline"}
          size="sm"
          className={`flex items-center gap-2 transition-all duration-200 ${showResetConfirm
              ? 'bg-red-500 hover:bg-red-600 text-white'
              : 'hover:bg-gray-100'
            }`}
        >
          <RotateCcw className={`h-4 w-4 ${showResetConfirm ? 'animate-spin' : ''}`} />
          <span className="hidden sm:inline">
            {showResetConfirm ? 'Confirm Reset' : 'Reset All'}
          </span>
          <span className="sm:hidden">Reset</span>
        </Button>
      </div>
    </div>
  )
}

export default Navigation

