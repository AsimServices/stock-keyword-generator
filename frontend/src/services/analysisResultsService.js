const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api'

export const analysisResultsService = {
  // Load all results for the authenticated user
  async loadUserResults(authHeaders) {
    try {


      const response = await fetch(`${API_BASE_URL}/analysis-results`, {
        method: 'GET',
        headers: authHeaders
      })



      if (!response.ok) {
        const errorText = await response.text()

        throw new Error(`Failed to load results: ${response.statusText}`)
      }

      const data = await response.json()

      return data
    } catch (error) {

      throw error
    }
  },

  // Load results by type (image, video, text)
  async loadResultsByType(type, authHeaders) {
    try {
      const response = await fetch(`${API_BASE_URL}/analysis-results?type=${type}`, {
        method: 'GET',
        headers: authHeaders
      })

      if (!response.ok) {
        throw new Error(`Failed to load ${type} results: ${response.statusText}`)
      }

      const data = await response.json()
      return data
    } catch (error) {

      throw error
    }
  },

  // Save a single result to the database
  async saveResult(result, authHeaders) {
    try {
      const response = await fetch(`${API_BASE_URL}/analysis-results`, {
        method: 'POST',
        headers: authHeaders,
        body: JSON.stringify(result)
      })

      if (!response.ok) {
        throw new Error(`Failed to save result: ${response.statusText}`)
      }

      const data = await response.json()
      return data
    } catch (error) {

      throw error
    }
  },

  // Save multiple results to the database
  async saveResultsBatch(results, authHeaders) {
    try {
      const response = await fetch(`${API_BASE_URL}/analysis-results/batch`, {
        method: 'POST',
        headers: authHeaders,
        body: JSON.stringify({ results })
      })

      if (!response.ok) {
        throw new Error(`Failed to save results: ${response.statusText}`)
      }

      const data = await response.json()
      return data
    } catch (error) {

      throw error
    }
  },

  // Delete a result
  async deleteResult(resultId, authHeaders) {
    try {
      const response = await fetch(`${API_BASE_URL}/analysis-results/${resultId}`, {
        method: 'DELETE',
        headers: authHeaders
      })

      if (!response.ok) {
        throw new Error(`Failed to delete result: ${response.statusText}`)
      }

      const data = await response.json()
      return data
    } catch (error) {

      throw error
    }
  },

  // Get analysis statistics
  async getAnalysisStats(authHeaders) {
    try {
      const response = await fetch(`${API_BASE_URL}/analysis-results/stats`, {
        method: 'GET',
        headers: authHeaders
      })

      if (!response.ok) {
        throw new Error(`Failed to load stats: ${response.statusText}`)
      }

      const data = await response.json()
      return data
    } catch (error) {

      throw error
    }
  }
}
