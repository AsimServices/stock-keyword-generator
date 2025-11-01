import { useUser } from '@clerk/clerk-react'

export const useAuthHeaders = () => {
    const { user } = useUser()
    
    const getAuthHeaders = () => {
        if (!user) {
            throw new Error('User not authenticated')
        }
        
        return {
            'X-User-ID': user.id,
            'Content-Type': 'application/json'
        }
    }
    
    return { getAuthHeaders, user }
}
