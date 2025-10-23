"use client"

import React, { useEffect, useRef, useState } from "react"
import { ChevronLeft, ChevronRight, X } from "lucide-react"

interface GalleryItem {
  id: string
  title?: string
  media_url?: string
  media_urls?: string[]
  mediaType?: string
  description?: string
}

interface GalleryLightboxProps {
  items: GalleryItem[]
  initialIndex?: number
  onClose?: () => void
}

export function GalleryLightbox({ items, initialIndex = 0, onClose }: GalleryLightboxProps) {
  const [currentIndex, setCurrentIndex] = useState<number>(initialIndex)
  const [mediaIndex, setMediaIndex] = useState<number>(0)
  const [autoAdvance, setAutoAdvance] = useState<boolean>(false)
  const autoRef = useRef<number | null>(null)

  const current = items?.[currentIndex]
  // accept both snake_case (DB) and camelCase (frontend) field names
  const mediaList = (current?.media_urls && current.media_urls.length > 0)
    ? current.media_urls
    : (current as any)?.mediaUrls && (current as any).mediaUrls.length > 0
    ? (current as any).mediaUrls
    : current?.media_url
    ? [current.media_url]
    : (current as any)?.mediaUrl
    ? [(current as any).mediaUrl]
    : []

  const toProxied = (rawUrl?: string): string | undefined => {
    if (!rawUrl) return undefined
    try {
      const u = new URL(rawUrl)

      if (u.hostname === "drive.google.com") {
        const match = rawUrl.match(/\/file\/d\/([^/\?]+)/)
        const id = match?.[1] ?? u.searchParams.get("id")
        if (id) {
          const target = `https://drive.usercontent.google.com/u/0/uc?id=${encodeURIComponent(id)}&export=download`
          return `/api/media/proxy?url=${encodeURIComponent(target)}`
        }
        return `/api/media/proxy?url=${encodeURIComponent(rawUrl)}`
      }

      const whitelist = ["drive.usercontent.google.com", "docs.google.com", "youtube.googleapis.com"]
      if (whitelist.includes(u.hostname)) {
        return `/api/media/proxy?url=${encodeURIComponent(rawUrl)}`
      }

      if (u.origin === window.location.origin) return rawUrl
      return `/api/media/proxy?url=${encodeURIComponent(rawUrl)}`
    } catch (e) {
      return rawUrl
    }
  }

  useEffect(() => {
    setMediaIndex(0)
  }, [currentIndex])

  useEffect(() => {
    if (!autoAdvance) {
      if (autoRef.current) {
        clearInterval(autoRef.current)
        autoRef.current = null
      }
      return
    }

    autoRef.current = window.setInterval(() => {
      setMediaIndex((mi) => {
        const next = mi + 1
        if (next >= mediaList.length) {
          setCurrentIndex((ci) => (ci === items.length - 1 ? 0 : ci + 1))
          return 0
        }
        return next
      })
    }, 5000)

    return () => {
      if (autoRef.current) {
        clearInterval(autoRef.current)
        autoRef.current = null
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoAdvance, currentIndex])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowLeft") {
        setCurrentIndex((prev) => (prev === 0 ? items.length - 1 : prev - 1))
        setMediaIndex(0)
      } else if (e.key === "ArrowRight") {
        setCurrentIndex((prev) => (prev === items.length - 1 ? 0 : prev + 1))
        setMediaIndex(0)
      } else if (e.key === "Escape") {
        onClose?.()
      }
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [items.length, onClose])

  if (!current) return null

  const mUrl = mediaList?.[mediaIndex]
  const proxied = toProxied(mUrl)
  const isImage = !!mUrl && /\.(jpg|jpeg|png|gif|webp)$/i.test(mUrl)
  const isVideo = !!mUrl && (/\.(mp4|webm|ogg)$/i.test(mUrl) || (current.mediaType && current.mediaType.startsWith("video")))
  const isDrive = !!mUrl && /drive\.google\.com/.test(mUrl)
  const isAudio = !!mUrl && /\.(mp3|wav|ogg)$/i.test(mUrl)

  const handlePrevious = () => {
    setCurrentIndex((prev) => (prev === 0 ? items.length - 1 : prev - 1))
    setMediaIndex(0)
  }

  const handleNext = () => {
    setCurrentIndex((prev) => (prev === items.length - 1 ? 0 : prev + 1))
    setMediaIndex(0)
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="relative w-full max-w-4xl">
        <button
          onClick={() => onClose?.()}
          className="absolute -top-10 right-0 text-white hover:text-primary transition-colors"
          aria-label="Close"
        >
          <X className="h-6 w-6" />
        </button>

        <div className="relative bg-black rounded-lg overflow-hidden">
          <div className="absolute top-2 right-2 z-10 flex items-center gap-2">
            <button onClick={() => setAutoAdvance((s) => !s)} className="px-2 py-1 bg-black/40 rounded text-white text-sm">
              {autoAdvance ? "Pause" : "Play"}
            </button>
          </div>

          <div className="p-2 flex items-center justify-center">
            {isImage && (
              <img src={proxied ?? mUrl ?? "/placeholder.svg"} alt={current.title ?? ""} className="w-full h-auto max-h-[70vh] object-contain" />
            )}

            {isDrive && (
              // Google Drive preview iframe (works well for embedded Drive-hosted videos)
              <iframe
                title={current.title ?? 'External media'}
                src={(mUrl || '').replace(/\/view\?.*$/, '/preview')}
                className="w-full h-[70vh]"
                allowFullScreen
              />
            )}

            {!isDrive && isVideo && (
              <video src={proxied ?? mUrl ?? ""} controls className="w-full h-auto max-h-[70vh] object-contain" />
            )}

            {isAudio && (
              <audio src={proxied ?? mUrl ?? ""} controls className="w-full" />
            )}

            {!isImage && !isVideo && !isAudio && (
              <div className="w-full h-[70vh] flex items-center justify-center bg-black/60 text-white">
                <div className="text-center">
                  <p className="mb-2">Cannot preview this media type inline.</p>
                  {mUrl && (
                    <a href={mUrl} target="_blank" rel="noreferrer" className="underline">Open in new tab</a>
                  )}
                </div>
              </div>
            )}
          </div>

          {mediaList.length > 1 && (
            <div className="absolute bottom-2 left-2 right-2 flex items-center justify-between gap-4 px-4">
              <div className="flex items-center gap-2">
                <button onClick={() => setMediaIndex((i) => i === 0 ? mediaList.length - 1 : i - 1)} className="px-2 py-1 bg-black/40 rounded text-white">Prev</button>
                <span className="text-white text-sm">{mediaIndex + 1} / {mediaList.length}</span>
                <button onClick={() => setMediaIndex((i) => (i + 1) % mediaList.length)} className="px-2 py-1 bg-black/40 rounded text-white">Next</button>
              </div>
              <div className="text-white text-sm">{current.title}</div>
            </div>
          )}
        </div>

        {items.length > 1 && (
          <>
            <button
              onClick={handlePrevious}
              className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-16 text-white hover:text-primary transition-colors"
              aria-label="Previous"
            >
              <ChevronLeft className="h-8 w-8" />
            </button>
            <button
              onClick={handleNext}
              className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-16 text-white hover:text-primary transition-colors"
              aria-label="Next"
            >
              <ChevronRight className="h-8 w-8" />
            </button>
          </>
        )}

        <div className="mt-4 text-white">
          <h3 className="text-lg font-bold">{current.title}</h3>
          {current.description && <p className="text-sm text-gray-300 mt-2">{current.description}</p>}
          <p className="text-xs text-gray-400 mt-2">{currentIndex + 1} / {items.length}</p>
        </div>
      </div>
    </div>
  )
}

export default GalleryLightbox
// "use client"

// import React, { useEffect, useState, useRef } from "react"
// import { ChevronLeft, ChevronRight, X } from "lucide-react"

// interface GalleryItem {
//   id: string
//   title: string
//   mediaUrl: string
//   mediaUrls?: string[]
//   mediaType?: string
//   description?: string
// }

// "use client"

// import React, { useEffect, useRef, useState } from "react"
// import { ChevronLeft, ChevronRight, X } from "lucide-react"

// interface GalleryItem {
//   id: string
//   title?: string
//   media_url?: string
//   media_urls?: string[]
//   mediaType?: string
//   description?: string
// }

// interface GalleryLightboxProps {
//   items: GalleryItem[]
//   initialIndex?: number
//   onClose?: () => void
// }

// export function GalleryLightbox({ items, initialIndex = 0, onClose }: GalleryLightboxProps) {
//   const [currentIndex, setCurrentIndex] = useState<number>(initialIndex)
//   const [mediaIndex, setMediaIndex] = useState<number>(0)
//   const [autoAdvance, setAutoAdvance] = useState<boolean>(false)
//   const autoRef = useRef<number | null>(null)

//   const current = items?.[currentIndex]
//   const mediaList = (current?.media_urls && current.media_urls.length > 0)
//     ? current.media_urls
//     : current?.media_url
//     ? [current.media_url]
//     : []

//   // Convert known share links (Drive) to a proxied URL under our app origin so the browser gets a same-origin response.
//   const toProxied = (rawUrl?: string): string | undefined => {
//     if (!rawUrl) return undefined
//     try {
//       const u = new URL(rawUrl)

//       // Google Drive share links like /file/d/:id/view or ?id=... -> use direct content endpoint
//       if (u.hostname === "drive.google.com") {
//         const match = rawUrl.match(/\/file\/d\/([^/\?]+)/)
//         const id = match?.[1] ?? u.searchParams.get("id")
//         if (id) {
//           const target = `https://drive.usercontent.google.com/u/0/uc?id=${encodeURIComponent(id)}&export=download`
//           return `/api/media/proxy?url=${encodeURIComponent(target)}`
//         }
//         return `/api/media/proxy?url=${encodeURIComponent(rawUrl)}`
//       }

//       // If it's already a usercontent host we still proxy to ensure correct CORS/content-type handling
//       const whitelist = ["drive.usercontent.google.com", "docs.google.com", "youtube.googleapis.com"]
//       if (whitelist.includes(u.hostname)) {
//         return `/api/media/proxy?url=${encodeURIComponent(rawUrl)}`
//       }

//       // If the URL is same-origin, return as-is
//       if (u.origin === window.location.origin) return rawUrl

//       // Fallback: proxy cross-origin resources so browser receives non-opaque responses
//       return `/api/media/proxy?url=${encodeURIComponent(rawUrl)}`
//     } catch (e) {
//       return rawUrl
//     }
//   }

//   // useEffect(() => {
    // "use client"

    // import React, { useEffect, useRef, useState } from "react"
    // import { ChevronLeft, ChevronRight, X } from "lucide-react"

    // interface GalleryItem {
    //   id: string
    //   title?: string
    //   media_url?: string
    //   media_urls?: string[]
    //   mediaType?: string
    //   description?: string
    // }

    // interface GalleryLightboxProps {
    //   items: GalleryItem[]
    //   initialIndex?: number
    //   onClose?: () => void
    // }

    // export function GalleryLightbox({ items, initialIndex = 0, onClose }: GalleryLightboxProps) {
    //   const [currentIndex, setCurrentIndex] = useState<number>(initialIndex)
    //   const [mediaIndex, setMediaIndex] = useState<number>(0)
    //   const [autoAdvance, setAutoAdvance] = useState<boolean>(false)
    //   const autoRef = useRef<number | null>(null)

    //   const current = items?.[currentIndex]
    //   const mediaList = (current?.media_urls && current.media_urls.length > 0)
    //     ? current.media_urls
    //     : current?.media_url
    //     ? [current.media_url]
    //     : []

    //   const toProxied = (rawUrl?: string): string | undefined => {
    //     if (!rawUrl) return undefined
    //     try {
    //       const u = new URL(rawUrl)

    //       if (u.hostname === "drive.google.com") {
    //         const match = rawUrl.match(/\/file\/d\/([^/\?]+)/)
    //         const id = match?.[1] ?? u.searchParams.get("id")
    //         if (id) {
    //           const target = `https://drive.usercontent.google.com/u/0/uc?id=${encodeURIComponent(id)}&export=download`
    //           return `/api/media/proxy?url=${encodeURIComponent(target)}`
    //         }
    //         return `/api/media/proxy?url=${encodeURIComponent(rawUrl)}`
    //       }

    //       const whitelist = ["drive.usercontent.google.com", "docs.google.com", "youtube.googleapis.com"]
    //       if (whitelist.includes(u.hostname)) {
    //         return `/api/media/proxy?url=${encodeURIComponent(rawUrl)}`
    //       }

    //       if (u.origin === window.location.origin) return rawUrl
    //       return `/api/media/proxy?url=${encodeURIComponent(rawUrl)}`
    //     } catch (e) {
    //       return rawUrl
    //     }
    //   }

    //   useEffect(() => {
    //     setMediaIndex(0)
    //   }, [currentIndex])

    //   useEffect(() => {
    //     if (!autoAdvance) {
    //       if (autoRef.current) {
    //         clearInterval(autoRef.current)
    //         autoRef.current = null
    //       }
    //       return
    //     }

    //     autoRef.current = window.setInterval(() => {
    //       setMediaIndex((mi) => {
    //         const next = mi + 1
    //         if (next >= mediaList.length) {
    //           setCurrentIndex((ci) => (ci === items.length - 1 ? 0 : ci + 1))
    //           return 0
    //         }
    //         return next
    //       })
    //     }, 5000)

    //     return () => {
    //       if (autoRef.current) {
    //         clearInterval(autoRef.current)
    //         autoRef.current = null
    //       }
    //     }
    //     // eslint-disable-next-line react-hooks/exhaustive-deps
    //   }, [autoAdvance, currentIndex])

    //   useEffect(() => {
    //     const onKey = (e: KeyboardEvent) => {
    //       if (e.key === "ArrowLeft") {
    //         setCurrentIndex((prev) => (prev === 0 ? items.length - 1 : prev - 1))
    //         setMediaIndex(0)
    //       } else if (e.key === "ArrowRight") {
    //         setCurrentIndex((prev) => (prev === items.length - 1 ? 0 : prev + 1))
    //         setMediaIndex(0)
    //       } else if (e.key === "Escape") {
    //         onClose?.()
    //       }
    //     }
    //     window.addEventListener("keydown", onKey)
    //     return () => window.removeEventListener("keydown", onKey)
    //   }, [items.length, onClose])

    //   if (!current) return null

    //   const mUrl = mediaList?.[mediaIndex]
    //   const proxied = toProxied(mUrl)
    //   const isImage = !!mUrl && /\.(jpg|jpeg|png|gif|webp)$/i.test(mUrl)
    //   const isVideo = !!mUrl && (/\.(mp4|webm|ogg)$/i.test(mUrl) || (current.mediaType && current.mediaType.startsWith("video")))
    //   const isAudio = !!mUrl && /\.(mp3|wav|ogg)$/i.test(mUrl)

    //   const handlePrevious = () => {
    //     setCurrentIndex((prev) => (prev === 0 ? items.length - 1 : prev - 1))
    //     setMediaIndex(0)
    //   }

    //   const handleNext = () => {
    //     setCurrentIndex((prev) => (prev === items.length - 1 ? 0 : prev + 1))
    //     setMediaIndex(0)
    //   }

    //   return (
    //     <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
    //       <div className="relative w-full max-w-4xl">
    //         <button
    //           onClick={() => onClose?.()}
    //           className="absolute -top-10 right-0 text-white hover:text-primary transition-colors"
    //           aria-label="Close"
    //         >
    //           <X className="h-6 w-6" />
    //         </button>

    //         <div className="relative bg-black rounded-lg overflow-hidden">
    //           <div className="absolute top-2 right-2 z-10 flex items-center gap-2">
    //             <button onClick={() => setAutoAdvance((s) => !s)} className="px-2 py-1 bg-black/40 rounded text-white text-sm">
    //               {autoAdvance ? "Pause" : "Play"}
    //             </button>
    //           </div>

    //           <div className="p-2 flex items-center justify-center">
    //             {isImage && (
    //               <img src={proxied ?? mUrl ?? "/placeholder.svg"} alt={current.title ?? ""} className="w-full h-auto max-h-[70vh] object-contain" />
    //             )}

    //             {isVideo && (
    //               <video src={proxied ?? mUrl ?? ""} controls className="w-full h-auto max-h-[70vh] object-contain" />
    //             )}

    //             {isAudio && (
    //               <audio src={proxied ?? mUrl ?? ""} controls className="w-full" />
    //             )}

    //             {!isImage && !isVideo && !isAudio && (
    //               <div className="w-full h-[70vh] flex items-center justify-center bg-black/60 text-white">
    //                 <div className="text-center">
    //                   <p className="mb-2">Cannot preview this media type inline.</p>
    //                   {mUrl && (
    //                     <a href={mUrl} target="_blank" rel="noreferrer" className="underline">Open in new tab</a>
    //                   )}
    //                 </div>
    //               </div>
    //             )}
    //           </div>

    //           {mediaList.length > 1 && (
    //             <div className="absolute bottom-2 left-2 right-2 flex items-center justify-between gap-4 px-4">
    //               <div className="flex items-center gap-2">
    //                 <button onClick={() => setMediaIndex((i) => i === 0 ? mediaList.length - 1 : i - 1)} className="px-2 py-1 bg-black/40 rounded text-white">Prev</button>
    //                 <span className="text-white text-sm">{mediaIndex + 1} / {mediaList.length}</span>
    //                 <button onClick={() => setMediaIndex((i) => (i + 1) % mediaList.length)} className="px-2 py-1 bg-black/40 rounded text-white">Next</button>
    //               </div>
    //               <div className="text-white text-sm">{current.title}</div>
    //             </div>
    //           )}
    //         </div>

    //         {items.length > 1 && (
    //           <>
    //             <button
    //               onClick={handlePrevious}
    //               className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-16 text-white hover:text-primary transition-colors"
    //               aria-label="Previous"
    //             >
    //               <ChevronLeft className="h-8 w-8" />
    //             </button>
    //             <button
    //               onClick={handleNext}
    //               className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-16 text-white hover:text-primary transition-colors"
    //               aria-label="Next"
    //             >
    //               <ChevronRight className="h-8 w-8" />
    //             </button>
    //           </>
    //         )}

    //         <div className="mt-4 text-white">
    //           <h3 className="text-lg font-bold">{current.title}</h3>
    //           {current.description && <p className="text-sm text-gray-300 mt-2">{current.description}</p>}
    //           <p className="text-xs text-gray-400 mt-2">{currentIndex + 1} / {items.length}</p>
    //         </div>
    //       </div>
    //     </div>
    //   )
    // }

    // export default GalleryLightbox


