"use client"

import { Header } from "@/components/header"
import { Footer } from "@/components/footer"
import { GalleryGrid } from "@/components/gallery-grid"
import { useEffect, useState } from "react"
import { createClient } from "@/lib/supabase/client"

interface GalleryItem {
  id: string
  title: string
  media_url: string
  media_type: string
  description: string
  category: string
}

export default function GalleryPage() {
  const [items, setItems] = useState<GalleryItem[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<string>("all")

  useEffect(() => {
    const fetchGallery = async () => {
      try {
        const supabase = createClient()
        const { data, error } = await supabase.from("gallery").select("*").order("created_at", { ascending: false })

        if (error) throw error

        if (filter === "all") {
          setItems(data || [])
        } else {
          setItems(data?.filter((item) => item.category === filter) || [])
        }
      } catch (error) {
        console.error("Error fetching gallery:", error)
      } finally {
        setLoading(false)
      }
    }

    fetchGallery()
  }, [filter])

  const categories = ["all", "workshops", "distributions", "awareness", "community"]

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Header />

      <main className="flex-1">
        {/* Hero */}
        <section className="py-16 md:py-24 bg-gradient-to-br from-primary/10 to-transparent">
          <div className="container mx-auto px-4">
            <h1 className="text-4xl md:text-5xl font-bold mb-4">Gallery</h1>
            <p className="text-lg text-muted-foreground max-w-2xl">
              Explore our impact through photos and videos from our programs, events, and community initiatives.
            </p>
          </div>
        </section>

        {/* Filter */}
        <section className="py-8 border-b border-border">
          <div className="container mx-auto px-4">
            <div className="flex flex-wrap gap-3">
              {categories.map((cat) => (
                <button
                  key={cat}
                  onClick={() => setFilter(cat)}
                  className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                    filter === cat
                      ? "bg-primary text-primary-foreground"
                      : "bg-secondary text-secondary-foreground hover:bg-secondary/80"
                  }`}
                >
                  {cat.charAt(0).toUpperCase() + cat.slice(1)}
                </button>
              ))}
            </div>
          </div>
        </section>

        {/* Gallery Grid */}
        <section className="py-16 md:py-24">
          <div className="container mx-auto px-4">
            {loading ? (
              <div className="text-center py-12">
                <p className="text-muted-foreground">Loading gallery...</p>
              </div>
            ) : items.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-muted-foreground text-lg">No gallery items found.</p>
              </div>
            ) : (
              <GalleryGrid
                  items={items.map((item) => ({
                    id: item.id,
                    title: item.title,
                    // prefer the new media_urls array if present
                    mediaUrl: (item as any).media_urls && Array.isArray((item as any).media_urls) && (item as any).media_urls.length > 0 ? (item as any).media_urls[0] : item.media_url,
                    mediaUrls: (item as any).media_urls || undefined,
                    mediaType: item.media_type,
                    description: item.description,
                  }))}
                />
            )}
          </div>
        </section>
      </main>

      <Footer />
    </div>
  )
}
