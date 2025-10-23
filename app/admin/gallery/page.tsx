import AdminGalleryClient from '@/components/admin-gallery-client'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { createGallery, updateGallery, deleteGallery } from './actions'

export default async function GalleryPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/admin/auth/login')

  const { data: admins } = await supabase.from('admin_users').select('id').eq('id', user.id).limit(1)
  if (!admins || admins.length === 0) redirect('/admin/auth/login')

  return <AdminGalleryClient createAction={createGallery} updateAction={updateGallery} deleteAction={deleteGallery} />
}
