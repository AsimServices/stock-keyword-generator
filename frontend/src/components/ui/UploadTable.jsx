import { useState } from 'react'
import { Button } from './button.jsx'
import { Card, CardContent, CardHeader, CardTitle } from './card.jsx'
import {
  Play,
  Pause,
  CheckCircle,
  XCircle,
  Loader2,
  Eye,
  Download,
  Trash2,
  Edit3,
  FileSpreadsheet,
  Save,
  X,
  Plus,
  Minus
} from 'lucide-react'
import { motion } from 'framer-motion'

const UploadTable = ({
  items = [],
  onAnalyze,
  onDelete,
  onEdit,
  onGenerateMetadata,
  onDownloadCSV,
  type = 'image' // 'image', 'video', 'text'
}) => {
  const [analyzingItems, setAnalyzingItems] = useState(new Set())
  const [isGeneratingMetadata, setIsGeneratingMetadata] = useState(false)
  const [metadataGenerated, setMetadataGenerated] = useState(false)

  // Editing state
  const [editingItem, setEditingItem] = useState(null)
  const [editForm, setEditForm] = useState({
    title: '',
    keywords: [],
    category: '',
    releases: ''
  })
  const [newKeyword, setNewKeyword] = useState('')

  const getStatusIcon = (status) => {
    switch (status) {
      case 'pending':
        return <div className="w-2 h-2 bg-gray-400 rounded-full" />
      case 'processing':
        return <Loader2 className="w-4 h-4 text-gray-600 dark:text-gray-400 animate-spin" />
      case 'completed':
        return <CheckCircle className="w-4 h-4 text-gray-600 dark:text-gray-400" />
      case 'error':
        return <XCircle className="w-4 h-4 text-gray-600 dark:text-gray-400" />
      default:
        return <div className="w-2 h-2 bg-gray-400 rounded-full" />
    }
  }

  const getStatusColor = (status) => {
    switch (status) {
      case 'pending':
        return 'text-gray-600'
      case 'processing':
        return 'text-gray-600 dark:text-gray-400'
      case 'completed':
        return 'text-gray-600 dark:text-gray-400'
      case 'error':
        return 'text-gray-600 dark:text-gray-400'
      default:
        return 'text-gray-600'
    }
  }

  const handleAnalyze = async (item) => {
    setAnalyzingItems(prev => new Set([...prev, item.id]))
    try {
      await onAnalyze(item)
    } finally {
      setAnalyzingItems(prev => {
        const newSet = new Set(prev)
        newSet.delete(item.id)
        return newSet
      })
    }
  }

  const handleGenerateMetadata = async () => {
    setIsGeneratingMetadata(true)
    try {
      // Use the batch analysis function if available
      if (onGenerateMetadata) {
        await onGenerateMetadata()
      } else {
        // Fallback to individual analysis if batch function not provided
        const pendingItems = items.filter(item => item.status === 'pending')
        for (const item of pendingItems) {
          await onAnalyze(item)
        }
      }

      setMetadataGenerated(true)
    } catch (error) {

    } finally {
      setIsGeneratingMetadata(false)
    }
  }

  const handleDownloadCSV = () => {
    if (onDownloadCSV) {
      onDownloadCSV()
    }
  }

  // Editing functions
  const startEditing = (item) => {
    setEditingItem(item.id)
    setEditForm({
      title: item.result?.title || '',
      keywords: item.result?.keywords || [],
      category: item.result?.category || '',
      releases: item.result?.releases || ''
    })
    setNewKeyword('')
  }

  const cancelEditing = () => {
    setEditingItem(null)
    setEditForm({
      title: '',
      keywords: [],
      category: '',
      releases: ''
    })
    setNewKeyword('')
  }

  const saveEdit = () => {
    if (onEdit && editingItem) {
      onEdit(editingItem, editForm)
      setEditingItem(null)
      setEditForm({
        title: '',
        keywords: [],
        category: '',
        releases: ''
      })
      setNewKeyword('')
    }
  }

  const addKeyword = () => {
    if (newKeyword.trim() && !editForm.keywords.includes(newKeyword.trim())) {
      setEditForm(prev => ({
        ...prev,
        keywords: [...prev.keywords, newKeyword.trim()]
      }))
      setNewKeyword('')
    }
  }

  const removeKeyword = (keywordToRemove) => {
    setEditForm(prev => ({
      ...prev,
      keywords: prev.keywords.filter(keyword => keyword !== keywordToRemove)
    }))
  }

  const handleDelete = (itemId) => {
    if (onDelete) {
      onDelete(itemId)
    }
  }



  const getPreviewContent = (item) => {
    if (type === 'image' || type === 'video') {
      return (
        <img
          src={item.preview}
          alt={item.name}
          className="w-12 h-12 object-cover rounded border"
        />
      )
    } else if (type === 'text') {
      return (
        <div className="w-12 h-12 bg-gray-100 rounded border flex items-center justify-center">
          <span className="text-xs text-gray-600">TXT</span>
        </div>
      )
    }
    return null
  }

  const getFilename = (item) => {
    if (type === 'text') {
      return item.title || item.name || 'Untitled'
    }
    return item.name
  }

  // Calculate success and error counts
  const successCount = items.filter(item => item.status === 'completed').length
  const errorCount = items.filter(item => item.status === 'error').length
  const processingCount = items.filter(item => item.status === 'processing').length
  const pendingCount = items.filter(item => item.status === 'pending').length

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex flex-col sm:flex-row sm:items-center gap-2">
          <div className="flex flex-col sm:flex-row sm:items-center gap-2">
            <span className="text-sm sm:text-base">Uploaded {type === 'image' ? 'Images' : type === 'video' ? 'Videos' : 'Text Files'}</span>
            <span className="text-sm font-normal text-gray-500 dark:text-gray-400">({items.length} items)</span>
          </div>

          {/* Success and Error Counters - moved to same line */}
          {items.length > 0 && (
            <div className="flex flex-wrap items-center gap-2 sm:gap-4">
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-1">
                  <CheckCircle className="w-4 h-4 text-gray-600 dark:text-gray-400" />
                  <span className="text-sm font-medium text-gray-600 dark:text-gray-400">
                    Successfully Completed: {successCount}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <div className="flex items-center gap-1">
                  <XCircle className="w-4 h-4 text-gray-600 dark:text-gray-400" />
                  <span className="text-sm font-medium text-gray-600 dark:text-gray-400">
                    Errors: {errorCount}
                  </span>
                </div>
              </div>

              {processingCount > 0 && (
                <div className="flex items-center gap-2">
                  <div className="flex items-center gap-1">
                    <Loader2 className="w-4 h-4 text-gray-600 dark:text-gray-400 animate-spin" />
                    <span className="text-sm font-medium text-gray-600 dark:text-gray-400">
                      Processing: {processingCount}
                    </span>
                  </div>
                </div>
              )}

              {pendingCount > 0 && (
                <div className="flex items-center gap-2">
                  <div className="flex items-center gap-1">
                    <div className="w-4 h-4 bg-gray-400 rounded-full" />
                    <span className="text-sm font-medium text-gray-600 dark:text-gray-400">
                      Pending: {pendingCount}
                    </span>
                  </div>
                </div>
              )}
            </div>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {items.length === 0 ? (
          <div className="text-center py-8 text-gray-500 dark:text-gray-400">
            No {type === 'image' ? 'images' : type === 'video' ? 'videos' : 'text files'} uploaded yet
          </div>
        ) : (
          <div className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
            <div className="overflow-x-auto max-h-96 overflow-y-auto relative">
              <table className="w-full min-w-[1200px]">
                <thead className="sticky top-0 bg-white dark:bg-gray-800 z-10">
                  <tr className="border-b border-gray-200 dark:border-gray-700">
                    <th className="text-left py-3 px-2 sm:px-4 font-medium text-gray-700 dark:text-gray-300 text-xs sm:text-sm">FILENAME</th>
                    <th className="text-center py-3 px-2 sm:px-4 font-medium text-gray-700 dark:text-gray-300 text-xs sm:text-sm hidden sm:table-cell">PREVIEW</th>
                    <th className="text-center py-3 px-2 sm:px-4 font-medium text-gray-700 dark:text-gray-300 text-xs sm:text-sm">STATUS</th>
                    <th className="text-center py-3 px-2 sm:px-4 font-medium text-gray-700 dark:text-gray-300 text-xs sm:text-sm hidden lg:table-cell">TITLE</th>
                    <th className="text-center py-3 px-2 sm:px-4 font-medium text-gray-700 dark:text-gray-300 text-xs sm:text-sm hidden md:table-cell">KEYWORDS</th>
                    <th className="text-center py-3 px-2 sm:px-4 font-medium text-gray-700 dark:text-gray-300 text-xs sm:text-sm hidden lg:table-cell">CATEGORY</th>
                    <th className="text-center py-3 px-2 sm:px-4 font-medium text-gray-700 dark:text-gray-300 text-xs sm:text-sm hidden xl:table-cell">RELEASES</th>
                    <th className="text-center py-3 px-2 sm:px-4 font-medium text-gray-700 dark:text-gray-300 text-xs sm:text-sm w-24 sticky right-0 bg-white dark:bg-gray-800 z-20 border-l border-gray-200 dark:border-gray-700">ACTIONS</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((item, index) => (
                    <motion.tr
                      key={item.id || index}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.1 }}
                      className="border-b border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors duration-200"
                    >
                      {/* Filename */}
                      <td className="py-4 px-2 sm:px-4">
                        <div className="max-w-xs">
                          <p className="text-xs sm:text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
                            {getFilename(item)}
                          </p>
                          {item.size && (
                            <p className="text-xs text-gray-500 dark:text-gray-400">
                              {(item.size / 1024 / 1024).toFixed(1)} MB
                            </p>
                          )}
                        </div>
                      </td>

                      {/* Preview */}
                      <td className="py-4 px-2 sm:px-4 text-center hidden sm:table-cell">
                        {getPreviewContent(item)}
                      </td>

                      {/* Status */}
                      <td className="py-4 px-2 sm:px-4 text-center">
                        <div className="flex items-center justify-center gap-2">
                          {getStatusIcon(item.status || 'pending')}
                          <span className={`text-sm font-medium ${getStatusColor(item.status || 'pending')}`}>
                            {item.status || 'Pending'}
                          </span>
                        </div>
                      </td>

                      {/* Title */}
                      <td className="py-2 px-2 sm:px-4 text-center hidden lg:table-cell align-middle">
                        {editingItem === item.id ? (
                          <input
                            type="text"
                            value={editForm.title}
                            onChange={(e) => setEditForm(prev => ({ ...prev, title: e.target.value }))}
                            className="min-w-[200px] max-w-[400px] w-full px-2 py-1 text-xs border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            placeholder="Enter title"
                          />
                        ) : (
                          item.result?.title ? (
                            <div className="max-w-md mx-auto">
                              <p
                                className="text-xs sm:text-sm leading-5 text-gray-900 dark:text-gray-100 break-words whitespace-normal"
                                title={item.result.title}
                              >
                                {item.result.title}
                              </p>
                            </div>
                          ) : (
                            <span className="text-xs sm:text-sm text-gray-400">-</span>
                          )
                        )}
                      </td>

                      {/* Keywords */}
                      <td className="py-2 px-2 sm:px-4 text-center hidden md:table-cell align-top">
                        {editingItem === item.id ? (
                          <div className="min-w-[400px] inline-block text-left">
                            <div className="flex flex-wrap gap-1">
                              {editForm.keywords.map((keyword, idx) => (
                                <span key={idx} className="inline-flex items-center gap-1 px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full">
                                  {keyword}
                                  <button
                                    onClick={() => removeKeyword(keyword)}
                                    className="text-blue-600 hover:text-blue-800"
                                  >
                                    <X className="w-3 h-3" />
                                  </button>
                                </span>
                              ))}
                            </div>
                            <div className="flex gap-1 mt-2">
                              <input
                                type="text"
                                value={newKeyword}
                                onChange={(e) => setNewKeyword(e.target.value)}
                                onKeyPress={(e) => e.key === 'Enter' && addKeyword()}
                                className="flex-1 px-2 py-1 text-xs border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                placeholder="Add keyword"
                              />
                              <button
                                onClick={addKeyword}
                                className="px-2 py-1 bg-blue-500 text-white text-xs rounded hover:bg-blue-600"
                              >
                                <Plus className="w-3 h-3" />
                              </button>
                            </div>
                          </div>
                        ) : (
                          item.result?.keywords && item.result.keywords.length > 0 ? (
                            <div className="max-w-xl mx-auto text-left">
                              <div className="flex flex-wrap gap-1.5">
                                {item.result.keywords.slice(0, 12).map((kw, idx) => (
                                  <span key={idx} className="px-2 py-0.5 rounded-full text-[10px] sm:text-xs bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200 border border-gray-200 dark:border-gray-600">
                                    {kw}
                                  </span>
                                ))}
                                {item.result.keywords.length > 12 && (
                                  <span className="px-2 py-0.5 rounded-full text-[10px] sm:text-xs bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 border border-dashed border-gray-300 dark:border-gray-600">
                                    +{item.result.keywords.length - 12} more
                                  </span>
                                )}
                              </div>
                              <p className="mt-1 text-[10px] sm:text-xs text-gray-500 dark:text-gray-400">
                                {item.result.keywords.length} keywords
                              </p>
                            </div>
                          ) : (
                            <span className="text-sm text-gray-400">-</span>
                          )
                        )}
                      </td>

                      {/* Category */}
                      <td className="py-2 px-2 sm:px-4 text-center hidden lg:table-cell align-middle">
                        {editingItem === item.id ? (
                          <input
                            type="text"
                            value={editForm.category}
                            onChange={(e) => setEditForm(prev => ({ ...prev, category: e.target.value }))}
                            className="min-w-[150px] w-full px-2 py-1 text-xs border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            placeholder="Enter category"
                          />
                        ) : (
                          item.result?.category ? (
                            <span className="text-xs sm:text-sm text-gray-900 dark:text-gray-100">{item.result.category}</span>
                          ) : (
                            <span className="text-xs sm:text-sm text-gray-400">-</span>
                          )
                        )}
                      </td>

                      {/* Releases */}
                      <td className="py-2 px-2 sm:px-4 text-center hidden xl:table-cell align-middle">
                        {editingItem === item.id ? (
                          <input
                            type="text"
                            value={editForm.releases}
                            onChange={(e) => setEditForm(prev => ({ ...prev, releases: e.target.value }))}
                            className="min-w-[150px] w-full px-2 py-1 text-xs border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            placeholder="Enter releases"
                          />
                        ) : (
                          item.result?.releases ? (
                            <span className="text-xs sm:text-sm text-gray-900 dark:text-gray-100">{item.result.releases}</span>
                          ) : (
                            <span className="text-xs sm:text-sm text-gray-400">-</span>
                          )
                        )}
                      </td>

                      {/* Actions */}
                      <td className="py-4 px-2 sm:px-4 text-center w-24 sticky right-0 bg-white dark:bg-gray-800 z-20 border-l border-gray-200 dark:border-gray-700">
                        <div className="flex items-center justify-center gap-2">
                          {editingItem === item.id ? (
                            <>
                              <button
                                onClick={saveEdit}
                                className="p-2 text-green-600 hover:text-green-800 hover:bg-green-100 rounded-lg transition-colors"
                                title="Save changes"
                              >
                                <Save className="w-4 h-4" />
                              </button>
                              <button
                                onClick={cancelEditing}
                                className="p-2 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition-colors"
                                title="Cancel editing"
                              >
                                <X className="w-4 h-4" />
                              </button>
                            </>
                          ) : (
                            <>
                              <button
                                onClick={() => startEditing(item)}
                                className="p-2 text-blue-600 hover:text-blue-800 hover:bg-blue-100 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                title="Edit metadata"
                                disabled={item.status !== 'completed'}
                              >
                                <Edit3 className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => handleDelete(item.id)}
                                className="p-2 text-red-600 hover:text-red-800 hover:bg-red-100 rounded-lg transition-colors"
                                title="Delete item"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </>
                          )}
                        </div>
                      </td>

                    </motion.tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Action Buttons */}
        {items.length > 0 && (
          <div className="mt-6 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Button
                onClick={handleGenerateMetadata}
                disabled={isGeneratingMetadata || items.every(item => item.status !== 'pending')}
                className={`px-6 py-2 rounded-lg font-medium transition-all duration-200 ${isGeneratingMetadata || items.every(item => item.status !== 'pending')
                  ? 'bg-gray-300 text-gray-500 dark:text-gray-400 cursor-not-allowed'
                  : 'bg-teal-500 hover:bg-teal-600 text-white shadow-md hover:shadow-lg'
                  }`}
              >
                {isGeneratingMetadata ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Processing...
                  </>
                ) : (
                  'Generate Metadata'
                )}
              </Button>
            </div>

            <div className="flex items-center gap-3">
              <Button
                onClick={handleDownloadCSV}
                disabled={!metadataGenerated || items.every(item => item.status !== 'completed')}
                className={`px-6 py-2 rounded-lg font-medium transition-all duration-200 ${!metadataGenerated || items.every(item => item.status !== 'completed')
                  ? 'bg-gray-300 text-gray-500 dark:text-gray-400 cursor-not-allowed border border-gray-400'
                  : 'bg-gray-600 hover:bg-gray-700 text-white shadow-md hover:shadow-lg'
                  }`}
              >
                <FileSpreadsheet className="w-4 h-4 mr-2" />
                Download CSV
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

export default UploadTable
