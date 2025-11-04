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

        // Load API keys ONLY from localStorage (never from server)
        try {
            const storageKey = `api_keys_${user.id}`
            const stored = localStorage.getItem(storageKey)
            if (stored) {
                const parsedKeys = JSON.parse(stored)
                setApiKeys({
                    openai: !!(parsedKeys.openai_api_key && parsedKeys.openai_api_key.trim()),
                    gemini: !!(parsedKeys.gemini_api_key && parsedKeys.gemini_api_key.trim()),
                    groq: !!(parsedKeys.groq_api_key && parsedKeys.groq_api_key.trim()),
                    grok: !!(parsedKeys.grok_api_key && parsedKeys.grok_api_key.trim()),
                    llama: !!(parsedKeys.llama_api_key && parsedKeys.llama_api_key.trim()),
                    cohere: !!(parsedKeys.cohere_api_key && parsedKeys.cohere_api_key.trim()),
                    deepseek: !!(parsedKeys.deepseek_api_key && parsedKeys.deepseek_api_key.trim())
                })
            } else {
                // No keys in localStorage
                setApiKeys({
                    openai: false,
                    gemini: false,
                    groq: false,
                    grok: false,
                    llama: false,
                    cohere: false,
                    deepseek: false
                })
            }
        } catch (error) {

            setApiKeys({
                openai: false,
                gemini: false,
                groq: false,
                grok: false,
                llama: false,
                cohere: false,
                deepseek: false
            })
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        fetchApiKeyStatus()
    }, [user])

    // Helper function to get actual API key values from localStorage
    const getApiKey = (service) => {
        if (!user) return null
        try {
            const storageKey = `api_keys_${user.id}`
            const stored = localStorage.getItem(storageKey)
            if (stored) {
                const parsedKeys = JSON.parse(stored)
                return parsedKeys[`${service}_api_key`] || null
            }
        } catch (error) {

        }
        return null
    }

    // Add hasApiKey flag to each service (do not filter out)
    const annotateServicesWithKeys = (services) => {
        return services.map(service => ({
            ...service,
            hasApiKey: apiKeys[service.id] === true
        }))
    }

    const hasKeyFor = (serviceId) => apiKeys[serviceId] === true

    return {
        apiKeys,
        loading,
        fetchApiKeyStatus,
        getApiKey,
        annotateServicesWithKeys,
        hasKeyFor
    }
}
