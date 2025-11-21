import React, { useState, useRef, useCallback, useEffect } from 'react'
import { useUser } from '@clerk/clerk-react'
import { Button } from './ui/button.jsx'
import { Card, CardContent, CardHeader, CardTitle } from './ui/card.jsx'
import { Textarea } from './ui/textarea.jsx'
import { KeywordEditor } from './ui/keyword-editor.jsx'
import UploadTable from './ui/UploadTable.jsx'
import { Upload, Loader2, Video, Copy, Check, X, Download, FileText, FileSpreadsheet, FolderOpen, AlertCircle, Settings, Edit3 } from 'lucide-react'
import { useApiKeys } from '../hooks/useApiKeys.js'
import { formatApiError } from '../utils/errorUtils.js'
import { motion, AnimatePresence } from 'framer-motion'
import { useAppContext } from '../context/AppContext'
import { getCategoryNumber } from '../utils/categoryUtils'

const VideoAnalysis = () => {
  const { user } = useUser()
  const { state, setVideoData } = useAppContext()
  const [selectedVideos, setSelectedVideos] = useState([])
  const { apiKeys, loading: keysLoading, annotateServicesWithKeys } = useApiKeys()
  const [selectedService, setSelectedService] = useState(() => {
    try {
      return localStorage.getItem('selectedAIService') || 'gemini'
    } catch (error) {
      console.warn('localStorage not available:', error)
      return 'gemini'
    }
  })

  const [dragActive, setDragActive] = useState(false)
  const [isUploading, setIsUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState({ current: 0, total: 0 })
  const fileInputRef = useRef(null)
  const uploadTableRef = useRef(null)

  // Enhanced videos with status tracking
  const [videosWithStatus, setVideosWithStatus] = useState([])

  // Custom prompt for analysis
  const [customPrompt, setCustomPrompt] = useState('')

  // Chunk processing state
  const [chunkProgress, setChunkProgress] = useState({
    currentChunk: 0,
    totalChunks: 0,
    isProcessing: false
  })

  // Update videos with status when selectedVideos changes
  useEffect(() => {
    if (selectedVideos.length > 0) {
      setVideosWithStatus(prevVideos => {
        const newVideos = selectedVideos.filter(video =>
          !prevVideos.some(prev => prev.id === video.id)
        ).map(video => ({
          ...video,
          status: 'pending',
          result: null,
          error: null
        }))

        return [...prevVideos, ...newVideos]
      })
    }
  }, [selectedVideos])

  const handleServiceToggle = (serviceId) => {
    setSelectedService(serviceId)
    try {
      localStorage.setItem('selectedAIService', serviceId)
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
    const videoFiles = files.filter(file =>
      file.type.startsWith('video/') ||
      file.name.toLowerCase().match(/\.(mp4|avi|mov|wmv|flv|webm|mkv)$/i)
    )

    if (videoFiles.length === 0) {
      alert('Please select valid video files (MP4, AVI, MOV, WMV, FLV, WebM, MKV)')
      return
    }

    setIsUploading(true)
    setUploadProgress({ current: 0, total: videoFiles.length })

    const newVideos = []

    for (let i = 0; i < videoFiles.length; i++) {
      const file = videoFiles[i]

      try {
        // Extract frames from video
        const frames = await extractFramesFromVideo(file, 8) // Extract 8 frames

        const newVideo = {
          id: `${Date.now()}-${Math.random()}`,
          name: file.name,
          size: file.size,
          type: file.type,
          preview: frames[0], // Use first frame as preview
          frames: frames, // Store all frames for analysis
          timestamp: new Date().toISOString(),
          file: file,
          status: 'pending',
          result: null,
          error: null
        }
        newVideos.push(newVideo)
        setUploadProgress({ current: i + 1, total: videoFiles.length })
      } catch (error) {
        console.error(`Error processing video ${file.name}:`, error)
        // Create video object with error
        const newVideo = {
          id: `${Date.now()}-${Math.random()}`,
          name: file.name,
          size: file.size,
          type: file.type,
          preview: null,
          frames: [],
          file: file,
          status: 'error',
          result: null,
          error: error.message
        }
        newVideos.push(newVideo)
        setUploadProgress({ current: i + 1, total: videoFiles.length })
      }
    }

    setVideosWithStatus(prev => [...prev, ...newVideos])
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

  // Helper function to extract frames from video
  const extractFramesFromVideo = (videoFile, numFrames = 8) => {
    return new Promise((resolve, reject) => {
      const video = document.createElement('video')
      const canvas = document.createElement('canvas')
      const ctx = canvas.getContext('2d')
      const fileURL = URL.createObjectURL(videoFile)

      if (!ctx) {
        return reject(new Error('Could not get canvas context'))
      }

      video.preload = 'metadata'
      video.src = fileURL
      video.muted = true
      video.playsInline = true

      const frames = []

      video.onloadedmetadata = async () => {
        if (video.duration === Infinity || video.duration === 0 || isNaN(video.duration)) {
          video.currentTime = 1e101
          await new Promise(r => setTimeout(r, 500))
        }

        if (video.duration === 0 || isNaN(video.duration) || video.duration === Infinity) {
          URL.revokeObjectURL(fileURL)
          return reject(new Error("Could not determine video duration. The file may be corrupt or in an unsupported format."))
        }

        // Downscale frames modestly for faster processing/upload
        const maxWidth = 960
        const scale = Math.min(1, maxWidth / video.videoWidth)
        const targetWidth = Math.round(video.videoWidth * scale)
        const targetHeight = Math.round(video.videoHeight * scale)

        canvas.width = targetWidth
        canvas.height = targetHeight

        const interval = video.duration / (numFrames + 1)
        let framesExtracted = 0

        const captureFrame = (time) => {
          return new Promise((resolveCapture, rejectCapture) => {
            video.currentTime = time
            const onSeeked = () => {
              video.removeEventListener('seeked', onSeeked)
              try {
                ctx.drawImage(video, 0, 0, targetWidth, targetHeight)
                // Slightly reduced quality for smaller payloads
                const dataUrl = canvas.toDataURL('image/jpeg', 0.75)
                frames.push(dataUrl)
                framesExtracted++
                resolveCapture()
              } catch (e) {
                rejectCapture(e)
              }
            }
            video.addEventListener('seeked', onSeeked)
          })
        }

        (async () => {
          try {
            for (let i = 1; i <= numFrames; i++) {
              const time = interval * i
              if (time < video.duration) {
                await captureFrame(time)
              }
            }
            URL.revokeObjectURL(fileURL)
            resolve(frames)
          } catch (err) {
            URL.revokeObjectURL(fileURL)
            reject(err)
          }
        })()
      }

      video.onerror = (e) => {
        URL.revokeObjectURL(fileURL)
        reject(new Error('Error loading video file. It may be corrupt or in an unsupported format.'))
      }
    })
  }


  const removeVideo = (videoId) => {
    setVideosWithStatus(prev => prev.filter(video => video.id !== videoId))
  }

  const updateVideoMetadata = (videoId, updatedMetadata) => {
    setVideosWithStatus(prev =>
      prev.map(video =>
        video.id === videoId
          ? {
            ...video,
            result: {
              ...video.result,
              ...updatedMetadata
            }
          }
          : video
      )
    )
  }

  const analyzeVideo = async (video) => {
    try {
      // Update status to processing
      setVideosWithStatus(prev =>
        prev.map(vid =>
          vid.id === video.id
            ? { ...vid, status: 'processing', error: null }
            : vid
        )
      )



      const response = await fetch('/api/analyze-video-structured', {
        method: 'POST',
        headers: {
          'X-User-ID': user.id,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          frames: video.frames, // Send extracted frames instead of full video
          filename: video.name,
          services: [selectedService],
          custom_prompt: customPrompt || 'This is a video file. Analyze the content for Adobe Stock video submission.'
        })
      })

      const data = await response.json()

      if (data.results && data.results.length > 0) {
        const result = data.results[0]

        if (result.success) {
          // Update status to completed with result
          setVideosWithStatus(prev =>
            prev.map(vid =>
              vid.id === video.id
                ? {
                  ...vid,
                  status: 'completed',
                  result: {
                    title: result.title,
                    keywords: result.keywords,
                    category: result.category,
                    releases: result.releases,
                    raw_response: result.raw_response
                  }
                }
                : vid
            )
          )

          // Update AppContext with the result
          const analysisResult = {
            id: video.id,
            filename: video.name,
            type: 'video',
            result: {
              title: result.title,
              keywords: result.keywords,
              category: result.category,
              releases: result.releases,
              raw_response: result.raw_response
            },
            service: selectedService,
            timestamp: video.timestamp || new Date().toISOString()
          }


          setVideoData({
            results: [...state.videoAnalysis.results, analysisResult]
          })

        } else {
          // Update status to error
          setVideosWithStatus(prev =>
            prev.map(vid =>
              vid.id === video.id
                ? { ...vid, status: 'error', error: result.error }
                : vid
            )
          )
        }
      } else {
        // Update status to error
        setVideosWithStatus(prev =>
          prev.map(vid =>
            vid.id === video.id
              ? { ...vid, status: 'error', error: 'No results received' }
              : vid
          )
        )
      }
    } catch (error) {
      console.error('Analysis error:', error)
      // Update status to error
      setVideosWithStatus(prev =>
        prev.map(vid =>
          vid.id === video.id
            ? { ...vid, status: 'error', error: error.message }
            : vid
        )
      )
    }
  }

  // Process videos in chunks of 2
  const processVideoChunk = async (chunk) => {


    // Update chunk videos to processing
    setVideosWithStatus(prev =>
      prev.map(video =>
        chunk.some(chunkVideo => chunkVideo.id === video.id)
          ? { ...video, status: 'processing', error: null }
          : video
      )
    )

    // Prepare batch data for this chunk
    const batchData = {
      videos: chunk.map(video => ({
        frames: video.frames, // Send extracted frames
        filename: video.name
      })),
      services: [selectedService],
      custom_prompt: customPrompt
    }



    const response = await fetch('/api/analyze-videos-batch', {
      method: 'POST',
      headers: {
        'X-User-ID': user.id,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(batchData)
    })

    const data = await response.json()

    if (data.success && data.results) {
      // First, collect all the results (both successful and failed)
      const newResults = []
      const updatedVideos = chunk.map(video => {
        const filename = video.name
        const results = data.results[filename]

        if (results && results.length > 0) {
          const result = results[0] // Take first result

          if (result.success) {

            // Add successful result to AppContext
            const analysisResult = {
              id: video.id,
              filename: video.name,
              type: 'video',
              result: {
                title: result.title,
                keywords: result.keywords,
                category: result.category,
                releases: result.releases,
                raw_response: result.raw_response
              },
              service: selectedService,
              timestamp: video.timestamp || new Date().toISOString()
            }
            newResults.push(analysisResult)

            return {
              ...video,
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

            // Add failed result to AppContext
            const errorResult = {
              id: video.id,
              filename: video.name,
              type: 'video',
              status: 'error',
              error: result.error,
              service: selectedService,
              timestamp: video.timestamp || new Date().toISOString()
            }
            newResults.push(errorResult)

            return {
              ...video,
              status: 'error',
              error: result.error
            }
          }
        } else {

          // Add failed result to AppContext
          const errorResult = {
            id: video.id,
            filename: video.name,
            type: 'video',
            status: 'error',
            error: 'No results received',
            service: selectedService,
            timestamp: video.timestamp || new Date().toISOString()
          }
          newResults.push(errorResult)

          return {
            ...video,
            status: 'error',
            error: 'No results received'
          }
        }
      })

      // Update the videos status
      setVideosWithStatus(prev =>
        prev.map(video => {
          const updatedVideo = updatedVideos.find(updated => updated.id === video.id)
          return updatedVideo || video
        })
      )

      // Update AppContext with new results from this chunk


      if (newResults.length > 0) {


        setVideoData({
          results: [...state.videoAnalysis.results, ...newResults]
        })

      } else {

      }
    } else {
      // Update chunk videos to error status
      setVideosWithStatus(prev =>
        prev.map(video =>
          chunk.some(chunkVideo => chunkVideo.id === video.id) && video.status === 'processing'
            ? { ...video, status: 'error', error: data.error || 'Analysis failed' }
            : video
        )
      )
    }
  }

  // Batch analysis function with chunked processing
  const analyzeAllVideos = async () => {
    // Process both pending and errored files (retry errored files)
    const videosToProcess = videosWithStatus.filter(video =>
      video.status === 'pending' || video.status === 'error'
    )

    if (videosToProcess.length === 0) {
      alert('No videos to analyze. Upload new videos or wait for pending analysis.')
      return
    }

    const chunkSize = 2
    const totalChunks = Math.ceil(videosToProcess.length / chunkSize)



    // Set initial progress
    setChunkProgress({
      currentChunk: 0,
      totalChunks: totalChunks,
      isProcessing: true
    })

    try {
      // Process videos in chunks of 2
      for (let i = 0; i < videosToProcess.length; i += chunkSize) {
        const chunk = videosToProcess.slice(i, i + chunkSize)
        const currentChunkNumber = Math.floor(i / chunkSize) + 1



        // Update progress
        setChunkProgress(prev => ({
          ...prev,
          currentChunk: currentChunkNumber
        }))

        await processVideoChunk(chunk)

        // Add a small delay between chunks to prevent overwhelming the server
        if (i + chunkSize < videosToProcess.length) {

          await new Promise(resolve => setTimeout(resolve, 3000))
        }
      }



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

      // Update any remaining processing videos to error status
      setVideosWithStatus(prev =>
        prev.map(video =>
          video.status === 'processing'
            ? { ...video, status: 'error', error: error.message }
            : video
        )
      )
    }
  }

  const downloadCSV = () => {
    const completedVideos = videosWithStatus.filter(video => video.status === 'completed' && video.result)

    if (completedVideos.length === 0) {
      alert('No completed analyses to download')
      return
    }

    const csvData = completedVideos.map(video => ({
      filename: video.name,
      title: video.result.title || '',
      keywords: video.result.keywords ? video.result.keywords.join(', ') : '',
      category: getCategoryNumber(video.result.category) || '-',
      releases: video.result.releases || '-'
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
    a.download = `video-analysis-${new Date().toISOString().split('T')[0]}.csv`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    window.URL.revokeObjectURL(url)
  }


  const services = [
    { id: 'gemini', name: 'Google Gemini', color: 'bg-blue-500', description: 'Native video support' },
    { id: 'openai', name: 'OpenAI GPT-4o', color: 'bg-green-500', description: 'Advanced video understanding' },

    { id: 'grok', name: 'Grok', color: 'bg-orange-500', description: 'X.AI\'s video model' },
    { id: 'llama', name: 'Llama', color: 'bg-indigo-500', description: 'Meta\'s vision model' },
    { id: 'cohere', name: 'Cohere', color: 'bg-pink-500', description: 'Command A Vision with frame analysis' },
    { id: 'deepseek', name: 'DeepSeek', color: 'bg-cyan-500', description: 'Advanced video capabilities' }
  ]

  const filteredServices = annotateServicesWithKeys(services)

  return (
    <div className="space-y-4 sm:space-y-6 bg-gray-50 dark:bg-gray-900 min-h-screen p-4 sm:p-6 transition-colors duration-300">
      {/* Upload Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Video className="h-5 w-5" />
            Video Upload
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            Upload videos for AI analysis. Supports MP4, AVI, MOV, WMV, FLV, WebM, MKV formats.
          </p>
        </CardHeader>
        <CardContent>
          <div
            className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-all duration-200 ${dragActive
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
                  <p className="text-lg font-medium">Uploading Videos...</p>
                  <p className="text-sm text-muted-foreground">
                    {uploadProgress.current} of {uploadProgress.total} videos processed
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
                  <p className="text-lg font-medium">Upload Videos</p>
                  <p className="text-sm text-muted-foreground">
                    Drag and drop videos or click to browse
                  </p>
                  <p className="text-xs text-gray-500 mt-2">
                    Supports: MP4, AVI, MOV, WMV, FLV, WebM, MKV
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
                  <Video className="h-4 w-4" />
                  Select Videos
                </Button>
              </div>
            )}
          </div>

          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept="video/*"
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
            Choose which AI service to use for video analysis
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
                  className={`relative p-4 rounded-xl border-2 transition-all duration-200 text-left ${!hasApiKey
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
            placeholder="e.g., Focus on motion and action, emphasize cinematic quality, target video production buyers..."
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
                Processing Videos in Chunks
              </h3>
              <div className="text-sm text-gray-600 dark:text-gray-400">
                Chunk {chunkProgress.currentChunk} of {chunkProgress.totalChunks}
              </div>
            </div>
            <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-3 mb-2">
              <div
                className="bg-purple-600 h-3 rounded-full transition-all duration-300"
                style={{
                  width: `${(chunkProgress.currentChunk / chunkProgress.totalChunks) * 100}%`
                }}
              ></div>
            </div>
            <div className="text-sm text-gray-600 dark:text-gray-400">
              Processing 2 videos at a time to optimize performance...
            </div>
          </CardContent>
        </Card>
      )}

      {/* Upload Table */}
      {videosWithStatus.length > 0 && (
        <div ref={uploadTableRef}>
          <UploadTable
            items={videosWithStatus}
            onAnalyze={analyzeVideo}
            onDelete={removeVideo}
            onEdit={updateVideoMetadata}
            onGenerateMetadata={analyzeAllVideos}
            onDownloadCSV={downloadCSV}
            type="video"
          />
        </div>
      )}

    </div>
  )
}

export default VideoAnalysis