import type { Metadata } from 'next'
import BlogListClient from '@/components/blog-list-client'
import { Header } from "@/components/header"
import { Footer } from "@/components/footer"

export const revalidate = 10

export const metadata: Metadata = {
  title: "Blog & Insights | HerCircle Foundation",
  description: "Stay updated with articles, health tips, stories, and insights on menstrual health advocacy from HerCircle Foundation.",
}

export default function BlogPage() {
  return (
    <div className="min-h-screen flex flex-col">
        <Header />
        <main className="flex-1 px-4 mx-4">
            <BlogListClient />
        </main>
        <footer className="mt-auto w-full">
            <Footer />
        </footer>
    </div>
  )
}
