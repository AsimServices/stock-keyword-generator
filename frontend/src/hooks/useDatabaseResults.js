
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

      return
    }

    // Prevent multiple simultaneous requests
    if (loading) {

      return
    }


    setLoading(true)
    setError(null)

    try {
      const authHeaders = getAuthHeaders()

      const response = await analysisResultsService.loadUserResults(authHeaders)

      if (response.success && response.results) {


        // Group results by type
        const imageResults = response.results.filter(r => r.type === 'image')
        const videoResults = response.results.filter(r => r.type === 'video')
        const textResults = response.results.filter(r => r.type === 'text')

        setResults({
          image: imageResults,
          video: videoResults,
          text: textResults
        })


      } else {

        setResults({ image: [], video: [], text: [] })
      }
    } catch (error) {

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

    } catch (error) {

      setError(error)
    }
  }

  // Load results when user ID changes (not entire user object)
  useEffect(() => {
    if (user?.id) {

      loadResults()
    } else {

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
