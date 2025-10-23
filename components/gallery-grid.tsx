"use client"

import { useState } from "react"
import { Play } from "lucide-react"
import { GalleryLightbox } from "./gallery-lightbox"

// Helpers: convert Drive share/view links to direct usercontent/download endpoints,
// decide when to proxy, and build proxied URLs. Keep logic simple and defensive.
function isDriveUrl(u?: string) {
  if (!u) return false
  try {
    const p = new URL(u)
    return /drive\.google\.com$/.test(p.hostname) || /drive\.google\.com/.test(u) || /docs\.google\.com/.test(p.hostname)
  } catch (e) {
    return /drive\.google\.com/.test(u) || /docs\.google\.com/.test(u)
  }
}

function driveToDirect(u: string) {
  // support common Drive share URLs and /file/d/:id/view? patterns
  try {
    const p = new URL(u)
    // patterns: /file/d/:id/(view|preview) or open?id=ID
    const fileIdMatch = u.match(/\/file\/d\/([a-zA-Z0-9_-]+)/) || u.match(/[?&]id=([a-zA-Z0-9_-]+)/)
    const id = fileIdMatch ? fileIdMatch[1] : null
    if (id) return `https://drive.google.com/uc?export=download&id=${id}`
    // fallback: convert /view to /preview which may embed
    if (p.pathname.endsWith('/view')) {
      p.pathname = p.pathname.replace(/\/view$/, '/preview')
      return p.toString()
    }
    return u
  } catch (e) {
    return u
  }
}

function proxiedFor(u?: string) {
  if (!u) return undefined
  try {
    const p = new URL(u)
    // same-origin -> return original
    if (p.hostname === window.location.hostname) return u
    // Drive: convert to direct download URL first then proxy
    if (isDriveUrl(u)) {
      const direct = driveToDirect(u)
      return `/api/media/proxy?url=${encodeURIComponent(direct)}`
    }
    // otherwise proxy cross-origin media
    return `/api/media/proxy?url=${encodeURIComponent(u)}`
  } catch (e) {
    return u
  }
}

interface GalleryItem {
  id: string
  title: string
  mediaUrl: string
  mediaUrls?: string[]
  mediaType: string
  description?: string
}

interface GalleryGridProps {
  items: GalleryItem[]
}

export function GalleryGrid({ items }: GalleryGridProps) {
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null)

  return (
    <>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {items.map((item, index) => (
          <div
            key={item.id}
            onClick={() => setSelectedIndex(index)}
            className="group relative overflow-hidden rounded-lg cursor-pointer bg-secondary aspect-square"
          >
            {/* If the media is a Google Drive link, don't try to render it as an img (it may be blocked). Show a safe placeholder instead. */}
            <div className="w-full h-full">
              {/* If it's a Drive link we proxy a Drive direct URL; proxiedFor() handles conversion. */}
              {item.mediaType.startsWith("video") ? (
                // show a muted preview that plays on hover to respect autoplay policies
                <video
                  src={proxiedFor(item.mediaUrl)}
                  className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
                  muted
                  playsInline
                  preload="metadata"
                  onMouseEnter={(e) => {
                    try { const v = e.currentTarget as HTMLVideoElement; v.play().catch(()=>{}); } catch (e) {}
                  }}
                  onMouseLeave={(e) => {
                    try { const v = e.currentTarget as HTMLVideoElement; v.pause(); v.currentTime = 0; } catch (e) {}
                  }}
                />
              ) : (
                <img
                  src={proxiedFor(item.mediaUrl) || "/placeholder.svg"}
                  alt={item.title}
                  loading="lazy"
                  className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
                />
              )}

              {/* small thumbnail strip if multiple mediaUrls present */}
              {item.mediaUrls && item.mediaUrls.length > 1 && (
                <div className="absolute bottom-2 left-2 right-2 flex gap-2">
                  {item.mediaUrls.slice(0, 3).map((u, idx) => (
                    <img key={idx} src={proxiedFor(u) || '/placeholder.svg'} alt={`${item.title} thumbnail ${idx + 1}`} className="h-12 w-1/3 object-cover rounded" />
                  ))}
                </div>
              )}
            </div>
            {item.mediaType.startsWith("video") && (
              <div className="absolute inset-0 flex items-center justify-center bg-black/40 group-hover:bg-black/60 transition-colors">
                <Play className="h-12 w-12 text-white fill-white" />
              </div>
            )}
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex flex-col justify-end p-4">
              <h3 className="text-white font-bold">{item.title}</h3>
              {item.description && <p className="text-white/80 text-sm line-clamp-2">{item.description}</p>}
            </div>
          </div>
        ))}
      </div>

      {selectedIndex !== null && (
        <GalleryLightbox
          items={items}
          initialIndex={selectedIndex}
          onClose={() => setSelectedIndex(null)}
        />
      )}
    </>
  )
}
