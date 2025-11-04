import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './components/App.jsx'
import './index.css'
import { ClerkProvider } from '@clerk/clerk-react'
import { BrowserRouter } from 'react-router-dom'

// Import your Clerk Publishable Key
const PUBLISHABLE_KEY = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY

if (!PUBLISHABLE_KEY) {
    throw new Error('Add your Clerk Publishable Key to the .env file')
}

// Check if this is a production key (starts with pk_live_)
const isProductionKey = PUBLISHABLE_KEY.startsWith('pk_live_')

// Log warning in console if using development keys (can't suppress Clerk's internal warning)
if (!isProductionKey && import.meta.env.PROD) {
    console.warn(
        '⚠️ Using Clerk development keys in production! ' +
        'Get production keys from: https://dashboard.clerk.com/ ' +
        'Production keys start with "pk_live_"'
    )
}

ReactDOM.createRoot(document.getElementById('root')).render(
    <React.StrictMode>
        <BrowserRouter>
            <ClerkProvider
                publishableKey={PUBLISHABLE_KEY}
                // Configure Clerk for better error handling
                appearance={{
                    variables: {
                        colorPrimary: '#3b82f6'
                    }
                }}
                // Add sign-in and sign-up URLs for Clerk redirects
                signInUrl="/sign-in"
                signUpUrl="/sign-up"
                fallbackRedirectUrl="/app"
            >
                <App />
                {/* CAPTCHA container for Clerk */}
                <div id="clerk-captcha" style={{ display: 'none' }} />
            </ClerkProvider>
        </BrowserRouter>
    </React.StrictMode>,
)