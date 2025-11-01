import { useState, useEffect } from 'react'
import { useUser } from '@clerk/clerk-react'

export const useApiKeys = () => {
    const { user } = useUser()
    const [apiKeys, setApiKeys] = useState({
        openai: false,
        gemini: false,
        groq: false,
        grok: false,
        llama: false,
        cohere: false,
        deepseek: false
    })
    const [loading, setLoading] = useState(true)

    const fetchApiKeyStatus = async () => {
        if (!user) {
            setLoading(false)
            return
        }

        // Helper to load from localStorage
        const loadFromLocalStorage = () => {
            try {
                const storageKey = `api_keys_${user.id}`
                const stored = localStorage.getItem(storageKey)
                if (stored) {
                    const parsedKeys = JSON.parse(stored)
                    return {
                        openai: !!(parsedKeys.openai_api_key && parsedKeys.openai_api_key.trim()),
                        gemini: !!(parsedKeys.gemini_api_key && parsedKeys.gemini_api_key.trim()),
                        groq: !!(parsedKeys.groq_api_key && parsedKeys.groq_api_key.trim()),
                        grok: !!(parsedKeys.grok_api_key && parsedKeys.grok_api_key.trim()),
                        llama: !!(parsedKeys.llama_api_key && parsedKeys.llama_api_key.trim()),
                        cohere: !!(parsedKeys.cohere_api_key && parsedKeys.cohere_api_key.trim()),
                        deepseek: !!(parsedKeys.deepseek_api_key && parsedKeys.deepseek_api_key.trim())
                    }
                }
            } catch (error) {
                console.warn('Failed to load API keys from localStorage:', error)
            }
            return null
        }

        try {
            const response = await fetch('/api/user-settings', {
                headers: {
                    'X-User-ID': user.id,
                    'Content-Type': 'application/json'
                }
            })

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
                console.error('Failed to parse JSON response:', jsonError)
                // Try localStorage as fallback
                const localKeys = loadFromLocalStorage()
                if (localKeys) {
                    setApiKeys(localKeys)
                    setLoading(false)
                    return
                }
                throw new Error('Invalid JSON response')
            }

            setApiKeys({
                openai: !!(data.openai_api_key && data.openai_api_key.trim()),
                gemini: !!(data.gemini_api_key && data.gemini_api_key.trim()),
                groq: !!(data.groq_api_key && data.groq_api_key.trim()),
                grok: !!(data.grok_api_key && data.grok_api_key.trim()),
                llama: !!(data.llama_api_key && data.llama_api_key.trim()),
                cohere: !!(data.cohere_api_key && data.cohere_api_key.trim()),
                deepseek: !!(data.deepseek_api_key && data.deepseek_api_key.trim())
            })
        } catch (error) {
            console.error('Error fetching API key status:', error)
            // Fallback to localStorage
            const localKeys = loadFromLocalStorage()
            if (localKeys) {
                setApiKeys(localKeys)
            }
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        if (user?.id) {
            fetchApiKeyStatus()
        } else {
            setLoading(false)
        }
    }, [user?.id]) // Only depend on user.id, not the entire user object

    const refreshApiKeys = () => {
        setLoading(true)
        fetchApiKeyStatus()
    }

    const filterServicesWithKeys = (services) => {
        return services.map(service => ({
            ...service,
            hasApiKey: apiKeys[service.id] || false
        }))
    }

    return {
        apiKeys,
        loading,
        refreshApiKeys,
        filterServicesWithKeys
    }
}
