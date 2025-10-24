"use client"

import type React from "react"

import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { LayoutDashboard, Users, Heart, Calendar, ImageIcon, LogOut, Moon, Sun, Bell } from "lucide-react"
import { createClient } from "@/lib/supabase/client"
import { useState, useEffect } from "react"
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
}

interface AdminSidebarNewProps {
  children?: React.ReactNode
  headerTitle?: string
}

export function AdminSidebarNew({ children, headerTitle = 'Admin Dashboard' }: AdminSidebarNewProps) {
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
    // mark mounted so we can avoid rendering client-only active states during SSR
    setMounted(true)
  }, [])

  useEffect(() => {
    // fetch unread notifications count
    let mounted = true
    const fetchUnread = async () => {
      try {
        const supabase = createClient()
        const res = await supabase
          .from("notifications")
          .select("id", { count: "exact", head: true })
          .eq("is_read", false)

        if (!mounted) return
        setUnreadCount(res.count || 0)
      } catch (err) {
        console.error("Error fetching unread notifications:", err)
      }
    }

    fetchUnread()

    // simple realtime poll every 20s
    const t = setInterval(fetchUnread, 20000)
    return () => {
      mounted = false
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
    // Notifications moved into main menu so it's visible on smaller screens
    { href: "/admin/notifications", label: "Notifications", icon: Bell, isNotifications: true },
    // Add Push Subscriptions management link
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

  // Render a logout button that can access the Sidebar context (must be
  // called from inside the SidebarProvider). This ensures on mobile we can
  // close the sheet (sidebar) before showing the modal so the modal buttons
  // remain clickable.
  function LogoutButtonInsideProvider() {
    const { setOpenMobile, isMobile } = useSidebar()

    const onClick = () => {
      if (isMobile) {
        // Close the mobile sidebar first so the modal is not blocked by the Sheet
        setOpenMobile(false)
        // Small delay to allow the sheet close animation to begin
        setTimeout(() => setShowLogoutModal(true), 120)
      } else {
        setShowLogoutModal(true)
      }
    }

    return (
      <SidebarMenuItem>
        <SidebarMenuButton
          onClick={onClick}
          tooltip="Logout"
          className="w-full text-destructive hover:text-destructive"
        >
          <LogOut className="h-6 w-6 md:h-5 md:w-5" />
          <span className="group-data-[state=collapsed]:hidden">Logout</span>
        </SidebarMenuButton>
      </SidebarMenuItem>
    )
  }

  return (
    <>
      <SidebarProvider>
        {/* default width is narrower on mobile (w-56), expands on md/lg */}
        <Sidebar collapsible="icon" className="border-r border-sidebar-border w-32 md:w-64 lg:w-64">
          <SidebarHeader className="border-b border-sidebar-border">
            <Link href="/admin/dashboard" className="flex items-center gap-2 group">
              <img src="/logo.png" alt="HerCircle" className="h-16 w-12 md:h-14 md:w-10" />
              <span className="font-bold text-sidebar-foreground text-base md:text-md text-lg group-data-[state=collapsed]:hidden">Admin</span>
            </Link>
          </SidebarHeader>

          <SidebarContent>
            {/* More generous gaps on mobile and slightly tighter on md+ */}
            <SidebarMenu className="gap-4 md:gap-2">
              {menuItems.map((item) => {
                const Icon = item.icon
                // avoid using pathname for active highlighting until after mount to
                // prevent hydration mismatches between server and client
                const isActive = mounted && pathname === item.href
                return (
                  <SidebarMenuItem key={item.href}>
                    <SidebarMenuButton
                      asChild
                      isActive={isActive}
                      tooltip={item.label}
                      className={isActive ? "bg-sidebar-primary text-sidebar-primary-foreground" : ""}
                    >
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
                <SidebarMenuButton
                  onClick={toggleTheme}
                  tooltip={theme === "light" ? "Dark Mode" : "Light Mode"}
                  className="w-full"
                >
                  {theme === "light" ? <Moon className="h-6 w-6 md:h-5 md:w-5" /> : <Sun className="h-6 w-6 md:h-5 md:w-5" />}
                  <span className="group-data-[state=collapsed]:hidden">{theme === "light" ? "Dark" : "Light"}</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
              {/* Use LogoutButtonInsideProvider so on mobile the sheet is closed
                  before showing the modal which prevents the modal buttons from
                  being blocked by the Sheet's overlay/stacking context. */}
              <LogoutButtonInsideProvider />
            </SidebarMenu>
          </SidebarFooter>
        </Sidebar>

  {/* Fixed top header so it stays visible while scrolling */}
  <InnerHeaderAndMain title={headerTitle}>{children}</InnerHeaderAndMain>
        <SidebarRail className="hidden lg:block" />
      </SidebarProvider>

      <LogoutConfirmationModal
        isOpen={showLogoutModal}
        onConfirm={handleLogout}
        onCancel={() => setShowLogoutModal(false)}
        isLoading={isLoggingOut}
      />
    </>
  )
}

function InnerHeaderAndMain({ children, title }: { children?: React.ReactNode; title?: string }) {
  // This component must be rendered inside SidebarProvider so useSidebar
  // is available and we can read the `state` and `isMobile` values.
  const { state, isMobile } = useSidebar()

  // When expanded we want the header to start after the full sidebar
  // width; when collapsed (icon-only) we start after the icon width.
  // The sidebar component exposes CSS variables we can reference here.
  const leftClass = isMobile
    ? 'left-0 right-0'
    : state === 'expanded'
    ? 'left-[var(--sidebar-width)] right-0'
    : 'left-[var(--sidebar-width-icon)] right-0'

  // Provide matching spacer height for the fixed header so content below
  // doesn't get hidden. Use CSS to ensure responsive alignment.
  return (
    <main className="flex-1 overflow-auto">
      <div
        className={`fixed top-0 z-50 p-4 border-b border-border flex items-center gap-2 bg-card backdrop-blur-sm shadow-sm transition-all duration-200 ${leftClass}`}
      >
        <SidebarTrigger />
        <h1 className="font-semibold">{title ?? 'Admin Dashboard'}</h1>
      </div>

      {/* spacer ensures children aren't hidden behind the fixed header */}
      <div className="h-16" />

      <div className="px-4">{children}</div>
    </main>
  )
}
