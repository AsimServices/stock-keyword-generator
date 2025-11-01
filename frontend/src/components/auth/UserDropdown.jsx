import { useState, useRef, useEffect } from 'react'
import { useUser, useClerk } from '@clerk/clerk-react'
import { ChevronDown, User, Settings, LogOut } from 'lucide-react'

export const UserDropdown = ({ onSettingsClick }) => {
    const { user } = useUser()
    const { signOut } = useClerk()
    const [isOpen, setIsOpen] = useState(false)
    const dropdownRef = useRef(null)

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
                setIsOpen(false)
            }
        }

        document.addEventListener('mousedown', handleClickOutside)
        return () => document.removeEventListener('mousedown', handleClickOutside)
    }, [])

    const handleSignOut = async () => {
        try {
            await signOut()
            setIsOpen(false)
        } catch (error) {
            console.error('Error signing out:', error)
        }
    }

    const handleSettings = () => {
        if (onSettingsClick) {
            onSettingsClick()
        }
        setIsOpen(false)
    }

    const handleManageAccount = () => {
        // Open Clerk's account management in a new tab or modal
        window.open(user?.externalAccounts?.[0]?.verification?.externalVerificationRedirectURL || '#', '_blank')
        setIsOpen(false)
    }

    if (!user) return null

    const userInitials = `${user.firstName?.[0] || ''}${user.lastName?.[0] || ''}`.toUpperCase()
    const userName = `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.emailAddresses[0]?.emailAddress

    return (
        <div className="relative" ref={dropdownRef}>
            {/* Trigger Button */}
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="flex items-center gap-3 p-2 rounded-lg hover:bg-gray-100 transition-colors"
            >
                <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white font-semibold text-sm ring-2 ring-blue-200">
                    {user.imageUrl ? (
                        <img
                            src={user.imageUrl}
                            alt={userName}
                            className="w-full h-full rounded-full object-cover"
                        />
                    ) : (
                        userInitials
                    )}
                </div>
                <div className="hidden sm:block text-left">
                    <p className="text-sm font-medium text-gray-900 truncate max-w-[120px]">
                        {userName}
                    </p>
                    <p className="text-xs text-gray-500 truncate max-w-[120px]">
                        {user.emailAddresses[0]?.emailAddress}
                    </p>
                </div>
                <ChevronDown className={`h-4 w-4 text-gray-500 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
            </button>

            {/* Dropdown Menu */}
            {isOpen && (
                <div className="absolute right-0 mt-2 w-72 bg-white rounded-xl shadow-2xl border border-gray-200 py-2 z-50">
                    {/* User Info Header */}
                    <div className="px-4 py-3 border-b border-gray-100">
                        <div className="flex items-center gap-3">
                            <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white font-semibold">
                                {user.imageUrl ? (
                                    <img
                                        src={user.imageUrl}
                                        alt={userName}
                                        className="w-full h-full rounded-full object-cover"
                                    />
                                ) : (
                                    userInitials
                                )}
                            </div>
                            <div className="flex-1 min-w-0">
                                <p className="font-semibold text-gray-900 truncate">
                                    {userName}
                                </p>
                                <p className="text-sm text-gray-500 truncate">
                                    {user.emailAddresses[0]?.emailAddress}
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* Menu Items */}
                    <div className="py-2">
                        <button
                            onClick={handleManageAccount}
                            className="w-full flex items-center gap-3 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                        >
                            <User className="h-4 w-4" />
                            Manage Account
                        </button>

                        <button
                            onClick={handleSettings}
                            className="w-full flex items-center gap-3 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                        >
                            <Settings className="h-4 w-4" />
                            Settings
                        </button>
                    </div>

                    {/* Sign Out */}
                    <div className="border-t border-gray-100 py-2">
                        <button
                            onClick={handleSignOut}
                            className="w-full flex items-center gap-3 px-4 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors"
                        >
                            <LogOut className="h-4 w-4" />
                            Sign Out
                        </button>
                    </div>

                    {/* Footer */}
                    <div className="border-t border-gray-100 px-4 py-2">
                        <p className="text-xs text-gray-400 text-center">
                            AI Keyword Generator Platform
                        </p>
                    </div>
                </div>
            )}
        </div>
    )
}
