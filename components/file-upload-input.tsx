"use client"

import type React from "react"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Upload, X, CheckCircle } from "lucide-react"
import { createClient } from "@/lib/supabase/client"

interface FileUploadInputProps {
  label: string
  onFileUrlChange: (url: string) => void
  bucket: string
  accept?: string
  maxSize?: number
  multiple?: boolean
}

export function FileUploadInput({
  label,
  onFileUrlChange,
  bucket,
  accept = "image/*",
  maxSize = 5 * 1024 * 1024, // 5MB
  multiple = false,
}: FileUploadInputProps) {
  const [uploading, setUploading] = useState(false)
  const [uploadedFile, setUploadedFile] = useState<{ name: string; url: string } | null>(null)
  const [uploadedFiles, setUploadedFiles] = useState<Array<{ name: string; url: string }>>([])
  const [error, setError] = useState<string | null>(null)
  const [externalUrl, setExternalUrl] = useState("")

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (!files || files.length === 0) return

    // If multiple files were selected, upload them sequentially
    const filesArray = Array.from(files)
    for (let i = 0; i < filesArray.length; i++) {
      const file = filesArray[i]

      // continue with the same upload logic per file

      setError(null)

      // Validate file size
      if (file.size > maxSize) {
        setError(`File size must be less than ${maxSize / 1024 / 1024}MB`)
        continue
      }

      setUploading(true)

      // Prepare filename before attempting uploads so it's available to fallback logic
      let fileName = `${Date.now()}-${file.name}`
      try {
        const supabase = createClient()

        // If the user is an admin, prefer server-side upload which uses the
        // service role key and won't be blocked by storage RLS.
        const sessionRes = await supabase.auth.getSession()
        const userId = sessionRes?.data?.session?.user?.id
        if (userId) {
          try {
            const adminCheck = await supabase.from('admin_users').select('id').eq('id', userId).limit(1).maybeSingle()
            if (adminCheck && (adminCheck as any).data) {
              // upload via server endpoint
              const form = new FormData()
              form.append('file', file)
              form.append('bucket', bucket)
              form.append('filename', fileName)

              const token = sessionRes?.data?.session?.access_token
              const res = await fetch('/api/admin/upload', {
                method: 'POST',
                headers: token ? { Authorization: `Bearer ${token}` } : {},
                body: form,
              })

              const body = await res.json()
              if (!res.ok) throw new Error(JSON.stringify(body))
              const newItem = { name: file.name, url: body.publicUrl }
              if (multiple) {
                setUploadedFiles((s) => [...s, newItem])
              } else {
                setUploadedFile(newItem)
              }
              onFileUrlChange(body.publicUrl)
              setUploading(false)
              continue
            }
          } catch (e) {
            // ignore admin-check errors and continue to client upload attempt
            console.warn('Admin check failed, falling back to client upload', e)
          }
        }

        const filePath = `${fileName}`

        // First attempt: upload to the requested bucket name.
        let uploadError = null
        let uploadData = null
        try {
          const res = await supabase.storage.from(bucket).upload(filePath, file, {
            cacheControl: "3600",
            upsert: false,
          })
          uploadError = res.error
          uploadData = res.data
        } catch (e) {
          uploadError = e
        }

        // If bucket is missing, fall back to the legacy single `media` bucket
        let usedBucket = bucket
        let usedFilePath = filePath

        if (uploadError && /Bucket not found/i.test(String(uploadError))) {
          usedBucket = 'media'
          usedFilePath = `${bucket}/${fileName}`
          const res2 = await supabase.storage.from(usedBucket).upload(usedFilePath, file, {
            cacheControl: "3600",
            upsert: false,
          })
          uploadError = res2.error
          uploadData = res2.data
        }

        if (uploadError) throw uploadError

        const { data: publicUrlData } = supabase.storage.from(usedBucket).getPublicUrl(usedFilePath)

        const publicUrl = publicUrlData.publicUrl
        const newItem = { name: file.name, url: publicUrl }
        if (multiple) {
          setUploadedFiles((s) => [...s, newItem])
        } else {
          setUploadedFile(newItem)
        }
        onFileUrlChange(publicUrl)
      } catch (err) {
        // If we received a RLS/403 error, try server-side upload endpoint as a fallback
        const errStr = err instanceof Error ? err.message : String(err)
        if (/row-level security|violates row-level security|403|forbidden/i.test(errStr)) {
          try {
            const form = new FormData()
            form.append('file', file)
            form.append('bucket', bucket)
            form.append('filename', fileName)

            const supabase = createClient()
            const session = await supabase.auth.getSession()
            const token = session?.data?.session?.access_token

            const res = await fetch('/api/admin/upload', {
              method: 'POST',
              headers: token ? { Authorization: `Bearer ${token}` } : {},
              body: form,
            })

            const body = await res.json()
            if (!res.ok) throw new Error(JSON.stringify(body))
            const newItem = { name: file.name, url: body.publicUrl }
            if (multiple) {
              setUploadedFiles((s) => [...s, newItem])
            } else {
              setUploadedFile(newItem)
            }
            onFileUrlChange(body.publicUrl)
            setError(null)
            continue
          } catch (e2) {
            setError(String(e2))
            continue
          }
        }

        setError(err instanceof Error ? err.message : "Upload failed")
      } finally {
        setUploading(false)
      }
    }

    // end for loop
    }

  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      <div className="space-y-3">
        {uploadedFile ? (
          <div className="p-3 bg-green-50 dark:bg-green-950 border border-green-200 dark:border-green-800 rounded-lg flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-green-600 dark:text-green-400" />
              <span className="text-sm font-medium text-green-900 dark:text-green-100">{uploadedFile.name}</span>
            </div>
            <button
              type="button"
              aria-label="Remove uploaded file"
              onClick={() => {
                setUploadedFile(null)
                onFileUrlChange("")
              }}
              className="text-green-600 dark:text-green-400 hover:text-green-700 dark:hover:text-green-300"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        ) : (
          <div className="relative">
            <Input
              type="file"
              accept={accept}
              onChange={handleFileChange}
              disabled={uploading}
              className="hidden"
              id={`file-upload-${label}`}
              multiple={multiple}
            />
            <label htmlFor={`file-upload-${label}`}>
              <Button
                type="button"
                variant="outline"
                className="w-full cursor-pointer bg-transparent"
                disabled={uploading}
                asChild
              >
                <span>
                  <Upload className="h-4 w-4 mr-2" />
                  {uploading ? "Uploading..." : "Choose File"}
                </span>
              </Button>
            </label>
          </div>
        )}

        <div className="pt-2">
          <Label>Or provide an external URL (Google Drive link or other public URL)</Label>
          <div className="flex gap-2 mt-2">
            <Input
              placeholder="https://..."
              value={externalUrl}
              onChange={(e) => setExternalUrl(e.target.value)}
            />
            <Button
              type="button"
              onClick={() => {
                setError(null)
                if (!externalUrl) return setError("Please provide a valid URL")
                const newItem = { name: externalUrl.split('/').pop() || externalUrl, url: externalUrl }
                if (multiple) {
                  setUploadedFiles((s) => [...s, newItem])
                } else {
                  setUploadedFile(newItem)
                }
                onFileUrlChange(externalUrl)
                setExternalUrl("")
              }}
            >
              Use URL
            </Button>
          </div>
        </div>

        {multiple && uploadedFiles.length > 0 && (
          <div className="space-y-2">
            {uploadedFiles.map((f, i) => (
              <div key={i} className="p-2 bg-green-50 dark:bg-green-950 border border-green-200 dark:border-green-800 rounded-lg flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <CheckCircle className="h-5 w-5 text-green-600 dark:text-green-400" />
                  <span className="text-sm font-medium text-green-900 dark:text-green-100">{f.name}</span>
                </div>
                <button
                  type="button"
                  aria-label={`Remove uploaded file ${i + 1}`}
                  onClick={() => {
                    setUploadedFiles((s) => s.filter((_, idx) => idx !== i))
                    // if needed, caller can manage removal from their list
                  }}
                  className="text-green-600 dark:text-green-400 hover:text-green-700 dark:hover:text-green-300"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>
        )}

        {error && <p className="text-sm text-destructive">{error}</p>}
      </div>
    </div>
  )
}
