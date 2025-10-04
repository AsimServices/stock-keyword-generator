import { useState } from 'react'
import { Button } from './button.jsx'
import { Input } from './input.jsx'
import { Textarea } from './textarea.jsx'
import { Edit3, Save, XCircle, Plus, X, Hash, Type } from 'lucide-react'

export const KeywordEditor = ({
    title = '',
    keywords = [],
    onTitleChange,
    onKeywordsChange,
    readOnly = false,
    className = ''
}) => {
    const [isEditingTitle, setIsEditingTitle] = useState(false)
    const [editingTitle, setEditingTitle] = useState(title)
    const [newKeyword, setNewKeyword] = useState('')

    const handleTitleSave = () => {
        onTitleChange?.(editingTitle)
        setIsEditingTitle(false)
    }

    const handleTitleCancel = () => {
        setEditingTitle(title)
        setIsEditingTitle(false)
    }

    const handleAddKeyword = () => {
        if (newKeyword.trim() && !keywords.includes(newKeyword.trim())) {
            const updatedKeywords = [...keywords, newKeyword.trim()]
            onKeywordsChange?.(updatedKeywords)
            setNewKeyword('')
        }
    }

    const handleRemoveKeyword = (keywordToRemove) => {
        const updatedKeywords = keywords.filter(keyword => keyword !== keywordToRemove)
        onKeywordsChange?.(updatedKeywords)
    }

    const handleKeywordKeyPress = (e) => {
        if (e.key === 'Enter') {
            e.preventDefault()
            handleAddKeyword()
        }
    }

    return (
        <div className={`space-y-4 ${className}`}>
            {/* Title Section */}
            <div className="space-y-2">
                <div className="flex items-center gap-2">
                    <Type className="h-4 w-4 text-blue-600" />
                    <h4 className="font-semibold text-gray-900">Title</h4>
                    {!readOnly && !isEditingTitle && title && (
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setIsEditingTitle(true)}
                            className="ml-auto"
                        >
                            <Edit3 className="h-3 w-3" />
                        </Button>
                    )}
                </div>

                {isEditingTitle ? (
                    <div className="space-y-2">
                        <Textarea
                            value={editingTitle}
                            onChange={(e) => setEditingTitle(e.target.value)}
                            className="min-h-20 resize-none"
                            placeholder="Enter title..."
                        />
                        <div className="flex items-center gap-2">
                            <Button
                                onClick={handleTitleSave}
                                size="sm"
                                className="flex items-center gap-2"
                            >
                                <Save className="h-3 w-3" />
                                Save
                            </Button>
                            <Button
                                onClick={handleTitleCancel}
                                variant="outline"
                                size="sm"
                                className="flex items-center gap-2"
                            >
                                <XCircle className="h-3 w-3" />
                                Cancel
                            </Button>
                        </div>
                    </div>
                ) : (
                    <div className="bg-blue-50 rounded-lg p-3 border border-blue-200">
                        {title ? (
                            <p className="text-sm text-gray-800 leading-relaxed">{title}</p>
                        ) : (
                            <p className="text-sm text-gray-500 italic">No title generated</p>
                        )}
                    </div>
                )}
            </div>

            {/* Keywords Section */}
            <div className="space-y-3">
                <div className="flex items-center gap-2">
                    <Hash className="h-4 w-4 text-green-600" />
                    <h4 className="font-semibold text-gray-900">Keywords</h4>
                    <span className="text-sm text-gray-500">({keywords.length})</span>
                </div>

                {/* Add New Keyword */}
                {!readOnly && (
                    <div className="flex gap-2">
                        <Input
                            value={newKeyword}
                            onChange={(e) => setNewKeyword(e.target.value)}
                            onKeyPress={handleKeywordKeyPress}
                            placeholder="Add new keyword..."
                            className="flex-1"
                        />
                        <Button
                            onClick={handleAddKeyword}
                            disabled={!newKeyword.trim() || keywords.includes(newKeyword.trim())}
                            size="sm"
                            className="flex items-center gap-2"
                        >
                            <Plus className="h-3 w-3" />
                            Add
                        </Button>
                    </div>
                )}

                {/* Keywords Display */}
                {keywords.length > 0 ? (
                    <div className="flex flex-wrap gap-2">
                        {keywords.map((keyword, index) => (
                            <div
                                key={index}
                                className="inline-flex items-center gap-1 bg-green-100 text-green-800 px-3 py-1 rounded-full text-sm font-medium border border-green-200 hover:bg-green-200 transition-colors"
                            >
                                <span>{keyword}</span>
                                {!readOnly && (
                                    <button
                                        onClick={() => handleRemoveKeyword(keyword)}
                                        className="text-green-600 hover:text-green-800 ml-1"
                                    >
                                        <X className="h-3 w-3" />
                                    </button>
                                )}
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                        <p className="text-sm text-gray-500 italic">No keywords generated</p>
                    </div>
                )}
            </div>
        </div>
    )
}

export default KeywordEditor
