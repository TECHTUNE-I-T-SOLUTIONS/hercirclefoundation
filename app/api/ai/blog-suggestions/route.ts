import { NextResponse } from 'next/server'
import { createClient as createServerClient } from '@supabase/supabase-js'
import crypto from 'crypto'

const GEMINI_MODELS = [
  'gemini-2.5-flash',
  'gemini-2.5-flash-lite', 
  'gemini-2.5-pro',
  'gemini-3-flash-preview',
  'gemini-3.1-flash-lite',
  'gemini-3.5-flash',
  'gemini-3.5-flash-lite',
  'gemini-3.6-flash',
  'gemini-3.7-flash',
]

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!
const supabase = createServerClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

function generateContentHash(title: string, content: string): string {
  return crypto.createHash('md5').update(title + content).digest('hex')
}

async function callGeminiAPI(prompt: string, apiKey: string): Promise<{ text: string, model: string }> {
  let lastError: Error | null = null
  
  for (const model of GEMINI_MODELS) {
    try {
      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{
            parts: [{ text: prompt }]
          }],
          generationConfig: {
            temperature: 0.7,
            maxOutputTokens: 2048,
          }
        }),
      })

      if (response.ok) {
        const data = await response.json()
        const text = data.candidates?.[0]?.content?.parts?.[0]?.text || ''
        if (text) return { text, model }
      }
    } catch (error: any) {
      console.error(`Failed with model ${model}:`, error)
      lastError = error
      continue
    }
  }
  
  // Check if it's a network/DNS error
  if (lastError?.cause?.code === 'EAI_AGAIN' || lastError?.cause?.code === 'ENOTFOUND') {
    throw new Error('Network error: Unable to connect to AI service. Please check your internet connection and try again.')
  }
  
  throw new Error('All AI models failed to generate suggestions')
}

function extractJSON(text: string): any {
  // Remove markdown code blocks if present
  let cleanedText = text
  
  // Remove ```json ... ``` blocks
  cleanedText = cleanedText.replace(/```json\s*/g, '')
  cleanedText = cleanedText.replace(/```\s*$/g, '')
  
  // Remove ``` ... ``` blocks
  cleanedText = cleanedText.replace(/```\s*/g, '')
  cleanedText = cleanedText.replace(/```\s*$/g, '')
  
  // Remove any leading/trailing whitespace
  cleanedText = cleanedText.trim()
  
  // Remove any text before the first { or after the last }
  const firstBrace = cleanedText.indexOf('{')
  const lastBrace = cleanedText.lastIndexOf('}')
  
  if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
    cleanedText = cleanedText.substring(firstBrace, lastBrace + 1)
  }
  
  // Try to find JSON in the cleaned response
  const jsonMatch = cleanedText.match(/\{[\s\S]*\}/)
  if (jsonMatch) {
    try {
      return JSON.parse(jsonMatch[0])
    } catch (e) {
      console.error('Failed to parse matched JSON:', e)
    }
  }
  
  // Try to find JSON array
  const arrayMatch = cleanedText.match(/\[[\s\S]*\]/)
  if (arrayMatch) {
    try {
      return JSON.parse(arrayMatch[0])
    } catch (e) {
      console.error('Failed to parse matched array:', e)
    }
  }
  
  // Try to parse the entire cleaned text as JSON
  try {
    return JSON.parse(cleanedText)
  } catch (e) {
    console.error('Failed to parse entire text as JSON:', e)
  }
  
  return null
}

function attemptPartialJSONFix(text: string): any {
  // Try to fix common JSON issues
  let fixedText = text
  
  // Fix incomplete strings by adding closing quotes
  fixedText = fixedText.replace(/"([^"]*)$/g, '"$1"')
  
  // Fix incomplete arrays/objects - count nested braces/brackets
  let braceDepth = 0
  let bracketDepth = 0
  let inString = false
  let escapeNext = false
  
  for (let i = 0; i < fixedText.length; i++) {
    const char = fixedText[i]
    
    if (escapeNext) {
      escapeNext = false
      continue
    }
    
    if (char === '\\') {
      escapeNext = true
      continue
    }
    
    if (char === '"') {
      inString = !inString
      continue
    }
    
    if (!inString) {
      if (char === '{') braceDepth++
      if (char === '}') braceDepth--
      if (char === '[') bracketDepth++
      if (char === ']') bracketDepth--
    }
  }
  
  // Close incomplete structures
  if (bracketDepth > 0) {
    fixedText += ']'.repeat(bracketDepth)
  }
  if (braceDepth > 0) {
    fixedText += '}'.repeat(braceDepth)
  }
  
  try {
    return JSON.parse(fixedText)
  } catch (e) {
    console.error('Failed to fix JSON:', e)
    return null
  }
}

export async function POST(req: Request) {
  try {
    const { title, content, blogId } = await req.json()
    
    if (!content || content.length < 100) {
      return NextResponse.json({ error: 'Content must be at least 100 characters' }, { status: 400 })
    }

    const apiKey = process.env.GEMINI_API_KEY
    if (!apiKey) {
      return NextResponse.json({ error: 'Gemini API key not configured' }, { status: 500 })
    }

    // Generate content hash to check for existing suggestions
    const contentHash = generateContentHash(title || '', content)
    
    // Check if we already have suggestions for this content
    const { data: existingSuggestions } = await supabase
      .from('ai_blog_suggestions')
      .select('*')
      .eq('content_hash', contentHash)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()
    
    if (existingSuggestions) {
      console.log('Using cached AI suggestions')
      return NextResponse.json({
        excerpts: existingSuggestions.excerpts,
        tags: existingSuggestions.tags,
        seoTitles: existingSuggestions.seo_titles,
        seoDescriptions: existingSuggestions.seo_descriptions,
        cached: true,
        modelUsed: existingSuggestions.model_used,
        createdAt: existingSuggestions.created_at
      })
    }

    const prompt = `You are an expert content strategist and SEO specialist. Analyze the following blog post and provide suggestions in JSON format:

Title: ${title || 'Untitled'}
Content: ${content.substring(0, 3000)}

Please provide:
1. 3 different excerpt suggestions (150-200 characters each)
2. 5-8 relevant tags (lowercase, comma-separated)
3. 3 SEO title suggestions (50-60 characters each)
4. 3 SEO meta description suggestions (150-160 characters each)

CRITICAL INSTRUCTIONS:
- Return ONLY a valid JSON object
- Do NOT use markdown code blocks (no \`\`\`)
- Do NOT include any additional text before or after the JSON
- Your response must start with { and end with }
- Ensure all strings are properly escaped
- All arrays must contain valid strings

Required JSON format:
{
  "excerpts": ["excerpt1", "excerpt2", "excerpt3"],
  "tags": ["tag1", "tag2", "tag3", "tag4", "tag5"],
  "seoTitles": ["seo title1", "seo title2", "seo title3"],
  "seoDescriptions": ["seo description1", "seo description2", "seo description3"]
}

Now provide the JSON response:`

    const { text: aiResponse, model: modelUsed } = await callGeminiAPI(prompt, apiKey)
    
    // Parse the AI response to extract JSON with better error handling
    let suggestions = extractJSON(aiResponse)
    
    // If primary parsing fails, try to fix incomplete JSON
    if (!suggestions) {
      console.log('Primary JSON parsing failed, attempting fixes...')
      suggestions = attemptPartialJSONFix(aiResponse)
    }
    
    if (!suggestions) {
      console.error('AI Response:', aiResponse)
      throw new Error('Failed to parse AI response as JSON. The AI may have returned an unexpected format.')
    }
    
    // Validate the response structure
    // Handle case where AI returns just an array (treat as excerpts)
    if (Array.isArray(suggestions)) {
      console.log('AI returned array, treating as excerpts')
      suggestions = {
        excerpts: suggestions,
        tags: [],
        seoTitles: [],
        seoDescriptions: []
      }
    }
    
    // Handle case where AI returns partial object
    if (!suggestions.excerpts && !suggestions.tags && !suggestions.seoTitles && !suggestions.seoDescriptions) {
      console.error('Invalid suggestions structure:', suggestions)
      throw new Error('AI response missing required fields')
    }
    
    // Ensure arrays exist
    suggestions.excerpts = suggestions.excerpts || []
    suggestions.tags = suggestions.tags || []
    suggestions.seoTitles = suggestions.seoTitles || []
    suggestions.seoDescriptions = suggestions.seoDescriptions || []
    
    // Save suggestions to database for future reuse
    try {
      await supabase.from('ai_blog_suggestions').insert({
        blog_id: blogId || null, // Handle null for unsaved blogs
        content_hash: contentHash,
        excerpts: suggestions.excerpts,
        tags: suggestions.tags,
        seo_titles: suggestions.seoTitles,
        seo_descriptions: suggestions.seoDescriptions,
        model_used: modelUsed,
      })
      console.log('AI suggestions saved to database')
    } catch (dbError) {
      console.error('Failed to save AI suggestions to database:', dbError)
      // Continue even if save fails - this is non-critical
    }
    
    return NextResponse.json({
      ...suggestions,
      cached: false,
      modelUsed,
    })
  } catch (error: any) {
    console.error('AI suggestion error:', error)
    return NextResponse.json({ error: error.message || 'Failed to generate AI suggestions' }, { status: 500 })
  }
}
