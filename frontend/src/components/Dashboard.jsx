import React, { useEffect } from 'react'
import { useAppContext } from '../context/AppContext'
import { useDatabaseResults } from '../hooks/useDatabaseResults'
import { useApiKeys } from '../hooks/useApiKeys'
import { useAuth } from '@clerk/clerk-react'
import { useNavigate } from 'react-router-dom'
import { 
  BarChart3, 
  CheckCircle,
  XCircle
} from 'lucide-react'

// KPI Card Component
const KpiCard = ({ title, children, className = "", titleSize = "text-sm" }) => (
  <div className={`bg-white dark:bg-gray-800 rounded-xl p-6 shadow-lg hover:shadow-xl hover:shadow-2xl hover:-translate-y-2 transition-all duration-300 border border-gray-100 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600 flex flex-col justify-between ${className}`}>
    <h3 className={`${titleSize} font-medium text-gray-500 dark:text-gray-400 truncate`}>{title}</h3>
    {children}
  </div>
)


const Dashboard = () => {
  console.log('Dashboard: Component rendering')
  const { state } = useAppContext()
  const { results: databaseResults, loading: databaseLoading } = useDatabaseResults()
  const { apiKeys, loading: apiKeysLoading } = useApiKeys()
  const { isSignedIn, isLoaded } = useAuth()
  const navigate = useNavigate()

  // Handle authentication errors
  useEffect(() => {
    if (isLoaded && !isSignedIn) {
      navigate('/', { replace: true })
    }
  }, [isSignedIn, isLoaded, navigate])

  // Debug state changes (removed force re-render to prevent infinite loops)
  useEffect(() => {
    console.log('Dashboard: State or database results changed')
  }, [state, databaseResults])
  
  // Debug localStorage on component mount
  React.useEffect(() => {
    console.log('Dashboard: Component mounted, checking localStorage')
    const storedData = localStorage.getItem('aiKeywordGenerator')
    console.log('Dashboard: Stored data in localStorage:', storedData)
    if (storedData) {
      try {
        const parsed = JSON.parse(storedData)
        console.log('Dashboard: Parsed localStorage data:', parsed)
      } catch (e) {
        console.error('Dashboard: Error parsing localStorage data:', e)
      }
    }
  }, [])

  // Use ONLY database results for true cross-device sync
  // No fallback to state/localStorage for consistent data across devices
  const imageResults = databaseResults.image || []
  const videoResults = databaseResults.video || []
  const textResults = databaseResults.text || []
  
  const allResults = [...imageResults, ...videoResults, ...textResults]
  
  const totalAnalyses = allResults.length
  
  const successfulAnalyses = allResults.filter(result => 
    result.result && 
    result.result.title && 
    result.result.keywords && 
    result.result.category && 
    result.result.releases
  )
  
  const totalSuccessfulAnalyses = successfulAnalyses.length
  
  const errorResults = allResults.filter(result => result.status === 'error').length
  const totalErrorCount = errorResults
  
  // Debug database-only approach
  console.log('Dashboard: Database-only approach debug:')
  console.log('  - databaseLoading:', databaseLoading)
  console.log('  - databaseResults:', { image: databaseResults.image?.length || 0, video: databaseResults.video?.length || 0, text: databaseResults.text?.length || 0 })
  console.log('  - allResults (database only):', allResults.length, allResults.map(result => ({ id: result.id, status: result.status })))
  console.log('  - totalAnalyses (database only):', totalAnalyses)
  console.log('  - totalSuccessfulAnalyses (database only):', totalSuccessfulAnalyses)
  console.log('  - errorResults (database only):', errorResults)
  console.log('  - totalErrorCount (database only):', totalErrorCount)
  
  const successRate = totalAnalyses > 0 ? Math.round((totalSuccessfulAnalyses / totalAnalyses) * 100) : 0
  const errorRate = totalAnalyses > 0 ? Math.round((totalErrorCount / totalAnalyses) * 100) : 0
  
  const analysisTypes = {
    images: imageResults.length,
    videos: videoResults.length,
    texts: textResults.length
  }

  // Calculate AI model usage from actual analysis results
  const calculateModelUsage = () => {
    const serviceCounts = {}
    allResults.forEach(result => {
      if (result.service) {
        serviceCounts[result.service] = (serviceCounts[result.service] || 0) + 1
      }
    })
    
    const totalUsage = Object.values(serviceCounts).reduce((sum, count) => sum + count, 0)
    
    return {
      serviceCounts,
      totalUsage
    }
  }

  const { serviceCounts, totalUsage } = calculateModelUsage()





  return (
    <div key={`dashboard-${totalErrorCount}-${totalAnalyses}`} className="space-y-4 sm:space-y-6 p-4 sm:p-6">
      {/* Header */}
      <div>
        <h2 className="text-xl sm:text-2xl lg:text-3xl font-bold text-gray-900 dark:text-gray-100">Dashboard</h2>
        <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
          An overview of your metadata generation activity.
        </p>
      </div>


      {/* First Row: Total Jobs, Success, Error */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5">
        <KpiCard title="Total Jobs" titleSize="text-base">
          <p className="mt-2 text-4xl font-semibold text-gray-900 dark:text-gray-100">{totalAnalyses}</p>
          <div className="flex items-center text-xs text-gray-500 dark:text-gray-400 mt-2">
            <BarChart3 className="w-4 h-4" /> <span className="ml-1">All time analyses</span>
          </div>
        </KpiCard>
        
        <KpiCard title="Success">
          <p className="mt-2 text-4xl font-semibold text-gray-900 dark:text-gray-100">{totalSuccessfulAnalyses}</p>
          <div className="flex items-center text-xs text-gray-500 dark:text-gray-400 mt-2">
           
          </div>
          {totalAnalyses > 0 && (
            <div className="mt-3">
              <div className="flex justify-between text-xs font-medium text-gray-500 dark:text-gray-400 mb-2">
                <span>Success Rate</span>
                <span className="font-bold text-gray-900 dark:text-gray-100">{successRate.toFixed(1)}%</span>
              </div>
              <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2 mb-2">
                <div 
                  className="bg-gray-900 dark:bg-gray-100 h-2 rounded-full transition-all duration-500" 
                  style={{width: `${successRate}%`}}
                ></div>
              </div>
              <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400">
                <span className="text-gray-900 dark:text-gray-100">✓ {totalSuccessfulAnalyses}</span>
                <span className="text-gray-600 dark:text-gray-400">✗ {totalErrorCount}</span>
              </div>
            </div>
          )}
        </KpiCard>
        
        <KpiCard title="Error">
          <p className="mt-2 text-4xl font-semibold text-gray-900 dark:text-gray-100">{totalErrorCount}</p>
          <div className="flex items-center text-xs text-gray-500 dark:text-gray-400 mt-2">
        
          </div>
          {totalAnalyses > 0 && (
            <div className="mt-3">
              <div className="flex justify-between text-xs font-medium text-gray-500 dark:text-gray-400 mb-2">
                <span>Error Rate</span>
                <span className="font-bold text-gray-900 dark:text-gray-100">{errorRate.toFixed(1)}%</span>
              </div>
              <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2 mb-2">
                <div 
                  className="bg-gray-900 dark:bg-gray-100 h-2 rounded-full transition-all duration-500" 
                  style={{width: `${errorRate}%`}}
                ></div>
              </div>
              <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400">
                <span className="text-gray-900 dark:text-gray-100">✗ {totalErrorCount}</span>
                <span className="text-gray-600 dark:text-gray-400">✓ {totalSuccessfulAnalyses}</span>
              </div>
            </div>
          )}
        </KpiCard>
      </div>


      {/* Second Row: Analysis Types */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5">
        <KpiCard title="Image Analysis">
          <p className="mt-2 text-4xl font-semibold text-gray-900 dark:text-gray-100">{analysisTypes.images}</p>
          <div className="mt-2">
            <div className="flex justify-between text-xs font-medium text-gray-500 dark:text-gray-400">
              <span>{totalAnalyses > 0 ? ((analysisTypes.images / totalAnalyses) * 100).toFixed(0) : 0}% of total</span>
            </div>
            <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-1.5 mt-1">
              <div className="bg-gray-900 dark:bg-gray-100 h-1.5 rounded-full" style={{width: `${totalAnalyses > 0 ? (analysisTypes.images / totalAnalyses) * 100 : 0}%`}}></div>
            </div>
          </div>
        </KpiCard>
        
        <KpiCard title="Video Analysis">
          <p className="mt-2 text-4xl font-semibold text-gray-900 dark:text-gray-100">{analysisTypes.videos}</p>
          <div className="mt-2">
            <div className="flex justify-between text-xs font-medium text-gray-500 dark:text-gray-400">
              <span>{totalAnalyses > 0 ? ((analysisTypes.videos / totalAnalyses) * 100).toFixed(0) : 0}% of total</span>
            </div>
            <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-1.5 mt-1">
              <div className="bg-gray-900 dark:bg-gray-100 h-1.5 rounded-full" style={{width: `${totalAnalyses > 0 ? (analysisTypes.videos / totalAnalyses) * 100 : 0}%`}}></div>
            </div>
          </div>
        </KpiCard>
        
        <KpiCard title="Text Analysis">
          <p className="mt-2 text-4xl font-semibold text-gray-900 dark:text-gray-100">{analysisTypes.texts}</p>
          <div className="mt-2">
            <div className="flex justify-between text-xs font-medium text-gray-500 dark:text-gray-400">
              <span>{totalAnalyses > 0 ? ((analysisTypes.texts / totalAnalyses) * 100).toFixed(0) : 0}% of total</span>
            </div>
            <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-1.5 mt-1">
              <div className="bg-gray-900 dark:bg-gray-100 h-1.5 rounded-full" style={{width: `${totalAnalyses > 0 ? (analysisTypes.texts / totalAnalyses) * 100 : 0}%`}}></div>
            </div>
          </div>
        </KpiCard>
      </div>

      {/* AI Model Performance & Latest Generation Logs */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 sm:gap-6">
        <div className="bg-white dark:bg-gray-800 rounded-xl p-5 shadow-lg hover:shadow-xl hover:shadow-2xl hover:-translate-y-2 transition-all duration-300 border border-gray-100 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-200">AI Model Usage</h3>
            <button className="p-1 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700 hover:scale-110 transition-all duration-200">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-gray-500 dark:text-gray-400" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M11.49 3.17c-.38-1.56-2.6-1.56-2.98 0a1.532 1.532 0 01-2.286.948c-1.372-.836-2.942.734-2.106 2.106.54.886.061 2.042-.947 2.287-1.561.379-1.561 2.6 0 2.978a1.532 1.532 0 01.947 2.287c-.836 1.372.734 2.942 2.106 2.106a1.532 1.532 0 012.287.947c.379 1.561 2.6 1.561 2.978 0a1.532 1.532 0 012.287-.947c1.372.836 2.942-.734 2.106-2.106a1.532 1.532 0 01-.947-2.287c1.561-.379 1.561-2.6 0-2.978a1.532 1.532 0 01-.947-2.287c.836-1.372-.734-2.942-2.106-2.106A1.532 1.532 0 0111.49 3.17zM10 13a3 3 0 100-6 3 3 0 000 6z" clipRule="evenodd" />
              </svg>
            </button>
          </div>
          
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">
            AI Model Usage: <span className="font-semibold text-gray-900 dark:text-gray-100">
              {totalUsage > 0 ? `${totalUsage} analyses completed` : 'No analyses yet'}
            </span>
          </p>

          <div className="mt-4">
            <div className="space-y-3">
              {[
                { id: 'openai', name: 'OpenAI', color: 'bg-gray-900 dark:bg-gray-100' },
                { id: 'gemini', name: 'Gemini', color: 'bg-gray-900 dark:bg-gray-100' },
                { id: 'groq', name: 'Groq', color: 'bg-gray-900 dark:bg-gray-100' },
                { id: 'grok', name: 'Grok', color: 'bg-gray-900 dark:bg-gray-100' },
                { id: 'llama', name: 'Llama', color: 'bg-gray-900 dark:bg-gray-100' },
                { id: 'cohere', name: 'Cohere', color: 'bg-gray-900 dark:bg-gray-100' },
                { id: 'deepseek', name: 'DeepSeek', color: 'bg-gray-900 dark:bg-gray-100' }
              ].map((service) => {
                const hasApiKey = apiKeys[service.id] || false
                const usageCount = serviceCounts[service.id] || 0
                const usagePercentage = totalUsage > 0 ? (usageCount / totalUsage) * 100 : 0
                
                return (
                  <div key={service.name} className="hover:bg-gray-50 dark:hover:bg-gray-700 rounded-lg p-2 -m-2 transition-all duration-200">
                    <div className="flex justify-between items-center text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      <div className="flex items-center">
                        <span>{service.name}</span>
                        <span 
                          className={`ml-2 w-2 h-2 rounded-full ${
                            apiKeysLoading 
                              ? 'bg-gray-400 animate-pulse' 
                              : hasApiKey 
                                ? 'bg-gray-900 dark:bg-gray-100' 
                                : 'bg-gray-400'
                          }`} 
                          title={
                            apiKeysLoading 
                              ? 'Loading API key status...' 
                              : hasApiKey 
                                ? 'API Key Available' 
                                : 'No API Key'
                          }
                        ></span>
                      </div>
                      <span className="text-xs text-gray-500">
                        {usageCount > 0 ? `${usageCount} analyses (${usagePercentage.toFixed(1)}%)` : (hasApiKey ? 'Available' : 'Not configured')}
                      </span>
                    </div>
                    <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                      <div 
                        className="h-2 rounded-full transition-all duration-500 bg-gray-900 dark:bg-gray-100" 
                        style={{ width: `${usagePercentage}%` }}
                      ></div>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </div>

        {/* Latest Generation Logs */}
        <div className="bg-white dark:bg-gray-800 rounded-xl p-5 shadow-lg hover:shadow-xl hover:shadow-2xl hover:-translate-y-2 transition-all duration-300 border border-gray-100 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600">
          <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-200">Latest Generation Logs</h3>
          <div className="mt-4 flow-root">
            <ul role="list" className="-mb-8">
              {allResults.length > 0 ? allResults.slice(0, 5).map((result, resultIdx) => (
                <li key={resultIdx}>
                  <div className="relative pb-8">
                    {resultIdx !== allResults.slice(0, 5).length - 1 ? (
                      <span className="absolute top-4 left-4 -ml-px h-full w-0.5 bg-gray-300 dark:bg-gray-600" aria-hidden="true" />
                    ) : null}
                    <div className="relative flex space-x-3 hover:bg-gray-50 dark:hover:bg-gray-700 rounded-lg p-2 -m-2 transition-all duration-200">
                      <div>
                        <span className={`h-8 w-8 rounded-full flex items-center justify-center ring-4 ring-gray-100 dark:ring-gray-700 ${result.result && result.result.title ? 'bg-gray-600 dark:bg-gray-400' : 'bg-gray-400'}`}>
                          <svg className="h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                            {result.type === 'image' && <path fillRule="evenodd" d="M4 3a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V5a2 2 0 00-2-2H4zm12 12H4l4-8 3 6 2-4 3 6z" clipRule="evenodd" />}
                            {result.type === 'video' && <path d="M2 6a2 2 0 012-2h6a2 2 0 012 2v8a2 2 0 01-2 2H4a2 2 0 01-2-2V6zM14.553 7.106A1 1 0 0014 8v4a1 1 0 001.553.832l3-2a1 1 0 000-1.664l-3-2z" />}
                            {result.type === 'text' && <path fillRule="evenodd" d="M4 4a2 2 0 012-2h8a2 2 0 012 2v12a1 1 0 110 2h-3a1 1 0 01-1-1v-2a1 1 0 00-1-1H9a1 1 0 00-1 1v2a1 1 0 01-1 1H4a1 1 0 110-2V4zm2 4v1h8V8H6zm0 3v1h8v-1H6z" clipRule="evenodd" />}
                          </svg>
                        </span>
                      </div>
                      <div className="min-w-0 flex-1 pt-1.5 flex justify-between space-x-4">
                        <div>
                          <p className="text-sm text-gray-700 dark:text-gray-300 truncate max-w-[150px] sm:max-w-xs" title={result.result?.title || result.filename || 'Analysis'}>
                            {result.result?.title || result.filename || 'Analysis'}
                          </p>
                          <p className="text-xs text-gray-500 dark:text-gray-500">{result.result?.category || result.type || 'Unknown'}</p>
                        </div>
                        <div className="text-right text-xs whitespace-nowrap text-gray-500 dark:text-gray-500">
                          <time dateTime={new Date(result.timestamp || Date.now()).toISOString()}>
                            {new Date(result.timestamp || Date.now()).toLocaleTimeString('en-US', {
                              hour: '2-digit',
                              minute: '2-digit',
                              second: '2-digit',
                              hour12: true
                            })}
                          </time>
                        </div>
                      </div>
                    </div>
                  </div>
                </li>
              )) : (
                <p className="text-center py-10 text-sm text-gray-500 dark:text-gray-500">No activity yet. Analyze some content to get started!</p>
              )}
            </ul>
          </div>
        </div>
      </div>
    </div>
  )
}

export default Dashboard
