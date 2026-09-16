"use client"

import { Calendar, MapPin, Clock, ChevronDown, Check, Download, ExternalLink, Info } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useState } from "react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

interface EventCardProps {
  id: string
  title: string
  date: string
  location: string
  description: string
  imageUrl?: string
  eventType: string
  status?: string
  onViewDetails?: (event: EventCardProps) => void
}

export function EventCard({ id, title, date, location, description, imageUrl, eventType, status, onViewDetails }: EventCardProps) {
  const [isAdded, setIsAdded] = useState(false)
  const [selectedCalendar, setSelectedCalendar] = useState<string | null>(null)

  const eventDate = new Date(date)
  const formattedDate = eventDate.toLocaleDateString("en-US", { 
    weekday: "long", 
    month: "long", 
    day: "numeric", 
    year: "numeric" 
  })
  const formattedTime = eventDate.toLocaleTimeString("en-US", { 
    hour: "numeric", 
    minute: "2-digit",
    hour12: true 
  })

  const formatDateForCalendar = (date: Date) => {
    return date.toISOString().replace(/-|:|\.\d\d\d/g, "")
  }

  const generateGoogleCalendarUrl = () => {
    const startDate = formatDateForCalendar(eventDate)
    const endDate = formatDateForCalendar(new Date(eventDate.getTime() + 2 * 60 * 60 * 1000)) // Add 2 hours
    const details = encodeURIComponent(`${description}\n\nLocation: ${location}`)
    return `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(title)}&dates=${startDate}/${endDate}&details=${details}&location=${encodeURIComponent(location)}`
  }

  const generateOutlookCalendarUrl = () => {
    const startDate = eventDate.toISOString()
    const endDate = new Date(eventDate.getTime() + 2 * 60 * 60 * 1000).toISOString() // Add 2 hours
    const details = encodeURIComponent(`${description}\n\nLocation: ${location}`)
    return `https://outlook.live.com/calendar/0/deeplink/compose?subject=${encodeURIComponent(title)}&startdt=${startDate}&enddt=${endDate}&body=${details}&location=${encodeURIComponent(location)}`
  }

  const generateYahooCalendarUrl = () => {
    const startDate = formatDateForCalendar(eventDate)
    const endDate = formatDateForCalendar(new Date(eventDate.getTime() + 2 * 60 * 60 * 1000)) // Add 2 hours
    const details = encodeURIComponent(`${description}\n\nLocation: ${location}`)
    return `https://calendar.yahoo.com/?v=60&view=d&type=20&title=${encodeURIComponent(title)}&st=${startDate}&et=${endDate}&desc=${details}&in_loc=${encodeURIComponent(location)}`
  }

  const generateICSFile = () => {
    const startDate = formatDateForCalendar(eventDate)
    const endDate = formatDateForCalendar(new Date(eventDate.getTime() + 2 * 60 * 60 * 1000)) // Add 2 hours
    const ics = `BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//HerCircle Foundation//EN
CALSCALE:GREGORIAN
METHOD:PUBLISH
BEGIN:VEVENT
UID:${id}@hercircle.org
DTSTAMP:${formatDateForCalendar(new Date())}Z
DTSTART:${startDate}Z
DTEND:${endDate}Z
SUMMARY:${title}
DESCRIPTION:${description.replace(/\n/g, "\\n")}
LOCATION:${location}
STATUS:CONFIRMED
SEQUENCE:0
TRANSP:OPAQUE
END:VEVENT
END:VCALENDAR`

    const blob = new Blob([ics], { type: "text/calendar;charset=utf-8" })
    const url = window.URL.createObjectURL(blob)
    const link = document.createElement("a")
    link.href = url
    link.download = `${title.replace(/[^a-z0-9]/gi, "_")}.ics`
    link.click()
    window.URL.revokeObjectURL(url)
    handleCalendarAdded("ICS File")
  }

  const handleCalendarAdded = (calendarName: string) => {
    setSelectedCalendar(calendarName)
    setIsAdded(true)
    setTimeout(() => {
      setIsAdded(false)
      setSelectedCalendar(null)
    }, 3000)
  }

  const handleCalendarClick = (type: string) => {
    switch (type) {
      case "google":
        window.open(generateGoogleCalendarUrl(), "_blank")
        handleCalendarAdded("Google Calendar")
        break
      case "outlook":
        window.open(generateOutlookCalendarUrl(), "_blank")
        handleCalendarAdded("Outlook")
        break
      case "yahoo":
        window.open(generateYahooCalendarUrl(), "_blank")
        handleCalendarAdded("Yahoo Calendar")
        break
      case "ics":
        generateICSFile()
        break
    }
  }

  return (
    <div className="group overflow-hidden rounded-xl border border-border bg-card hover:shadow-xl transition-all duration-300 hover:border-primary/50 flex flex-col h-full">
      {imageUrl ? (
        <div className="relative h-56 overflow-hidden bg-gradient-to-br from-primary/20 to-secondary">
          <img
            src={imageUrl}
            alt={title}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
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
            <div className="text-center">
              <Calendar className="h-12 w-12 text-primary/60 mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">Image unavailable</p>
            </div>
          </div>
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
          <div className="absolute top-4 right-4">
            <span className="bg-primary text-primary-foreground px-3 py-1.5 rounded-full text-xs font-semibold shadow-lg">
              {eventType}
            </span>
          </div>
          <div className="absolute bottom-4 left-4 right-4">
            <div className="flex items-center gap-2 text-white/90 text-sm">
              <Calendar className="h-4 w-4" />
              <span className="font-medium">{formattedDate}</span>
            </div>
          </div>
        </div>
      ) : (
        <div className="relative h-32 bg-gradient-to-br from-primary/20 to-secondary flex items-center justify-center">
          <div className="text-center">
            <Calendar className="h-12 w-12 text-primary/60 mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">No image available</p>
          </div>
          <div className="absolute top-4 right-4">
            <span className="bg-primary text-primary-foreground px-3 py-1.5 rounded-full text-xs font-semibold shadow-lg">
              {eventType}
            </span>
          </div>
        </div>
      )}

      <div className="p-6 flex-1 flex flex-col">
        <h3 className="text-xl font-bold mb-3 group-hover:text-primary transition-colors line-clamp-2">{title}</h3>
        
        <div className="space-y-3 mb-4">
          <div className="flex items-start gap-3 text-sm">
            <Clock className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
            <div>
              <p className="font-medium text-foreground">{formattedDate}</p>
              <p className="text-muted-foreground">{formattedTime}</p>
            </div>
          </div>
          <div className="flex items-start gap-3 text-sm">
            <MapPin className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
            <p className="text-muted-foreground line-clamp-2">{location || "Location TBD"}</p>
          </div>
        </div>

        <div className="mb-6 flex-1">
          <p className="text-sm text-muted-foreground line-clamp-3 leading-relaxed">
            {description || "No description available for this event."}
          </p>
        </div>

        <div className="flex gap-2">
          {onViewDetails && (
            <Button 
              variant="outline" 
              size="sm" 
              className="flex-1"
              onClick={() => onViewDetails({ id, title, date, location, description, imageUrl, eventType, status })}
            >
              <Info className="h-4 w-4 mr-2" />
              Details
            </Button>
          )}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button 
                variant={isAdded ? "default" : "outline"} 
                size="sm" 
                className={onViewDetails ? "flex-1" : "w-full group-hover:primary transition-colors"}
              >
                {isAdded ? (
                  <>
                    <Check className="h-4 w-4 mr-2" />
                    Added
                  </>
                ) : (
                  <>
                    <Calendar className="h-4 w-4 mr-2" />
                    Calendar
                    <ChevronDown className="h-4 w-4 ml-2" />
                  </>
                )}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuItem onClick={() => handleCalendarClick("google")} className="cursor-pointer">
                <ExternalLink className="h-4 w-4 mr-2 text-blue-500" />
                Google Calendar
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleCalendarClick("outlook")} className="cursor-pointer">
                <ExternalLink className="h-4 w-4 mr-2 text-blue-600" />
                Outlook Calendar
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleCalendarClick("yahoo")} className="cursor-pointer">
                <ExternalLink className="h-4 w-4 mr-2 text-purple-600" />
                Yahoo Calendar
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleCalendarClick("ics")} className="cursor-pointer">
                <Download className="h-4 w-4 mr-2 text-green-600" />
                Download ICS File
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </div>
  )
}
