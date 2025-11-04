import { useState, useRef, useCallback, useEffect } from 'react'
import { useUser } from '@clerk/clerk-react'
import { Button } from './ui/button.jsx'
import { Card, CardContent, CardHeader, CardTitle } from './ui/card.jsx'
import { Textarea } from './ui/textarea.jsx'
import { KeywordEditor } from './ui/keyword-editor.jsx'
import UploadTable from './ui/UploadTable.jsx'
import { useAppContext } from '../context/AppContext'
import { downloadTXT, downloadCSV, downloadExcel, downloadPDF } from '../utils/downloadUtils'
import { getCategoryNumber } from '../utils/categoryUtils'
import { Upload, Loader2, Image, Copy, Check, X, Download, FileText, FileSpreadsheet, File, Printer, FolderOpen, Edit3, Save, XCircle, AlertCircle, Settings, Eye, CheckCircle } from 'lucide-react'
import { useApiKeys } from '../hooks/useApiKeys.js'
import { formatApiError } from '../utils/errorUtils.js'
import { motion, AnimatePresence } from 'framer-motion'

const ImageAnalysis = () => {
  const { user } = useUser()
  const { state, setImageData, updateImageResult, updateResultTitle, updateResultKeywords } = useAppContext()
  const { selectedImages, selectedServices, results, isAnalyzing, currentProgress, totalImages } = state.imageAnalysis
  const { apiKeys, loading: keysLoading, filterServicesWithKeys } = useApiKeys()
  const [selectedService, setSelectedService] = useState(() => {
    try {
      return localStorage.getItem('selectedImageAIService') || 'openai'
    } catch (error) {
      console.warn('localStorage not available:', error)
      return 'openai'
    }
  })

  const [dragActive, setDragActive] = useState(false)
  const [isUploading, setIsUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState({ current: 0, total: 0 })
  const fileInputRef = useRef(null)
  const uploadTableRef = useRef(null)

  // Enhanced images with status tracking
  const [imagesWithStatus, setImagesWithStatus] = useState([])

  // Custom prompt for analysis
  const [customPrompt, setCustomPrompt] = useState('')

  // Chunk processing state
  const [chunkProgress, setChunkProgress] = useState({
    currentChunk: 0,
    totalChunks: 0,
    isProcessing: false
  })

  // Update images with status when selectedImages changes
  useEffect(() => {
    if (selectedImages.length > 0) {
      setImagesWithStatus(prevImages => {
        const newImages = selectedImages.filter(img => 
          !prevImages.some(prev => prev.id === img.id)
        ).map(img => ({
          ...img,
          status: 'pending',
          result: null,
          error: null
        }))
        
        return [...prevImages, ...newImages]
      })
    }
  }, [selectedImages])

  const handleServiceToggle = (serviceId) => {
    setSelectedService(serviceId)
    try {
      localStorage.setItem('selectedImageAIService', serviceId)
    } catch (error) {
      console.warn('localStorage not available:', error)
    }
  }

  const handleDrag = useCallback((e) => {
    e.preventDefault()
    e.stopPropagation()
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true)
    } else if (e.type === 'dragleave') {
      setDragActive(false)
    }
  }, [])

  const handleDrop = useCallback((e) => {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(false)

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFiles(Array.from(e.dataTransfer.files))
    }
  }, [])

  const handleFiles = async (files) => {
    const imageFiles = files.filter(file => 
      file.type.startsWith('image/') || 
      file.name.toLowerCase().match(/\.(jpg|jpeg|png|gif|bmp|webp)$/i)
    )

    if (imageFiles.length === 0) {
      alert('Please select valid image files (JPG, PNG, GIF, BMP, WebP)')
      return
    }

    setIsUploading(true)
    setUploadProgress({ current: 0, total: imageFiles.length })

    const newImages = []

    for (let i = 0; i < imageFiles.length; i++) {
      const file = imageFiles[i]
      const reader = new FileReader()

      await new Promise((resolve) => {
        reader.onload = (e) => {
          const newImage = {
            id: `${Date.now()}-${Math.random()}`,
            name: file.name,
            size: file.size,
            type: file.type,
            preview: e.target.result,
            file: file,
            status: 'pending',
            result: null,
            timestamp: new Date().toISOString(),
            error: null
          }
          newImages.push(newImage)
          setUploadProgress({ current: i + 1, total: imageFiles.length })
          resolve()
        }
        reader.readAsDataURL(file)
      })
    }

    setImagesWithStatus(prev => [...prev, ...newImages])
    setIsUploading(false)
    setUploadProgress({ current: 0, total: 0 })
    
    // Auto-scroll to table after files are uploaded
    setTimeout(() => {
      if (uploadTableRef.current) {
        uploadTableRef.current.scrollIntoView({ 
          behavior: 'smooth', 
          block: 'start' 
        })
      }
    }, 200) // Slightly longer delay to ensure DOM is updated
  }

  const removeImage = (imageId) => {
    setImagesWithStatus(prev => prev.filter(img => img.id !== imageId))
  }

  const updateImageMetadata = (imageId, updatedMetadata) => {
    setImagesWithStatus(prev => 
      prev.map(img => 
        img.id === imageId 
          ? { 
              ...img, 
              result: { 
                ...img.result, 
                ...updatedMetadata 
              } 
            }
          : img
      )
    )
  }

  const analyzeImage = async (image) => {
    try {
      // Update status to processing
      setImagesWithStatus(prev => 
        prev.map(img => 
          img.id === image.id 
            ? { ...img, status: 'processing', error: null }
            : img
        )
      )

      const response = await fetch('/api/analyze-image-structured', {
          method: 'POST',
          headers: {
          'X-User-ID': user.id,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            image: image.preview,
            filename: image.name,
          services: [selectedService],
          custom_prompt: customPrompt
          })
        })

        const data = await response.json()

      if (data.results && data.results.length > 0) {
        const result = data.results[0]
        
        if (result.success) {
          // Update status to completed with result
          setImagesWithStatus(prev => 
            prev.map(img => 
              img.id === image.id 
                ? { 
                    ...img, 
                    status: 'completed', 
                    result: {
                      title: result.title,
                      keywords: result.keywords,
                      category: result.category,
                      releases: result.releases,
                      raw_response: result.raw_response
                    }
                  }
                : img
            )
          )

          // Update AppContext with the result
          const analysisResult = {
            id: image.id,
            filename: image.name,
            type: 'image',
            result: {
              title: result.title,
              keywords: result.keywords,
              category: result.category,
              releases: result.releases,
              raw_response: result.raw_response
            },
            service: selectedService,
            timestamp: image.timestamp || new Date().toISOString()
          }
          
          console.log('ImageAnalysis: Updating AppContext with individual result:', analysisResult)
          console.log('ImageAnalysis: Current state results:', state.imageAnalysis.results)
          setImageData({
            results: [...state.imageAnalysis.results, analysisResult]
          })
          console.log('ImageAnalysis: AppContext updated successfully')
        } else {
          // Update status to error and store error result
          setImagesWithStatus(prev => 
            prev.map(img => 
              img.id === image.id 
                ? { ...img, status: 'error', error: result.error }
                : img
            )
          )
          
          // Store error result in AppContext
          const errorResult = {
            id: image.id,
            filename: image.name,
            type: 'image',
            status: 'error',
            error: result.error,
            service: selectedService,
            timestamp: image.timestamp || new Date().toISOString()
          }
          
          setImageData({
            results: [...state.imageAnalysis.results, errorResult]
          })
        }
      } else {
        // Update status to error and store error result
        setImagesWithStatus(prev => 
          prev.map(img => 
            img.id === image.id 
              ? { ...img, status: 'error', error: 'No results received' }
              : img
          )
        )
        
        // Store error result in AppContext
        const errorResult = {
          id: image.id,
          filename: image.name,
          type: 'image',
          status: 'error',
          error: 'No results received',
          service: selectedService,
          timestamp: image.timestamp || new Date().toISOString()
        }
        
        setImageData({
          results: [...state.imageAnalysis.results, errorResult]
        })
      }
    } catch (error) {
      console.error('Analysis error:', error)
      // Update status to error and store error result
      setImagesWithStatus(prev => 
        prev.map(img => 
          img.id === image.id 
            ? { ...img, status: 'error', error: error.message }
            : img
        )
      )
      
      // Store error result in AppContext
      const errorResult = {
        id: image.id,
        filename: image.name,
        type: 'image',
        status: 'error',
        error: error.message,
        service: selectedService,
        timestamp: image.timestamp || new Date().toISOString()
      }
      
      setImageData({
        results: [...state.imageAnalysis.results, errorResult]
      })
    }
  }

  // Process images in chunks of 10
  const processImageChunk = async (chunk) => {
    console.log(`Processing chunk of ${chunk.length} images`)
    
    // Update chunk images to processing
    setImagesWithStatus(prev => 
      prev.map(img => 
        chunk.some(chunkImg => chunkImg.id === img.id)
          ? { ...img, status: 'processing', error: null }
          : img
      )
    )

    // Prepare batch data for this chunk
    const batchData = {
      images: chunk.map(img => ({
        image_data: img.preview,
        filename: img.name
      })),
      services: [selectedService],
      custom_prompt: customPrompt
    }

    const response = await fetch('/api/analyze-images-batch', {
      method: 'POST',
      headers: {
        'X-User-ID': user.id,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(batchData)
    })

    // Check if response is OK and content type is JSON
    if (!response.ok) {
      const contentType = response.headers.get('content-type') || ''
      let errorMessage = `Server error: ${response.status} ${response.statusText}`
      
      if (response.status === 502) {
        errorMessage = 'Server is temporarily unavailable (502 Bad Gateway). Please try again in a moment.'
      } else if (response.status === 503) {
        errorMessage = 'Service is temporarily unavailable. Please try again later.'
      } else if (response.status === 500) {
        errorMessage = 'Internal server error. Please try again later.'
      }
      
      // Try to parse error message if it's JSON
      if (contentType.includes('application/json')) {
        try {
          const errorData = await response.json()
          errorMessage = errorData.error || errorMessage
        } catch (e) {
          // If JSON parsing fails, use the default error message
        }
      }
      
      throw new Error(errorMessage)
    }

    // Check content type before parsing
    const contentType = response.headers.get('content-type') || ''
    if (!contentType.includes('application/json')) {
      const responseText = await response.text()
      console.error('Server returned non-JSON response:', responseText.substring(0, 200))
      throw new Error(`Server returned non-JSON response. Status: ${response.status}`)
    }

    const data = await response.json()
    console.log('ImageAnalysis: Backend response:', data)
    console.log('ImageAnalysis: Response success:', data.success)
    console.log('ImageAnalysis: Response results:', data.results)

    if (data.success && data.results) {
      // First, collect all the results (both successful and failed)
      const newResults = []
      const updatedImages = chunk.map(img => {
        const filename = img.name
        const results = data.results[filename]
        
        if (results && results.length > 0) {
          const result = results[0] // Take first result
          console.log('ImageAnalysis: Processing result for', filename, ':', result)
          if (result.success) {
            console.log('ImageAnalysis: Result is successful, adding to newResults')
            // Add successful result to AppContext
            const analysisResult = {
              id: img.id,
              filename: img.name,
              type: 'image',
              result: {
                title: result.title,
                keywords: result.keywords,
                category: result.category,
                releases: result.releases,
                raw_response: result.raw_response
              },
              service: selectedService,
              timestamp: img.timestamp || new Date().toISOString()
            }
            console.log('ImageAnalysis: Analysis result to push:', analysisResult)
            newResults.push(analysisResult)
            console.log('ImageAnalysis: newResults after push:', newResults)
            console.log('ImageAnalysis: newResults.length after push:', newResults.length)
            
            return {
              ...img,
              status: 'completed',
              result: {
                title: result.title,
                keywords: result.keywords,
                category: result.category,
                releases: result.releases,
                raw_response: result.raw_response
              }
            }
          } else {
            console.log('ImageAnalysis: Result is not successful for', filename, ':', result.error)
            // Add failed result to AppContext
            const errorResult = {
              id: img.id,
              filename: img.name,
              type: 'image',
              status: 'error',
              error: result.error,
              service: selectedService,
              timestamp: img.timestamp || new Date().toISOString()
            }
            newResults.push(errorResult)
            
            return {
              ...img,
              status: 'error',
              error: result.error
            }
          }
        } else {
          console.log('ImageAnalysis: No results received for', filename)
          // Add failed result to AppContext
          const errorResult = {
            id: img.id,
            filename: img.name,
            type: 'image',
            status: 'error',
            error: 'No results received',
            service: selectedService,
            timestamp: img.timestamp || new Date().toISOString()
          }
          newResults.push(errorResult)
          
          return {
            ...img,
            status: 'error',
            error: 'No results received'
          }
        }
      })

      // Update the images status
      setImagesWithStatus(prev => 
        prev.map(img => {
          const updatedImg = updatedImages.find(updated => updated.id === img.id)
          return updatedImg || img
        })
      )

      // Update AppContext with new results from this chunk
      console.log(`ImageAnalysis: Processing chunk results - newResults.length: ${newResults.length}`)
      console.log('ImageAnalysis: newResults content:', newResults)
      
      if (newResults.length > 0) {
        console.log(`ImageAnalysis: Updating AppContext with ${newResults.length} results from chunk`)
        console.log('ImageAnalysis: Current state results:', state.imageAnalysis.results)
        console.log('ImageAnalysis: New results to add:', newResults)
        
        setImageData({
          results: [...state.imageAnalysis.results, ...newResults]
        })
        console.log('ImageAnalysis: AppContext updated successfully')
      } else {
        console.log('ImageAnalysis: No new results to add to AppContext')
      }
    } else {
      console.log('ImageAnalysis: Analysis failed or no results received')
      console.log('ImageAnalysis: Error details:', data.error)
      console.log('ImageAnalysis: Full response data:', data)
      
      // Update chunk images to error status
      setImagesWithStatus(prev => 
        prev.map(img => 
          chunk.some(chunkImg => chunkImg.id === img.id) && img.status === 'processing'
            ? { ...img, status: 'error', error: data.error || 'Analysis failed' }
            : img
        )
      )
    }
  }

  // Batch analysis function with chunked processing
  const analyzeAllImages = async () => {
    const pendingImages = imagesWithStatus.filter(img => img.status === 'pending')
    
    if (pendingImages.length === 0) {
      alert('No pending images to analyze')
      return
    }

    const chunkSize = 6
    const totalChunks = Math.ceil(pendingImages.length / chunkSize)
    
    console.log(`Starting batch analysis of ${pendingImages.length} images in chunks of 6`)
    
    // Set initial progress
    setChunkProgress({
      currentChunk: 0,
      totalChunks: totalChunks,
      isProcessing: true
    })

    try {
      // Process images in chunks of 10
      for (let i = 0; i < pendingImages.length; i += chunkSize) {
        const chunk = pendingImages.slice(i, i + chunkSize)
        const currentChunkNumber = Math.floor(i / chunkSize) + 1
        
        console.log(`Processing chunk ${currentChunkNumber}/${totalChunks}: ${chunk.length} images`)
        
        // Update progress
        setChunkProgress(prev => ({
          ...prev,
          currentChunk: currentChunkNumber
        }))
        
        await processImageChunk(chunk)
        
        // Add a small delay between chunks to prevent overwhelming the server
        if (i + chunkSize < pendingImages.length) {
          console.log('Waiting 2 seconds before next chunk...')
          await new Promise(resolve => setTimeout(resolve, 2000))
        }
      }
      
      console.log('Batch analysis completed for all images')
      
      // Reset progress
      setChunkProgress({
        currentChunk: 0,
        totalChunks: 0,
        isProcessing: false
      })
    } catch (error) {
      console.error('Batch analysis error:', error)
      
      // Reset progress on error
      setChunkProgress({
        currentChunk: 0,
        totalChunks: 0,
        isProcessing: false
      })
      
      // Update any remaining processing images to error status
      setImagesWithStatus(prev => 
        prev.map(img => 
          img.status === 'processing' 
            ? { ...img, status: 'error', error: error.message }
            : img
        )
      )
    }
  }

  const downloadCSV = () => {
    const completedImages = imagesWithStatus.filter(img => img.status === 'completed' && img.result)
    
    if (completedImages.length === 0) {
      alert('No completed analyses to download')
      return
    }

    const csvData = completedImages.map(img => ({
      filename: img.name,
      title: img.result.title || '',
      keywords: img.result.keywords ? img.result.keywords.join(', ') : '',
      category: getCategoryNumber(img.result.category) || '-',
      releases: img.result.releases || '-'
    }))

    // Convert to CSV
    const headers = ['Filename', 'Title', 'Keywords', 'Category', 'Releases']
    const csvContent = [
      headers.join(','),
      ...csvData.map(row => [
        `"${row.filename}"`,
        `"${row.title}"`,
        `"${row.keywords}"`,
        `"${row.category}"`,
        `"${row.releases}"`
      ].join(','))
    ].join('\n')

    // Download CSV
    const blob = new Blob([csvContent], { type: 'text/csv' })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `image-analysis-${new Date().toISOString().split('T')[0]}.csv`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    window.URL.revokeObjectURL(url)
  }


  const services = [
    { id: 'openai', name: 'OpenAI GPT-4 Vision', color: 'bg-green-500', description: 'Advanced image understanding' },
    { id: 'gemini', name: 'Google Gemini', color: 'bg-blue-500', description: 'Google\'s multimodal AI' },
    { id: 'groq', name: 'Groq', color: 'bg-purple-500', description: 'Fast inference engine' },
    { id: 'grok', name: 'Grok', color: 'bg-orange-500', description: 'X.AI\'s vision model' },
    { id: 'llama', name: 'Llama', color: 'bg-indigo-500', description: 'Meta\'s open model' },
    { id: 'cohere', name: 'Cohere', color: 'bg-pink-500', description: 'Command A Vision with advanced image understanding' },
    { id: 'deepseek', name: 'DeepSeek', color: 'bg-cyan-500', description: 'Advanced vision capabilities' }
  ]

  const filteredServices = filterServicesWithKeys(services)

  return (
    <div className="space-y-4 sm:space-y-6 bg-gray-50 dark:bg-gray-900 min-h-screen p-4 sm:p-6 transition-colors duration-300">
      {/* Upload Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Image className="h-5 w-5" />
            Image Upload
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            Upload images for AI analysis. Supports JPG, PNG, GIF, BMP, WebP formats.
          </p>
        </CardHeader>
        <CardContent>
            <div
            className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-all duration-200 ${
              dragActive
                ? 'border-gray-900 dark:border-gray-100 bg-gray-50 dark:bg-gray-800 scale-105'
                : 'border-gray-300 hover:border-gray-400'
                }`}
              onClick={() => fileInputRef.current?.click()}
              onDragEnter={handleDrag}
              onDragLeave={handleDrag}
              onDragOver={handleDrag}
              onDrop={handleDrop}
            >
              {isUploading ? (
                <div className="space-y-4">
                  <Loader2 className="h-12 w-12 mx-auto text-gray-600 dark:text-gray-400 animate-spin" />
                  <div>
                    <p className="text-lg font-medium">Uploading Images...</p>
                    <p className="text-sm text-muted-foreground">
                      {uploadProgress.current} of {uploadProgress.total} images processed
                    </p>
                    <div className="w-full bg-gray-200 rounded-full h-2 mt-2">
                      <div
                        className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                        style={{ width: `${(uploadProgress.current / uploadProgress.total) * 100}%` }}
                      />
                    </div>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  <Upload className="h-12 w-12 mx-auto text-gray-400" />
                  <div>
                  <p className="text-lg font-medium">Upload Images</p>
                    <p className="text-sm text-muted-foreground">
                    Drag and drop images or click to browse
                    </p>
                    <p className="text-xs text-gray-500 mt-2">
                      Supports: JPG, PNG, GIF, BMP, WebP
                    </p>
                  </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation()
                        fileInputRef.current?.click()
                      }}
                      className="flex items-center gap-2"
                    >
                      <Image className="h-4 w-4" />
                      Select Images
                    </Button>
                </div>
              )}
            </div>
          
            <input
              ref={fileInputRef}
              type="file"
            multiple
              accept="image/*"
            onChange={(e) => handleFiles(Array.from(e.target.files))}
              className="hidden"
            />
        </CardContent>
      </Card>

      {/* AI Service Selection */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            AI Service Selection
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            Choose which AI service to use for analysis
          </p>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredServices.map((service) => {
                  const hasApiKey = service.hasApiKey
                  return (
                    <button
                      key={service.id}
                      onClick={() => hasApiKey && handleServiceToggle(service.id)}
                      disabled={!hasApiKey}
                  className={`relative p-4 rounded-xl border-2 transition-all duration-200 text-left ${
                    !hasApiKey
                      ? 'border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 cursor-not-allowed opacity-50'
                        : selectedService === service.id
                      ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20 shadow-md'
                      : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600 hover:shadow-sm'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-3 h-3 rounded-full ${service.color}`} />
                    <div className="flex-1">
                      <h3 className="font-medium text-sm text-gray-900 dark:text-gray-100">{service.name}</h3>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{service.description}</p>
                        </div>
                    {selectedService === service.id && (
                      <Check className="h-4 w-4 text-blue-600" />
                        )}
                      </div>
                  {!hasApiKey && (
                    <div className="mt-2 text-xs text-red-600 dark:text-red-400">
                      API key required
                    </div>
                  )}
                    </button>
                  )
                })}
              </div>
        </CardContent>
      </Card>

      {/* Custom Prompt */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
            <Edit3 className="h-5 w-5" />
            Custom Analysis Prompt
            </CardTitle>
          <p className="text-sm text-muted-foreground">
            Provide additional context for the AI analysis (optional)
          </p>
          </CardHeader>
          <CardContent>
          <textarea
            value={customPrompt}
            onChange={(e) => setCustomPrompt(e.target.value)}
            placeholder="e.g., Focus on landscape photography, emphasize natural lighting, target travel industry buyers..."
            className="w-full p-3 border border-gray-200 rounded-lg resize-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            rows={3}
          />
          </CardContent>
        </Card>

      {/* Chunk Processing Progress */}
      {chunkProgress.isProcessing && (
        <Card className="mb-6">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-200">
                Processing Images in Chunks
              </h3>
              <div className="text-sm text-gray-600 dark:text-gray-400">
                Chunk {chunkProgress.currentChunk} of {chunkProgress.totalChunks}
              </div>
            </div>
            <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-3 mb-2">
              <div 
                className="bg-blue-600 h-3 rounded-full transition-all duration-300"
                style={{ 
                  width: `${(chunkProgress.currentChunk / chunkProgress.totalChunks) * 100}%` 
                }}
              ></div>
            </div>
            <div className="text-sm text-gray-600 dark:text-gray-400">
              Processing 10 images at a time to optimize performance...
            </div>
          </CardContent>
        </Card>
      )}

      {/* Upload Table */}
      {imagesWithStatus.length > 0 && (
        <div ref={uploadTableRef}>
          <UploadTable
            items={imagesWithStatus}
            onAnalyze={analyzeImage}
            onDelete={removeImage}
            onEdit={updateImageMetadata}
            onGenerateMetadata={analyzeAllImages}
            onDownloadCSV={downloadCSV}
            type="image"
          />
        </div>
      )}

    </div>
  )
}

export default ImageAnalysis
