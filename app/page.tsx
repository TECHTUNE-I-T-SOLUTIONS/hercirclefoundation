"use client"

import { Header } from "@/components/header"
import { Footer } from "@/components/footer"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import { Heart, Users, BookOpen, TrendingUp } from "lucide-react"
import { useEffect, useState } from "react"
import { CountUpNumber } from "@/components/count-up-number"

export default function Home() {
  const [isVisible, setIsVisible] = useState(false)

  useEffect(() => {
    setIsVisible(true)
  }, [])

  const stats = [
    { icon: Heart, label: "Lives Impacted", value: "5,000+" },
    { icon: Users, label: "Active Volunteers", value: "150+" },
    { icon: BookOpen, label: "Girls Educated", value: "2,500+" },
    { icon: TrendingUp, label: "Pads Distributed", value: "50,000+" },
  ]

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Header />

      <main className="flex-1">
        {/* Hero Section */}
        <section className="relative overflow-hidden py-20 md:py-32">
          <div className="absolute inset-0 bg-gradient-to-br from-primary/10 to-transparent" />
          <div className="container mx-auto px-4 relative z-10">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
              <div
                className={`transition-all duration-1000 ${isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-10"}`}
              >
                <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-foreground mb-6 leading-tight">
                  Breaking Period Poverty, Empowering Women
                </h1>
                <p className="text-lg text-muted-foreground mb-8 leading-relaxed">
                  Her Circle Foundation is dedicated to providing free sanitary pads, promoting safe menstrual
                  practices, and educating communities about menstrual health.
                </p>
                <div className="flex flex-col sm:flex-row gap-4">
                  <Link href="/volunteer">
                    <Button size="lg" className="w-full sm:w-auto bg-primary hover:bg-primary/90">
                      Become a Volunteer
                    </Button>
                  </Link>
                  <Link href="/donate">
                    <Button size="lg" variant="outline" className="w-full sm:w-auto bg-transparent">
                      Make a Donation
                    </Button>
                  </Link>
                </div>
              </div>

              <div
                className={`transition-all duration-1000 delay-300 ${isVisible ? "opacity-100 scale-100" : "opacity-0 scale-95"}`}
              >
                <div className="relative">
                  <div className="absolute inset-0 bg-primary/20 rounded-full blur-3xl" />
                  <img
                    src="/logo.png"
                    alt="Her Circle Foundation"
                    className="relative w-full max-w-md mx-auto drop-shadow-lg"
                  />
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Stats Section */}
        <section className="py-16 bg-secondary/50">
          <div className="container mx-auto px-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
              {stats.map((stat, index) => (
                <div
                  key={index}
                  className={`text-center transition-all duration-700 ${isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-10"}`}
                  style={{ transitionDelay: `${index * 100}ms` }}
                >
                  <stat.icon className="h-8 w-8 mx-auto mb-3 text-primary" />
                  <p className="text-2xl md:text-3xl font-bold text-foreground">
                    <CountUpNumber
                      value={Number.parseInt(stat.value.replace(/\D/g, ""))}
                      suffix={stat.value.includes("+") ? "+" : ""}
                      duration={2000}
                    />
                  </p>
                  <p className="text-sm text-muted-foreground">{stat.label}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Mission Section */}
        <section className="py-20 md:py-32">
          <div className="container mx-auto px-4">
            <div className="max-w-3xl mx-auto">
              <h2 className="text-3xl md:text-4xl font-bold text-center mb-12">Our Mission</h2>
              <div className="space-y-6 text-lg text-muted-foreground leading-relaxed">
                <p>
                  Our mission is to provide free sanitary pads, promote safe menstrual practices, and educate
                  communities about menstrual health to reduce the occurrence of TSS and other hygiene-related
                  complications.
                </p>
                <p>
                  Through partnerships with schools, healthcare providers, and local organizations, we aim to break the
                  stigma surrounding menstruation, create equitable access to hygiene products, and ensure that every
                  young woman can live with dignity, confidence, and good health.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Impact Section */}
        <section className="py-20 md:py-32 bg-secondary/30">
          <div className="container mx-auto px-4">
            <h2 className="text-3xl md:text-4xl font-bold text-center mb-16">Our Impact</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
              <div className="space-y-4">
                <h3 className="text-2xl font-bold text-primary">Health & Hygiene Improvement</h3>
                <p className="text-muted-foreground leading-relaxed">
                  Investing in menstrual health creates a ripple effect of positive outcomes. Without proper sanitary
                  products, women resort to unhygienic alternatives, increasing infection risks. Our funding enables
                  distribution of high-quality sanitary pads that are safe and effective.
                </p>
                <ul className="space-y-2 text-sm">
                  <li className="flex items-start gap-2">
                    <span className="text-primary font-bold">•</span>
                    <span>Prevents UTIs and RTIs from improper care</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-primary font-bold">•</span>
                    <span>Reduces risk of Toxic Shock Syndrome (TSS)</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-primary font-bold">•</span>
                    <span>Improves overall menstrual hygiene practices</span>
                  </li>
                </ul>
              </div>

              <div className="space-y-4">
                <h3 className="text-2xl font-bold text-primary">Empowering Women & Girls</h3>
                <p className="text-muted-foreground leading-relaxed">
                  Many women and girls lack basic knowledge about menstrual hygiene. Our education programs empower them
                  to manage their periods effectively and maintain their health with confidence.
                </p>
                <ul className="space-y-2 text-sm">
                  <li className="flex items-start gap-2">
                    <span className="text-primary font-bold">•</span>
                    <span>Increased school attendance and participation</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-primary font-bold">•</span>
                    <span>Greater confidence and self-esteem</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-primary font-bold">•</span>
                    <span>Breaking stigma around menstruation</span>
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="py-20 md:py-32 bg-primary text-primary-foreground">
          <div className="container mx-auto px-4 text-center">
            <h2 className="text-3xl md:text-4xl font-bold mb-6">How You Can Help</h2>
            <p className="text-lg mb-12 max-w-2xl mx-auto opacity-90">
              Together, we can change the lives of millions of women and girls. Choose how you want to make a
              difference.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link href="/volunteer">
                <Button size="lg" variant="secondary" className="w-full sm:w-auto">
                  Volunteer Your Time
                </Button>
              </Link>
              <Link href="/donate">
                <Button size="lg" variant="secondary" className="w-full sm:w-auto">
                  Make a Donation
                </Button>
              </Link>
              <Link href="/contact">
                <Button size="lg" variant="secondary" className="w-full sm:w-auto">
                  Partner With Us
                </Button>
              </Link>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  )
}
