import { createClient as createServerHelper } from '@/lib/supabase/server'
import { createClient as createServerClient } from '@supabase/supabase-js'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!

const serverClient = createServerClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

export async function createGallery(payload: any) {
  'use server'
  const authClient = await createServerHelper()
  const { data: { user }, error: userErr } = await authClient.auth.getUser()
  if (userErr || !user) throw new Error('invalid session')

  const { data: admins } = await serverClient.from('admin_users').select('id').eq('id', user.id).limit(1)
  if (!admins || admins.length === 0) throw new Error('not admin')

  // ensure legacy media_url exists when media_urls provided
  if (payload.media_urls && Array.isArray(payload.media_urls) && payload.media_urls.length > 0) payload.media_url = payload.media_urls[0]

  const { data, error } = await serverClient.from('gallery').insert([payload]).select().single()
  if (error) throw new Error(error.message)
  return data
}

export async function updateGallery(id: string, payload: any) {
  'use server'
  const authClient = await createServerHelper()
  const { data: { user }, error: userErr } = await authClient.auth.getUser()
  if (userErr || !user) throw new Error('invalid session')

  const { data: admins } = await serverClient.from('admin_users').select('id').eq('id', user.id).limit(1)
  if (!admins || admins.length === 0) throw new Error('not admin')

  if (payload.media_urls && Array.isArray(payload.media_urls) && payload.media_urls.length > 0) payload.media_url = payload.media_urls[0]

  const { data, error } = await serverClient.from('gallery').update(payload).eq('id', id).select().single()
  if (error) throw new Error(error.message)
  return data
}

export async function deleteGallery(id: string) {
  'use server'
  const authClient = await createServerHelper()
  const { data: { user }, error: userErr } = await authClient.auth.getUser()
  if (userErr || !user) throw new Error('invalid session')

  const { data: admins } = await serverClient.from('admin_users').select('id').eq('id', user.id).limit(1)
  if (!admins || admins.length === 0) throw new Error('not admin')

  const { error } = await serverClient.from('gallery').delete().eq('id', id)
  if (error) throw new Error(error.message)
  return { success: true }
}
