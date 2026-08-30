"use client"

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useToast } from '@/hooks/use-toast'
import BlogEditor from '@/components/admin-blog-editor'

export default function EditBlogPage({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter()
  const { toast } = useToast()
  const [adminId, setAdminId] = useState<string | null>(null)
  const [blogData, setBlogData] = useState<any>(null)
  const [blogId, setBlogId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const init = async () => {
      const resolvedParams = await params
      setBlogId(resolvedParams.id)
      fetchData(resolvedParams.id)
    }
    init()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const fetchData = async (id: string) => {
    try {
      const { createClient } = await import('@/lib/supabase/client')
      const supabase = createClient()
      const { data: { session } } = await supabase.auth.getSession()
      
      if (!session) {
        router.push('/admin/auth/login')
        return
      }

      // Check if user is admin
      const { data: admins } = await supabase
        .from('admin_users')
        .select('id')
        .eq('id', session.user.id)
        .limit(1)

      if (!admins || admins.length === 0) {
        toast({
          variant: 'destructive',
          title: 'Access Denied',
          description: 'You do not have admin privileges.',
        })
        router.push('/')
        return
      }

      setAdminId(session.user.id)

      // Fetch blog data
      const { data: blog } = await supabase
        .from('blogs')
        .select('*')
        .eq('id', id)
        .single()

      if (!blog) {
        toast({
          variant: 'destructive',
          title: 'Not Found',
          description: 'Blog post not found.',
        })
        router.push('/admin/blogs')
        return
      }

      setBlogData(blog)
    } catch (error) {
      console.error('Error fetching data:', error)
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to load data.',
      })
      router.push('/admin/blogs')
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="container py-8">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-muted-foreground">Loading...</p>
          </div>
        </div>
      </div>
    )
  }

  if (!adminId || !blogData || !blogId) {
    return null
  }

  return (
    <div className="container py-8">
      <BlogEditor blogId={blogId} initialData={blogData} />
    </div>
  )
}
