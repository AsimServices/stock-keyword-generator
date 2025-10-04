import { useState, useEffect } from 'react'
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
  const [settings, setSettings] = useState({
    openai_api_key: '',
    gemini_api_key: '',
    groq_api_key: '',
    grok_api_key: '',
    llama_api_key: '',
    cohere_api_key: '',
    deepseek_api_key: '',
    openai_model: 'gpt-4o',
    gemini_model: 'gemini-2.0-flash',
    groq_model: 'openai/gpt-oss-120b',
    grok_model: 'grok-vision-beta',
    llama_model: 'llama-3.2-11b-vision-instruct',
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
      color: 'bg-green-500',
      description: 'GPT-4 Vision for image analysis',
      models: [
        { value: 'gpt-4o', label: 'GPT-4o' },
        { value: 'chatgpt-4o-latest', label: 'ChatGPT-4o' },
        { value: 'gpt-4-turbo', label: 'GPT-4 Turbo' },
        { value: 'gpt-4o-mini', label: 'GPT-4o mini' },
        { value: 'o1-mini', label: 'o1-mini' },
        { value: 'o1-preview', label: 'o1' },
        { value: 'o1-pro', label: 'o1-pro' }
      ]
    },
    {
      id: 'gemini',
      name: 'Google Gemini',
      color: 'bg-blue-500',
      description: 'Multimodal AI for images and videos',
      models: [
        { value: 'gemini-2.5-flash-preview-04-17', label: 'Gemini 2.5 Flash Preview 04-17' },
        { value: 'gemini-2.5-pro-preview-03-25', label: 'Gemini 2.5 Pro Preview 03-25' },
        { value: 'gemini-2.0-flash', label: 'Gemini 2.0 Flash' },
        { value: 'gemini-2.0-flash-lite', label: 'Gemini 2.0 Flash-Lite' },
        { value: 'gemini-2.0-flash-live', label: 'Gemini 2.0 Flash Live' }
      ]
    },
    {
      id: 'groq',
      name: 'Groq',
      color: 'bg-yellow-500',
      description: 'Fast Llama Vision models with high-speed inference',
      models: [
        { value: 'openai/gpt-oss-120b', label: 'OpenAI GPT OSS 120B' },
        { value: 'openai/gpt-oss-20b', label: 'OpenAI GPT OSS 20B' },
        { value: 'deepseek-r1-distill-llama-70b', label: 'DeepSeek R1 Distill Llama 70B' },
        { value: 'moonshotai/kimi-k2-instruct', label: 'Moonshot AI Kimi K2 Instruct' }
      ]
    },
    {
      id: 'grok',
      name: 'xAI Grok',
      color: 'bg-purple-500',
      description: 'Advanced reasoning and vision capabilities',
      models: [
        { value: 'grok-2-vision-1212', label: 'Grok 2 Vision (1212)' },
        { value: 'grok-vision-beta', label: 'Grok Vision Beta' }
      ]
    },
    {
      id: 'llama',
      name: 'Meta Llama',
      color: 'bg-orange-500',
      description: 'Open-source multimodal model',
      models: [
        { value: 'llama-3.2-90b-vision-instruct', label: 'LLaMA 3.2 90B Vision Instruct' },
        { value: 'llama-3.2-11b-vision-instruct', label: 'LLaMA 3.2 11B Vision Instruct' }
      ]
    },
    {
      id: 'cohere',
      name: 'Cohere',
      color: 'bg-pink-500',
      description: 'Command A Vision for multimodal image analysis',
      models: [
        { value: 'command-a-vision-07-2025', label: 'Command A Vision' },
        { value: 'c4ai-aya-expanse-32b', label: 'c4ai-aya-expanse-32b' },
        { value: 'c4ai-aya-expanse-8b', label: 'c4ai-aya-expanse-8b' },
        { value: 'c4ai-aya-vision-32b', label: 'c4ai-aya-vision-32b' },
        { value: 'c4ai-aya-vision-8b', label: 'c4ai-aya-vision-8b' }
      ]
    },
    {
      id: 'deepseek',
      name: 'DeepSeek',
      color: 'bg-indigo-500',
      description: 'Efficient reasoning and vision model',
      models: [
        { value: 'deepseek-vl-7b-chat', label: 'DeepSeek VL 7B Chat' }
      ]
    }
  ]

  useEffect(() => {
    fetchSettings()
  }, [])

  const fetchSettings = async () => {
    try {
      const response = await fetch('/api/settings')
      const data = await response.json()
      setSettings(data)

      // Don't populate masked API keys into the form - keep them empty for new input
      setApiKeys({
        openai_api_key: '',
        gemini_api_key: '',
        groq_api_key: '',
        grok_api_key: '',
        llama_api_key: '',
        cohere_api_key: '',
        deepseek_api_key: ''
      })
    } catch (error) {
      console.error('Error fetching settings:', error)
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

    try {
      // Only include API keys that have been changed (non-empty values)
      const apiKeysToSave = {}
      Object.entries(apiKeys).forEach(([key, value]) => {
        if (value && value.trim()) {
          apiKeysToSave[key] = value.trim()
        }
      })

      const payload = {
        ...apiKeysToSave,
        ...Object.fromEntries(
          Object.entries(settings).filter(([key]) =>
            key.includes('_model') || key === 'additional_context' || key === 'global_system_prompt'
          )
        )
      }

      const response = await fetch('/api/settings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload)
      })

      const data = await response.json()

      if (response.ok) {
        setSaveMessage('Settings saved successfully!')
        setApiKeys({
          openai_api_key: '',
          gemini_api_key: '',
          groq_api_key: '',
          grok_api_key: '',
          llama_api_key: '',
          cohere_api_key: '',
          deepseek_api_key: ''
        })
        await fetchSettings()
      } else {
        setSaveMessage(`Error: ${data.error}`)
      }
    } catch (error) {
      setSaveMessage(`Error: ${error.message}`)
    } finally {
      setIsSaving(false)
      setTimeout(() => setSaveMessage(''), 3000)
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
        ok = /^sk_/.test(trimmed)
        message = ok ? 'Looks like a Cohere key' : 'Expected to start with sk_'
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
      const response = await fetch('/api/settings/api-keys', {
        method: 'DELETE'
      })

      if (response.ok) {
        const data = await response.json()
        setSaveMessage('API keys cleared successfully!')
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
        await fetchSettings()
      } else {
        const errorData = await response.json()
        setSaveMessage(`Error: ${errorData.error || 'Failed to clear API keys'}`)
      }
    } catch (error) {
      setSaveMessage(`Error: ${error.message}`)
    } finally {
      setTimeout(() => setSaveMessage(''), 3000)
    }
  }

  const resetPrompts = async () => {
    try {
      const response = await fetch('/api/settings/prompts/reset', {
        method: 'POST'
      })

      if (response.ok) {
        const data = await response.json()
        setSaveMessage('System prompts reset to default!')
        await fetchSettings()
      } else {
        const errorData = await response.json()
        setSaveMessage(`Error: ${errorData.error || 'Failed to reset prompts'}`)
      }
    } catch (error) {
      setSaveMessage(`Error: ${error.message}`)
    } finally {
      setTimeout(() => setSaveMessage(''), 3000)
    }
  }

  return (
    <div className="space-y-6">
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

        <TabsContent value="api-keys" className="space-y-4">
          <div className="grid gap-6">
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
                        <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded-full">
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
                                <CheckCircle2 className="h-3 w-3 text-green-600" />
                              ) : (
                                <XCircle className="h-3 w-3 text-red-600" />
                              )}
                              <span className={validationStatus[service.id].valid ? 'text-green-700' : 'text-red-700'}>
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

          <div className="flex gap-4 pt-4">
            <Button onClick={saveSettings} disabled={isSaving} className="flex items-center gap-2">
              <Save className="h-4 w-4" />
              {isSaving ? 'Saving...' : 'Save API Keys & Models'}
            </Button>
            <Button variant="destructive" onClick={clearApiKeys} className="flex items-center gap-2">
              <Trash2 className="h-4 w-4" />
              Clear All Keys
            </Button>
          </div>
        </TabsContent>

        <TabsContent value="prompts" className="space-y-4">
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

          <div className="flex gap-4 pt-4">
            <Button onClick={saveSettings} disabled={isSaving} className="flex items-center gap-2">
              <Save className="h-4 w-4" />
              {isSaving ? 'Saving...' : 'Save Additional Context'}
            </Button>
            <Button variant="outline" onClick={resetPrompts} className="flex items-center gap-2">
              <RotateCcw className="h-4 w-4" />
              Reset Context
            </Button>
          </div>
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
