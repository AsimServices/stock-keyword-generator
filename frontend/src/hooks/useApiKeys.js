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

        try {
            const response = await fetch('/api/user-settings', {
                headers: {
                    'X-User-ID': user.id,
                    'Content-Type': 'application/json'
                }
            })
            const data = await response.json()

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
