/**
 * Utility functions for category conversion between names and numbers
 * Adobe Stock uses category numbers (1-21) for submissions
 */

// Official Adobe Stock category mapping
export const CATEGORY_NAME_TO_NUMBER = {
  'Animals': 1,
  'Buildings and Architecture': 2,
  'Business': 3,
  'Drinks': 4,
  'The Environment': 5,
  'States of Mind': 6,
  'Food': 7,
  'Graphic Resources': 8,
  'Hobbies and Leisure': 9,
  'Industry': 10,
  'Landscape': 11,
  'Lifestyle': 12,
  'People': 13,
  'Plants and Flowers': 14,
  'Culture and Religion': 15,
  'Science': 16,
  'Social Issues': 17,
  'Sports': 18,
  'Technology': 19,
  'Transport': 20,
  'Travel': 21,
  // Legacy mappings for backward compatibility
  'Buildings': 2,
  'Environment': 5,
  'Graphics': 8,
  'Hobbies': 9,
  'Plants': 14,
  'Culture': 15
}

export const CATEGORY_NUMBER_TO_NAME = {
  1: 'Animals',
  2: 'Buildings and Architecture',
  3: 'Business',
  4: 'Drinks',
  5: 'The Environment',
  6: 'States of Mind',
  7: 'Food',
  8: 'Graphic Resources',
  9: 'Hobbies and Leisure',
  10: 'Industry',
  11: 'Landscape',
  12: 'Lifestyle',
  13: 'People',
  14: 'Plants and Flowers',
  15: 'Culture and Religion',
  16: 'Science',
  17: 'Social Issues',
  18: 'Sports',
  19: 'Technology',
  20: 'Transport',
  21: 'Travel'
}

/**
 * Convert category name to Adobe Stock category number
 * @param {string} categoryName - Category name (e.g., "Landscape", "People")
 * @returns {number|string} - Category number (1-21) or original value if not found
 */
export const getCategoryNumber = (categoryName) => {
  if (!categoryName || categoryName === '-') {
    return '-'
  }
  
  // If it's already a number, return it
  if (typeof categoryName === 'number' || !isNaN(categoryName)) {
    const num = parseInt(categoryName)
    if (num >= 1 && num <= 21) {
      return num
    }
  }
  
  // Convert name to number
  const categoryNumber = CATEGORY_NAME_TO_NUMBER[categoryName]
  return categoryNumber !== undefined ? categoryNumber : categoryName
}

/**
 * Convert category number to name
 * @param {number|string} categoryNumber - Category number (1-21)
 * @returns {string} - Category name or original value if not found
 */
export const getCategoryName = (categoryNumber) => {
  if (!categoryNumber || categoryNumber === '-') {
    return '-'
  }
  
  const num = parseInt(categoryNumber)
  const categoryName = CATEGORY_NUMBER_TO_NAME[num]
  return categoryName || categoryNumber
}
