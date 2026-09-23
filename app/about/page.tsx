"use client"

// import { Header } from "@/components/header"
// import { Footer } from "@/components/footer"
import { Card, CardContent } from "@/components/ui/card"
import { Users, Target, Heart, Globe } from "lucide-react"

export default function AboutPage() {
  const values = [
    {
      icon: Heart,
      title: "Compassion",
      description: "We care deeply about the wellbeing of every woman and girl we serve.",
    },
    {
      icon: Target,
      title: "Mission-Driven",
      description: "Every action we take is guided by our commitment to breaking period poverty.",
    },
    {
      icon: Users,
      title: "Community",
      description: "We believe in the power of collective action and community support.",
    },
    {
      icon: Globe,
      title: "Equity",
      description: "We work to ensure equal access to menstrual health resources for all.",
    },
  ]

  return (
    <div className="min-h-screen flex flex-col bg-background">
      {/* <Header /> */}

      <main className="flex-1">
        {/* Hero */}
        <section className="py-16 md:py-24 bg-gradient-to-br from-primary/10 to-transparent">
          <div className="container mx-auto px-4 text-center">
            <h1 className="text-4xl md:text-5xl font-bold mb-4">About HerCircle Foundation</h1>
            <p className="text-lg text-muted-foreground max-w-auto text-center justify-center">
              Dedicated to empowering young women by addressing critical challenges in menstrual health.
            </p>
          </div>
        </section>

        {/* Story */}
        <section className="py-16 md:py-24">
          <div className="container mx-auto px-4 max-w-3xl">
            <h2 className="text-3xl font-bold mb-8">Our Story</h2>
            <div className="space-y-6 text-lg text-muted-foreground leading-relaxed">
              <p>
                HerCircle Foundation was born from a simple yet powerful realization: millions of girls and young women
                around the world lack access to affordable menstrual hygiene products. This isn't just an
                inconvenience—it's a barrier to education, health, and dignity.
              </p>
              <p>
                When girls miss school due to lack of menstrual products, they fall behind academically. When women
                resort to unsafe alternatives, they risk serious health complications including Toxic Shock Syndrome
                (TSS). We knew we had to act.
              </p>
              <p>
                Today, HerCircle Foundation stands as a beacon of hope, providing free sanitary pads, comprehensive
                menstrual health education, and community support to break the cycle of period poverty.
              </p>
            </div>
          </div>
        </section>

        {/* Values */}
        <section className="py-16 md:py-24 bg-secondary/30">
          <div className="container mx-auto px-4">
            <h2 className="text-3xl font-bold mb-12 text-center">Our Values</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {values.map((value, index) => {
                const Icon = value.icon
                return (
                  <Card
                    key={index}
                    className="hover:shadow-lg transition-all duration-300 hover:border-primary/50 animate-slide-up"
                    style={{ animationDelay: `${index * 100}ms` }}
                  >
                    <CardContent className="pt-6">
                      <Icon className="h-8 w-8 text-primary mb-4" />
                      <h3 className="font-bold text-lg mb-2">{value.title}</h3>
                      <p className="text-sm text-muted-foreground">{value.description}</p>
                    </CardContent>
                  </Card>
                )
              })}
            </div>
          </div>
        </section>

        {/* Team */}
        <section className="py-16 md:py-24">
          <div className="container mx-auto px-4">
            <h2 className="text-3xl font-bold mb-12 text-center">Leadership</h2>
            <div className="max-w-2xl mx-auto">
              <Card>
                <CardContent className="pt-6">
                  <div className="text-center">
                    <div className="w-24 h-24 bg-primary/20 rounded-full mx-auto mb-4 flex items-center justify-center">
                      <Users className="h-12 w-12 text-primary" />
                    </div>
                    <h3 className="text-xl font-bold mb-2">Kanyinsola Joy Sanni</h3>
                    <p className="text-muted-foreground mb-4">Founder & Executive Director</p>
                    <p className="text-sm leading-relaxed">
                      With a passion for women's health and social justice, Kanyinsola founded HerCircle Foundation to
                      create lasting change in menstrual health advocacy and access.
                    </p>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </section>
      </main>

      {/* <Footer /> */}
    </div>
  )
}
