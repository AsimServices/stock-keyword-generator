import { useState, useRef, useCallback } from 'react'
import { Button } from './ui/button.jsx'
import { Card, CardContent, CardHeader, CardTitle } from './ui/card.jsx'
import { Textarea } from './ui/textarea.jsx'
import { KeywordEditor } from './ui/keyword-editor.jsx'
import { Upload, Loader2, Video, Copy, Check, X, Download, FileText, FileSpreadsheet, FolderOpen, AlertCircle, Settings } from 'lucide-react'
import { useApiKeys } from '../hooks/useApiKeys.js'
import { formatApiError } from '../utils/errorUtils.js'
import { motion, AnimatePresence } from 'framer-motion'

const VideoAnalysis = () => {
  const [selectedVideos, setSelectedVideos] = useState([])
  const { apiKeys, loading: keysLoading, filterServicesWithKeys } = useApiKeys()
  const [selectedService, setSelectedService] = useState(() => {
    try {
      return localStorage.getItem('selectedAIService') || 'gemini'
    } catch (error) {
      console.warn('localStorage not available:', error)
      return 'gemini'
    }
  })
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [isUploading, setIsUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState({ current: 0, total: 0 })
  const [results, setResults] = useState([])
  const [copiedIndex, setCopiedIndex] = useState(null)
  const [currentProgress, setCurrentProgress] = useState(0)
  const [totalVideos, setTotalVideos] = useState(0)
  const [dragActive, setDragActive] = useState(false)
  const fileInputRef = useRef(null)
  const folderInputRef = useRef(null)

  const services = [
    {
      id: 'gemini',
      name: 'Google Gemini',
      color: 'bg-blue-500',
      gradient: 'from-blue-400 to-blue-600',
      videoSupport: true,
      nativeVideoSupport: true,
      premium: true,
      description: '🎥 BEST VIDEO SUPPORT - Complete video analysis with audio, visual, and temporal understanding',
      badge: 'Native Video'
    },
    {
      id: 'openai',
      name: 'OpenAI GPT-4o',
      color: 'bg-green-500',
      gradient: 'from-green-400 to-green-600',
      videoSupport: true,
      nativeVideoSupport: false,
      description: '📷 Frame-based analysis - Extracts key frames for comprehensive understanding',
      badge: 'Frame Analysis'
    },
    {
      id: 'groq',
      name: 'Groq Llama',
      color: 'bg-yellow-500',
      gradient: 'from-yellow-400 to-yellow-600',
      videoSupport: true,
      nativeVideoSupport: false,
      description: '📷 Fast frame analysis - High-speed processing of video frames',
      badge: 'Frame Analysis'
    },
    {
      id: 'grok',
      name: 'xAI Grok',
      color: 'bg-purple-500',
      gradient: 'from-purple-400 to-purple-600',
      videoSupport: true,
      nativeVideoSupport: false,
      description: '📷 Advanced reasoning - Intelligent frame extraction with enhanced reasoning',
      badge: 'Frame Analysis'
    },
    {
      id: 'llama',
      name: 'Meta Llama Vision',
      color: 'bg-orange-500',
      gradient: 'from-orange-400 to-orange-600',
      videoSupport: true,
      nativeVideoSupport: false,
      description: '📷 Open-source frame analysis - Free and powerful frame-based understanding',
      badge: 'Frame Analysis'
    },
    {
      id: 'cohere',
      name: 'Cohere Command-A',
      color: 'bg-pink-500',
      gradient: 'from-pink-400 to-pink-600',
      videoSupport: true,
      nativeVideoSupport: false,
      description: '📷 Enterprise frame analysis - Professional-grade frame extraction and analysis',
      badge: 'Frame Analysis'
    },
    {
      id: 'deepseek',
      name: 'DeepSeek V2.5',
      color: 'bg-indigo-500',
      gradient: 'from-indigo-400 to-indigo-600',
      videoSupport: true,
      nativeVideoSupport: false,
      description: '📷 Deep reasoning frames - Advanced reasoning applied to extracted frames',
      badge: 'Frame Analysis'
    }
  ]

  const processFiles = useCallback(async (files) => {
    const videoFiles = Array.from(files).filter(file => file.type.startsWith('video/'))

    if (videoFiles.length === 0) {
      return
    }

    setIsUploading(true)
    setUploadProgress({ current: 0, total: videoFiles.length })

    for (let i = 0; i < videoFiles.length; i++) {
      const file = videoFiles[i]
      setUploadProgress({ current: i + 1, total: videoFiles.length })

      await new Promise((resolve) => {
        const reader = new FileReader()
        reader.onload = (e) => {
          const newVideo = {
            id: Date.now() + Math.random(),
            file: file,
            preview: e.target.result,
            name: file.name,
            size: file.size,
            type: file.type
          }
          setSelectedVideos(prev => [...prev, newVideo])
          resolve()
        }
        reader.readAsDataURL(file)
      })

      // Small delay to show progress
      await new Promise(resolve => setTimeout(resolve, 200))
    }

    setIsUploading(false)
    setUploadProgress({ current: 0, total: 0 })
  }, [])

  const handleDrag = useCallback((e) => {
    e.preventDefault()
    e.stopPropagation()
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true)
    } else if (e.type === "dragleave") {
      setDragActive(false)
    }
  }, [])

  const handleDrop = useCallback((e) => {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(false)

    const files = []

    if (e.dataTransfer.items) {
      // Handle folder drops
      for (let i = 0; i < e.dataTransfer.items.length; i++) {
        const item = e.dataTransfer.items[i]
        if (item.kind === 'file') {
          const entry = item.webkitGetAsEntry()
          if (entry) {
            if (entry.isDirectory) {
              // Handle folder
              readDirectory(entry, files).then(() => {
                processFiles(files)
              })
              return
            } else {
              // Handle individual files
              files.push(item.getAsFile())
            }
          }
        }
      }
      if (files.length > 0) {
        processFiles(files)
      }
    } else {
      // Fallback for older browsers
      processFiles(e.dataTransfer.files)
    }
  }, [processFiles])

  const readDirectory = async (dirEntry, files) => {
    const dirReader = dirEntry.createReader()

    return new Promise((resolve) => {
      const readEntries = () => {
        dirReader.readEntries(async (entries) => {
          if (entries.length === 0) {
            resolve()
            return
          }

          for (const entry of entries) {
            if (entry.isFile && entry.name.match(/\.(mp4|avi|mov|wmv|flv|webm|mkv|m4v)$/i)) {
              await new Promise((fileResolve) => {
                entry.file((file) => {
                  files.push(file)
                  fileResolve()
                })
              })
            } else if (entry.isDirectory) {
              await readDirectory(entry, files)
            }
          }

          readEntries() // Continue reading
        })
      }
      readEntries()
    })
  }

  const handleFileUpload = (event) => {
    const files = event.target.files
    if (files) {
      processFiles(files)
    }
  }

  const handleFolderUpload = (event) => {
    const files = event.target.files
    if (files) {
      processFiles(files)
    }
  }

  const removeVideo = (videoId) => {
    setSelectedVideos(prev => prev.filter(vid => vid.id !== videoId))
    setResults(prev => prev.filter(result => result.videoId !== videoId))
  }

  const handleServiceToggle = (serviceId) => {
    setSelectedService(serviceId)
    try {
      localStorage.setItem('selectedAIService', serviceId)
    } catch (error) {
      console.warn('Failed to save service selection to localStorage:', error)
    }
  }

  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  const analyzeVideos = async () => {
    if (selectedVideos.length === 0 || !selectedService) return

    setIsAnalyzing(true)
    setResults([])
    setCurrentProgress(0)
    setTotalVideos(selectedVideos.length)

    try {
      for (let i = 0; i < selectedVideos.length; i++) {
        const video = selectedVideos[i]
        setCurrentProgress(i + 1)

        const response = await fetch('/api/analyze-video', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            video: video.preview,
            filename: video.name,
            services: [selectedService],
            mimeType: video.type
          })
        })

        const data = await response.json()

        if (data.results) {
          const videoResults = data.results.map(result => ({
            ...result,
            videoId: video.id,
            videoName: video.name
          }))
          setResults(prev => [...prev, ...videoResults])
        } else if (data.error) {
          console.error('Analysis error:', data.error)
          const errorResult = {
            videoId: video.id,
            videoName: video.name,
            service: 'Error',
            success: false,
            error: formatApiError(data.error)
          }
          setResults(prev => [...prev, errorResult])
        }
      }
    } catch (error) {
      console.error('Error analyzing videos:', error)
    } finally {
      setIsAnalyzing(false)
      setCurrentProgress(0)
      setTotalVideos(0)
    }
  }

  const copyToClipboard = async (text, index) => {
    try {
      await navigator.clipboard.writeText(text)
      setCopiedIndex(index)
      setTimeout(() => setCopiedIndex(null), 2000)
    } catch (error) {
      console.error('Failed to copy text:', error)
    }
  }

  const downloadResults = (format) => {
    if (results.length === 0) return

    const successfulResults = results.filter(result => result.success)

    if (format === 'txt') {
      let content = 'AI Video Analysis Results\n'
      content += '================================\n\n'

      const groupedResults = successfulResults.reduce((acc, result) => {
        if (!acc[result.videoId]) {
          acc[result.videoId] = {
            videoName: result.videoName,
            results: []
          }
        }
        acc[result.videoId].results.push(result)
        return acc
      }, {})

      Object.values(groupedResults).forEach(videoGroup => {
        content += `Video: ${videoGroup.videoName}\n`
        content += '-'.repeat(50) + '\n'
        videoGroup.results.forEach(result => {
          content += `${result.service}:\n`
          if (result.title) {
            content += `Title: ${result.title}\n\n`
          }
          if (result.keywords && result.keywords.length > 0) {
            content += `Keywords: ${result.keywords.join(', ')}\n\n`
          }
          content += '\n'
        })
        content += '\n'
      })

      const blob = new Blob([content], { type: 'text/plain' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `video-analysis-${new Date().toISOString().split('T')[0]}.txt`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
    } else if (format === 'csv') {
      let csvContent = 'Video Name,AI Service,Keywords and Title\n'

      successfulResults.forEach(result => {
        const titleAndKeywords = `${result.title || ''}\n\n${(result.keywords || []).join(', ')}`
        const escapedResult = titleAndKeywords.replace(/"/g, '""')
        csvContent += `"${result.videoName}","${result.service}","${escapedResult}"\n`
      })

      const blob = new Blob([csvContent], { type: 'text/csv' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `video-analysis-${new Date().toISOString().split('T')[0]}.csv`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
    }
  }

  const groupedResults = results.reduce((acc, result) => {
    if (!acc[result.videoId]) {
      acc[result.videoId] = {
        videoName: result.videoName,
        results: []
      }
    }
    acc[result.videoId].results.push(result)
    return acc
  }, {})

  const hasVideoSupportedService = services.find(s => s.id === selectedService)?.videoSupport

  return (
    <div className="space-y-6">
      {/* Upload Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Video className="h-5 w-5" />
            Video Upload
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            Upload videos for AI analysis. <span className="text-blue-600 font-medium">🌟 Gemini offers the BEST video support</span> with complete video processing, while other services use intelligent frame extraction.
          </p>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div
              className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-all duration-200 ${dragActive
                ? 'border-blue-500 bg-blue-50 scale-105'
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
                  <Loader2 className="h-12 w-12 mx-auto text-blue-500 animate-spin" />
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
              ) : selectedVideos.length > 0 ? (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {selectedVideos.map((video) => (
                      <div key={video.id} className="relative group border rounded-lg p-4 bg-gray-50">
                        <div className="flex items-center gap-3">
                          <Video className="h-8 w-8 text-blue-500 flex-shrink-0" />
                          <div className="flex-1 min-w-0">
                            <p className="font-medium truncate">{video.name}</p>
                            <p className="text-sm text-gray-500">{formatFileSize(video.size)}</p>
                            <p className="text-xs text-gray-400">{video.type}</p>
                          </div>
                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              removeVideo(video.id)
                            }}
                            className="bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                          >
                            <X className="h-3 w-3" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                    <p className="text-green-800 font-medium">
                      ✅ {selectedVideos.length} video{selectedVideos.length !== 1 ? 's' : ''} uploaded successfully
                    </p>
                    <p className="text-sm text-green-600 mt-1">
                      Click here or drag more videos/folders to add additional files
                    </p>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  <Upload className="h-12 w-12 mx-auto text-gray-400" />
                  <div>
                    <p className="text-lg font-medium">Upload Videos or Folders</p>
                    <p className="text-sm text-muted-foreground">
                      Drag and drop videos, folders, or click to browse
                    </p>
                    <p className="text-xs text-gray-500 mt-2">
                      Supports: MP4, AVI, MOV, WMV, FLV, WebM, MKV, M4V
                    </p>
                  </div>
                  <div className="flex gap-2 justify-center">
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
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation()
                        folderInputRef.current?.click()
                      }}
                      className="flex items-center gap-2"
                    >
                      <FolderOpen className="h-4 w-4" />
                      Select Folder
                    </Button>
                  </div>
                </div>
              )}
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept="video/*"
              multiple
              onChange={handleFileUpload}
              className="hidden"
            />
            <input
              ref={folderInputRef}
              type="file"
              webkitdirectory=""
              multiple
              onChange={handleFolderUpload}
              className="hidden"
            />
          </div>
        </CardContent>
      </Card>

      {/* Enhanced Service Selection */}
      <Card>
        <CardHeader>
          <CardTitle>Select AI Service</CardTitle>
          <p className="text-sm text-muted-foreground">
            Choose an AI model to analyze your videos with
          </p>
        </CardHeader>
        <CardContent>
          {keysLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-gray-500" />
              <span className="ml-2 text-gray-500">Checking API keys...</span>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {filterServicesWithKeys(services).map((service) => {
                  const hasApiKey = service.hasApiKey
                  const canUse = hasApiKey && service.videoSupport
                  return (
                    <button
                      key={service.id}
                      onClick={() => canUse && handleServiceToggle(service.id)}
                      disabled={!canUse}
                      className={`relative p-6 rounded-xl border-2 transition-all duration-200 text-left min-h-[160px] ${!canUse
                        ? 'border-gray-200 bg-gray-50 opacity-60 cursor-not-allowed'
                        : selectedService === service.id
                          ? service.nativeVideoSupport
                            ? 'border-blue-500 bg-gradient-to-br from-blue-50 to-purple-50 shadow-lg scale-[1.02] ring-2 ring-blue-200 cursor-pointer'
                            : 'border-blue-500 bg-blue-50 shadow-lg scale-[1.02] cursor-pointer'
                          : service.nativeVideoSupport
                            ? 'border-blue-300 bg-gradient-to-br from-blue-25 to-purple-25 hover:border-blue-400 hover:shadow-md hover:scale-[1.01] cursor-pointer'
                            : 'border-gray-200 hover:border-blue-300 hover:bg-gray-50 hover:shadow-md hover:scale-[1.01] cursor-pointer'
                        }`}
                    >
                      {selectedService === service.id && canUse && (
                        <div className="absolute -top-1 -right-1 w-5 h-5 bg-blue-500 rounded-full flex items-center justify-center">
                          <Check className="h-3 w-3 text-white" />
                        </div>
                      )}

                      <div className="flex items-center justify-between mb-2">
                        <div className={`w-3 h-3 rounded-full ${service.color}`} />
                        {!hasApiKey ? (
                          <span className="bg-red-100 text-red-700 text-xs px-2 py-1 rounded-md font-medium flex items-center gap-1">
                            <AlertCircle className="h-3 w-3" />
                            No API Key
                          </span>
                        ) : service.nativeVideoSupport ? (
                          <span className="bg-gradient-to-r from-blue-500 to-purple-500 text-white text-xs px-2 py-1 rounded-md font-medium">
                            ⭐ {service.badge}
                          </span>
                        ) : service.videoSupport ? (
                          <span className="bg-green-100 text-green-700 text-xs px-2 py-1 rounded-md font-medium">
                            {service.badge}
                          </span>
                        ) : (
                          <span className="bg-amber-100 text-amber-700 text-xs px-2 py-1 rounded-md font-medium">
                            Limited
                          </span>
                        )}
                      </div>

                      <h3 className={`font-bold text-base mb-3 ${canUse ? 'text-gray-900' : 'text-gray-500'}`}>
                        {service.name}
                      </h3>

                      <p className={`text-sm leading-relaxed ${canUse ? 'text-gray-600' : 'text-gray-400'}`}>
                        {!hasApiKey ? 'Configure API key in settings to use this service' : service.description}
                      </p>
                    </button>
                  )
                })}
              </div>

              {filterServicesWithKeys(services).every(s => !s.hasApiKey) && (
                <div className="text-center py-8">
                  <AlertCircle className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">No API Keys Configured</h3>
                  <p className="text-gray-600 mb-4">Add your AI service API keys in settings to start analyzing videos.</p>
                  <Button variant="outline" className="gap-2" onClick={() => window.location.assign('/settings')}>
                    <Settings className="h-4 w-4" />
                    Go to Settings
                  </Button>
                </div>
              )}
            </>
          )}

          {!hasVideoSupportedService && selectedService && (
            <div className="mt-4 p-4 bg-amber-50 border border-amber-200 rounded-lg">
              <div className="flex items-start gap-2">
                <AlertCircle className="h-5 w-5 text-amber-600 mt-0.5" />
                <div>
                  <p className="text-amber-800 font-medium">Limited Video Support</p>
                  <p className="text-amber-700 text-sm mt-1">
                    The selected service has limited video analysis capabilities. For best results with videos, select Gemini which provides complete video understanding.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Progress indicator */}
          {isAnalyzing && (
            <div className="mt-6 space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span>Analyzing videos...</span>
                <span>{currentProgress} of {totalVideos}</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${(currentProgress / totalVideos) * 100}%` }}
                />
              </div>
            </div>
          )}

          <Button
            onClick={analyzeVideos}
            disabled={selectedVideos.length === 0 || !selectedService || isAnalyzing}
            className="w-full mt-6"
            size="lg"
          >
            {isAnalyzing ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Analyzing {currentProgress} of {totalVideos}...
              </>
            ) : (
              `Analyze ${selectedVideos.length} Video${selectedVideos.length !== 1 ? 's' : ''}`
            )}
          </Button>
        </CardContent>
      </Card>

      {/* Download Section */}
      {results.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Download className="h-5 w-5" />
              Download Results
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex gap-4">
              <Button
                onClick={() => downloadResults('txt')}
                variant="outline"
                className="flex items-center gap-2"
              >
                <FileText className="h-4 w-4" />
                Download TXT
              </Button>
              <Button
                onClick={() => downloadResults('csv')}
                variant="outline"
                className="flex items-center gap-2"
              >
                <FileSpreadsheet className="h-4 w-4" />
                Download CSV
              </Button>
            </div>
            <p className="text-sm text-muted-foreground mt-2">
              Download all successful analysis results in your preferred format
            </p>
          </CardContent>
        </Card>
      )}

      {/* Results - Side by Side Layout */}
      <AnimatePresence>
        {Object.keys(groupedResults).length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="space-y-6"
          >
            <h3 className="text-xl font-semibold">Analysis Results</h3>
            {Object.entries(groupedResults).map(([videoId, videoGroup]) => {
              const video = selectedVideos.find(v => v.id === parseInt(videoId))
              return (
                <Card key={videoId} className="overflow-hidden">
                  <CardHeader className="bg-gray-50">
                    <CardTitle className="flex items-center gap-2">
                      <Video className="h-4 w-4" />
                      {videoGroup.videoName}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-6">
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 min-h-0">
                      {/* Left Side - Video Preview */}
                      <div className="space-y-4 order-2 lg:order-1">
                        <div className="aspect-video bg-gray-100 rounded-lg overflow-hidden border">
                          {video ? (
                            <video
                              src={video.preview}
                              controls
                              className="w-full h-full object-cover"
                              poster={video.preview}
                            >
                              Your browser does not support the video tag.
                            </video>
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-gray-500">
                              <div className="text-center">
                                <Video className="h-12 w-12 mx-auto mb-2 text-gray-400" />
                                <p className="text-sm">Video Preview</p>
                              </div>
                            </div>
                          )}
                        </div>
                        <div className="bg-gray-50 rounded-lg p-4">
                          <h4 className="font-medium text-sm text-gray-700 mb-2">Video Details</h4>
                          <div className="space-y-1 text-sm text-gray-600">
                            <p><span className="font-medium">Name:</span> {videoGroup.videoName}</p>
                            {video && (
                              <>
                                <p><span className="font-medium">Size:</span> {formatFileSize(video.size)}</p>
                                <p><span className="font-medium">Type:</span> {video.type}</p>
                              </>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Right Side - Keywords and Analysis */}
                      <div className="space-y-4 order-1 lg:order-2">
                        <h4 className="font-semibold text-lg text-gray-900 mb-4">Keywords & Analysis</h4>
                        {videoGroup.results.map((result, index) => {
                          const service = services.find(s => s.name.toLowerCase().includes(result.service.toLowerCase()))
                          const globalIndex = `${videoId}-${index}`
                          return (
                            <Card key={index} className={result.success ? 'border-gray-200 shadow-sm' : 'border-red-200'}>
                              <CardHeader className="pb-3">
                                <CardTitle className="flex items-center justify-between text-base">
                                  <div className="flex items-center gap-2">
                                    {service && <div className={`w-3 h-3 rounded-full ${service.color}`} />}
                                    <span className="font-medium">{result.service}</span>
                                  </div>
                                  {result.success && (
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      onClick={() => copyToClipboard(`${result.title || ''}\n\n${(result.keywords || []).join(', ')}`, globalIndex)}
                                      className="flex items-center gap-2"
                                    >
                                      {copiedIndex === globalIndex ? (
                                        <>
                                          <Check className="h-4 w-4" />
                                          Copied
                                        </>
                                      ) : (
                                        <>
                                          <Copy className="h-4 w-4" />
                                          Copy All
                                        </>
                                      )}
                                    </Button>
                                  )}
                                </CardTitle>
                              </CardHeader>
                              <CardContent>
                                {result.success ? (
                                  <div>
                                    <KeywordEditor
                                      title={result.title || ''}
                                      keywords={result.keywords || []}
                                      onTitleChange={(newTitle) => {
                                        // Update result with new title
                                        setResults(prev => prev.map(r =>
                                          r.videoId === result.videoId && r.service === result.service
                                            ? { ...r, title: newTitle }
                                            : r
                                        ))
                                      }}
                                      onKeywordsChange={(newKeywords) => {
                                        // Update result with new keywords
                                        setResults(prev => prev.map(r =>
                                          r.videoId === result.videoId && r.service === result.service
                                            ? { ...r, keywords: newKeywords }
                                            : r
                                        ))
                                      }}
                                      readOnly={false}
                                    />
                                  </div>
                                ) : (
                                  <div className="text-red-600 bg-red-50 p-3 rounded-md">
                                    <p className="font-medium">Error:</p>
                                    <p className="text-sm">{result.error}</p>
                                  </div>
                                )}
                              </CardContent>
                            </Card>
                          )
                        })}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )
            })}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

export default VideoAnalysis
