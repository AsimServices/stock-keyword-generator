import { useEffect } from 'react'
import { useClerk } from '@clerk/clerk-react'
import { Loader2 } from 'lucide-react'

export const SSOCallback = () => {
    const { handleRedirectCallback } = useClerk()

    useEffect(() => {
        const handleCallback = async () => {
            try {
                await handleRedirectCallback()
                // The user will be automatically redirected after successful authentication
            } catch (error) {

                // Redirect to home page on error
                window.location.href = '/'
            }
        }

        handleCallback()
    }, [handleRedirectCallback])

    return (
        <div className="min-h-screen bg-gray-50 flex items-center justify-center">
            <div className="text-center">
                <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Loader2 className="h-8 w-8 text-white animate-spin" />
                </div>
                <h2 className="text-xl font-semibold text-gray-900 mb-2">
                    Completing Sign In...
                </h2>
                <p className="text-gray-600">
                    Please wait while we complete your authentication.
                </p>
            </div>
        </div>
    )
}
