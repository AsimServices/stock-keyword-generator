// Download utility functions for various formats
import { getCategoryNumber } from './categoryUtils'

export const downloadTXT = (results, filename = 'keyword-analysis') => {
  const successfulResults = results.filter(result => result.success)
  
  let content = 'AI Keyword Generator Results\n'
  content += '================================\n\n'
  
  const groupedResults = successfulResults.reduce((acc, result) => {
    const key = result.imageId || result.videoId || result.textId || 'unknown'
    const name = result.imageName || result.videoName || result.textName || 'Unknown'
    
    if (!acc[key]) {
      acc[key] = {
        name: name,
        results: []
      }
    }
    acc[key].results.push(result)
    return acc
  }, {})

  Object.values(groupedResults).forEach(group => {
    content += `Content: ${group.name}\n`
    content += '-'.repeat(50) + '\n'
    group.results.forEach(result => {
      content += `${result.service}:\n${result.result}\n\n`
    })
    content += '\n'
  })

  const blob = new Blob([content], { type: 'text/plain' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `${filename}-${new Date().toISOString().split('T')[0]}.txt`
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

export const downloadCSV = (results, filename = 'keyword-analysis') => {
  const successfulResults = results.filter(result => result.success)

  // Group by asset to output one row per file
  const grouped = successfulResults.reduce((acc, r) => {
    const key = r.imageId || r.videoId || r.textId || 'unknown'
    const name = r.imageName || r.videoName || r.textName || 'Unknown'
    if (!acc[key]) acc[key] = { name, results: [] }
    acc[key].results.push(r)
    return acc
  }, {})

  // Target header
  let csvContent = 'Filename,Title,Keywords,Category,Releases\n'

  const escapeCSV = (val) => String(val ?? '')
    .replace(/\n/g, ' ')
    .replace(/"/g, '""')

  Object.values(grouped).forEach(group => {
    const preferred = group.results.find(r => (r.title && r.title.length) || (Array.isArray(r.keywords) && r.keywords.length)) || group.results[0]
    const filenameOut = group.name

    // Title fallback
    let title = preferred?.title ?? ''
    if (!title) {
      const raw = preferred?.result ?? ''
      title = raw.split('\n').map(s => s.trim()).filter(Boolean)[0] || group.name
    }
    title = title.slice(0, 200)

    // Keywords
    let keywordsArr = Array.isArray(preferred?.keywords) ? preferred.keywords : []
    if (keywordsArr.length === 0 && preferred?.result) {
      const raw = preferred.result
      keywordsArr = raw.split(',').map(k => k.trim()).filter(Boolean)
    }
    const keywords = keywordsArr.slice(0, 49).join(', ')

    const category = preferred?.category ? getCategoryNumber(preferred.category) : '3'
    const releases = ''

    csvContent += `"${escapeCSV(filenameOut)}","${escapeCSV(title)}","${escapeCSV(keywords)}","${escapeCSV(category)}","${escapeCSV(releases)}"\n`
  })

  const blob = new Blob([csvContent], { type: 'text/csv' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `${filename}-${new Date().toISOString().split('T')[0]}.csv`
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

export const downloadExcel = (results, filename = 'keyword-analysis') => {
  const successfulResults = results.filter(result => result.success)
  
  // Create Excel-compatible CSV with proper formatting
  let excelContent = '\uFEFF' // BOM for UTF-8
  excelContent += 'Content Name,AI Service,Keywords and Title,Date Generated\n'
  
  const currentDate = new Date().toLocaleDateString()
  
  successfulResults.forEach(result => {
    const name = result.imageName || result.videoName || result.textName || 'Unknown'
    const escapedResult = result.result.replace(/"/g, '""').replace(/\n/g, ' ')
    excelContent += `"${name}","${result.service}","${escapedResult}","${currentDate}"\n`
  })

  const blob = new Blob([excelContent], { 
    type: 'application/vnd.ms-excel;charset=utf-8' 
  })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `${filename}-${new Date().toISOString().split('T')[0]}.xls`
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

export const downloadPDF = async (results, filename = 'keyword-analysis') => {
  const successfulResults = results.filter(result => result.success)
  
  // Create HTML content for PDF
  let htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <title>AI Keyword Generator Results</title>
      <style>
        body { 
          font-family: Arial, sans-serif; 
          margin: 20px; 
          line-height: 1.6;
          color: #333;
        }
        .header { 
          text-align: center; 
          border-bottom: 2px solid #4F46E5; 
          padding-bottom: 20px; 
          margin-bottom: 30px;
        }
        .header h1 { 
          color: #4F46E5; 
          margin: 0;
          font-size: 28px;
        }
        .header p { 
          color: #666; 
          margin: 10px 0 0 0;
          font-size: 14px;
        }
        .content-section { 
          margin-bottom: 30px; 
          page-break-inside: avoid;
        }
        .content-title { 
          font-size: 18px; 
          font-weight: bold; 
          color: #1F2937; 
          border-left: 4px solid #4F46E5;
          padding-left: 15px;
          margin-bottom: 15px;
        }
        .service-result { 
          margin-bottom: 20px; 
          padding: 15px; 
          border: 1px solid #E5E7EB; 
          border-radius: 8px;
          background-color: #F9FAFB;
        }
        .service-name { 
          font-weight: bold; 
          color: #4F46E5; 
          margin-bottom: 8px;
          font-size: 14px;
        }
        .service-content { 
          color: #374151; 
          white-space: pre-wrap;
          font-size: 13px;
          line-height: 1.5;
        }
        .footer {
          margin-top: 40px;
          padding-top: 20px;
          border-top: 1px solid #E5E7EB;
          text-align: center;
          color: #6B7280;
          font-size: 12px;
        }
      </style>
    </head>
    <body>
      <div class="header">
        <h1>AI Keyword Generator Results</h1>
        <p>Generated on ${new Date().toLocaleDateString()} at ${new Date().toLocaleTimeString()}</p>
        <p>Total Results: ${successfulResults.length}</p>
      </div>
  `
  
  const groupedResults = successfulResults.reduce((acc, result) => {
    const key = result.imageId || result.videoId || result.textId || 'unknown'
    const name = result.imageName || result.videoName || result.textName || 'Unknown'
    
    if (!acc[key]) {
      acc[key] = {
        name: name,
        results: []
      }
    }
    acc[key].results.push(result)
    return acc
  }, {})

  Object.values(groupedResults).forEach(group => {
    htmlContent += `
      <div class="content-section">
        <div class="content-title">${group.name}</div>
    `
    
    group.results.forEach(result => {
      htmlContent += `
        <div class="service-result">
          <div class="service-name">${result.service}</div>
          <div class="service-content">${result.result}</div>
        </div>
      `
    })
    
    htmlContent += '</div>'
  })
  
  htmlContent += `
      <div class="footer">
        <p>Generated by AI Keyword Generator Platform</p>
        <p>Powered by multiple AI models for content creators</p>
      </div>
    </body>
    </html>
  `

  // Convert HTML to PDF using browser's print functionality
  const printWindow = window.open('', '_blank')
  printWindow.document.write(htmlContent)
  printWindow.document.close()
  
  // Wait for content to load
  setTimeout(() => {
    printWindow.print()
    printWindow.close()
  }, 500)
}
