"use client"

import React, { useState, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog'
import {
  Save,
  Eye,
  Upload,
  X,
  Plus,
  Loader2,
  FileText,
  Bold,
  Italic,
  Underline,
  AlignLeft,
  AlignCenter,
  AlignRight,
  AlignJustify,
  Image,
  Link as LinkIcon,
  Heading,
  MousePointer2,
  ArrowLeft,
  Sparkles,
  Lightbulb,
} from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import { FileUploadInput } from '@/components/file-upload-input'

interface BlogEditorProps {
  blogId?: string
  initialData?: any
}

interface FormData {
  title: string
  slug: string
  content: string
  excerpt: string
  status: 'draft' | 'published'
  featured: boolean
  tags: string[]
  seoTitle: string
  seoDescription: string
  authorName: string
  coverImage: string
  schemaType: 'Article' | 'BlogPosting' | 'NewsArticle' | 'None'
}

export default function BlogEditor({ blogId, initialData }: BlogEditorProps) {
  const router = useRouter()
  const { toast } = useToast()

  const [formData, setFormData] = useState<FormData>({
    title: initialData?.title || '',
    slug: initialData?.slug || '',
    content: initialData?.content || '',
    excerpt: initialData?.excerpt || '',
    status: initialData?.status || 'draft',
    featured: initialData?.featured || false,
    tags: initialData?.tags || [],
    seoTitle: initialData?.seo_title || '',
    seoDescription: initialData?.seo_description || '',
    authorName: initialData?.author_name || '',
    coverImage: initialData?.cover_image || '',
    schemaType: initialData?.schema_type || 'Article',
  })

  const [newTag, setNewTag] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [showImageDialog, setShowImageDialog] = useState(false)
  const [showLinkDialog, setShowLinkDialog] = useState(false)
  const [showCtaDialog, setShowCtaDialog] = useState(false)
  const [linkUrl, setLinkUrl] = useState('')
  const [linkText, setLinkText] = useState('')
  const [ctaText, setCtaText] = useState('')
  const [ctaUrl, setCtaUrl] = useState('')
  const [imageAltText, setImageAltText] = useState('')
  const [imageSizeOption, setImageSizeOption] = useState<'small' | 'medium' | 'large' | 'full'>('medium')
  const [selectedImageForInsert, setSelectedImageForInsert] = useState<any | null>(null)
  const [showAISuggestions, setShowAISuggestions] = useState(false)
  const [aiLoading, setAiLoading] = useState(false)
  const [aiSuggestions, setAiSuggestions] = useState<any>(null)
  const [isCached, setIsCached] = useState(false)
  const [modelUsed, setModelUsed] = useState<string | null>(null)
  
  const contentRef = useRef<HTMLDivElement>(null)
  const savedSelectionRef = useRef<Range | null>(null)

  const contentIsEmpty = !formData.content || formData.content === '<p><br></p>' || formData.content === ''

  // Rich text editor commands
  const exec = (command: string, value?: string) => {
    contentRef.current?.focus()
    try {
      document.execCommand(command, false, value || undefined)
    } catch (e) {
      console.error('Command failed:', command, e)
    }
    updateContent()
  }

  const updateContent = () => {
    const html = contentRef.current?.innerHTML || ''
    setFormData(prev => ({ ...prev, content: html }))
  }

  // Save/restore selection for dialogs
  const saveSelection = () => {
    const sel = window.getSelection()
    if (sel && sel.rangeCount > 0) {
      savedSelectionRef.current = sel.getRangeAt(0).cloneRange()
    }
  }

  const restoreSelection = () => {
    const sel = window.getSelection()
    if (!sel || !savedSelectionRef.current) return
    sel.removeAllRanges()
    sel.addRange(savedSelectionRef.current)
  }

  // Insert HTML at cursor position
  const insertAtCursor = (html: string) => {
    const el = contentRef.current
    if (!el) return

    el.focus()
    restoreSelection()

    try {
      document.execCommand('insertHTML', false, html)
    } catch (e) {
      el.innerHTML += html
    }

    savedSelectionRef.current = null
    updateContent()
  }

  // Image insertion
  const handleImageInsert = () => {
    if (!selectedImageForInsert) return
    
    const sizeClasses = {
      small: 'max-w-[25%]',
      medium: 'max-w-[50%]',
      large: 'max-w-[75%]',
      full: 'max-w-full'
    }
    const sizeClass = sizeClasses[imageSizeOption]
    
    const html = `<img src="${selectedImageForInsert.file_url}" alt="${imageAltText || 'Image'}" class="${sizeClass} h-auto rounded mx-auto" style="width: 100%" />`
    insertAtCursor(html)
    
    setShowImageDialog(false)
    setSelectedImageForInsert(null)
    setImageAltText('')
    setImageSizeOption('medium')
  }

  // Link insertion
  const handleLinkInsert = () => {
    const html = linkText 
      ? `<a href="${linkUrl}" target="_blank" rel="noopener noreferrer" class="text-primary underline hover:text-primary/80">${linkText}</a>`
      : `<a href="${linkUrl}" target="_blank" rel="noopener noreferrer" class="text-primary underline hover:text-primary/80">${linkUrl}</a>`
    
    insertAtCursor(html)
    setShowLinkDialog(false)
    setLinkUrl('')
    setLinkText('')
  }

  // CTA button insertion
  const handleCtaInsert = () => {
    const html = `<a href="${ctaUrl}" target="_blank" rel="noopener noreferrer" class="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground shadow-sm hover:bg-primary/90">${ctaText}</a>`
    insertAtCursor(html)
    setShowCtaDialog(false)
    setCtaText('')
    setCtaUrl('')
  }

  // Tag management
  const addTag = () => {
    if (newTag.trim() && !formData.tags.includes(newTag.trim())) {
      setFormData(prev => ({ ...prev, tags: [...prev.tags, newTag.trim()] }))
      setNewTag('')
    }
  }

  const removeTag = (tagToRemove: string) => {
    setFormData(prev => ({ ...prev, tags: prev.tags.filter(tag => tag !== tagToRemove) }))
  }

  // Calculate reading time (approx 200 words per minute)
  const calculateReadingTime = () => {
    const words = formData.content.split(/\s+/).filter(word => word.length > 0).length
    return Math.ceil(words / 200)
  }

  // AI Suggestions
  const generateAISuggestions = async () => {
    if (!formData.content || formData.content.length < 100) {
      toast({
        variant: 'destructive',
        title: 'Content Required',
        description: 'Please write at least 100 characters before generating AI suggestions.',
      })
      return
    }

    setAiLoading(true)
    try {
      const response = await fetch('/api/ai/blog-suggestions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: formData.title,
          content: formData.content,
          blogId: blogId || null,
        }),
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }))
        throw new Error(errorData.error || 'Failed to generate AI suggestions')
      }

      const data = await response.json()
      setAiSuggestions(data)
      setIsCached(data.cached || false)
      setModelUsed(data.modelUsed || null)
      setShowAISuggestions(true)
      
      if (data.cached) {
        toast({
          title: 'AI Suggestions Loaded',
          description: 'Using previously generated suggestions for this content.',
        })
      } else {
        toast({
          title: 'AI Suggestions Generated',
          description: 'Review and apply the suggestions below.',
        })
      }
    } catch (error: any) {
      console.error('AI suggestion error:', error)
      toast({
        variant: 'destructive',
        title: 'AI Error',
        description: error.message || 'Failed to generate suggestions. Please try again.',
      })
    } finally {
      setAiLoading(false)
    }
  }

  const applyAISuggestion = (type: 'excerpt' | 'tags' | 'seoTitle' | 'seoDescription', value: any) => {
    if (type === 'tags' && Array.isArray(value)) {
      setFormData(prev => ({ ...prev, tags: [...new Set([...prev.tags, ...value])] }))
    } else {
      setFormData(prev => ({ ...prev, [type]: value }))
    }
    
    // Mark suggestions as used in database
    if (blogId) {
      fetch('/api/ai/blog-suggestions/mark-used', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ blogId }),
      }).catch(err => console.error('Failed to mark suggestions as used:', err))
    } else {
      console.log('No blogId to mark suggestions as used (unsaved blog)')
    }
    
    toast({
      title: 'Suggestion Applied',
      description: `AI suggestion for ${type} has been applied.`,
    })
  }

  const applyAllAISuggestions = () => {
    if (!aiSuggestions) return
    
    if (aiSuggestions.excerpts && aiSuggestions.excerpts.length > 0) {
      setFormData(prev => ({ ...prev, excerpt: aiSuggestions.excerpts[0] }))
    }
    
    if (aiSuggestions.tags && aiSuggestions.tags.length > 0) {
      setFormData(prev => ({ ...prev, tags: [...new Set([...prev.tags, ...aiSuggestions.tags])] }))
    }
    
    if (aiSuggestions.seoTitles && aiSuggestions.seoTitles.length > 0) {
      setFormData(prev => ({ ...prev, seoTitle: aiSuggestions.seoTitles[0] }))
    }
    
    if (aiSuggestions.seoDescriptions && aiSuggestions.seoDescriptions.length > 0) {
      setFormData(prev => ({ ...prev, seoDescription: aiSuggestions.seoDescriptions[0] }))
    }
    
    // Mark suggestions as used in database
    if (blogId) {
      fetch('/api/ai/blog-suggestions/mark-used', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ blogId }),
      }).catch(err => console.error('Failed to mark suggestions as used:', err))
    } else {
      console.log('No blogId to mark suggestions as used (unsaved blog)')
    }
    
    setShowAISuggestions(false)
    toast({
      title: 'All Suggestions Applied',
      description: 'AI suggestions have been applied to your blog post.',
    })
  }

  // Form submission
  const handleSubmit = async (status: 'draft' | 'published') => {
    setIsLoading(true)
    try {
      const url = blogId ? `/api/admin/blogs/${blogId}` : '/api/admin/blogs'
      const method = blogId ? 'PATCH' : 'POST'
      
      const payload = {
        ...formData,
        status,
        reading_time: calculateReadingTime(),
      }

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      if (response.ok) {
        const data = await response.json()
        toast({
          title: blogId ? 'Blog updated' : 'Blog created',
          description: `Successfully ${blogId ? 'updated' : status === 'published' ? 'published' : 'saved as draft'}.`,
        })
        router.push('/admin/blogs')
      } else {
        const error = await response.json()
        throw new Error(error.error || `Failed to ${blogId ? 'update' : 'save'} blog`)
      }
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: error.message,
      })
    } finally {
      setIsLoading(false)
    }
  }

  // Initialize content editable with initial content
  useEffect(() => {
    if (initialData?.content && contentRef.current) {
      contentRef.current.innerHTML = initialData.content
    }
  }, [initialData])

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Only apply shortcuts when content editor is focused
      if (!contentRef.current || document.activeElement !== contentRef.current) return

      // Ctrl/Cmd + B for bold
      if ((e.ctrlKey || e.metaKey) && e.key === 'b') {
        e.preventDefault()
        exec('bold')
      }
      // Ctrl/Cmd + I for italic
      else if ((e.ctrlKey || e.metaKey) && e.key === 'i') {
        e.preventDefault()
        exec('italic')
      }
      // Ctrl/Cmd + U for underline
      else if ((e.ctrlKey || e.metaKey) && e.key === 'u') {
        e.preventDefault()
        exec('underline')
      }
      // Ctrl/Cmd + K for link
      else if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault()
        saveSelection()
        setShowLinkDialog(true)
        setLinkUrl('')
        setLinkText('')
      }
      // Ctrl/Cmd + 1 for H1
      else if ((e.ctrlKey || e.metaKey) && e.key === '1') {
        e.preventDefault()
        exec('formatBlock', 'H1')
      }
      // Ctrl/Cmd + 2 for H2
      else if ((e.ctrlKey || e.metaKey) && e.key === '2') {
        e.preventDefault()
        exec('formatBlock', 'H2')
      }
      // Ctrl/Cmd + 3 for H3
      else if ((e.ctrlKey || e.metaKey) && e.key === '3') {
        e.preventDefault()
        exec('formatBlock', 'H3')
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [])

  return (
    <div className="max-w-6xl mx-auto space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <Button variant="outline" onClick={() => router.back()}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back
        </Button>
        <div>
          <h1 className="text-3xl font-bold font-serif">
            {blogId ? 'Edit Blog Post' : 'Create New Blog Post'}
          </h1>
          <p className="text-muted-foreground">
            {blogId ? 'Update your blog post' : 'Write and publish a new blog post'}
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => handleSubmit('draft')}
            disabled={isLoading}
          >
            {isLoading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
            Save Draft
          </Button>
          <Button
            onClick={() => handleSubmit('published')}
            disabled={isLoading}
          >
            {isLoading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Eye className="h-4 w-4 mr-2" />}
            Publish
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Main Content Area */}
        <div className="lg:col-span-2 space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Content</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Title */}
              <div>
                <Label htmlFor="title">Title</Label>
                <Input
                  id="title"
                  value={formData.title}
                  onChange={e => setFormData(prev => ({
                    ...prev,
                    title: e.target.value,
                    slug: e.target.value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')
                  }))}
                  placeholder="Enter blog post title..."
                  className="text-lg font-serif"
                />
              </div>

              {/* Slug */}
              <div>
                <Label htmlFor="slug">URL Slug</Label>
                <Input
                  id="slug"
                  value={formData.slug}
                  onChange={e => setFormData(prev => ({
                    ...prev,
                    slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '-').replace(/-+/g, '-').replace(/^-+|-+$/g, '')
                  }))}
                  placeholder="clean-url-slug"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Auto-generated from title. Edit for keywords if needed.
                </p>
              </div>

              {/* Author Name */}
              <div>
                <Label htmlFor="authorName">Author Name (optional)</Label>
                <Input
                  id="authorName"
                  value={formData.authorName}
                  onChange={e => setFormData(prev => ({ ...prev, authorName: e.target.value }))}
                  placeholder="Author name if different from admin"
                />
              </div>

              {/* Formatting Toolbar */}
              <div className="flex flex-wrap gap-1 p-2 border rounded-lg bg-muted/30">
                <Button type="button" variant="ghost" size="sm" onClick={() => exec('bold')} title="Bold (Ctrl+B)">
                  <Bold className="h-4 w-4" />
                </Button>
                <Button type="button" variant="ghost" size="sm" onClick={() => exec('italic')} title="Italic (Ctrl+I)">
                  <Italic className="h-4 w-4" />
                </Button>
                <Button type="button" variant="ghost" size="sm" onClick={() => exec('underline')} title="Underline (Ctrl+U)">
                  <Underline className="h-4 w-4" />
                </Button>
                <span className="w-px h-6 bg-border mx-1" />
                <Button type="button" variant="ghost" size="sm" onMouseDown={e => { e.preventDefault(); saveSelection(); setShowImageDialog(true); }} title="Insert Image">
                  <Image className="h-4 w-4" />
                </Button>
                <Button type="button" variant="ghost" size="sm" onMouseDown={e => { e.preventDefault(); saveSelection(); setShowLinkDialog(true); setLinkUrl(''); setLinkText(''); }} title="Insert Link (Ctrl+K)">
                  <LinkIcon className="h-4 w-4" />
                </Button>
                <Button type="button" variant="ghost" size="sm" onMouseDown={e => { e.preventDefault(); saveSelection(); setShowCtaDialog(true); setCtaText(''); setCtaUrl(''); }} title="Insert CTA Button">
                  <MousePointer2 className="h-4 w-4" />
                </Button>
                <span className="w-px h-6 bg-border mx-1" />
                <Button type="button" variant="ghost" size="sm" onClick={() => exec('formatBlock', 'H1')} title="Heading 1 (Ctrl+1)">
                  <Heading className="h-4 w-4" /><span className="text-[10px]">1</span>
                </Button>
                <Button type="button" variant="ghost" size="sm" onClick={() => exec('formatBlock', 'H2')} title="Heading 2 (Ctrl+2)">
                  <Heading className="h-4 w-4" /><span className="text-[10px]">2</span>
                </Button>
                <Button type="button" variant="ghost" size="sm" onClick={() => exec('formatBlock', 'H3')} title="Heading 3 (Ctrl+3)">
                  <Heading className="h-4 w-4" /><span className="text-[10px]">3</span>
                </Button>
                <span className="w-px h-6 bg-border mx-1" />
                <Button type="button" variant="ghost" size="sm" onClick={() => exec('justifyLeft')} title="Align Left">
                  <AlignLeft className="h-4 w-4" />
                </Button>
                <Button type="button" variant="ghost" size="sm" onClick={() => exec('justifyCenter')} title="Align Center">
                  <AlignCenter className="h-4 w-4" />
                </Button>
                <Button type="button" variant="ghost" size="sm" onClick={() => exec('justifyRight')} title="Align Right">
                  <AlignRight className="h-4 w-4" />
                </Button>
                <Button type="button" variant="ghost" size="sm" onClick={() => exec('justifyFull')} title="Justify">
                  <AlignJustify className="h-4 w-4" />
                </Button>
                <span className="w-px h-6 bg-border mx-1" />
                <Button 
                  type="button" 
                  variant="ghost" 
                  size="sm" 
                  onClick={generateAISuggestions} 
                  disabled={aiLoading}
                  title="Generate AI Suggestions"
                  className="text-primary"
                >
                  {aiLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
                </Button>
              </div>

              {/* Content Editor */}
              <div>
                <Label>Content</Label>
                <div className="relative border rounded-md overflow-hidden">
                  <div
                    ref={contentRef}
                    contentEditable
                    suppressContentEditableWarning
                    onInput={updateContent}
                    onKeyUp={updateContent}
                    className="min-h-[400px] p-4 text-foreground dark:text-white prose dark:prose-invert max-w-none focus:outline-none focus:ring-1 focus:ring-primary"
                  />
                  {contentIsEmpty && (
                    <div className="absolute top-4 left-4 text-muted-foreground pointer-events-none select-none">
                      Write your blog post content here...
                    </div>
                  )}
                </div>
              </div>

              {/* Excerpt */}
              <div>
                <Label htmlFor="excerpt">Excerpt</Label>
                <Textarea
                  id="excerpt"
                  value={formData.excerpt}
                  onChange={e => setFormData(prev => ({ ...prev, excerpt: e.target.value }))}
                  placeholder="Brief description for preview..."
                  className="min-h-[100px] resize-none"
                />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-6 lg:sticky lg:top-20 lg:self-start">
          {/* Blog Settings */}
          <Card>
            <CardHeader>
              <CardTitle>Blog Settings</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Featured */}
              <div className="flex items-center justify-between">
                <Label htmlFor="featured">Featured Post</Label>
                <Switch
                  id="featured"
                  checked={formData.featured}
                  onCheckedChange={checked => setFormData(prev => ({ ...prev, featured: checked }))}
                />
              </div>

              {/* Status */}
              <div>
                <Label htmlFor="status">Status</Label>
                <Select value={formData.status} onValueChange={(value: 'draft' | 'published') => setFormData(prev => ({ ...prev, status: value }))}>
                  <SelectTrigger id="status">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="draft">Draft</SelectItem>
                    <SelectItem value="published">Published</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Schema Type */}
              <div>
                <Label htmlFor="schemaType">Schema Type</Label>
                <Select value={formData.schemaType} onValueChange={(value: any) => setFormData(prev => ({ ...prev, schemaType: value }))}>
                  <SelectTrigger id="schemaType">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Article">Article</SelectItem>
                    <SelectItem value="BlogPosting">Blog Posting</SelectItem>
                    <SelectItem value="NewsArticle">News Article</SelectItem>
                    <SelectItem value="None">None</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          {/* Cover Image */}
          <Card>
            <CardHeader>
              <CardTitle>Cover Image</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <FileUploadInput
                label="Upload Cover Image"
                bucket="media"
                onFileUrlChange={url => setFormData(prev => ({ ...prev, coverImage: url }))}
              />
              {formData.coverImage && (
                <div className="relative">
                  <img src={formData.coverImage} alt="Cover" className="w-full h-32 object-cover rounded" />
                  <Button
                    size="sm"
                    variant="destructive"
                    className="absolute top-2 right-2"
                    onClick={() => setFormData(prev => ({ ...prev, coverImage: '' }))}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Tags */}
          <Card>
            <CardHeader>
              <CardTitle>Tags</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-2">
                <Input
                  value={newTag}
                  onChange={e => setNewTag(e.target.value)}
                  placeholder="Add tag..."
                  onKeyPress={e => e.key === 'Enter' && (e.preventDefault(), addTag())}
                />
                <Button size="sm" onClick={addTag}>
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
              <div className="flex flex-wrap gap-2">
                {formData.tags.map(tag => (
                  <Badge key={tag} variant="secondary" className="cursor-pointer">
                    {tag}
                    <X
                      className="h-3 w-3 ml-1"
                      onClick={() => removeTag(tag)}
                    />
                  </Badge>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* SEO */}
          <Card>
            <CardHeader>
              <CardTitle>SEO</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="seoTitle">SEO Title</Label>
                <Input
                  id="seoTitle"
                  value={formData.seoTitle}
                  onChange={e => setFormData(prev => ({ ...prev, seoTitle: e.target.value }))}
                  placeholder="Custom SEO title (optional)"
                />
              </div>
              <div>
                <Label htmlFor="seoDescription">SEO Description</Label>
                <Textarea
                  id="seoDescription"
                  value={formData.seoDescription}
                  onChange={e => setFormData(prev => ({ ...prev, seoDescription: e.target.value }))}
                  placeholder="Meta description for search engines"
                  className="min-h-[80px] resize-none"
                />
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Image Dialog */}
      <Dialog open={showImageDialog} onOpenChange={setShowImageDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Insert Image</DialogTitle>
            <DialogDescription>Upload and insert an image at the cursor position.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 mt-4">
            <FileUploadInput
              label="Upload Image"
              bucket="media"
              onFileUrlChange={url => setSelectedImageForInsert({ file_url: url })}
            />
            {selectedImageForInsert && (
              <>
                <div>
                  <Label>Alt Text</Label>
                  <Input
                    value={imageAltText}
                    onChange={e => setImageAltText(e.target.value)}
                    placeholder="Image description"
                  />
                </div>
                <div>
                  <Label>Size</Label>
                  <Select value={imageSizeOption} onValueChange={(value: any) => setImageSizeOption(value)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="small">Small (25%)</SelectItem>
                      <SelectItem value="medium">Medium (50%)</SelectItem>
                      <SelectItem value="large">Large (75%)</SelectItem>
                      <SelectItem value="full">Full Width</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <Button onClick={handleImageInsert} className="w-full">
                  Insert Image
                </Button>
              </>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Link Dialog */}
      <Dialog open={showLinkDialog} onOpenChange={setShowLinkDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Insert Link</DialogTitle>
            <DialogDescription>Enter URL and optional text for the link.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 mt-4">
            <div>
              <Label>URL</Label>
              <Input
                value={linkUrl}
                onChange={e => setLinkUrl(e.target.value)}
                placeholder="https://example.com"
              />
            </div>
            <div>
              <Label>Text (optional)</Label>
              <Input
                value={linkText}
                onChange={e => setLinkText(e.target.value)}
                placeholder="Link text"
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setShowLinkDialog(false)}>
                Cancel
              </Button>
              <Button onClick={handleLinkInsert}>
                Insert Link
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* CTA Dialog */}
      <Dialog open={showCtaDialog} onOpenChange={setShowCtaDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Insert CTA Button</DialogTitle>
            <DialogDescription>Create a call-to-action button.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 mt-4">
            <div>
              <Label>Button Text</Label>
              <Input
                value={ctaText}
                onChange={e => setCtaText(e.target.value)}
                placeholder="Click here"
              />
            </div>
            <div>
              <Label>Button URL</Label>
              <Input
                value={ctaUrl}
                onChange={e => setCtaUrl(e.target.value)}
                placeholder="https://example.com"
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setShowCtaDialog(false)}>
                Cancel
              </Button>
              <Button onClick={handleCtaInsert}>
                Insert Button
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* AI Suggestions Dialog */}
      <Dialog open={showAISuggestions} onOpenChange={setShowAISuggestions}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-primary" />
              AI Content Suggestions
            </DialogTitle>
            <DialogDescription>
              {isCached ? (
                <span className="flex items-center gap-2">
                  <span className="text-amber-600 dark:text-amber-400">⚡ Using cached suggestions (saved AI usage)</span>
                  {modelUsed && <span className="text-muted-foreground">• Model: {modelUsed}</span>}
                </span>
              ) : (
                <span className="flex items-center gap-2">
                  <span>AI-generated suggestions to improve your blog post. Click on any suggestion to apply it directly to your blog.</span>
                  {modelUsed && <span className="text-muted-foreground">• Model: {modelUsed}</span>}
                </span>
              )}
            </DialogDescription>
          </DialogHeader>
          {aiSuggestions && (
            <div className="space-y-6 mt-4">
              {/* Excerpt Suggestions */}
              {aiSuggestions.excerpts && aiSuggestions.excerpts.length > 0 && (
                <div>
                  <Label className="flex items-center gap-2 mb-2">
                    <Lightbulb className="h-4 w-4" />
                    Suggested Excerpts
                  </Label>
                  <div className="space-y-2">
                    {aiSuggestions.excerpts.map((excerpt: string, index: number) => (
                      <div 
                        key={index} 
                        className="p-3 border rounded-lg bg-muted/50 hover:bg-muted cursor-pointer transition-colors"
                        onClick={() => applyAISuggestion('excerpt', excerpt)}
                      >
                        <p className="text-sm mb-2">{excerpt}</p>
                        <p className="text-xs text-muted-foreground">Click to apply this excerpt</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Tag Suggestions */}
              {aiSuggestions.tags && aiSuggestions.tags.length > 0 && (
                <div>
                  <Label className="flex items-center gap-2 mb-2">
                    <Lightbulb className="h-4 w-4" />
                    Suggested Tags
                  </Label>
                  <div className="flex flex-wrap gap-2 mb-3">
                    {aiSuggestions.tags.map((tag: string, index: number) => (
                      <Badge 
                        key={index} 
                        variant="secondary" 
                        className="cursor-pointer hover:bg-primary hover:text-primary-foreground transition-colors"
                        onClick={() => {
                          setFormData(prev => ({ ...prev, tags: [...new Set([...prev.tags, tag])] }))
                          toast({
                            title: 'Tag Added',
                            description: `"${tag}" has been added to your tags.`,
                          })
                        }}
                      >
                        {tag}
                      </Badge>
                    ))}
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => applyAISuggestion('tags', aiSuggestions.tags)}
                  >
                    Add All Tags
                  </Button>
                </div>
              )}

              {/* SEO Title Suggestions */}
              {aiSuggestions.seoTitles && aiSuggestions.seoTitles.length > 0 && (
                <div>
                  <Label className="flex items-center gap-2 mb-2">
                    <Lightbulb className="h-4 w-4" />
                    Suggested SEO Titles
                  </Label>
                  <div className="space-y-2">
                    {aiSuggestions.seoTitles.map((title: string, index: number) => (
                      <div 
                        key={index} 
                        className="p-3 border rounded-lg bg-muted/50 hover:bg-muted cursor-pointer transition-colors"
                        onClick={() => applyAISuggestion('seoTitle', title)}
                      >
                        <p className="text-sm mb-2">{title}</p>
                        <p className="text-xs text-muted-foreground">Click to apply this SEO title</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* SEO Description Suggestions */}
              {aiSuggestions.seoDescriptions && aiSuggestions.seoDescriptions.length > 0 && (
                <div>
                  <Label className="flex items-center gap-2 mb-2">
                    <Lightbulb className="h-4 w-4" />
                    Suggested SEO Descriptions
                  </Label>
                  <div className="space-y-2">
                    {aiSuggestions.seoDescriptions.map((description: string, index: number) => (
                      <div 
                        key={index} 
                        className="p-3 border rounded-lg bg-muted/50 hover:bg-muted cursor-pointer transition-colors"
                        onClick={() => applyAISuggestion('seoDescription', description)}
                      >
                        <p className="text-sm mb-2">{description}</p>
                        <p className="text-xs text-muted-foreground">Click to apply this SEO description</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
          <DialogFooter className="flex justify-between">
            <Button variant="outline" onClick={() => setShowAISuggestions(false)}>
              Close
            </Button>
            <Button onClick={applyAllAISuggestions} className="bg-primary">
              Apply All Suggestions
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
