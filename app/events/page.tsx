"use client"

import { Header } from "@/components/header"
import { Footer } from "@/components/footer"
import { EventCard } from "@/components/event-card"
import { Button } from "@/components/ui/button"
import { useEffect, useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Calendar, MapPin, Clock, X } from "lucide-react"

interface Event {
  id: string
  title: string
  description: string
  date: string
  location: string
  image_url?: string
  event_type: string
  status: string
}

export default function EventsPage() {
  const [events, setEvents] = useState<Event[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<"all" | "upcoming" | "past">("upcoming")
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null)

  useEffect(() => {
    const fetchEvents = async () => {
      try {
        const supabase = createClient()
        const { data, error } = await supabase.from("events").select("*").order("date", { ascending: true })

        if (error) throw error

        const now = new Date()
        const publishedEvents = data?.filter((e) => e.status === 'published') || []
        const upcoming = publishedEvents.filter((e) => new Date(e.date) >= now) || []
        const past = publishedEvents.filter((e) => new Date(e.date) < now) || []

        if (filter === "upcoming") {
          setEvents(upcoming)
        } else if (filter === "past") {
          setEvents(past)
        } else {
          setEvents(publishedEvents)
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
            <p className="text-lg text-muted-foreground max-w-auto text-center">
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
                    status={event.status}
                    onViewDetails={(eventData) => setSelectedEvent({
                      id: eventData.id,
                      title: eventData.title,
                      description: eventData.description,
                      date: eventData.date,
                      location: eventData.location,
                      image_url: eventData.imageUrl,
                      event_type: eventData.eventType,
                      status: eventData.status || 'published'
                    })}
                  />
                ))}
              </div>
            )}
          </div>
        </section>
      </main>

      <Footer />

      {/* Event Details Modal */}
      <Dialog open={!!selectedEvent} onOpenChange={(open) => !open && setSelectedEvent(null)}>
        <DialogContent className="max-w-2xl w-full max-h-[85vh] overflow-hidden flex flex-col p-0">
          {selectedEvent && (
            <>
              {/* Header Image */}
              {selectedEvent.image_url ? (
                <div className="relative h-48 md:h-64 flex-shrink-0">
                  <img
                    src={selectedEvent.image_url}
                    alt={selectedEvent.title}
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      const target = e.target as HTMLImageElement
                      target.style.display = "none"
                      const fallback = target.parentElement?.querySelector('.fallback-image')
                      if (fallback) {
                        fallback.classList.remove('hidden')
                      }
                    }}
                  />
                  <div className="fallback-image hidden absolute inset-0 bg-gradient-to-br from-primary/20 to-secondary flex items-center justify-center">
                    <Calendar className="h-12 w-12 text-primary/60 mx-auto mb-2" />
                    <p className="text-sm text-muted-foreground">Image unavailable</p>
                  </div>
                  <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent" />
                  <button
                    onClick={() => setSelectedEvent(null)}
                    className="absolute top-4 right-4 bg-white/20 backdrop-blur-sm hover:bg-white/30 rounded-full p-2 transition-colors"
                  >
                    <X className="h-5 w-5 text-white" />
                  </button>
                </div>
              ) : (
                <div className="relative h-32 bg-gradient-to-br from-primary/20 to-secondary flex items-center justify-center flex-shrink-0">
                  <div className="text-center">
                    <Calendar className="h-12 w-12 text-primary/60 mx-auto mb-2" />
                    <p className="text-sm text-muted-foreground">No image available</p>
                  </div>
                  <button
                    onClick={() => setSelectedEvent(null)}
                    className="absolute top-4 right-4 bg-white/20 backdrop-blur-sm hover:bg-white/30 rounded-full p-2 transition-colors"
                  >
                    <X className="h-5 w-5 text-white" />
                  </button>
                </div>
              )}

              {/* Scrollable Content */}
              <div className="flex-1 overflow-y-auto p-6">
                <DialogHeader className="mb-4">
                  <DialogTitle className="text-2xl md:text-3xl font-bold">{selectedEvent.title}</DialogTitle>
                </DialogHeader>

                <div className="space-y-4">
                  {/* Event Type Badge */}
                  <div className="flex items-center gap-2">
                    <span className="bg-primary/20 text-primary px-3 py-1 rounded-full text-sm font-semibold">
                      {selectedEvent.event_type}
                    </span>
                    <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                      selectedEvent.status === 'published' 
                        ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100' 
                        : 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-100'
                    }`}>
                      {selectedEvent.status}
                    </span>
                  </div>

                  {/* Date & Time */}
                  <div className="flex items-start gap-3">
                    <Calendar className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="font-medium">Date & Time</p>
                      <p className="text-muted-foreground">
                        {new Date(selectedEvent.date).toLocaleDateString("en-US", { 
                          weekday: "long", 
                          month: "long", 
                          day: "numeric", 
                          year: "numeric" 
                        })}
                      </p>
                      <p className="text-muted-foreground">
                        {new Date(selectedEvent.date).toLocaleTimeString("en-US", { 
                          hour: "numeric", 
                          minute: "2-digit",
                          hour12: true 
                        })}
                      </p>
                    </div>
                  </div>

                  {/* Location */}
                  <div className="flex items-start gap-3">
                    <MapPin className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="font-medium">Location</p>
                      <p className="text-muted-foreground">{selectedEvent.location || "Location TBD"}</p>
                    </div>
                  </div>

                  {/* Description */}
                  <div className="border-t pt-4">
                    <h3 className="font-semibold mb-2">About this event</h3>
                    <p className="text-muted-foreground leading-relaxed whitespace-pre-wrap">
                      {selectedEvent.description || "No description available for this event."}
                    </p>
                  </div>
                </div>
              </div>

              {/* Footer Actions */}
              <div className="flex-shrink-0 border-t p-4 bg-muted/30">
                <div className="flex gap-2">
                  <Button
                    onClick={() => setSelectedEvent(null)}
                    variant="outline"
                    className="flex-1"
                  >
                    Close
                  </Button>
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
