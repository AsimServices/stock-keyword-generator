import { useState, useEffect } from 'react'

export const useApiKeys = () => {
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
        try {
            const response = await fetch('/api/settings')
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
        fetchApiKeyStatus()
    }, [])

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
