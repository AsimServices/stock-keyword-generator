import { useState, useEffect, useRef } from 'react'
import { useUser } from '@clerk/clerk-react'
import { Button } from './ui/button.jsx'
import { Card, CardContent, CardHeader, CardTitle } from './ui/card.jsx'
import { Textarea } from './ui/textarea.jsx'
import { Input } from './ui/input.jsx'
import UploadTable from './ui/UploadTable.jsx'
import { useAppContext } from '../context/AppContext'
import { downloadTXT, downloadCSV, downloadExcel, downloadPDF } from '../utils/downloadUtils'
import { getCategoryNumber } from '../utils/categoryUtils'
import { FileText, Loader2, Copy, Check, X, Download, FileSpreadsheet, File, Printer, Plus, Edit3, Save, XCircle, AlertCircle, Settings, Trash2, ChevronDown, ChevronUp } from 'lucide-react'
import { useApiKeys } from '../hooks/useApiKeys.js'
import { formatApiError } from '../utils/errorUtils.js'
import { motion, AnimatePresence } from 'framer-motion'

const TextAnalysis = () => {
  const { user } = useUser()
  const { state, setTextData, updateTextResult, resetTextData } = useAppContext()
  const { textPrompts, selectedServices, results, isAnalyzing, currentProgress, totalPrompts } = state.textAnalysis
  const { apiKeys, loading: keysLoading, annotateServicesWithKeys } = useApiKeys()
  const [selectedService, setSelectedService] = useState(() => {
    try {
      return localStorage.getItem('selectedTextAIService') || 'openai'
    } catch (error) {

      return 'openai'
    }
  })

  // Enhanced text prompts with status tracking
  const [textsWithStatus, setTextsWithStatus] = useState([])
  const uploadTableRef = useRef(null)

  // Custom prompt for analysis
  const [customPrompt, setCustomPrompt] = useState('')

  // Update texts with status when textPrompts changes
  useEffect(() => {
    if (textPrompts.length > 0) {
      setTextsWithStatus(prevTexts => {
        const newTexts = textPrompts.filter(prompt =>
          !prevTexts.some(prev => prev.id === prompt.id)
        ).map(prompt => ({
          ...prompt,
          status: 'pending',
          result: null,
          error: null
        }))

        return [...prevTexts, ...newTexts]
      })
    }
  }, [textPrompts])

  const handleServiceToggle = (serviceId) => {
    setSelectedService(serviceId)
    try {
      localStorage.setItem('selectedTextAIService', serviceId)
    } catch (error) {

    }
  }

  const addTextPrompt = () => {
    const newPrompt = {
      id: `${Date.now()}-${Math.random()}`,
      title: '',
      text: '',
      status: 'pending',
      result: null,
      error: null,
      timestamp: new Date().toISOString()
    }
    setTextsWithStatus(prev => [...prev, newPrompt])

    // Auto-scroll to table after text prompt is added
    setTimeout(() => {
      if (uploadTableRef.current) {
        uploadTableRef.current.scrollIntoView({
          behavior: 'smooth',
          block: 'start'
        })
      }
    }, 200) // Slightly longer delay to ensure DOM is updated
  }

  const updateTextPrompt = (id, field, value) => {
    setTextsWithStatus(prev =>
      prev.map(prompt =>
        prompt.id === id
          ? { ...prompt, [field]: value }
          : prompt
      )
    )
  }

  const removeTextPrompt = (id) => {
    setTextsWithStatus(prev => prev.filter(prompt => prompt.id !== id))
  }

  const updateTextMetadata = (promptId, updatedMetadata) => {
    setTextsWithStatus(prev =>
      prev.map(prompt =>
        prompt.id === promptId
          ? {
            ...prompt,
            result: {
              ...prompt.result,
              ...updatedMetadata
            }
          }
          : prompt
      )
    )
  }

  const analyzeText = async (textPrompt) => {
    try {
      // Update status to processing
      setTextsWithStatus(prev =>
        prev.map(prompt =>
          prompt.id === textPrompt.id
            ? { ...prompt, status: 'processing', error: null }
            : prompt
        )
      )

      const response = await fetch('/api/analyze-text-structured', {
        method: 'POST',
        headers: {
          'X-User-ID': user.id,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          text: textPrompt.text,
          filename: textPrompt.title || 'text_prompt.txt',
          services: [selectedService],
          custom_prompt: customPrompt
        })
      })

      const data = await response.json()

      if (data.results && data.results.length > 0) {
        const result = data.results[0]

        if (result.success) {
          // Update status to completed with result
          setTextsWithStatus(prev =>
            prev.map(prompt =>
              prompt.id === textPrompt.id
                ? {
                  ...prompt,
                  status: 'completed',
                  result: {
                    title: result.title,
                    keywords: result.keywords,
                    category: result.category,
                    releases: result.releases,
                    raw_response: result.raw_response
                  }
                }
                : prompt
            )
          )

          // Update AppContext with the result
          const analysisResult = {
            id: textPrompt.id,
            filename: textPrompt.title || 'text_prompt.txt',
            type: 'text',
            result: {
              title: result.title,
              keywords: result.keywords,
              category: result.category,
              releases: result.releases,
              raw_response: result.raw_response
            },
            service: selectedService,
            timestamp: textPrompt.timestamp || new Date().toISOString()
          }

          setTextData({
            results: [...state.textAnalysis.results, analysisResult]
          })
        } else {
          // Update status to error and store error result
          setTextsWithStatus(prev =>
            prev.map(prompt =>
              prompt.id === textPrompt.id
                ? { ...prompt, status: 'error', error: result.error }
                : prompt
            )
          )

          // Store error result in AppContext
          const errorResult = {
            id: textPrompt.id,
            filename: textPrompt.title || 'Untitled',
            type: 'text',
            status: 'error',
            error: result.error,
            service: selectedService,
            timestamp: textPrompt.timestamp || new Date().toISOString()
          }

          setTextData({
            results: [...state.textAnalysis.results, errorResult]
          })
        }
      } else {
        // Update status to error and store error result
        setTextsWithStatus(prev =>
          prev.map(prompt =>
            prompt.id === textPrompt.id
              ? { ...prompt, status: 'error', error: 'No results received' }
              : prompt
          )
        )

        // Store error result in AppContext
        const errorResult = {
          id: textPrompt.id,
          filename: textPrompt.title || 'Untitled',
          type: 'text',
          status: 'error',
          error: 'No results received',
          service: selectedService,
          timestamp: textPrompt.timestamp || new Date().toISOString()
        }

        setTextData({
          results: [...state.textAnalysis.results, errorResult]
        })
      }
    } catch (error) {

      // Update status to error and store error result
      setTextsWithStatus(prev =>
        prev.map(prompt =>
          prompt.id === textPrompt.id
            ? { ...prompt, status: 'error', error: error.message }
            : prompt
        )
      )

      // Store error result in AppContext
      const errorResult = {
        id: textPrompt.id,
        filename: textPrompt.title || 'Untitled',
        type: 'text',
        status: 'error',
        error: error.message,
        service: selectedService,
        timestamp: textPrompt.timestamp || new Date().toISOString()
      }

      setTextData({
        results: [...state.textAnalysis.results, errorResult]
      })
    }
  }

  const downloadCSV = () => {
    const completedTexts = textsWithStatus.filter(text => text.status === 'completed' && text.result)

    if (completedTexts.length === 0) {
      alert('No completed analyses to download')
      return
    }

    const csvData = completedTexts.map(text => ({
      filename: text.title || 'Untitled',
      title: text.result.title || '',
      keywords: text.result.keywords ? text.result.keywords.join(', ') : '',
      category: getCategoryNumber(text.result.category) || '-',
      releases: text.result.releases || '-'
    }))

    // Convert to CSV
    const headers = ['Filename', 'Title', 'Keywords', 'Category', 'Releases']
    const csvContent = [
      headers.join(','),
      ...csvData.map(row => [
        `"${row.filename}"`,
        `"${row.title}"`,
        `"${row.keywords}"`,
        `"${row.category}"`,
        `"${row.releases}"`
      ].join(','))
    ].join('\n')

    // Download CSV
    const blob = new Blob([csvContent], { type: 'text/csv' })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `text-analysis-${new Date().toISOString().split('T')[0]}.csv`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    window.URL.revokeObjectURL(url)
  }


  const services = [
    { id: 'openai', name: 'OpenAI GPT-4', color: 'bg-green-500', description: 'Advanced text understanding' },
    { id: 'gemini', name: 'Google Gemini', color: 'bg-blue-500', description: 'Google\'s multimodal AI' },

    { id: 'grok', name: 'Grok', color: 'bg-orange-500', description: 'X.AI\'s language model' },
    { id: 'llama', name: 'Llama', color: 'bg-indigo-500', description: 'Meta\'s open model' },
    { id: 'cohere', name: 'Cohere', color: 'bg-pink-500', description: 'Command A with advanced reasoning' },
    { id: 'deepseek', name: 'DeepSeek', color: 'bg-cyan-500', description: 'Advanced language capabilities' }
  ]

  const filteredServices = annotateServicesWithKeys(services)

  return (
    <div className="space-y-4 sm:space-y-6 bg-gray-50 dark:bg-gray-900 min-h-screen p-4 sm:p-6 transition-colors duration-300">
      {/* Text Input Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Text Input
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            Add text prompts for AI analysis. Each prompt will be analyzed separately.
          </p>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <Button
              onClick={addTextPrompt}
              className="flex items-center gap-2"
            >
              <Plus className="h-4 w-4" />
              Add Text Prompt
            </Button>

            {textsWithStatus.length > 0 && (
              <div className="space-y-3">
                {textsWithStatus.map((prompt) => (
                  <div key={prompt.id} className="border rounded-lg p-4">
                    <div className="space-y-3">
                      <Input
                        placeholder="Enter title (optional)"
                        value={prompt.title}
                        onChange={(e) => updateTextPrompt(prompt.id, 'title', e.target.value)}
                        className="text-sm"
                      />
                      <Textarea
                        placeholder="Enter your text prompt here..."
                        value={prompt.text}
                        onChange={(e) => updateTextPrompt(prompt.id, 'text', e.target.value)}
                        className="min-h-[100px] text-sm"
                      />
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          {prompt.status === 'pending' && (
                            <span className="text-sm text-gray-500">Ready to analyze</span>
                          )}
                          {prompt.status === 'processing' && (
                            <div className="flex items-center gap-2">
                              <Loader2 className="h-4 w-4 animate-spin text-gray-600 dark:text-gray-400" />
                              <span className="text-sm text-gray-600 dark:text-gray-400">Processing...</span>
                            </div>
                          )}
                          {prompt.status === 'completed' && (
                            <div className="flex items-center gap-2">
                              <Check className="h-4 w-4 text-gray-600 dark:text-gray-400" />
                              <span className="text-sm text-gray-600 dark:text-gray-400">Completed</span>
                            </div>
                          )}
                          {prompt.status === 'error' && (
                            <div className="flex items-center gap-2">
                              <XCircle className="h-4 w-4 text-gray-600 dark:text-gray-400" />
                              <span className="text-sm text-gray-600 dark:text-gray-400">Error</span>
                            </div>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          {prompt.status === 'pending' && prompt.text.trim() && (
                            <Button
                              size="sm"
                              onClick={() => analyzeText(prompt)}
                              className="gap-1"
                            >
                              <FileText className="h-3 w-3" />
                              Analyze
                            </Button>
                          )}
                          {prompt.status === 'error' && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => analyzeText(prompt)}
                              className="gap-1"
                            >
                              <FileText className="h-3 w-3" />
                              Retry
                            </Button>
                          )}
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => removeTextPrompt(prompt.id)}
                            className="gap-1 text-red-600 hover:text-red-700"
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* AI Service Selection */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            AI Service Selection
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            Choose which AI service to use for text analysis
          </p>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredServices.map((service) => {
              const hasApiKey = service.hasApiKey
              return (
                <button
                  key={service.id}
                  onClick={() => hasApiKey && handleServiceToggle(service.id)}
                  disabled={!hasApiKey}
                  className={`relative p-4 rounded-xl border-2 transition-all duration-200 text-left ${!hasApiKey
                    ? 'border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 cursor-not-allowed opacity-50'
                    : selectedService === service.id
                      ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20 shadow-md'
                      : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600 hover:shadow-sm'
                    }`}
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-3 h-3 rounded-full ${service.color}`} />
                    <div className="flex-1">
                      <h3 className="font-medium text-sm text-gray-900 dark:text-gray-100">{service.name}</h3>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{service.description}</p>
                    </div>
                    {selectedService === service.id && (
                      <Check className="h-4 w-4 text-blue-600" />
                    )}
                  </div>
                  {!hasApiKey && (
                    <div className="mt-2 text-xs text-red-600 dark:text-red-400">
                      API key required
                    </div>
                  )}
                </button>
              )
            })}
          </div>
        </CardContent>
      </Card>

      {/* Custom Prompt */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Edit3 className="h-5 w-5" />
            Custom Analysis Prompt
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            Provide additional context for the AI analysis (optional)
          </p>
        </CardHeader>
        <CardContent>
          <textarea
            value={customPrompt}
            onChange={(e) => setCustomPrompt(e.target.value)}
            placeholder="e.g., Focus on business concepts, emphasize professional themes, target corporate buyers..."
            className="w-full p-3 border border-gray-200 rounded-lg resize-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            rows={3}
          />
        </CardContent>
      </Card>

      {/* Upload Table */}
      {textsWithStatus.length > 0 && (
        <div ref={uploadTableRef}>
          <UploadTable
            items={textsWithStatus}
            onAnalyze={analyzeText}
            onDelete={removeTextPrompt}
            onEdit={updateTextMetadata}
            onGenerateMetadata={() => { }} // Will be handled by the table
            onDownloadCSV={downloadCSV}
            type="text"
          />
        </div>
      )}

    </div>
  )
}

export default TextAnalysis