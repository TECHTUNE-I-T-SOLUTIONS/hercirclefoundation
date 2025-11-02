"use client"

import React, { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { CheckCircle, AlertCircle } from 'lucide-react'

export default function ResetPasswordPage() {
  const [loading, setLoading] = useState(true)
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const router = useRouter()

  useEffect(() => {
    async function init() {
      try {
        const supabase = createClient()
        // try to parse session from url if supabase provides helper
        if ((supabase.auth as any).getSessionFromUrl) {
          try {
            await (supabase.auth as any).getSessionFromUrl({ storeSession: true })
          } catch (e) {
            // ignore; proceed
          }
        } else {
          // parse tokens manually (access_token in URL)
          const params = new URLSearchParams(window.location.search)
          const accessToken = params.get('access_token')
          const refreshToken = params.get('refresh_token')
          if (accessToken) {
            try {
              await supabase.auth.setSession({ access_token: accessToken, refresh_token: refreshToken ?? '' })
            } catch (e) {
              // ignore
            }
          }
        }
      } catch (err) {
        console.warn('reset init error', err)
      } finally {
        setLoading(false)
      }
    }

    init()
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    if (password.length < 8) {
      setError('Password must be at least 8 characters')
      return
    }
    if (password !== confirm) {
      setError('Passwords do not match')
      return
    }

    setLoading(true)
    try {
      const supabase = createClient()
      // updateUser replaces password when logged in
      const { error: updateError } = await supabase.auth.updateUser({ password })
      if (updateError) {
        setError(updateError.message || 'Failed to update password')
        setLoading(false)
        return
      }

      setSuccess(true)
      setTimeout(() => router.push('/admin/auth/login'), 2000)
    } catch (err: any) {
      setError(err?.message || 'Failed to update password')
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div>Loading...</div>
      </div>
    )
  }

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/10 to-transparent p-4">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6 text-center">
            <CheckCircle className="h-12 w-12 text-green-600 mx-auto mb-4" />
            <h2 className="text-2xl font-bold mb-2">Password updated</h2>
            <p className="text-muted-foreground mb-4">Your password has been updated. Redirecting to login...</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/10 to-transparent p-4">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <img src="/logo.png" alt="HerCircle" className="h-16 w-16 mx-auto mb-4" />
          <h1 className="text-3xl font-bold">Set a New Password</h1>
          <p className="text-muted-foreground mt-2">Enter a new secure password for your account.</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Reset Password</CardTitle>
            <CardDescription>Choose a new password to finish resetting your account.</CardDescription>
          </CardHeader>
          <CardContent>
            {error && (
              <div className="mb-6 p-4 bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800 rounded-lg flex items-start gap-3">
                <AlertCircle className="h-5 w-5 text-red-600 dark:text-red-400 mt-0.5 flex-shrink-0" />
                <p className="text-sm text-red-900 dark:text-red-100">{error}</p>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label htmlFor="password">New password</Label>
                <Input id="password" type="password" placeholder="••••••••" value={password} onChange={(e) => setPassword(e.target.value)} required className="mt-2" />
              </div>

              <div>
                <Label htmlFor="confirm">Confirm password</Label>
                <Input id="confirm" type="password" placeholder="••••••••" value={confirm} onChange={(e) => setConfirm(e.target.value)} required className="mt-2" />
              </div>

              <Button type="submit" size="lg" className="w-full bg-primary hover:bg-primary/90" disabled={loading}>
                {loading ? 'Saving...' : 'Set new password'}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
