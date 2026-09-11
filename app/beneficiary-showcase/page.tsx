"use client"

import { useState, useEffect } from "react"
import { Header } from "@/components/header"
import { Footer } from "@/components/footer"
import { Heart, Loader2, ExternalLink, Sparkles } from "lucide-react"

interface BeneficiaryItem {
  id: string
  name: string
  description: string | null
  link: string | null
  image_url: string
  image_type: string
}

export default function BeneficiaryShowcasePage() {
  const [items, setItems] = useState<BeneficiaryItem[]>([])
  const [loading, setLoading] = useState(true)
  const [hoveredItem, setHoveredItem] = useState<string | null>(null)
  const [isMobile, setIsMobile] = useState(false)

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768)
    checkMobile()
    window.addEventListener('resize', checkMobile)
    return () => window.removeEventListener('resize', checkMobile)
  }, [])

  useEffect(() => {
    fetchItems()
  }, [])

  const fetchItems = async () => {
    try {
      const res = await fetch('/api/beneficiary-showcase')
      const data = await res.json()
      if (data.data) {
        setItems(data.data)
      }
    } catch (error) {
      console.error('Error fetching items:', error)
    } finally {
      setLoading(false)
    }
  }

  // Generate irregular positions for organic feel
  const getIrregularPosition = (index: number, total: number) => {
    const angle = (index / total) * 2 * Math.PI
    const baseRadius = 35
    const randomOffset = Math.random() * 15
    const radius = baseRadius + randomOffset
    const x = 50 + radius * Math.cos(angle)
    const y = 50 + radius * Math.sin(angle)
    return { x, y }
  }

  const handleItemClick = (item: BeneficiaryItem) => {
    if (item.link) {
      window.open(item.link, '_blank')
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col bg-background dark:bg-background">
        <Header />
        <main className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-primary" />
            <p className="text-muted-foreground">Loading our network...</p>
          </div>
        </main>
        <Footer />
      </div>
    )
  }

  return (
    <div className="min-h-screen flex flex-col bg-background dark:bg-background">
      <Header />

      <main className="flex-1">
        {/* Hero Section */}
        <section className="py-20 md:py-32">
          <div className="container mx-auto px-4 text-center">
            <div className="flex items-center justify-center gap-3 mb-6">
              <Sparkles className="h-8 w-8 text-primary" />
              <h1 className="text-5xl md:text-6xl font-bold bg-gradient-to-r from-primary to-red-600 bg-clip-text text-transparent">
                Our Network
              </h1>
              <Sparkles className="h-8 w-8 text-red-600" />
            </div>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto font-light">
              The beneficiaries and partners who make our mission possible
            </p>
          </div>
        </section>

        {/* Organic Circular Showcase */}
        <section className="py-8 md:py-24">
          <div className="container mx-auto px-4">
            {items.length === 0 ? (
              <div className="text-center py-20">
                <Heart className="h-16 w-16 mx-auto mb-4 text-primary/50" />
                <p className="text-muted-foreground">No items to display yet.</p>
              </div>
            ) : (
              <div className="relative mx-auto md:w-[700px] md:h-[700px] w-[300px] h-[300px]">
                {/* Main Heart Circle */}
                <div className="absolute inset-0 rounded-full border-4 border-primary/30 bg-gradient-to-br from-primary/10 to-purple-10/20 flex items-center justify-center backdrop-blur-sm">
                  <div className="text-center p-4 md:p-10">
                    <Heart className="h-10 w-10 md:h-20 md:w-20 text-primary mx-auto mb-2 md:mb-4 animate-pulse" />
                    <h2 className="text-xl md:text-3xl font-bold bg-primary dark:bg-primary bg-clip-text text-transparent">
                      {items.length}
                    </h2>
                    <p className="text-xs md:text-base text-muted-foreground font-light">Partners & Beneficiaries</p>
                  </div>
                </div>

                {/* Irregularly positioned logos */}
                {items.map((item, index) => {
                  const position = getIrregularPosition(index, items.length)
                  const isHovered = hoveredItem === item.id
                  const size = isMobile ? 40 + Math.random() * 30 : 60 + Math.random() * 40
                  const floatDuration = 3 + Math.random() * 2
                  
                  return (
                    <div
                      key={item.id}
                      className="absolute cursor-pointer transition-all duration-500 ease-out"
                      style={{
                        left: `${position.x}%`,
                        top: `${position.y}%`,
                        transform: `translate(-50%, -50%) ${isHovered ? 'scale(1.4)' : 'scale(1)'}`,
                        zIndex: 10 + index,
                        animationName: isHovered ? 'none' : 'float',
                        animationDuration: `${floatDuration}s`,
                        animationTimingFunction: 'ease-in-out',
                        animationIterationCount: 'infinite',
                        animationDelay: `${index * 0.3}s`,
                      }}
                      onMouseEnter={() => setHoveredItem(item.id)}
                      onMouseLeave={() => setHoveredItem(null)}
                      onClick={() => handleItemClick(item)}
                    >
                      <style>{`
                        @keyframes float {
                          0%, 100% { transform: translate(-50%, -50%) translateY(0px); }
                          50% { transform: translate(-50%, -50%) translateY(-15px); }
                        }
                      `}</style>
                      <div className="relative group">
                        <div 
                          className="rounded-full bg-white shadow-2xl overflow-hidden border-2 border-white/50 transition-all duration-500 group-hover:shadow-2xl group-hover:border-primary/50"
                          style={{
                            width: `${size}px`,
                            height: `${size}px`,
                          }}
                        >
                          <img
                            src={item.image_url}
                            alt={item.name}
                            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                          />
                        </div>
                        
                        {/* Elegant tooltip */}
                        <div className={`absolute bottom-full left-1/2 transform -translate-x-1/2 mb-3 px-4 py-2 bg-gray-900/90 backdrop-blur text-white text-xs md:text-sm rounded-lg whitespace-nowrap opacity-0 group-hover:opacity-100 transition-all duration-300 pointer-events-none ${isHovered ? 'opacity-100' : ''}`}>
                          {item.name}
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </section>

        {/* Elegant Grid Section */}
        <section className="py-16 md:py-24">
          <div className="container mx-auto px-4">
            <div className="text-center mb-16">
              <h2 className="text-3xl font-bold mb-4 bg-primary bg-clip-text text-transparent">
                Meet Our Partners
              </h2>
              <p className="text-muted-foreground font-light">
                Discover the organizations and communities we collaborate with
              </p>
            </div>
            
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-8">
              {items.map((item, index) => (
                <div
                  key={item.id}
                  className="group relative"
                  style={{
                    animationDelay: `${index * 100}ms`,
                  }}
                >
                  <div className="relative rounded-2xl overflow-hidden shadow-lg group-hover:shadow-2xl transition-all duration-500 bg-white aspect-square">
                    <img
                      src={item.image_url}
                      alt={item.name}
                      className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                    />
                    
                    {/* Gradient overlay */}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                    
                    {/* Content */}
                    <div className="absolute bottom-0 left-0 right-0 p-4 text-white">
                      <h3 className="font-bold text-lg mb-1">{item.name}</h3>
                      {item.description && (
                        <p className="text-sm opacity-90 line-clamp-2">{item.description}</p>
                      )}
                    </div>

                    {/* External link indicator */}
                    {item.link && (
                      <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                        <div className="bg-white/90 backdrop-blur rounded-full p-2">
                          <ExternalLink className="h-4 w-4" />
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  )
}
