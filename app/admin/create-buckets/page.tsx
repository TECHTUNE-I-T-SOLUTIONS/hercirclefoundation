"use client"

import React, { useState } from "react"
import { Button } from "@/components/ui/button"
import { createClient } from "@/lib/supabase/client"

export default function CreateBucketsPage() {
  const [loading, setLoading] = useState(false)
  const [results, setResults] = useState<any[]>([])
  const [error, setError] = useState<string | null>(null)
  const [uploadResult, setUploadResult] = useState<string | null>(null)

  const createBuckets = async () => {
    setLoading(true)
    setError(null)
    setResults([])
    setUploadResult(null)

    try {
      const res = await fetch("/api/admin/create-buckets", { method: "POST" })
      const body = await res.json()
      if (!res.ok) {
        setError(JSON.stringify(body))
      } else {
        setResults(body.results || [])
      }
    } catch (e) {
      setError(String(e))
    } finally {
      setLoading(false)
    }
  }

  const testUpload = async () => {
    setUploadResult(null)
    try {
      const supabase = createClient()
      const blob = new Blob(["test"], { type: "text/plain" })
      const fileName = `test-${Date.now()}.txt`
      // try uploading to `events` bucket first
      const { data, error } = await supabase.storage.from("events").upload(fileName, blob)
      if (error) {
        // If bucket missing, try fallback into media/events/<file>
        if (/Bucket not found/i.test(String(error))) {
          const fallbackPath = `events/${fileName}`
          const res2 = await supabase.storage.from("media").upload(fallbackPath, blob)
          if (res2.error) throw res2.error
          const { data: pu } = supabase.storage.from("media").getPublicUrl(fallbackPath)
          setUploadResult(`Fallback upload succeeded: ${pu.publicUrl}`)
          return
        }
        throw error
      }

      const { data: pub } = supabase.storage.from("events").getPublicUrl(fileName)
      setUploadResult(`Upload succeeded: ${pub.publicUrl}`)
    } catch (e) {
      setUploadResult(`Upload failed: ${String(e)}`)
    }
  }

  return (
    <>
      <div className="p-8">
        <h1 className="text-2xl font-bold mb-4">Create Storage Buckets</h1>

        <p className="mb-4">This endpoint will create public buckets the app uses: <code>media</code>, <code>events</code>, and <code>gallery</code>.</p>

        <div className="flex gap-3 mb-4">
          <Button onClick={createBuckets} disabled={loading} className="bg-primary">
            {loading ? "Creating..." : "Create buckets"}
          </Button>
          <Button onClick={testUpload} variant="outline">
            Test tiny upload (events)
          </Button>
        </div>

        {error && <pre className="bg-red-50 text-red-800 p-3 rounded mb-4">{error}</pre>}

        {results.length > 0 && (
          <div className="mb-4">
            <h3 className="font-semibold mb-2">Results</h3>
            <ul className="list-disc ml-6">
              {results.map((r, i) => (
                <li key={i}>
                  <strong>{r.name}:</strong> {r.status} {r.ok ? "(ok)" : "(error)"} — {JSON.stringify(r.body)}
                </li>
              ))}
            </ul>
          </div>
        )}

        {uploadResult && (
          <div className="p-3 bg-green-50 rounded">{uploadResult}</div>
        )}
      </div>
    </>
  )
}
