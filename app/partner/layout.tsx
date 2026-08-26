import type { Metadata } from "next"
import type React from "react"

export const metadata: Metadata = {
  title: "Partner With Us | HerCircle Foundation",
  description: "Collaborate with HerCircle Foundation to fight period poverty. Together, we can reach more women and girls in need.",
}

export default function PartnerLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return <>{children}</>
}
