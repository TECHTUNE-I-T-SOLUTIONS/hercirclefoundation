import type { Metadata } from "next"
import type React from "react"

export const metadata: Metadata = {
  title: "Become a Volunteer | HerCircle Foundation",
  description: "Join HerCircle Foundation as a volunteer. Dedicate your time and skills to make a direct impact on menstrual health hygiene.",
}

export default function VolunteerLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return <>{children}</>
}
