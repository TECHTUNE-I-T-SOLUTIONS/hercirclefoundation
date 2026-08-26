import type { Metadata } from 'next'
import { createClient as createServerHelper } from '@/lib/supabase/server'
import { Header } from '@/components/header'
import { Footer } from '@/components/footer'
import StoryReactions from '@/components/story-reactions'

type Props = { params: Promise<{ id: string }> }

export const revalidate = 10

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params
  const supabase = await createServerHelper()
  const { data: story } = await supabase.from('stories').select('title, content, author_name').eq('id', id).limit(1).single()
  if (!story) {
    return {
      title: "Story Not Found | HerCircle Foundation",
    }
  }
  const cleanDescription = story.content
    ? story.content.replace(/<[^>]*>/g, '').substring(0, 160) + '...'
    : `Read this story shared by ${story.author_name || 'Anonymous'} on HerCircle Foundation.`
  return {
    title: `${story.title || 'Community Story'} | HerCircle Foundation`,
    description: cleanDescription,
  }
}

// helper to detect file types by extension (server-side)
const isImageUrl = (url?: string | null) => {
  if (!url) return false
  try {
    const p = url.split('?')[0].toLowerCase()
    return /\.(jpe?g|png|gif|webp|avif|svg|bmp|tiff)$/.test(p)
  } catch {
    return false
  }
}
const isPdfUrl = (url?: string | null) => {
  if (!url) return false
  try { return /\.pdf($|\?)/i.test(url.split('?')[0]) } catch { return false }
}

export default async function StoryDetail({ params }: Props) {
  // `params` can be a Promise in the App Router — unwrap it before using.
  const { id } = await params
  const supabase = await createServerHelper()
  // fetch single approved story (or any story if admin)
  const { data } = await supabase.from('stories').select('*').eq('id', id).limit(1).single()
  const story = data

  if (!story) {
    return (
      <div className="min-h-screen flex flex-col bg-background">
        <Header />
        <main className="flex-1 container mx-auto px-4 py-12">Story not found or not approved yet.</main>
        <Footer />
      </div>
    )
  }

  return (
    <div className="min-h-screen flex flex-col bg-background">
      {/* Header is a client component and can be used inside server component */}
      <Header />
      <main className="flex-1 container mx-auto px-4 py-12">
        <article className="prose dark:prose-invert max-w-3xl mx-auto">
          <h1>{story.title || 'Untitled'}</h1>
          <p className="text-sm text-muted-foreground">By {story.author_name || 'Anonymous'} • {story.created_at ? new Date(story.created_at).toLocaleDateString() : ''}</p>

          {story.file_url && (
            <div className="my-4">
              {isImageUrl(story.file_url) ? (
                // render inline image for image attachments
                // use a responsive / full-width image with rounded corners
                <img src={story.file_url} alt={story.title || 'Attachment'} className="max-w-full h-auto rounded-md shadow-md" />
              ) : isPdfUrl(story.file_url) ? (
                // render a PDF preview iframe for convenience (fallback to link if blocked)
                <div className="w-full rounded-md overflow-hidden border">
                  <iframe src={story.file_url} title="Attachment preview" className="w-full h-96" />
                </div>
              ) : (
                // non-image/document: show a download/open link
                <a href={story.file_url} target="_blank" rel="noopener noreferrer" className="text-primary">Open attachment</a>
              )}
            </div>
          )}

          <div dangerouslySetInnerHTML={{ __html: story.content || '' }} />

          {/* Client-only reactions */}
          <StoryReactions storyId={story.id} />
        </article>
      </main>
      <Footer />
    </div>
  )
}
