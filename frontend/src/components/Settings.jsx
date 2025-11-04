import { useState, useEffect } from 'react'
import { useUser } from '@clerk/clerk-react'
import { Button } from './ui/button.jsx'
import { Card, CardContent, CardHeader, CardTitle } from './ui/card.jsx'
import { Input } from './ui/input.jsx'
import { Label } from './ui/label.jsx'
import { Textarea } from './ui/textarea.jsx'
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs.jsx'
import { Select, SelectItem } from './ui/select.jsx'
import { Settings as SettingsIcon, Key, MessageSquare, Save, Trash2, RotateCcw, Eye, EyeOff, Loader2, CheckCircle2, XCircle } from 'lucide-react'
import { motion } from 'framer-motion'

const Settings = () => {
  const { user } = useUser()
  const [settings, setSettings] = useState({
    openai_api_key: '',
    gemini_api_key: '',
    groq_api_key: '',
    grok_api_key: '',
    llama_api_key: '',
    cohere_api_key: '',
    deepseek_api_key: '',
    openai_model: 'gpt-4o',
    gemini_model: 'gemini-1.5-pro',
    groq_model: 'llama-3.2-11b-vision-preview',
    grok_model: 'grok-2-vision',
    llama_model: 'llama-3.1-70b',
    cohere_model: 'command-a-vision-07-2025',
    deepseek_model: 'deepseek-vl-7b-chat',
    global_system_prompt: '',
    additional_context: ''
  })

  const [apiKeys, setApiKeys] = useState({
    openai_api_key: '',
    gemini_api_key: '',
    groq_api_key: '',
    grok_api_key: '',
    llama_api_key: '',
    cohere_api_key: '',
    deepseek_api_key: ''
  })

  const [showKeys, setShowKeys] = useState({
    openai: false,
    gemini: false,
    groq: false,
    grok: false,
    llama: false,
    cohere: false,
    deepseek: false
  })

  const [isSaving, setIsSaving] = useState(false)
  const [saveMessage, setSaveMessage] = useState('')
  const [validating, setValidating] = useState({
    openai: false,
    gemini: false,
    groq: false,
    grok: false,
    llama: false,
    cohere: false,
    deepseek: false
  })
  const [validationStatus, setValidationStatus] = useState({})
  const validationTimersRef = useState({ current: {} })[0]

  const services = [
    {
      id: 'openai',
      name: 'OpenAI',
      color: 'bg-gray-900 dark:bg-gray-100',
      description: 'GPT-5 and GPT-4 series models support both text and image inputs (Vision/Chat).',
      models: [
        // Current Multimodal (Vision & Chat)
        { value: 'gpt-5', label: 'GPT-5 (Vision/Chat)' },
        { value: 'gpt-4o', label: 'GPT-4o (Vision/Chat)' },
        { value: 'gpt-4-turbo', label: 'GPT-4 Turbo (Vision/Chat)' }
      ]
    },
    {
      id: 'gemini',
      name: 'Google Gemini',
      color: 'bg-gray-900 dark:bg-gray-100',
      description: 'All listed Gemini models are multimodal, supporting text, image, and often video inputs.',
      models: [
        // All Gemini models are natively multimodal (Vision & Chat)
        { value: 'gemini-2.5-pro', label: 'Gemini 2.5 Pro (Vision/Chat)' },
        { value: 'gemini-2.5-flash', label: 'Gemini 2.5 Flash (Vision/Chat)' },
        { value: 'gemini-2.5-flash-lite', label: 'Gemini 2.5 Flash Lite (Vision/Chat)' },
        { value: 'gemini-2.5-flash-image', label: 'Gemini 2.5 Flash Image (Vision/Chat)' }
      ]
    },
    {
      id: 'groq',
      name: 'Groq',
      color: 'bg-yellow-500',
      description: 'LPU-powered inference with fast open-source models. FREE models available for both vision and text.',
      models: [
        // Multimodal (Vision & Chat) - Free models available
        { value: 'llama-3.2-11b-vision-preview', label: 'Llama 3.2 11B Vision (Vision/Chat) - FREE' },
        { value: 'llama-3.2-90b-vision-preview', label: 'Llama 3.2 90B Vision (Vision/Chat) - FREE' },
        // Text-Only (Chat) - Known for high speed, FREE
        { value: 'llama-3.1-70b-versatile', label: 'Llama 3.1 70B (Chat) - FREE' },
        { value: 'mixtral-8x7b-32768', label: 'Mixtral 8x7B (Chat) - FREE' },
        { value: 'llama-3.1-8b-instant', label: 'Llama 3.1 8B (Chat) - FREE' }
      ]
    },
    {
      id: 'grok',
      name: 'xAI Grok',
      color: 'bg-gray-900 dark:bg-gray-100',
      description: 'xAI’s models with vision and chat capabilities.',
      models: [
        { value: 'grok-4', label: 'Grok 4 (Vision/Chat)' },
        { value: 'grok-4-fast-reasoning', label: 'Grok 4 Fast Reasoning (Chat)' },
        { value: 'grok-3', label: 'Grok 3 (Chat)' },
        { value: 'grok-3-mini', label: 'Grok 3 Mini (Chat)' }
      ]
    },
    {
      id: 'llama',
      name: 'Meta Llama (API)',
      color: 'bg-gray-900 dark:bg-gray-100',
      description: 'Meta’s models, available directly via their API or through partners like Vertex AI.',
      models: [
        // Text-Only (Chat)
        { value: 'llama-3.1-70b', label: 'Llama 3.1 70B (Chat)' },
        { value: 'llama-3.1-8b', label: 'Llama 3.1 8B (Chat)' }
      ]
    },
    {
      id: 'cohere',
      name: 'Cohere',
      color: 'bg-pink-500',
      description: 'Cohere\'s Command models with advanced vision capabilities, multilingual support, and enterprise-grade performance.',
      models: [
        { value: 'command-a-vision-07-2025', label: 'Command A Vision (Vision/Chat) - New' }
      ]
    },
    {
      id: 'deepseek',
      name: 'DeepSeek',
      color: 'bg-indigo-500',
      description: 'Vision-Language and text-based reasoning models.',
      models: [
        // Multimodal (Vision & Chat)
        { value: 'deepseek-vl-7b-chat', label: 'DeepSeek VL 7B (Vision/Chat)' },
        // Text-Only (Chat)
        { value: 'deepseek-reasoner', label: 'DeepSeek Reasoner (Chat)' }
      ]
    }
  ]

  useEffect(() => {
    fetchSettings()
  }, [user])

  const fetchSettings = async () => {
    if (!user) return

    // Load API keys ONLY from localStorage (never from server)
    const loadFromLocalStorage = () => {
      try {
        const storageKey = `api_keys_${user.id}`
        const stored = localStorage.getItem(storageKey)
        if (stored) {
          const parsedKeys = JSON.parse(stored)
          setApiKeys(prev => ({ ...prev, ...parsedKeys }))
          console.log('Loaded API keys from localStorage')
          return parsedKeys
        }
      } catch (error) {
        console.warn('Failed to load from localStorage:', error)
      }
      return null
    }

    // Load API keys from localStorage
    loadFromLocalStorage()

    // Load other settings (models, prompts) from server (but not API keys)
    try {
      // Fetch settings for form editing (unmasked API keys - but we won't use them for API keys)
      const response = await fetch('/api/user-settings/form', {
        headers: {
          'X-User-ID': user.id,
          'Content-Type': 'application/json'
        }
      })

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      // Check content type before parsing
      const contentType = response.headers.get('content-type') || ''
      const responseText = await response.text()

      if (!contentType.includes('application/json')) {
        throw new Error(`Server returned non-JSON. Status: ${response.status}`)
      }

      let data
      try {
        data = JSON.parse(responseText)
      } catch (jsonError) {
        console.error('Failed to parse JSON:', responseText.substring(0, 200))
        throw new Error('Invalid JSON response from server')
      }

      // Update settings but exclude API keys (we only use localStorage for API keys)
      setSettings(prev => ({
        ...prev,
        // Only update non-API-key settings
        openai_model: data.openai_model || prev.openai_model,
        gemini_model: data.gemini_model || prev.gemini_model,
        groq_model: data.groq_model || prev.groq_model,
        grok_model: data.grok_model || prev.grok_model,
        llama_model: data.llama_model || prev.llama_model,
        cohere_model: data.cohere_model || prev.cohere_model,
        deepseek_model: data.deepseek_model || prev.deepseek_model,
        global_system_prompt: data.global_system_prompt || prev.global_system_prompt,
        additional_context: data.additional_context || prev.additional_context
      }))

      // API keys are already loaded from localStorage above, so we don't set them here

    } catch (error) {
      console.error('Failed to load settings from server:', error)

      // Fallback to regular endpoint if form endpoint fails
      try {
        const response = await fetch('/api/user-settings', {
          headers: {
            'X-User-ID': user.id,
            'Content-Type': 'application/json'
          }
        })

        const contentType = response.headers.get('content-type') || ''
        const responseText = await response.text()

        if (contentType.includes('application/json')) {
          const data = JSON.parse(responseText)
          // Only update non-API-key settings
          setSettings(prev => ({
            ...prev,
            openai_model: data.openai_model || prev.openai_model,
            gemini_model: data.gemini_model || prev.gemini_model,
            groq_model: data.groq_model || prev.groq_model,
            grok_model: data.grok_model || prev.grok_model,
            llama_model: data.llama_model || prev.llama_model,
            cohere_model: data.cohere_model || prev.cohere_model,
            deepseek_model: data.deepseek_model || prev.deepseek_model,
            global_system_prompt: data.global_system_prompt || prev.global_system_prompt,
            additional_context: data.additional_context || prev.additional_context
          }))
        }
        // API keys remain loaded from localStorage only
      } catch (fallbackError) {
        console.error('Fallback also failed:', fallbackError)
        // API keys are already loaded from localStorage, so we're good
      }
    }
  }

  const handleApiKeyChange = (service, value) => {
    setApiKeys(prev => ({
      ...prev,
      [`${service}_api_key`]: value
    }))
    // debounce prefix validation for this service
    setValidating(prev => ({ ...prev, [service]: true }))
    const timers = validationTimersRef.current
    if (timers[service]) {
      clearTimeout(timers[service])
    }
    timers[service] = setTimeout(() => {
      validateKeyPrefix(service, value)
      setValidating(prev => ({ ...prev, [service]: false }))
    }, 400)
  }

  const handleAdditionalContextChange = (value) => {
    setSettings(prev => ({
      ...prev,
      additional_context: value
    }))
  }

  const handleModelChange = (service, value) => {
    setSettings(prev => ({
      ...prev,
      [`${service}_model`]: value
    }))
  }

  const toggleKeyVisibility = (service) => {
    setShowKeys(prev => ({
      ...prev,
      [service]: !prev[service]
    }))
  }

  const saveSettings = async () => {
    setIsSaving(true)
    setSaveMessage('')

    // Declare apiKeysToSave before try block to fix scope issue
    const apiKeysToSave = {}
    Object.entries(apiKeys).forEach(([key, value]) => {
      if (value && value.trim()) {
        apiKeysToSave[key] = value.trim()
      }
    })

    try {
      // Save API keys ONLY to localStorage (not to server)
      const hasApiKeys = Object.keys(apiKeysToSave).length > 0
      if (hasApiKeys) {
        try {
          const storageKey = `api_keys_${user?.id || 'local'}`
          localStorage.setItem(storageKey, JSON.stringify(apiKeysToSave))
          console.log('API keys saved to localStorage')
        } catch (storageError) {
          console.warn('Failed to save to localStorage:', storageError)
          throw new Error('Failed to save API keys to localStorage')
        }
      }

      // Only send non-API-key settings to server (models, prompts, etc.)
      const payload = Object.fromEntries(
        Object.entries(settings).filter(([key]) =>
          key.includes('_model') || key === 'additional_context' || key === 'global_system_prompt'
        )
      )

      // Only send to server if there are non-API-key settings to save
      if (Object.keys(payload).length > 0) {
        const response = await fetch('/api/user-settings', {
          method: 'POST',
          headers: {
            'X-User-ID': user.id,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(payload)
        })

        // Check if response is JSON before parsing
        const contentType = response.headers.get('content-type') || ''
        let data = null

        // Get response as text first to check what we're dealing with
        const responseText = await response.text()

        if (contentType.includes('application/json')) {
          try {
            data = JSON.parse(responseText)
          } catch (jsonError) {
            // If JSON parsing fails, log what we got
            console.error('Failed to parse JSON response:', responseText.substring(0, 200))
            throw new Error(`Server returned invalid JSON. Status: ${response.status}`)
          }
        } else {
          // Server returned HTML or other non-JSON response
          console.error('Server returned non-JSON response:', responseText.substring(0, 200))
          throw new Error(`Server error: Received HTML instead of JSON. Status: ${response.status}`)
        }

        if (!response.ok) {
          throw new Error(`Server error: ${data?.error || response.statusText}`)
        }
      }

      // Success message
      if (hasApiKeys && Object.keys(payload).length > 0) {
        setSaveMessage('API Keys and Settings Saved Successfully!')
      } else if (hasApiKeys) {
        setSaveMessage('API Keys Saved Successfully!')
      } else if (Object.keys(payload).length > 0) {
        setSaveMessage('Settings Saved Successfully!')
      } else {
        setSaveMessage('Nothing to save')
      }

      // Reload settings (but not API keys from server)
      await fetchSettings()

      // Set timeout to clear message after 3 seconds
      setTimeout(() => setSaveMessage(''), 3000)
    } catch (error) {
      // Error handling - API keys are already saved to localStorage if they were being saved
      if (hasApiKeys) {
        setSaveMessage(`API keys saved to localStorage. Error saving other settings: ${error.message}`)
      } else {
        setSaveMessage(`Error: ${error.message}`)
      }
      setTimeout(() => setSaveMessage(''), 5000)
    } finally {
      setIsSaving(false)
    }
  }

  // Client-side prefix validation for common API key formats
  const validateKeyPrefix = (service, key) => {
    const trimmed = (key || '').trim()
    let ok = false
    let message = ''
    switch (service) {
      case 'openai':
        ok = /^sk-/.test(trimmed)
        message = ok ? 'Looks like an OpenAI key' : 'Expected to start with sk-'
        break
      case 'gemini':
        ok = /^AIza/.test(trimmed)
        message = ok ? 'Looks like a Google API key' : 'Expected to start with AIza'
        break
      case 'groq':
        ok = /^gsk_/.test(trimmed)
        message = ok ? 'Looks like a Groq key' : 'Expected to start with gsk_'
        break
      case 'grok':
        ok = /^xai-/.test(trimmed)
        message = ok ? 'Looks like an xAI key' : 'Expected to start with xai-'
        break
      case 'llama':
        ok = /^llx_/.test(trimmed) || /^sk_/.test(trimmed)
        message = ok ? 'Looks like a Llama API key' : 'Unexpected prefix'
        break
      case 'cohere':
        ok = /^sk_/.test(trimmed) || /^[A-Za-z0-9]{20,}/.test(trimmed)
        message = ok ? 'Looks like a Cohere key' : 'Expected to start with sk_ or be a long alphanumeric string'
        break
      case 'deepseek':
        ok = /^sk-/.test(trimmed)
        message = ok ? 'Looks like a DeepSeek key' : 'Expected to start with sk-'
        break
      default:
        ok = trimmed.length > 0
        message = ok ? 'Entered' : 'Empty'
    }
    setValidationStatus(prev => ({
      ...prev,
      [service]: { service, valid: ok, message }
    }))
  }

  const clearApiKeys = async () => {
    try {
      // Clear API keys from localStorage only (not from server)
      const storageKey = `api_keys_${user.id}`
      localStorage.removeItem(storageKey)

      // Clear the form inputs
      setApiKeys({
        openai_api_key: '',
        gemini_api_key: '',
        groq_api_key: '',
        grok_api_key: '',
        llama_api_key: '',
        cohere_api_key: '',
        deepseek_api_key: ''
      })

      setSaveMessage('API keys cleared successfully!')

      // No need to fetch from server since API keys are localStorage-only
      setTimeout(() => setSaveMessage(''), 3000)
    } catch (error) {
      setSaveMessage(`Error: ${error.message}`)
      setTimeout(() => setSaveMessage(''), 3000)
    }
  }

  const resetPrompts = async () => {
    try {
      const response = await fetch('/api/user-settings/prompts/reset', {
        method: 'POST',
        headers: {
          'X-User-ID': user.id,
          'Content-Type': 'application/json',
        }
      })

      // Check content type before parsing
      const contentType = response.headers.get('content-type') || ''
      const responseText = await response.text()

      if (response.ok) {
        if (contentType.includes('application/json')) {
          try {
            const data = JSON.parse(responseText)
            setSaveMessage('System prompts reset to default!')
          } catch (jsonError) {
            console.error('Failed to parse JSON response:', jsonError)
            setSaveMessage('System prompts reset to default!')
          }
        } else {
          setSaveMessage('System prompts reset to default!')
        }
        await fetchSettings()
      } else {
        let errorMessage = 'Failed to reset prompts'
        if (contentType.includes('application/json')) {
          try {
            const errorData = JSON.parse(responseText)
            errorMessage = errorData.error || errorMessage
          } catch (jsonError) {
            errorMessage = `Server error: Status ${response.status}`
          }
        }
        setSaveMessage(`Error: ${errorMessage}`)
      }
    } catch (error) {
      setSaveMessage(`Error: ${error.message}`)
    } finally {
      setTimeout(() => setSaveMessage(''), 3000)
    }
  }

  return (
    <div className="space-y-4 sm:space-y-6 bg-gray-50 dark:bg-gray-900 min-h-screen p-4 sm:p-6 transition-colors duration-300">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <SettingsIcon className="h-5 w-5" />
            Platform Settings
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">
            Configure your AI service API keys and customize system prompts for optimal results.
            Your API keys are stored securely and only used for analysis requests.
          </p>
        </CardContent>
      </Card>

      <Tabs defaultValue="api-keys" className="space-y-6">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="api-keys" className="flex items-center gap-2">
            <Key className="h-4 w-4" />
            API Keys & Models
          </TabsTrigger>
          <TabsTrigger value="prompts" className="flex items-center gap-2">
            <MessageSquare className="h-4 w-4" />
            AI Configuration
          </TabsTrigger>
        </TabsList>

        <TabsContent value="api-keys" className="space-y-4 sm:space-y-6">
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 sm:gap-6">
            {services.map((service) => (
              <Card key={service.id}>
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className={`w-4 h-4 rounded-full ${service.color}`} />
                      <div>
                        <h3 className="text-lg font-medium">{service.name}</h3>
                        <p className="text-sm text-muted-foreground">{service.description}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {settings[`${service.id}_api_key`] && (
                        <span className="text-xs bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-200 px-2 py-1 rounded-full">
                          Configured
                        </span>
                      )}
                    </div>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor={`${service.id}-key`}>API Key</Label>
                      <div className="flex gap-2">
                        <Input
                          id={`${service.id}-key`}
                          type={showKeys[service.id] ? 'text' : 'password'}
                          placeholder={settings[`${service.id}_api_key`] ? `API key: ${settings[`${service.id}_api_key`]} (enter new key to update)` : 'Enter your API key'}
                          value={apiKeys[`${service.id}_api_key`] || ''}
                          onChange={(e) => handleApiKeyChange(service.id, e.target.value)}
                          className="flex-1"
                        />
                        <Button
                          variant="outline"
                          size="icon"
                          onClick={() => toggleKeyVisibility(service.id)}
                        >
                          {showKeys[service.id] ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </Button>
                      </div>
                      {apiKeys[`${service.id}_api_key`] && (
                        <div className="flex items-center gap-2 text-xs mt-1">
                          {validating[service.id] ? (
                            <>
                              <Loader2 className="h-3 w-3 animate-spin" />
                              <span>Validating key format…</span>
                            </>
                          ) : validationStatus[service.id] ? (
                            <>
                              {validationStatus[service.id].valid ? (
                                <CheckCircle2 className="h-3 w-3 text-gray-600 dark:text-gray-400" />
                              ) : (
                                <XCircle className="h-3 w-3 text-gray-600 dark:text-gray-400" />
                              )}
                              <span className={validationStatus[service.id].valid ? 'text-gray-700 dark:text-gray-300' : 'text-gray-600 dark:text-gray-400'}>
                                {validationStatus[service.id].message}
                              </span>
                            </>
                          ) : null}
                        </div>
                      )}
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor={`${service.id}-model`}>Model</Label>
                      <Select
                        id={`${service.id}-model`}
                        value={settings[`${service.id}_model`] || service.models[0]?.value || ''}
                        onChange={(e) => handleModelChange(service.id, e.target.value)}
                      >
                        {service.models.map((model) => (
                          <SelectItem key={model.value} value={model.value}>
                            {model.label}
                          </SelectItem>
                        ))}
                      </Select>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          <Card className="bg-gradient-to-r from-gray-50 to-gray-100 dark:from-gray-800 dark:to-gray-900 border-2 border-dashed border-gray-300 dark:border-gray-600">
            <CardContent className="p-6">
              <div className="flex flex-col sm:flex-row gap-4">
                <Button
                  onClick={saveSettings}
                  disabled={isSaving}
                  className="flex items-center gap-2 bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white font-semibold px-6 py-3 rounded-lg shadow-lg hover:shadow-xl transition-all duration-200"
                >
                  {isSaving ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      <span>Saving...</span>
                    </>
                  ) : (
                    <>
                      <Save className="h-4 w-4" />
                      <span>Save All API Keys & Models</span>
                    </>
                  )}
                </Button>
                <Button
                  variant="destructive"
                  onClick={clearApiKeys}
                  className="flex items-center gap-2 bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white font-semibold px-6 py-3 rounded-lg shadow-lg hover:shadow-xl transition-all duration-200"
                >
                  <Trash2 className="h-4 w-4" />
                  Clear All Keys
                </Button>
              </div>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-3">
                💡 Save your API keys and model preferences to start analyzing content with AI
              </p>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="prompts" className="space-y-4 sm:space-y-6">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-3">
                <MessageSquare className="h-5 w-5" />
                <div>
                  <h3 className="text-lg font-medium">AI System Configuration</h3>
                  <p className="text-sm text-muted-foreground">
                    All AI services use the same optimized Adobe Stock system prompt. Add additional context to customize the analysis.
                  </p>
                </div>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-green-500"></div>
                  <Label className="text-sm font-medium">Adobe Stock System Prompt (Built-in)</Label>
                </div>
                <div className="bg-gray-50 p-4 rounded-lg border">
                  <p className="text-sm text-gray-700 leading-relaxed">
                    <strong>Expert Adobe Stock contributor and SEO strategist</strong> that generates ready-to-use titles and keywords for Adobe Stock assets.
                  </p>
                  <ul className="text-sm text-gray-600 mt-3 space-y-1 list-disc list-inside">
                    <li><strong>Title:</strong> 170-200 characters, SEO-friendly, buyer-focused search terms</li>
                    <li><strong>Keywords:</strong> 30-50 single words, ordered by importance</li>
                    <li><strong>Output:</strong> JSON format ready for Adobe Stock submission</li>
                  </ul>
                </div>
              </div>

              <div className="space-y-3">
                <Label htmlFor="additional-context" className="text-sm font-medium flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-blue-500"></div>
                  Additional Context (Optional)
                </Label>
                <Textarea
                  id="additional-context"
                  placeholder="Add any specific instructions or context for the AI analysis here...

Examples:
• Focus on lifestyle and wellness themes
• Emphasize corporate and business concepts  
• Include specific color or mood descriptions
• Mention target audience or use case"
                  value={settings.additional_context || ''}
                  onChange={(e) => handleAdditionalContextChange(e.target.value)}
                  className="min-h-32 resize-none"
                />
                <p className="text-xs text-muted-foreground">
                  This context will be added to the Adobe Stock system prompt for all AI services.
                </p>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-r from-gray-50 to-gray-100 dark:from-gray-800 dark:to-gray-900 border-2 border-dashed border-gray-300 dark:border-gray-600">
            <CardContent className="p-6">
              <div className="flex flex-col sm:flex-row gap-4">
                <Button
                  onClick={saveSettings}
                  disabled={isSaving}
                  className="flex items-center gap-2 bg-gradient-to-r from-indigo-500 to-indigo-600 hover:from-indigo-600 hover:to-indigo-700 text-white font-semibold px-6 py-3 rounded-lg shadow-lg hover:shadow-xl transition-all duration-200"
                >
                  {isSaving ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      <span>Saving...</span>
                    </>
                  ) : (
                    <>
                      <Save className="h-4 w-4" />
                      <span>Save Additional Context</span>
                    </>
                  )}
                </Button>
                <Button
                  variant="outline"
                  onClick={resetPrompts}
                  className="flex items-center gap-2 bg-gradient-to-r from-gray-500 to-gray-600 hover:from-gray-600 hover:to-gray-700 text-white font-semibold px-6 py-3 rounded-lg shadow-lg hover:shadow-xl transition-all duration-200"
                >
                  <RotateCcw className="h-4 w-4" />
                  Reset Context
                </Button>
              </div>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-3">
                💡 Customize your AI analysis with additional context and instructions
              </p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {saveMessage && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          className={`p-4 rounded-lg ${saveMessage.includes('Error')
            ? 'bg-red-50 text-red-800 border border-red-200'
            : 'bg-green-50 text-green-800 border border-green-200'
            }`}
        >
          {saveMessage}
        </motion.div>
      )}
    </div>
  )
}

export default Settings
