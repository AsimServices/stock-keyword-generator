import { useState, useRef, useCallback, useEffect } from 'react'
import { Button } from './ui/button.jsx'
import { Card, CardContent, CardHeader, CardTitle } from './ui/card.jsx'
import { Textarea } from './ui/textarea.jsx'
import { KeywordEditor } from './ui/keyword-editor.jsx'
import { useAppContext } from '../context/AppContext'
import { downloadTXT, downloadCSV, downloadExcel, downloadPDF } from '../utils/downloadUtils'
import { Upload, Loader2, Image, Copy, Check, X, Download, FileText, FileSpreadsheet, File, Printer, FolderOpen, Edit3, Save, XCircle, AlertCircle, Settings, Eye } from 'lucide-react'
import { useApiKeys } from '../hooks/useApiKeys.js'
import { formatApiError } from '../utils/errorUtils.js'
import { motion, AnimatePresence } from 'framer-motion'

const ImageAnalysis = () => {
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

  const [isUploading, setIsUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState({ current: 0, total: 0 })
  const [copiedIndex, setCopiedIndex] = useState(null)
  const [dragActive, setDragActive] = useState(false)
  const [modalImage, setModalImage] = useState(null)
  const fileInputRef = useRef(null)
  const folderInputRef = useRef(null)

  // Handle escape key for modal
  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === 'Escape' && modalImage) {
        setModalImage(null)
      }
    }

    if (modalImage) {
      document.addEventListener('keydown', handleEscape)
      // Prevent body scroll when modal is open
      document.body.style.overflow = 'hidden'
    }

    return () => {
      document.removeEventListener('keydown', handleEscape)
      document.body.style.overflow = 'unset'
    }
  }, [modalImage])

  const services = [
    {
      id: 'openai',
      name: 'OpenAI GPT-4 Vision',
      color: 'bg-green-500',
      gradient: 'from-green-400 to-green-600',
      description: 'Advanced image understanding and detailed analysis'
    },
    {
      id: 'gemini',
      name: 'Google Gemini Pro Vision',
      color: 'bg-blue-500',
      gradient: 'from-blue-400 to-blue-600',
      description: 'Multimodal AI with excellent visual understanding'
    },
    {
      id: 'groq',
      name: 'Groq Llama Vision',
      color: 'bg-yellow-500',
      gradient: 'from-yellow-400 to-yellow-600',
      description: 'Fast Llama Vision models with high-speed inference'
    },
    {
      id: 'grok',
      name: 'xAI Grok Vision',
      color: 'bg-purple-500',
      gradient: 'from-purple-400 to-purple-600',
      description: 'Real-time knowledge and contextual visual analysis'
    },
    {
      id: 'llama',
      name: 'Meta Llama Vision',
      color: 'bg-orange-500',
      gradient: 'from-orange-400 to-orange-600',
      description: 'Open-source vision model for comprehensive analysis'
    },
    {
      id: 'cohere',
      name: 'Cohere Command-R+ Vision',
      color: 'bg-pink-500',
      gradient: 'from-pink-400 to-pink-600',
      description: 'Enterprise-grade visual understanding and reasoning'
    },
    {
      id: 'deepseek',
      name: 'DeepSeek V2.5 Vision',
      color: 'bg-indigo-500',
      gradient: 'from-indigo-400 to-indigo-600',
      description: 'High-performance model for detailed image analysis'
    }
  ]

  const processFiles = useCallback(async (files) => {
    const imageFiles = Array.from(files).filter(file => file.type.startsWith('image/'))

    if (imageFiles.length === 0) {
      return
    }

    setIsUploading(true)
    setUploadProgress({ current: 0, total: imageFiles.length })

    const newImages = []

    for (let i = 0; i < imageFiles.length; i++) {
      const file = imageFiles[i]
      setUploadProgress({ current: i + 1, total: imageFiles.length })

      await new Promise((resolve) => {
        const reader = new FileReader()
        reader.onload = (e) => {
          const newImage = {
            id: Date.now() + Math.random() + i, // Add index to ensure unique IDs
            file: file,
            preview: e.target.result,
            name: file.name,
            size: file.size,
            type: file.type
          }
          newImages.push(newImage)
          resolve()
        }
        reader.readAsDataURL(file)
      })

      await new Promise(resolve => setTimeout(resolve, 200))
    }

    // Update state once with all new images
    setImageData({ selectedImages: [...selectedImages, ...newImages] })

    setIsUploading(false)
    setUploadProgress({ current: 0, total: 0 })
  }, [selectedImages, setImageData])

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
      for (let i = 0; i < e.dataTransfer.items.length; i++) {
        const item = e.dataTransfer.items[i]
        if (item.kind === 'file') {
          const entry = item.webkitGetAsEntry()
          if (entry) {
            if (entry.isDirectory) {
              readDirectory(entry, files).then(() => {
                processFiles(files)
              })
              return
            } else {
              files.push(item.getAsFile())
            }
          }
        }
      }
      if (files.length > 0) {
        processFiles(files)
      }
    } else {
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
            if (entry.isFile && entry.name.match(/\.(jpg|jpeg|png|gif|bmp|webp)$/i)) {
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

          readEntries()
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

  const removeImage = (imageId) => {
    const updatedImages = selectedImages.filter(img => img.id !== imageId)
    const updatedResults = results.filter(result => result.imageId !== imageId)
    setImageData({
      selectedImages: updatedImages,
      results: updatedResults
    })
  }

  const handleServiceToggle = (serviceId) => {
    setSelectedService(serviceId)
    try {
      localStorage.setItem('selectedImageAIService', serviceId)
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

  const analyzeImages = async () => {
    if (selectedImages.length === 0 || !selectedService) return

    setImageData({
      isAnalyzing: true,
      currentProgress: 0,
      totalImages: selectedImages.length
    })

    try {
      for (let i = 0; i < selectedImages.length; i++) {
        const image = selectedImages[i]
        setImageData({ currentProgress: i + 1 })

        const response = await fetch('/api/analyze-image', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            image: image.preview,
            filename: image.name,
            services: [selectedService]
          })
        })

        const data = await response.json()

        if (data.results) {
          const imageResults = data.results.map(result => ({
            ...result,
            id: Date.now() + Math.random() + i, // Add index to ensure unique IDs
            imageId: image.id,
            imageName: image.name
          }))
          // Add to existing results
          setImageData({
            results: [...results, ...imageResults]
          })
        } else if (data.error) {
          console.error('Analysis error:', data.error)
          const errorResult = {
            id: Date.now() + Math.random() + i,
            imageId: image.id,
            imageName: image.name,
            service: 'Error',
            success: false,
            error: formatApiError(data.error)
          }
          setImageData({
            results: [...results, errorResult]
          })
        }
      }
    } catch (error) {
      console.error('Error analyzing images:', error)
    } finally {
      setImageData({
        isAnalyzing: false,
        currentProgress: 0,
        totalImages: 0
      })
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

    switch (format) {
      case 'txt':
        downloadTXT(results, 'image-analysis')
        break
      case 'csv':
        downloadCSV(results, 'image-analysis')
        break
      case 'excel':
        downloadExcel(results, 'image-analysis')
        break
      case 'pdf':
        downloadPDF(results, 'image-analysis')
        break
    }
  }

  const groupedResults = results.reduce((acc, result) => {
    if (!acc[result.imageId]) {
      acc[result.imageId] = {
        imageName: result.imageName,
        results: []
      }
    }
    acc[result.imageId].results.push(result)
    return acc
  }, {})


  return (
    <div className="space-y-6">
      {/* Upload Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Image className="h-5 w-5" />
            Image Upload
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            Upload images or folders for AI analysis. Supports JPG, PNG, GIF, BMP, WebP formats.
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
              ) : selectedImages.length > 0 ? (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
                    {selectedImages.map((image) => (
                      <div key={image.id} className="relative group">
                        <img
                          src={image.preview}
                          alt={image.name}
                          className="w-full h-24 object-cover rounded-lg border"
                        />
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            removeImage(image.id)
                          }}
                          className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <X className="h-3 w-3" />
                        </button>
                        <div className="absolute bottom-0 left-0 right-0 bg-black bg-opacity-50 text-white text-xs p-1 rounded-b-lg truncate">
                          {image.name}
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                    <p className="text-green-800 font-medium">
                      ✅ {selectedImages.length} image{selectedImages.length !== 1 ? 's' : ''} uploaded successfully
                    </p>
                    <p className="text-sm text-green-600 mt-1">
                      Click here or drag more images/folders to add additional files
                    </p>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  <Upload className="h-12 w-12 mx-auto text-gray-400" />
                  <div>
                    <p className="text-lg font-medium">Upload Images or Folders</p>
                    <p className="text-sm text-muted-foreground">
                      Drag and drop images, folders, or click to browse
                    </p>
                    <p className="text-xs text-gray-500 mt-2">
                      Supports: JPG, PNG, GIF, BMP, WebP
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
                      <Image className="h-4 w-4" />
                      Select Images
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
              accept="image/*"
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

      {/* AI Service Selection */}
      <Card>
        <CardHeader>
          <CardTitle>Select AI Service</CardTitle>
          <p className="text-sm text-muted-foreground">
            Choose an AI model to analyze your images with
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
                  return (
                    <button
                      key={service.id}
                      onClick={() => hasApiKey && handleServiceToggle(service.id)}
                      disabled={!hasApiKey}
                      className={`relative p-6 rounded-xl border-2 transition-all duration-200 text-left min-h-[160px] ${!hasApiKey
                        ? 'border-gray-200 bg-gray-50 opacity-60 cursor-not-allowed'
                        : selectedService === service.id
                          ? 'border-blue-500 bg-blue-50 shadow-lg scale-[1.02] cursor-pointer'
                          : 'border-gray-200 hover:border-blue-300 hover:bg-gray-50 hover:shadow-md hover:scale-[1.01] cursor-pointer'
                        }`}
                    >
                      {selectedService === service.id && hasApiKey && (
                        <div className="absolute -top-1 -right-1 w-5 h-5 bg-blue-500 rounded-full flex items-center justify-center">
                          <Check className="h-3 w-3 text-white" />
                        </div>
                      )}

                      <div className="flex items-center justify-between mb-2">
                        <div className={`w-3 h-3 rounded-full ${service.color}`} />
                        {hasApiKey ? (
                          <span className="bg-green-100 text-green-700 text-xs px-2 py-1 rounded-md font-medium">
                            Ready
                          </span>
                        ) : (
                          <span className="bg-red-100 text-red-700 text-xs px-2 py-1 rounded-md font-medium flex items-center gap-1">
                            <AlertCircle className="h-3 w-3" />
                            No API Key
                          </span>
                        )}
                      </div>

                      <h3 className={`font-bold text-base mb-3 ${hasApiKey ? 'text-gray-900' : 'text-gray-500'}`}>
                        {service.name}
                      </h3>

                      <p className={`text-sm leading-relaxed ${hasApiKey ? 'text-gray-600' : 'text-gray-400'}`}>
                        {hasApiKey ? service.description : 'Configure API key in settings to use this service'}
                      </p>
                    </button>
                  )
                })}
              </div>

              {filterServicesWithKeys(services).every(s => !s.hasApiKey) && (
                <div className="text-center py-8">
                  <AlertCircle className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">No API Keys Configured</h3>
                  <p className="text-gray-600 mb-4">Add your AI service API keys in settings to start analyzing images.</p>
                  <Button variant="outline" className="gap-2" onClick={() => window.location.assign('/settings')}>
                    <Settings className="h-4 w-4" />
                    Go to Settings
                  </Button>
                </div>
              )}
            </>
          )}

          {/* Progress indicator */}
          {isAnalyzing && (
            <div className="mt-6 space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span>Analyzing images...</span>
                <span>{currentProgress} of {totalImages}</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${(currentProgress / totalImages) * 100}%` }}
                />
              </div>
            </div>
          )}

          <Button
            onClick={analyzeImages}
            disabled={selectedImages.length === 0 || !selectedService || isAnalyzing}
            className="w-full mt-6"
            size="lg"
          >
            {isAnalyzing ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Analyzing {currentProgress} of {totalImages}...
              </>
            ) : (
              `Generate Keywords for ${selectedImages.length} Image${selectedImages.length !== 1 ? 's' : ''}`
            )}
          </Button>
        </CardContent>
      </Card>

      {/* Enhanced Download Section */}
      {results.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Download className="h-5 w-5" />
              Download Results
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              <Button
                onClick={() => downloadResults('txt')}
                variant="outline"
                className="flex items-center gap-2"
              >
                <FileText className="h-4 w-4" />
                TXT
              </Button>
              <Button
                onClick={() => downloadResults('csv')}
                variant="outline"
                className="flex items-center gap-2"
              >
                <FileSpreadsheet className="h-4 w-4" />
                CSV
              </Button>
              <Button
                onClick={() => downloadResults('excel')}
                variant="outline"
                className="flex items-center gap-2"
              >
                <File className="h-4 w-4" />
                Excel
              </Button>
              <Button
                onClick={() => downloadResults('pdf')}
                variant="outline"
                className="flex items-center gap-2"
              >
                <Printer className="h-4 w-4" />
                PDF
              </Button>
            </div>
            <p className="text-sm text-muted-foreground mt-2">
              Download all successful analysis results in your preferred format
            </p>
          </CardContent>
        </Card>
      )}


      {/* Results with Side by Side Layout */}
      <AnimatePresence>
        {Object.keys(groupedResults).length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="space-y-6"
          >
            <h3 className="text-xl font-semibold">Analysis Results</h3>
            {Object.entries(groupedResults).map(([imageId, imageGroup]) => {
              const image = selectedImages.find(img => img.id === parseInt(imageId))
              return (
                <Card key={imageId} className="overflow-hidden">
                  <CardHeader className="bg-gray-50">
                    <CardTitle className="flex items-center gap-2">
                      <Image className="h-4 w-4" />
                      {imageGroup.imageName}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-6">
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 min-h-0">
                      {/* Left Side - Image Details and Show Button */}
                      <div className="space-y-4 order-2 lg:order-1">
                        <div className="bg-gray-50 rounded-lg p-6 border">
                          <h4 className="font-medium text-sm text-gray-700 mb-4">Image Details</h4>
                          <div className="space-y-3 text-sm text-gray-600 mb-4">
                            <p><span className="font-medium">Name:</span> {imageGroup.imageName}</p>
                            {image && (
                              <>
                                <p><span className="font-medium">Size:</span> {formatFileSize(image.size)}</p>
                                <p><span className="font-medium">Type:</span> {image.type}</p>
                              </>
                            )}
                          </div>
                          {image && (
                            <Button
                              onClick={() => setModalImage(image)}
                              variant="outline"
                              className="w-full flex items-center gap-2 hover:bg-blue-50 hover:border-blue-300"
                            >
                              <Eye className="h-4 w-4" />
                              Show Image
                            </Button>
                          )}
                        </div>
                      </div>

                      {/* Right Side - Keywords and Analysis */}
                      <div className="space-y-4 order-1 lg:order-2">
                        <h4 className="font-semibold text-lg text-gray-900 mb-4">Keywords & Analysis</h4>
                        {imageGroup.results.map((result, index) => {
                          const service = services.find(s => s.name.toLowerCase().includes(result.service.toLowerCase()))
                          const globalIndex = `${imageId}-${index}`

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
                                      onTitleChange={(newTitle) => updateResultTitle('imageAnalysis', result.id, newTitle)}
                                      onKeywordsChange={(newKeywords) => updateResultKeywords('imageAnalysis', result.id, newKeywords)}
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

      {/* Image Modal */}
      <AnimatePresence>
        {modalImage && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black bg-opacity-80 flex items-center justify-center z-50 p-4"
            onClick={() => setModalImage(null)}
          >
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.8, opacity: 0 }}
              className="relative max-w-4xl max-h-full bg-white rounded-lg overflow-hidden shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Modal Header */}
              <div className="bg-gray-50 px-6 py-4 border-b flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Image className="h-5 w-5 text-gray-600" />
                  <div>
                    <h3 className="font-semibold text-gray-900">{modalImage.name}</h3>
                    <p className="text-sm text-gray-500">
                      {formatFileSize(modalImage.size)} • {modalImage.type}
                    </p>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setModalImage(null)}
                  className="text-gray-500 hover:text-gray-700"
                >
                  <X className="h-5 w-5" />
                </Button>
              </div>

              {/* Modal Content */}
              <div className="p-6">
                <div className="flex justify-center">
                  <img
                    src={modalImage.preview}
                    alt={modalImage.name}
                    className="max-w-full max-h-[70vh] object-contain rounded-lg shadow-lg"
                  />
                </div>
              </div>

              {/* Modal Footer */}
              <div className="bg-gray-50 px-6 py-4 border-t flex justify-between items-center">
                <p className="text-sm text-gray-600">
                  Click outside or press the X to close
                </p>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      const link = document.createElement('a')
                      link.href = modalImage.preview
                      link.download = modalImage.name
                      document.body.appendChild(link)
                      link.click()
                      document.body.removeChild(link)
                    }}
                    className="flex items-center gap-2"
                  >
                    <Download className="h-4 w-4" />
                    Download
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => window.open(modalImage.preview, '_blank')}
                    className="flex items-center gap-2"
                  >
                    <Eye className="h-4 w-4" />
                    Open in New Tab
                  </Button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

export default ImageAnalysis
