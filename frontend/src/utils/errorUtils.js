/**
 * Utility functions for handling and formatting API errors
 */

export const formatApiError = (error) => {
    if (!error) return 'Unknown error occurred'

    // If it's already a simple string, return it
    if (typeof error === 'string') {
        // Check if it's a JSON string
        try {
            const parsed = JSON.parse(error)
            return extractErrorMessage(parsed)
        } catch {
            // Not JSON, return as is but clean it up
            return error.replace(/^(HTTP \d+: )?/, '')
        }
    }

    // If it's an object, extract the message
    return extractErrorMessage(error)
}

const extractErrorMessage = (errorObj) => {
    // Handle different error response formats

    // OpenAI format: { error: { message: "...", type: "...", code: "..." } }
    if (errorObj.error && errorObj.error.message) {
        const msg = errorObj.error.message
        const type = errorObj.error.type
        const code = errorObj.error.code

        if (code === 'invalid_api_key') {
            return 'Invalid API key. Please check your API key in settings.'
        }
        if (code === 'insufficient_quota') {
            return 'API quota exceeded. Please check your account billing.'
        }
        if (type === 'invalid_request_error') {
            return `Invalid request: ${msg.split('.')[0]}`
        }

        return msg.split('.')[0] // Return first sentence only
    }

    // Gemini format: { error: { message: "...", status: "..." } }
    if (errorObj.error && errorObj.error.status) {
        const msg = errorObj.error.message || 'Unknown error'
        const status = errorObj.error.status

        if (status === 'INVALID_ARGUMENT') {
            return 'Invalid API key or request format. Please check your settings.'
        }
        if (status === 'PERMISSION_DENIED') {
            return 'API access denied. Please check your API key permissions.'
        }
        if (status === 'RESOURCE_EXHAUSTED') {
            return 'API quota exceeded. Please check your account usage.'
        }

        return msg.split('.')[0]
    }

    // Generic error with message
    if (errorObj.message) {
        return errorObj.message.split('.')[0]
    }

    // HTTP error format
    if (typeof errorObj === 'string' && errorObj.includes('HTTP')) {
        const match = errorObj.match(/HTTP (\d+): (.+)/)
        if (match) {
            const statusCode = match[1]
            const message = match[2]

            if (statusCode === '401') {
                return 'Authentication failed. Please check your API key.'
            }
            if (statusCode === '403') {
                return 'Access forbidden. Please check your API key permissions.'
            }
            if (statusCode === '429') {
                return 'Rate limit exceeded. Please try again later.'
            }
            if (statusCode === '500') {
                return 'Server error. Please try again later.'
            }

            try {
                const parsed = JSON.parse(message)
                return extractErrorMessage(parsed)
            } catch {
                return message
            }
        }
    }

    // Fallback
    return 'An error occurred while processing your request'
}

export const getServiceName = (serviceId) => {
    const serviceNames = {
        openai: 'OpenAI',
        gemini: 'Google Gemini',
        grok: 'xAI Grok',
        llama: 'Meta Llama',
        cohere: 'Cohere',
        deepseek: 'DeepSeek'
    }
    return serviceNames[serviceId] || serviceId
}
