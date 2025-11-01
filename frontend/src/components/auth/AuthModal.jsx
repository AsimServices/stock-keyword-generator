import { useState } from 'react'
import { Modal } from '../ui/modal'
import { Login } from './Login'
import { SignUp } from './SignUp'

export const AuthModal = ({ isOpen, onClose, initialMode = 'login' }) => {
    const [mode, setMode] = useState(initialMode)

    const handleClose = () => {
        onClose()
        // Reset to login mode when closing
        setTimeout(() => setMode('login'), 300)
    }

    const switchToSignUp = () => setMode('signup')
    const switchToLogin = () => setMode('login')

    return (
        <Modal
            isOpen={isOpen}
            onClose={handleClose}
            title={mode === 'login' ? 'Sign In' : 'Create Account'}
        >
            {mode === 'login' ? (
                <Login
                    onSwitchToSignUp={switchToSignUp}
                    onClose={handleClose}
                />
            ) : (
                <SignUp
                    onSwitchToLogin={switchToLogin}
                    onClose={handleClose}
                />
            )}
        </Modal>
    )
}
