import React from 'react'
import type { Metadata } from 'next'
import { createClient as createServerHelper } from '@/lib/supabase/server'
import BlogCommentsClient from '@/components/blog-comments-client'
import BlogReactionClient from '@/components/blog-reaction-client'
import BlogShareClient from '@/components/blog-share-client'

type Params = { params: Promise<{ slug: string }> }

export const revalidate = 10

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { slug } = await params
  const supabase = await createServerHelper()
  const { data: blog } = await supabase.from('blogs').select('title, content').eq('slug', slug).limit(1).single()
  if (!blog) {
    return {
      title: "Post Not Found | HerCircle Foundation",
    }
  }
  const cleanDescription = blog.content
    ? blog.content.replace(/<[^>]*>/g, '').substring(0, 160) + '...'
    : 'Read the latest blog post on HerCircle Foundation.'
  return {
    title: `${blog.title} | HerCircle Foundation`,
    description: cleanDescription,
  }
}

export default async function BlogPost({ params }: Params) {
  // `params` can be a Promise in the App Router — unwrap it before using.
  const { slug } = await params
  const supabase = await createServerHelper()
  const { data } = await supabase.from('blogs').select('*').eq('slug', slug).limit(1).single()
  const blog = data

  if (!blog) return (
    <main className="container mx-auto py-8">Post not found</main>
  )

  return (
    <main className="container mx-auto py-6 sm:py-8 max-w-4xl px-4 sm:px-6">
      <article className="relative">
        {/* Cover Image with Blur Effect */}
        {blog.cover_image && (
          <div className="relative mb-6 sm:mb-8 -mx-4 sm:-mx-6 lg:-mx-12">
            <div className="relative h-48 sm:h-64 md:h-80 lg:h-[650px] overflow-hidden">
              <img 
                src={blog.cover_image} 
                alt={blog.title} 
                className="w-full h-full object-cover"
              />
              {/* Gradient overlay for better text readability */}
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent" />
              {/* Bottom blur effect */}
              <div className="absolute bottom-0 left-0 right-0 h-24 sm:h-32 bg-gradient-to-t from-background to-transparent" />
            </div>
          </div>
        )}
        
        {/* Content container with negative margin to overlap image */}
        <div className={blog.cover_image ? "-mt-12 sm:-mt-16 relative z-10" : ""}>
          <div className="bg-background/95 dark:bg-black/95 backdrop-blur-sm rounded-lg p-4 sm:p-6 md:p-8 shadow-lg">
            {blog.featured && (
              <div className="inline-flex items-center gap-1 px-3 py-1 bg-primary text-primary-foreground rounded-full text-xs sm:text-sm mb-3 sm:mb-4">
                ⭐ Featured Post
              </div>
            )}
            
            <h1 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold mb-3 sm:mb-4 text-foreground dark:text-white">
              {blog.title}
            </h1>
            
            <div className="flex flex-wrap items-center gap-2 sm:gap-4 text-xs sm:text-sm text-muted-foreground mb-4 sm:mb-6">
              {blog.published_at && (
                <div className="flex items-center gap-1 sm:gap-2">
                  <span className="text-sm sm:text-base">📅</span>
                  <span>{new Date(blog.published_at).toLocaleDateString()}</span>
                </div>
              )}
              {blog.author_name && (
                <div className="flex items-center gap-1 sm:gap-2">
                  <span className="text-sm sm:text-base">👤</span>
                  <span>By {blog.author_name}</span>
                </div>
              )}
              {blog.reading_time && (
                <div className="flex items-center gap-1 sm:gap-2">
                  <span className="text-sm sm:text-base">⏱️</span>
                  <span>{blog.reading_time} min read</span>
                </div>
              )}
            </div>

            {blog.tags && blog.tags.length > 0 && (
              <div className="flex flex-wrap gap-1 sm:gap-2 mb-4 sm:mb-6">
                {blog.tags.map((tag: string) => (
                  <span key={tag} className="px-2 sm:px-3 py-1 bg-muted dark:bg-gray-800 text-muted-foreground dark:text-gray-300 rounded-full text-xs sm:text-sm">
                    #{tag}
                  </span>
                ))}
              </div>
            )}

            <div 
              className="prose prose-sm sm:prose-base lg:prose-lg dark:prose-invert max-w-none
              prose-headings:text-foreground dark:prose-headings:text-white
              prose-p:text-foreground dark:prose-p:text-white
              prose-a:text-primary dark:prose-a:text-primary
              prose-strong:text-foreground dark:prose-strong:text-white
              prose-code:text-foreground dark:prose-code:text-white
              prose-pre:text-foreground dark:prose-pre:text-white
              prose-blockquote:text-foreground dark:prose-blockquote:text-white
              prose-hr:border-border dark:prose-hr:border-gray-700"
              dangerouslySetInnerHTML={{ __html: blog.content }} 
            />
            <BlogReactionClient blogId={blog.id} />
            {/* share UI collects optional name and caches it in localStorage */}
            <React.Suspense>
              {/* client component import */}
              <BlogShareClient blogId={blog.id} />
            </React.Suspense>
            <BlogCommentsClient blogId={blog.id} />
          </div>
        </div>
      </article>
    </main>
  )
}
