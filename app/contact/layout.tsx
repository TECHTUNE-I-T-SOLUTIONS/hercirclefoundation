import type { Metadata } from "next"
import type React from "react"

export const metadata: Metadata = {
  title: "Contact Us | HerCircle Foundation",
  description: "Get in touch with HerCircle Foundation. Reach out to partner with us, ask questions, or join our community.",
}

export default function ContactLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return <>{children}</>
}
