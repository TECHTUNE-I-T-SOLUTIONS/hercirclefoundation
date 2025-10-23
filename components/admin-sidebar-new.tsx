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

export function AdminSidebarNew({ children }: AdminSidebarNewProps) {
  const pathname = usePathname()
  const router = useRouter()
  const isMobile = useIsMobile()
  const [showLogoutModal, setShowLogoutModal] = useState(false)
  const [isLoggingOut, setIsLoggingOut] = useState(false)
  const [theme, setTheme] = useState<"light" | "dark">("light")
  const [unreadCount, setUnreadCount] = useState<number>(0)

  useEffect(() => {
    const savedTheme = localStorage.getItem("theme") as "light" | "dark" | null
    const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches
    const initialTheme = savedTheme || (prefersDark ? "dark" : "light")
    setTheme(initialTheme)
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
    { href: "/admin/volunteers", label: "Volunteers", icon: Users },
    { href: "/admin/donors", label: "Donors", icon: Heart },
    { href: "/admin/events", label: "Events", icon: Calendar },
    { href: "/admin/gallery", label: "Gallery", icon: ImageIcon },
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
              <img src="/logo.png" alt="Her Circle" className="h-16 w-12 md:h-14 md:w-10" />
              <span className="font-bold text-sidebar-foreground text-base md:text-md text-lg group-data-[state=collapsed]:hidden">Admin</span>
            </Link>
          </SidebarHeader>

          <SidebarContent>
            {/* More generous gaps on mobile and slightly tighter on md+ */}
            <SidebarMenu className="gap-4 md:gap-2">
              {menuItems.map((item) => {
                const Icon = item.icon
                const isActive = pathname === item.href
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

        <main className="flex-1 overflow-auto">
          <div className="p-4 border-b border-border flex items-center gap-2">
            <SidebarTrigger />
            <h1 className="font-semibold">Admin Dashboard</h1>
          </div>
          {children}
        </main>
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
