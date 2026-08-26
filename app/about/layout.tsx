import type { Metadata } from "next"
import type React from "react"

export const metadata: Metadata = {
  title: "About Us | HerCircle Foundation",
  description: "Learn about HerCircle Foundation, our mission, values, and our commitment to breaking period poverty.",
}

export default function AboutLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return <>{children}</>
}
