import type { Metadata } from "next"
import type React from "react"

export const metadata: Metadata = {
  title: "Our Events & Workshops | HerCircle Foundation",
  description: "Join our upcoming events, workshops, and distributions. Learn about our outreach initiatives and community programs.",
}

export default function EventsLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return <>{children}</>
}
