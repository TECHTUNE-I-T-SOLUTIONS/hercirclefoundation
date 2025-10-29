import { createClient as createServerHelper } from '@/lib/supabase/server'
import { Header } from '@/components/header'
import { Footer } from '@/components/footer'
import StoryReactions from '@/components/story-reactions'

type Props = { params: Promise<{ id: string }> }

export const revalidate = 10

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
              <a href={story.file_url} target="_blank" rel="noopener noreferrer" className="text-primary">Open attachment</a>
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
