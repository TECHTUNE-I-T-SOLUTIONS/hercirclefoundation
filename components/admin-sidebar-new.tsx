"use client"

import React, { useEffect, useState } from "react"
import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { LayoutDashboard, Users, Heart, Calendar, ImageIcon, LogOut, Moon, Sun, Bell } from "lucide-react"
import { createClient } from "@/lib/supabase/client"
import { LogoutConfirmationModal } from "@/components/logout-confirmation-modal"
import { useIsMobile } from "@/hooks/use-mobile"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarTrigger,
  SidebarRail,
  useSidebar,
} from "@/components/ui/sidebar"

interface AdminSidebarNewProps {
  children?: React.ReactNode
  headerTitle?: string
}

export function AdminSidebarNew({ children, headerTitle = "Admin Dashboard" }: AdminSidebarNewProps) {
  // Hooks must always be called in the same order. Compute the route flag
  // (derived from `usePathname`) but do not return early before all hooks run.
  const pathname = usePathname()
  const router = useRouter()
  const isMobile = useIsMobile()

  const [showLogoutModal, setShowLogoutModal] = useState(false)
  const [isLoggingOut, setIsLoggingOut] = useState(false)
  const [theme, setTheme] = useState<"light" | "dark">("light")
  const [unreadCount, setUnreadCount] = useState<number>(0)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    const savedTheme = localStorage.getItem("theme") as "light" | "dark" | null
    const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches
    const initialTheme = savedTheme || (prefersDark ? "dark" : "light")
    setTheme(initialTheme)
    setMounted(true)
  }, [])

  // Determine whether we're on admin auth routes. We still call hooks
  // unconditionally to preserve hook order, but use this flag to render a
  // minimal layout for auth pages below.
  const isAuthRoute = typeof pathname === "string" && pathname.startsWith("/admin/auth")

  useEffect(() => {
    let mountedLocal = true
    const fetchUnread = async () => {
      try {
        const supabase = createClient()
        const res = await supabase
          .from("notifications")
          .select("id", { count: "exact", head: true })
          .eq("is_read", false)

        if (!mountedLocal) return
        setUnreadCount(res.count || 0)
      } catch (err) {
        console.error("Error fetching unread notifications:", err)
      }
    }

    fetchUnread()
    const t = setInterval(fetchUnread, 20000)
    return () => {
      mountedLocal = false
      clearInterval(t)
    }
  }, [])

  const toggleTheme = () => {
    const newTheme = theme === "light" ? "dark" : "light"
    setTheme(newTheme)
    localStorage.setItem("theme", newTheme)
    document.documentElement.classList.toggle("dark", newTheme === "dark")
  }

  const menuItems = [
    { href: "/admin/dashboard", label: "Dashboard", icon: LayoutDashboard },
    { href: "/admin/profile", label: "Profile", icon: Users },
    { href: "/admin/volunteers", label: "Volunteers", icon: Users },
    { href: "/admin/donors", label: "Donors", icon: Heart },
    { href: "/admin/events", label: "Events", icon: Calendar },
    { href: "/admin/blogs", label: "Blogs", icon: ImageIcon },
    { href: "/admin/blogs/comments", label: "Blog Comments", icon: Bell },
    { href: "/admin/blogs/reactions", label: "Blog Reactions", icon: Heart },
    { href: "/admin/blogs/shares", label: "Blog Shares", icon: ImageIcon },
    { href: "/admin/gallery", label: "Gallery", icon: ImageIcon },
    { href: "/admin/partner-requests", label: "Partner Requests", icon: Bell },
    { href: "/admin/notifications", label: "Notifications", icon: Bell, isNotifications: true },
    { href: "/admin/push-subscriptions", label: "Push Subscriptions", icon: Bell },
  ]

  const handleLogout = async () => {
    setIsLoggingOut(true)
    try {
      const supabase = createClient()
      await supabase.auth.signOut()
      router.push("/admin/auth/login")
    } catch (error) {
      console.error("Logout error:", error)
    } finally {
      setIsLoggingOut(false)
      setShowLogoutModal(false)
    }
  }

  function LogoutButtonInsideProvider() {
    const { setOpenMobile, isMobile: sidebarIsMobile } = useSidebar()

    const onClick = () => {
      if (sidebarIsMobile) {
        setOpenMobile(false)
        setTimeout(() => setShowLogoutModal(true), 120)
      } else {
        setShowLogoutModal(true)
      }
    }

    return (
      <SidebarMenuItem>
        <SidebarMenuButton onClick={onClick} tooltip="Logout" className="w-full text-destructive hover:text-destructive">
          <LogOut className="h-6 w-6 md:h-5 md:w-5" />
          <span className="group-data-[state=collapsed]:hidden">Logout</span>
        </SidebarMenuButton>
      </SidebarMenuItem>
    )
  }

  // Render a minimal layout for auth routes; otherwise render full admin chrome.
  if (isAuthRoute) {
    return <>{children}</>
  }

  return (
    <>
      {/* Hide the global header/footer rendered by the root layout so admin
          pages only show the admin header/sidebar. */}
      <style dangerouslySetInnerHTML={{ __html: ".site-header, .site-footer { display: none !important; }" }} />

      <SidebarProvider>
        <Sidebar collapsible="icon" className="border-r border-sidebar-border w-32 md:w-64 lg:w-64">
          <SidebarHeader className="border-b border-sidebar-border">
            <Link href="/admin/dashboard" className="flex items-center gap-2 group">
              <img src="/logo.png" alt="HerCircle" className="h-16 w-12 md:h-14 md:w-10" />
              <span className="font-bold text-sidebar-foreground text-base md:text-md text-lg group-data-[state=collapsed]:hidden">Admin</span>
            </Link>
          </SidebarHeader>

          <SidebarContent>
            <SidebarMenu className="gap-4 md:gap-2">
              {menuItems.map((item) => {
                const Icon = item.icon
                const isActive = mounted && pathname === item.href
                return (
                  <SidebarMenuItem key={item.href}>
                    <SidebarMenuButton asChild isActive={isActive} tooltip={item.label} className={isActive ? "bg-sidebar-primary text-sidebar-primary-foreground" : ""}>
                      <Link href={item.href} className="flex items-center gap-4 px-4 py-4 md:py-3">
                        <Icon className="h-6 w-6 md:h-5 md:w-5" />
                        <span className="text-lg md:text-sm font-medium">{item.label}</span>
                        {item.isNotifications && unreadCount > 0 && (
                          <span className="ml-auto inline-flex items-center justify-center rounded-full bg-destructive px-2 py-0.5 text-xs text-white">{unreadCount}</span>
                        )}
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                )
              })}
            </SidebarMenu>
          </SidebarContent>

          <SidebarFooter className="border-t border-sidebar-border space-y-2">
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton onClick={toggleTheme} tooltip={theme === "light" ? "Dark Mode" : "Light Mode"} className="w-full">
                  {theme === "light" ? <Moon className="h-6 w-6 md:h-5 md:w-5" /> : <Sun className="h-6 w-6 md:h-5 md:w-5" />}
                  <span className="group-data-[state=collapsed]:hidden">{theme === "light" ? "Dark" : "Light"}</span>
                </SidebarMenuButton>
              </SidebarMenuItem>

              <LogoutButtonInsideProvider />
            </SidebarMenu>
          </SidebarFooter>
        </Sidebar>

        <InnerHeaderAndMain title={headerTitle}>{children}</InnerHeaderAndMain>
        <SidebarRail className="hidden lg:block" />
      </SidebarProvider>

      <LogoutConfirmationModal isOpen={showLogoutModal} onConfirm={handleLogout} onCancel={() => setShowLogoutModal(false)} isLoading={isLoggingOut} />
    </>
  )
}

function InnerHeaderAndMain({ children, title }: { children?: React.ReactNode; title?: string }) {
  const { state, isMobile } = useSidebar()

  const leftClass = isMobile ? "left-0 right-0" : state === "expanded" ? "left-[var(--sidebar-width)] right-0" : "left-[var(--sidebar-width-icon)] right-0"

  return (
    <main className="flex-1 overflow-auto">
      <div className={`fixed top-0 z-50 p-4 border-b border-border flex items-center gap-2 bg-card backdrop-blur-sm shadow-sm transition-all duration-200 ${leftClass}`}>
        <SidebarTrigger />
        <h1 className="font-semibold">{title ?? "Admin Dashboard"}</h1>
      </div>

      <div className="h-16" />

      <div className="px-4">{children}</div>
    </main>
  )
}
