
import { useState, useEffect } from 'react'
import { useAuthHeaders } from '../utils/auth'
import { analysisResultsService } from '../services/analysisResultsService'

export const useDatabaseResults = () => {
  const { getAuthHeaders, user } = useAuthHeaders()
  const [results, setResults] = useState({
    image: [],
    video: [],
    text: []
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const loadResults = async () => {
    if (!user) {
      console.log('useDatabaseResults: No user authenticated, skipping database load')
      return
    }

    // Prevent multiple simultaneous requests
    if (loading) {
      console.log('useDatabaseResults: Already loading, skipping duplicate request')
      return
    }

    console.log('useDatabaseResults: User authenticated:', user.id)
    setLoading(true)
    setError(null)

    try {
      const authHeaders = getAuthHeaders()
      console.log('useDatabaseResults: Auth headers:', authHeaders)
      const response = await analysisResultsService.loadUserResults(authHeaders)
      
      if (response.success && response.results) {
        console.log('useDatabaseResults: Loaded results from database:', response.results.length)
        
        // Group results by type
        const imageResults = response.results.filter(r => r.type === 'image')
        const videoResults = response.results.filter(r => r.type === 'video')
        const textResults = response.results.filter(r => r.type === 'text')
        
        setResults({
          image: imageResults,
          video: videoResults,
          text: textResults
        })
        
        console.log('useDatabaseResults: Image results:', imageResults.length)
        console.log('useDatabaseResults: Video results:', videoResults.length)
        console.log('useDatabaseResults: Text results:', textResults.length)
      } else {
        console.log('useDatabaseResults: No results found in database')
        setResults({ image: [], video: [], text: [] })
      }
    } catch (error) {
      console.error('useDatabaseResults: Error loading results from database:', error)
      setError(error)
    } finally {
      setLoading(false)
    }
  }

  const saveResults = async (newResults) => {
    if (!user || !newResults || newResults.length === 0) {
      return
    }

    try {
      const authHeaders = getAuthHeaders()
      await analysisResultsService.saveResultsBatch(newResults, authHeaders)
      console.log('useDatabaseResults: Saved results to database:', newResults.length)
    } catch (error) {
      console.error('useDatabaseResults: Error saving results to database:', error)
      setError(error)
    }
  }

  // Load results when user ID changes (not entire user object)
  useEffect(() => {
    if (user?.id) {
      console.log('useDatabaseResults: User ID changed, loading results for:', user.id)
      loadResults()
    } else {
      console.log('useDatabaseResults: No user ID, clearing results')
      setResults({ image: [], video: [], text: [] })
    }
  }, [user?.id]) // Only depend on user.id, not the entire user object

  return {
    results,
    loading,
    error,
    loadResults,
    saveResults
  }
}
