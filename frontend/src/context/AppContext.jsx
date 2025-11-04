import React, { createContext, useContext, useReducer, useEffect, useState } from 'react'

const AppContext = createContext()

const initialState = {
  imageAnalysis: {
    selectedImages: [],
    selectedServices: ['openai'],
    results: [],
    isAnalyzing: false,
    currentProgress: 0,
    totalImages: 0
  },
  videoAnalysis: {
    selectedVideos: [],
    selectedServices: ['gemini'],
    results: [],
    isAnalyzing: false,
    currentProgress: 0,
    totalVideos: 0
  },
  textAnalysis: {
    textPrompts: [],
    selectedServices: ['openai'],
    results: [],
    isAnalyzing: false,
    currentProgress: 0,
    totalPrompts: 0
  }
}

const appReducer = (state, action) => {
  switch (action.type) {
    case 'SET_IMAGE_DATA':
      const newImageState = {
        ...state,
        imageAnalysis: {
          ...state.imageAnalysis,
          ...action.payload
        }
      }

      return newImageState

    case 'SET_VIDEO_DATA':
      const newVideoState = {
        ...state,
        videoAnalysis: {
          ...state.videoAnalysis,
          ...action.payload
        }
      }

      return newVideoState

    case 'SET_TEXT_DATA':
      const newTextState = {
        ...state,
        textAnalysis: {
          ...state.textAnalysis,
          ...action.payload
        }
      }

      return newTextState

    case 'UPDATE_IMAGE_RESULT':
      return {
        ...state,
        imageAnalysis: {
          ...state.imageAnalysis,
          results: state.imageAnalysis.results.map(result =>
            result.id === action.payload.id
              ? { ...result, result: action.payload.newContent }
              : result
          )
        }
      }

    case 'UPDATE_VIDEO_RESULT':
      return {
        ...state,
        videoAnalysis: {
          ...state.videoAnalysis,
          results: state.videoAnalysis.results.map(result =>
            result.id === action.payload.id
              ? { ...result, result: action.payload.newContent }
              : result
          )
        }
      }

    case 'UPDATE_TEXT_RESULT':
      return {
        ...state,
        textAnalysis: {
          ...state.textAnalysis,
          results: state.textAnalysis.results.map(result =>
            result.id === action.payload.id
              ? { ...result, result: action.payload.newContent }
              : result
          )
        }
      }

    case 'UPDATE_RESULT_TITLE':
      return {
        ...state,
        [action.payload.analysisType]: {
          ...state[action.payload.analysisType],
          results: state[action.payload.analysisType].results.map(result =>
            result.id === action.payload.id
              ? { ...result, title: action.payload.title }
              : result
          )
        }
      }

    case 'UPDATE_RESULT_KEYWORDS':
      return {
        ...state,
        [action.payload.analysisType]: {
          ...state[action.payload.analysisType],
          results: state[action.payload.analysisType].results.map(result =>
            result.id === action.payload.id
              ? { ...result, keywords: action.payload.keywords }
              : result
          )
        }
      }

    case 'RESET_IMAGE_DATA':
      return {
        ...state,
        imageAnalysis: initialState.imageAnalysis
      }

    case 'RESET_VIDEO_DATA':
      return {
        ...state,
        videoAnalysis: initialState.videoAnalysis
      }

    case 'RESET_TEXT_DATA':
      return {
        ...state,
        textAnalysis: initialState.textAnalysis
      }

    case 'RESET_ALL_DATA':
      return initialState

    case 'LOAD_PERSISTED_DATA':
      const newState = {
        ...state,
        ...action.payload
      }

      return newState

    default:
      return state
  }
}

export const AppProvider = ({ children }) => {
  const [state, dispatch] = useReducer(appReducer, initialState)
  const [hasLoadedData, setHasLoadedData] = useState(false)

  // Load results from database on mount
  useEffect(() => {
    if (hasLoadedData) {

      return
    }



    const loadResultsFromDatabase = async () => {
      try {
        // Import the service and auth utilities dynamically to avoid circular dependencies
        const { analysisResultsService } = await import('../services/analysisResultsService')
        const { useAuthHeaders } = await import('../utils/auth')

        // Get auth headers (this needs to be called from within a component)
        // For now, we'll skip database loading and fall back to localStorage
        // The database loading will be handled by the individual components

        setHasLoadedData(true)

        // Fallback to localStorage
        const persistedData = localStorage.getItem('aiKeywordGenerator')
        if (persistedData) {
          try {
            const parsedData = JSON.parse(persistedData)
            const mergedState = {
              ...initialState,
              imageAnalysis: {
                ...initialState.imageAnalysis,
                results: parsedData.imageAnalysis?.results || []
              },
              videoAnalysis: {
                ...initialState.videoAnalysis,
                results: parsedData.videoAnalysis?.results || []
              },
              textAnalysis: {
                ...initialState.textAnalysis,
                results: parsedData.textAnalysis?.results || []
              }
            }
            dispatch({ type: 'LOAD_PERSISTED_DATA', payload: mergedState })
          } catch (parseError) {

          }
        }
      } catch (error) {

        setHasLoadedData(true)
      }
    }

    loadResultsFromDatabase()
  }, [hasLoadedData])

  // Persist data to localStorage and database whenever state changes
  useEffect(() => {


    const buildPersistableState = (fullState) => ({
      imageAnalysis: {
        selectedServices: fullState.imageAnalysis.selectedServices,
        results: fullState.imageAnalysis.results || []
      },
      videoAnalysis: {
        selectedServices: fullState.videoAnalysis.selectedServices,
        results: fullState.videoAnalysis.results || []
      },
      textAnalysis: {
        selectedServices: fullState.textAnalysis.selectedServices,
        textPrompts: fullState.textAnalysis.textPrompts,
        results: fullState.textAnalysis.results || []
      }
    })

    // Save to localStorage (for offline capability)
    try {
      const minimalState = buildPersistableState(state)

      localStorage.setItem('aiKeywordGenerator', JSON.stringify(minimalState))

    } catch (error) {

    }

    // Note: Database saving is now handled by the individual analysis components
    // when they make API calls to the backend, so we don't need to save here
  }, [state])

  // Note: Removed localStorage clearing to persist results across page refreshes

  const value = {
    state,
    dispatch,

    // Image Analysis Actions
    setImageData: (data) => {

      dispatch({ type: 'SET_IMAGE_DATA', payload: data })
    },
    updateImageResult: (id, newContent) => dispatch({
      type: 'UPDATE_IMAGE_RESULT',
      payload: { id, newContent }
    }),
    resetImageData: () => dispatch({ type: 'RESET_IMAGE_DATA' }),

    // Video Analysis Actions
    setVideoData: (data) => {

      dispatch({ type: 'SET_VIDEO_DATA', payload: data })
    },
    updateVideoResult: (id, newContent) => dispatch({
      type: 'UPDATE_VIDEO_RESULT',
      payload: { id, newContent }
    }),
    resetVideoData: () => dispatch({ type: 'RESET_VIDEO_DATA' }),

    // Text Analysis Actions
    setTextData: (data) => {

      dispatch({ type: 'SET_TEXT_DATA', payload: data })
    },
    updateTextResult: (id, newContent) => dispatch({
      type: 'UPDATE_TEXT_RESULT',
      payload: { id, newContent }
    }),
    resetTextData: () => dispatch({ type: 'RESET_TEXT_DATA' }),

    // Title and Keywords Actions
    updateResultTitle: (analysisType, id, title) => dispatch({
      type: 'UPDATE_RESULT_TITLE',
      payload: { analysisType, id, title }
    }),
    updateResultKeywords: (analysisType, id, keywords) => dispatch({
      type: 'UPDATE_RESULT_KEYWORDS',
      payload: { analysisType, id, keywords }
    }),

    // Global Actions
    resetAllData: () => dispatch({ type: 'RESET_ALL_DATA' })
  }

  return (
    <AppContext.Provider value={value}>
      {children}
    </AppContext.Provider>
  )
}

export const useAppContext = () => {
  const context = useContext(AppContext)
  if (!context) {
    throw new Error('useAppContext must be used within an AppProvider')
  }
  return context
}

