"use client"

import { Calendar, MapPin, Plus } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useState } from "react"

interface EventCardProps {
  id: string
  title: string
  date: string
  location: string
  description: string
  imageUrl?: string
  eventType: string
}

export function EventCard({ id, title, date, location, description, imageUrl, eventType }: EventCardProps) {
  const [isAdded, setIsAdded] = useState(false)

  const handleAddToCalendar = () => {
    const eventDate = new Date(date)
    const ics = `BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//Her Circle Foundation//EN
BEGIN:VEVENT
UID:${id}@hercircle.org
DTSTAMP:${new Date().toISOString().replace(/[-:]/g, "").split(".")[0]}Z
DTSTART:${eventDate.toISOString().replace(/[-:]/g, "").split(".")[0]}Z
SUMMARY:${title}
DESCRIPTION:${description}
LOCATION:${location}
END:VEVENT
END:VCALENDAR`

    const blob = new Blob([ics], { type: "text/calendar" })
    const url = window.URL.createObjectURL(blob)
    const link = document.createElement("a")
    link.href = url
    link.download = `${title}.ics`
    link.click()
    setIsAdded(true)
    setTimeout(() => setIsAdded(false), 2000)
  }

  return (
    <div className="group overflow-hidden rounded-lg border border-border bg-card hover:shadow-lg transition-all duration-300 hover:border-primary/50">
      {imageUrl && (
        <div className="relative h-48 overflow-hidden bg-secondary">
          <img
            src={imageUrl || "/placeholder.svg"}
            alt={title}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          />
          <div className="absolute top-3 right-3 bg-primary text-primary-foreground px-3 py-1 rounded-full text-xs font-semibold">
            {eventType}
          </div>
        </div>
      )}
      <div className="p-6">
        <h3 className="text-xl font-bold mb-3 group-hover:text-primary transition-colors">{title}</h3>
        <div className="space-y-2 mb-4 text-sm text-muted-foreground">
          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4 text-primary" />
            <span>
              {new Date(date).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <MapPin className="h-4 w-4 text-primary" />
            <span>{location}</span>
          </div>
        </div>
        <p className="text-sm text-muted-foreground mb-4 line-clamp-2">{description}</p>
        <Button onClick={handleAddToCalendar} variant={isAdded ? "default" : "outline"} size="sm" className="w-full">
          <Plus className="h-4 w-4 mr-2" />
          {isAdded ? "Added to Calendar" : "Add to Calendar"}
        </Button>
      </div>
    </div>
  )
}
