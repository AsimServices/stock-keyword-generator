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

ReactDOM.createRoot(document.getElementById('root')).render(
    <React.StrictMode>
        <BrowserRouter>
            <ClerkProvider
                publishableKey={PUBLISHABLE_KEY}
                // Suppress development warning if using production keys
                // Note: If you see the warning, make sure you're using production keys from Clerk dashboard
                appearance={{
                    variables: {
                        colorPrimary: '#3b82f6'
                    }
                }}
            >
                <App />
            </ClerkProvider>
        </BrowserRouter>
    </React.StrictMode>,
) 