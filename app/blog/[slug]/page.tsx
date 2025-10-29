import React from 'react'
import { createClient as createServerHelper } from '@/lib/supabase/server'
import BlogCommentsClient from '@/components/blog-comments-client'
import BlogReactionClient from '@/components/blog-reaction-client'
import BlogShareClient from '@/components/blog-share-client'
import { Header } from '@/components/header'
import { Footer } from '@/components/footer'

type Params = { params: Promise<{ slug: string }> }

export const revalidate = 10

export default async function BlogPost({ params }: Params) {
  // `params` can be a Promise in the App Router — unwrap it before using.
  const { slug } = await params
  const supabase = await createServerHelper()
  const { data } = await supabase.from('blogs').select('*').eq('slug', slug).limit(1).single()
  const blog = data

  if (!blog) return (
    <>
      <Header />
      <main className="container mx-auto py-8">Post not found</main>
      <Footer />
    </>
  )

  return (
    <>
      <Header />
      <main className="container mx-auto py-8">
        <article>
          <h1 className="text-3xl font-bold mb-4">{blog.title}</h1>
          <div className="text-sm text-gray-900 dark:text-gray-400 mb-6">{blog.published_at ? new Date(blog.published_at).toLocaleString() : ''}</div>
          <div className="prose" dangerouslySetInnerHTML={{ __html: blog.content }} />
          <BlogReactionClient blogId={blog.id} />
          {/* share UI collects optional name and caches it in localStorage */}
          <React.Suspense>
            {/* client component import */}
            <BlogShareClient blogId={blog.id} />
          </React.Suspense>
          <BlogCommentsClient blogId={blog.id} />
        </article>
      </main>
      <Footer />
    </>
  )
}
