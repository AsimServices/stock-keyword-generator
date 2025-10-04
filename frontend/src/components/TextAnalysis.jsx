import { useState, useEffect } from 'react'
import { Button } from './ui/button.jsx'
import { Card, CardContent, CardHeader, CardTitle } from './ui/card.jsx'
import { Textarea } from './ui/textarea.jsx'
import { Input } from './ui/input.jsx'
import { useAppContext } from '../context/AppContext'
import { downloadTXT, downloadCSV, downloadExcel, downloadPDF } from '../utils/downloadUtils'
import { FileText, Loader2, Copy, Check, X, Download, FileSpreadsheet, File, Printer, Plus, Edit3, Save, XCircle, AlertCircle, Settings, Trash2, ChevronDown, ChevronUp } from 'lucide-react'
import { useApiKeys } from '../hooks/useApiKeys.js'
import { formatApiError } from '../utils/errorUtils.js'
import { motion, AnimatePresence } from 'framer-motion'

const TextAnalysis = () => {
  const { state, setTextData, updateTextResult, resetTextData } = useAppContext()
  const { textPrompts, selectedServices, results, isAnalyzing, currentProgress, totalPrompts } = state.textAnalysis
  const { apiKeys, loading: keysLoading, filterServicesWithKeys } = useApiKeys()
  const [selectedService, setSelectedService] = useState(() => {
    try {
      return localStorage.getItem('selectedTextAIService') || 'openai'
    } catch (error) {
      console.warn('localStorage not available:', error)
      return 'openai'
    }
  })

  const [newPrompt, setNewPrompt] = useState('')
  const [copiedIndex, setCopiedIndex] = useState(null)
  const [editingId, setEditingId] = useState(null)
  const [editContent, setEditContent] = useState('')
  const [showAllPrompts, setShowAllPrompts] = useState(false)
  const PROMPT_PREVIEW_COUNT = 5

  // Upload CSV/TXT of comma-separated prompts
  const handlePromptFileUpload = async (e) => {
    try {
      const file = e.target.files?.[0]
      if (!file) return
      const text = await file.text()
      const parts = text.split(',').map(p => p.trim()).filter(Boolean)
      if (parts.length === 0) return
      const newItems = parts.map(t => ({
        id: Date.now() + Math.random(),
        text: t,
        title: t.substring(0, 50) + (t.length > 50 ? '...' : '')
      }))
      setTextData({ textPrompts: [...textPrompts, ...newItems] })
      // reset input value to allow re-upload of same file if needed
      e.target.value = ''
    } catch (err) {
      console.error('Failed to parse prompts file:', err)
    }
  }

  const services = [
    {
      id: 'openai',
      name: 'OpenAI GPT-4',
      color: 'bg-green-500',
      gradient: 'from-green-400 to-green-600',
      description: 'Advanced text understanding and generation capabilities'
    },
    {
      id: 'gemini',
      name: 'Google Gemini Pro',
      color: 'bg-blue-500',
      gradient: 'from-blue-400 to-blue-600',
      description: 'Multimodal AI with excellent text processing'
    },
    {
      id: 'grok',
      name: 'xAI Grok',
      color: 'bg-purple-500',
      gradient: 'from-purple-400 to-purple-600',
      description: 'Real-time knowledge and creative text generation'
    },
    {
      id: 'llama',
      name: 'Meta Llama 3.1',
      color: 'bg-orange-500',
      gradient: 'from-orange-400 to-orange-600',
      description: 'Open-source language model for comprehensive analysis'
    },
    {
      id: 'cohere',
      name: 'Cohere Command-R+',
      color: 'bg-pink-500',
      gradient: 'from-pink-400 to-pink-600',
      description: 'Enterprise-grade text understanding and generation'
    },
    {
      id: 'deepseek',
      name: 'DeepSeek V2.5',
      color: 'bg-indigo-500',
      gradient: 'from-indigo-400 to-indigo-600',
      description: 'High-performance model for detailed text analysis'
    }
  ]

  // Load data from context on mount
  useEffect(() => {
    // Data is automatically loaded from context
  }, [])

  const addPrompt = () => {
    if (newPrompt.trim()) {
      const prompt = {
        id: Date.now() + Math.random(),
        text: newPrompt.trim(),
        title: newPrompt.trim().substring(0, 50) + (newPrompt.length > 50 ? '...' : '')
      }

      const updatedPrompts = [...textPrompts, prompt]
      setTextData({ textPrompts: updatedPrompts })
      setNewPrompt('')
    }
  }

  const removePrompt = (promptId) => {
    const updatedPrompts = textPrompts.filter(prompt => prompt.id !== promptId)
    const updatedResults = results.filter(result => result.textId !== promptId)
    setTextData({
      textPrompts: updatedPrompts,
      results: updatedResults
    })
  }

  const handleServiceToggle = (serviceId) => {
    setSelectedService(serviceId)
    try {
      localStorage.setItem('selectedTextAIService', serviceId)
    } catch (error) {
      console.warn('Failed to save service selection to localStorage:', error)
    }
  }

  const analyzeTexts = async () => {
    if (textPrompts.length === 0 || !selectedService) return

    setTextData({
      isAnalyzing: true,
      currentProgress: 0,
      totalPrompts: textPrompts.length
    })

    try {
      for (let i = 0; i < textPrompts.length; i++) {
        const prompt = textPrompts[i]
        setTextData({ currentProgress: i + 1 })

        const response = await fetch('/api/analyze-text', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            text: prompt.text,
            filename: prompt.title || 'text_prompt.txt',
            services: [selectedService]
          })
        })

        const data = await response.json()

        if (data.results) {
          const textResults = data.results.map(result => ({
            ...result,
            id: Date.now() + Math.random(),
            textId: prompt.id,
            textName: prompt.title
          }))
          setTextData({ results: [...results, ...textResults] })
        } else if (data.error) {
          console.error('Analysis error:', data.error)
          const errorResult = {
            id: Date.now() + Math.random(),
            textId: prompt.id,
            textName: prompt.title,
            service: 'Error',
            success: false,
            error: formatApiError(data.error)
          }
          setTextData({ results: [...results, errorResult] })
        }
      }
    } catch (error) {
      console.error('Error analyzing texts:', error)
    } finally {
      setTextData({
        isAnalyzing: false,
        currentProgress: 0,
        totalPrompts: 0
      })
    }
  }

  const copyToClipboard = async (text, index) => {
    try {
      await navigator.clipboard.writeText(text)
      setCopiedIndex(index)
      setTimeout(() => setCopiedIndex(null), 2000)
    } catch (error) {
      console.error('Failed to copy text:', error)
    }
  }

  const startEditing = (result) => {
    setEditingId(result.id)
    setEditContent(result.result)
  }

  const saveEdit = () => {
    updateTextResult(editingId, editContent)
    setEditingId(null)
    setEditContent('')
  }

  const cancelEdit = () => {
    setEditingId(null)
    setEditContent('')
  }

  const downloadResults = (format) => {
    if (results.length === 0) return

    switch (format) {
      case 'txt':
        downloadTXT(results, 'text-analysis')
        break
      case 'csv':
        downloadCSV(results, 'text-analysis')
        break
      case 'excel':
        downloadExcel(results, 'text-analysis')
        break
      case 'pdf':
        downloadPDF(results, 'text-analysis')
        break
    }
  }

  const groupedResults = results.reduce((acc, result) => {
    if (!acc[result.textId]) {
      acc[result.textId] = {
        textName: result.textName,
        results: []
      }
    }
    acc[result.textId].results.push(result)
    return acc
  }, {})

  return (
    <div className="space-y-6">
      {/* Text Input Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Text Prompts
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            Add text prompts to generate keywords, titles, and content analysis using AI models.
          </p>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {/* Add New Prompt */}
            <div className="flex gap-2">
              <Textarea
                value={newPrompt}
                onChange={(e) => setNewPrompt(e.target.value)}
                placeholder="Enter your text prompt here... (e.g., 'A beautiful sunset over mountains', 'Product description for eco-friendly water bottle')"
                className="flex-1 min-h-20"
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && e.ctrlKey) {
                    addPrompt()
                  }
                }}
              />
              <Button
                onClick={addPrompt}
                disabled={!newPrompt.trim()}
                className="flex items-center gap-2 self-start"
              >
                <Plus className="h-4 w-4" />
                Add
              </Button>
            </div>
            <p className="text-xs text-gray-500">
              Tip: Press Ctrl+Enter to quickly add a prompt
            </p>

            {/* Upload prompts from CSV/TXT (comma-separated) */}
            <div className="flex items-center gap-2">
              <Input
                type="file"
                accept=".csv,.txt"
                onChange={handlePromptFileUpload}
                className="w-full sm:w-auto"
              />
              <span className="text-xs text-gray-500">
                Upload CSV/TXT with prompts separated by commas
              </span>
            </div>

            {/* Existing Prompts */}
            {textPrompts.length > 0 && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <h4 className="font-medium text-sm text-gray-700">
                      Added Prompts ({textPrompts.length})
                    </h4>
                    {textPrompts.length > PROMPT_PREVIEW_COUNT && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setShowAllPrompts(!showAllPrompts)}
                        className="flex items-center gap-1"
                      >
                        {showAllPrompts ? (
                          <ChevronUp className="h-3 w-3" />
                        ) : (
                          <ChevronDown className="h-3 w-3" />
                        )}
                        {showAllPrompts ? 'Collapse' : `Expand (${PROMPT_PREVIEW_COUNT} shown)`}
                      </Button>
                    )}
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={resetTextData}
                    className="flex items-center gap-2 text-red-600 hover:text-red-700 hover:bg-red-50"
                  >
                    <Trash2 className="h-3 w-3" />
                    Clear All
                  </Button>
                </div>
                <div className={`space-y-2 ${showAllPrompts ? 'max-h-72 overflow-auto pr-1' : ''}`}>
                  {(showAllPrompts ? textPrompts : textPrompts.slice(0, PROMPT_PREVIEW_COUNT)).map((prompt) => (
                    <div key={prompt.id} className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
                      <FileText className="h-4 w-4 text-gray-500 mt-1 flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 truncate">
                          {prompt.title}
                        </p>
                        <p className="text-xs text-gray-600 mt-1 line-clamp-2">
                          {prompt.text}
                        </p>
                      </div>
                      <button
                        onClick={() => removePrompt(prompt.id)}
                        className="text-red-500 hover:text-red-700 p-1"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  ))}
                </div>
                {!showAllPrompts && textPrompts.length > PROMPT_PREVIEW_COUNT && (
                  <p className="text-xs text-gray-500">Showing first {PROMPT_PREVIEW_COUNT} of {textPrompts.length} prompts.</p>
                )}
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Enhanced Service Selection */}
      <Card>
        <CardHeader>
          <CardTitle>Select AI Service</CardTitle>
          <p className="text-sm text-muted-foreground">
            Choose an AI model to analyze your text prompts with
          </p>
        </CardHeader>
        <CardContent>
          {keysLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-gray-500" />
              <span className="ml-2 text-gray-500">Checking API keys...</span>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {filterServicesWithKeys(services).map((service) => {
                  const hasApiKey = service.hasApiKey
                  return (
                    <button
                      key={service.id}
                      onClick={() => hasApiKey && handleServiceToggle(service.id)}
                      disabled={!hasApiKey}
                      className={`relative p-6 rounded-xl border-2 transition-all duration-200 text-left min-h-[160px] ${!hasApiKey
                        ? 'border-gray-200 bg-gray-50 opacity-60 cursor-not-allowed'
                        : selectedService === service.id
                          ? 'border-blue-500 bg-blue-50 shadow-lg scale-[1.02] cursor-pointer'
                          : 'border-gray-200 hover:border-blue-300 hover:bg-gray-50 hover:shadow-md hover:scale-[1.01] cursor-pointer'
                        }`}
                    >
                      {selectedService === service.id && hasApiKey && (
                        <div className="absolute -top-1 -right-1 w-5 h-5 bg-blue-500 rounded-full flex items-center justify-center">
                          <Check className="h-3 w-3 text-white" />
                        </div>
                      )}

                      <div className="flex items-center justify-between mb-2">
                        <div className={`w-3 h-3 rounded-full ${service.color}`} />
                        {hasApiKey ? (
                          <span className="bg-green-100 text-green-700 text-xs px-2 py-1 rounded-md font-medium">
                            Ready
                          </span>
                        ) : (
                          <span className="bg-red-100 text-red-700 text-xs px-2 py-1 rounded-md font-medium flex items-center gap-1">
                            <AlertCircle className="h-3 w-3" />
                            No API Key
                          </span>
                        )}
                      </div>

                      <h3 className={`font-bold text-base mb-3 ${hasApiKey ? 'text-gray-900' : 'text-gray-500'}`}>
                        {service.name}
                      </h3>

                      <p className={`text-sm leading-relaxed ${hasApiKey ? 'text-gray-600' : 'text-gray-400'}`}>
                        {hasApiKey ? service.description : 'Configure API key in settings to use this service'}
                      </p>
                    </button>
                  )
                })}
              </div>

              {filterServicesWithKeys(services).every(s => !s.hasApiKey) && (
                <div className="text-center py-8">
                  <AlertCircle className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">No API Keys Configured</h3>
                  <p className="text-gray-600 mb-4">Add your AI service API keys in settings to start analyzing text.</p>
                  <Button variant="outline" className="gap-2" onClick={() => window.location.assign('/settings')}>
                    <Settings className="h-4 w-4" />
                    Go to Settings
                  </Button>
                </div>
              )}
            </>
          )}

          {/* Progress indicator */}
          {isAnalyzing && (
            <div className="mt-6 space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span>Analyzing prompts...</span>
                <span>{currentProgress} of {totalPrompts}</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${(currentProgress / totalPrompts) * 100}%` }}
                />
              </div>
            </div>
          )}

          <Button
            onClick={analyzeTexts}
            disabled={textPrompts.length === 0 || !selectedService || isAnalyzing}
            className="w-full mt-6"
            size="lg"
          >
            {isAnalyzing ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Analyzing {currentProgress} of {totalPrompts}...
              </>
            ) : (
              `Analyze ${textPrompts.length} Prompt${textPrompts.length !== 1 ? 's' : ''}`
            )}
          </Button>
        </CardContent>
      </Card>

      {/* Download Section */}
      {results.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Download className="h-5 w-5" />
              Download Results
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              <Button
                onClick={() => downloadResults('txt')}
                variant="outline"
                className="flex items-center gap-2"
              >
                <FileText className="h-4 w-4" />
                TXT
              </Button>
              <Button
                onClick={() => downloadResults('csv')}
                variant="outline"
                className="flex items-center gap-2"
              >
                <FileSpreadsheet className="h-4 w-4" />
                CSV
              </Button>
              <Button
                onClick={() => downloadResults('excel')}
                variant="outline"
                className="flex items-center gap-2"
              >
                <File className="h-4 w-4" />
                Excel
              </Button>
              <Button
                onClick={() => downloadResults('pdf')}
                variant="outline"
                className="flex items-center gap-2"
              >
                <Printer className="h-4 w-4" />
                PDF
              </Button>
            </div>
            <p className="text-sm text-muted-foreground mt-2">
              Download all successful analysis results in your preferred format
            </p>
          </CardContent>
        </Card>
      )}

      {/* Results */}
      <AnimatePresence>
        {Object.keys(groupedResults).length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="space-y-6"
          >
            <h3 className="text-xl font-semibold">Analysis Results</h3>
            {Object.entries(groupedResults).map(([textId, textGroup]) => (
              <Card key={textId} className="overflow-hidden">
                <CardHeader className="bg-gray-50">
                  <CardTitle className="flex items-center gap-2">
                    <FileText className="h-4 w-4" />
                    {textGroup.textName}
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                  <div className="space-y-4 p-6">
                    {textGroup.results.map((result, index) => {
                      const service = services.find(s => s.name.toLowerCase().includes(result.service.toLowerCase()))
                      const globalIndex = `${textId}-${index}`
                      const isEditing = editingId === result.id

                      return (
                        <Card key={index} className={result.success ? 'border-gray-200' : 'border-red-200'}>
                          <CardHeader className="pb-3">
                            <CardTitle className="flex items-center justify-between text-base">
                              <div className="flex items-center gap-2">
                                {service && <span className="text-lg">{service.icon}</span>}
                                {service && <div className={`w-3 h-3 rounded-full ${service.color}`} />}
                                {result.service}
                              </div>
                              {result.success && (
                                <div className="flex items-center gap-2">
                                  {!isEditing && (
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      onClick={() => startEditing(result)}
                                      className="flex items-center gap-2"
                                    >
                                      <Edit3 className="h-4 w-4" />
                                      Edit
                                    </Button>
                                  )}
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => copyToClipboard(result.result, globalIndex)}
                                    className="flex items-center gap-2"
                                  >
                                    {copiedIndex === globalIndex ? (
                                      <>
                                        <Check className="h-4 w-4" />
                                        Copied
                                      </>
                                    ) : (
                                      <>
                                        <Copy className="h-4 w-4" />
                                        Copy
                                      </>
                                    )}
                                  </Button>
                                </div>
                              )}
                            </CardTitle>
                          </CardHeader>
                          <CardContent>
                            {result.success ? (
                              isEditing ? (
                                <div className="space-y-3">
                                  <Textarea
                                    value={editContent}
                                    onChange={(e) => setEditContent(e.target.value)}
                                    className="min-h-32 resize-none"
                                  />
                                  <div className="flex items-center gap-2">
                                    <Button
                                      onClick={saveEdit}
                                      size="sm"
                                      className="flex items-center gap-2"
                                    >
                                      <Save className="h-4 w-4" />
                                      Save
                                    </Button>
                                    <Button
                                      onClick={cancelEdit}
                                      variant="outline"
                                      size="sm"
                                      className="flex items-center gap-2"
                                    >
                                      <XCircle className="h-4 w-4" />
                                      Cancel
                                    </Button>
                                  </div>
                                </div>
                              ) : (
                                <Textarea
                                  value={result.result}
                                  readOnly
                                  className="min-h-24 resize-none bg-gray-50"
                                />
                              )
                            ) : (
                              <div className="text-red-600 bg-red-50 p-3 rounded-md">
                                <p className="font-medium">Error:</p>
                                <p className="text-sm">{result.error}</p>
                              </div>
                            )}
                          </CardContent>
                        </Card>
                      )
                    })}
                  </div>
                </CardContent>
              </Card>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

export default TextAnalysis
