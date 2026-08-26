import type { Metadata } from "next"
import type React from "react"

export const metadata: Metadata = {
  title: "Gallery | HerCircle Foundation",
  description: "Explore photo and video highlights from our menstrual hygiene distributions, educational workshops, and community events.",
}

export default function GalleryLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return <>{children}</>
}
