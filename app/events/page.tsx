"use client"

import { Header } from "@/components/header"
import { Footer } from "@/components/footer"
import { EventCard } from "@/components/event-card"
import { useEffect, useState } from "react"
import { createClient } from "@/lib/supabase/client"

interface Event {
  id: string
  title: string
  description: string
  date: string
  location: string
  image_url: string
  event_type: string
}

export default function EventsPage() {
  const [events, setEvents] = useState<Event[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<"all" | "upcoming" | "past">("upcoming")

  useEffect(() => {
    const fetchEvents = async () => {
      try {
        const supabase = createClient()
        const { data, error } = await supabase.from("events").select("*").order("date", { ascending: true })

        if (error) throw error

        const now = new Date()
        const upcoming = data?.filter((e) => new Date(e.date) >= now) || []
        const past = data?.filter((e) => new Date(e.date) < now) || []

        if (filter === "upcoming") {
          setEvents(upcoming)
        } else if (filter === "past") {
          setEvents(past)
        } else {
          setEvents(data || [])
        }
      } catch (error) {
        console.error("Error fetching events:", error)
      } finally {
        setLoading(false)
      }
    }

    fetchEvents()
  }, [filter])

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Header />

      <main className="flex-1">
        {/* Hero */}
        <section className="py-16 md:py-24 bg-gradient-to-br from-primary/10 to-transparent">
          <div className="container mx-auto px-4 text-center justify-center">
            <h1 className="text-4xl md:text-5xl font-bold mb-4">Our Events</h1>
            <p className="text-lg text-muted-foreground max-w-2xl text-center">
              Join us for workshops, awareness campaigns, and community gatherings dedicated to menstrual health
              education and empowerment.
            </p>
          </div>
        </section>

        {/* Filter */}
        <section className="py-8 border-b border-border">
          <div className="container mx-auto px-4">
            <div className="flex gap-4">
              {(["all", "upcoming", "past"] as const).map((f) => (
                <button
                  key={f}
                  onClick={() => setFilter(f)}
                  className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                    filter === f
                      ? "bg-primary text-primary-foreground"
                      : "bg-secondary text-secondary-foreground hover:bg-secondary/80"
                  }`}
                >
                  {f.charAt(0).toUpperCase() + f.slice(1)}
                </button>
              ))}
            </div>
          </div>
        </section>

        {/* Events Grid */}
        <section className="py-16 md:py-24">
          <div className="container mx-auto px-4">
            {loading ? (
              <div className="text-center py-12">
                <p className="text-muted-foreground">Loading events...</p>
              </div>
            ) : events.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-muted-foreground text-lg">No events found. Check back soon!</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                {events.map((event) => (
                  <EventCard
                    key={event.id}
                    id={event.id}
                    title={event.title}
                    date={event.date}
                    location={event.location}
                    description={event.description}
                    imageUrl={event.image_url}
                    eventType={event.event_type}
                  />
                ))}
              </div>
            )}
          </div>
        </section>
      </main>

      <Footer />
    </div>
  )
}
