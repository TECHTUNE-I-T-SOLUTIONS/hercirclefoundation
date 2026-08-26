import type { Metadata } from "next"
import type React from "react"

export const metadata: Metadata = {
  title: "Voices & Stories | HerCircle Foundation",
  description: "Read inspiring stories and experiences shared by our community, volunteers, and the women we support.",
}

export default function StoriesLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return <>{children}</>
}
