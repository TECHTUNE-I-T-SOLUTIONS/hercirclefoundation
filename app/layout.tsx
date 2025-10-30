import type React from "react"
import type { Metadata } from "next"
import { Analytics } from "@vercel/analytics/next"
import { ThemeProvider } from "@/components/theme-provider"
import { ScrollToTop } from "@/components/scroll-to-top"
import NotificationBell from "@/components/notification-bell"
import HelpModal from "@/components/help-modal"
// import { Header } from '@/components/header'
// import { Footer } from '@/components/footer'
import { Toaster } from '@/components/ui/toaster'
import "./globals.css"
import LunaChatWrapper from '@/components/luna-chat-wrapper'
import HealthModalWrapper from '../components/health-modal-wrapper'
import SurveyPopup from '@/components/survey-popup-wrapper'

export const metadata: Metadata = {
  title: "HerCircle Foundation - Breaking Period Poverty",
  description: "Empowering young women through menstrual health education and access to sanitary products",
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`font-sans antialiased`}>
        <ThemeProvider>
          <div className="min-h-screen flex flex-col">
            {/* <Header /> */}
            <main className="flex-1">{children}</main>
            {/* <Footer /> */}
          </div>

          <NotificationBell />
          <HelpModal />
          <Toaster />
          <ScrollToTop />
          <LunaChatWrapper />
          <HealthModalWrapper />
          <SurveyPopup />
          <Analytics />
        </ThemeProvider>
      </body>
    </html>
  )
}
