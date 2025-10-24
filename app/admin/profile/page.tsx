import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

export default async function AdminProfilePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/admin/auth/login')

  const { data: admins } = await supabase.from('admin_users').select('*').eq('id', user.id).limit(1)
  if (!admins || admins.length === 0) redirect('/admin/auth/login')

  const admin = Array.isArray(admins) ? admins[0] : admins

  return (
    <div className="max-w-5xl mx-auto py-8 px-4">
      <div className="bg-card p-6 rounded-lg shadow-sm">
        <h2 className="text-2xl font-semibold mb-4">Profile</h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="text-sm text-black dark:text-white">Full name</label>
            <div className="mt-1 text-lg font-medium">{admin?.full_name || '—'}</div>
          </div>

          <div>
            <label className="text-sm text-black dark:text-white">Email</label>
            <div className="mt-1 text-lg font-medium">{admin?.email || '—'}</div>
          </div>

          <div>
            <label className="text-sm text-black dark:text-white">Role</label>
            <div className="mt-1 text-lg font-medium">{admin?.role || 'admin'}</div>
          </div>

          <div>
            <label className="text-sm text-black dark:text-white">Member since</label>
            <div className="mt-1 text-lg font-medium">{admin?.created_at ? new Date(admin.created_at).toLocaleString() : '—'}</div>
          </div>
        </div>

        <div className="mt-6 text-sm text-black dark:text-white">ID: <code className="text-xs">{admin?.id}</code></div>
      </div>
    </div>
  )
}
