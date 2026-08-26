import type { Metadata } from "next"
import type React from "react"

export const metadata: Metadata = {
  title: "Support Our Cause | Donate to HerCircle Foundation",
  description: "Your donation provides sanitary pads and menstrual hygiene education to young women, empowering them with dignity.",
}

export default function DonateLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return <>{children}</>
}
