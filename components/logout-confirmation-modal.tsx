"use client"
import * as React from "react"
import ReactDOM from "react-dom"
import { Button } from "@/components/ui/button"
import { AlertCircle } from "lucide-react"

interface LogoutConfirmationModalProps {
  isOpen: boolean
  onConfirm: () => void
  onCancel: () => void
  isLoading?: boolean
}

export function LogoutConfirmationModal({
  isOpen,
  onConfirm,
  onCancel,
  isLoading = false,
}: LogoutConfirmationModalProps) {
  const [mounted, setMounted] = React.useState(false)

  React.useEffect(() => {
    setMounted(true)
    return () => setMounted(false)
  }, [])

  if (!isOpen || !mounted) return null

  const modal = (
    <div className="fixed inset-0 z-[2000] flex items-center justify-center bg-black/50 backdrop-blur-sm animate-fade-in">
      <div className="bg-card border border-border rounded-lg shadow-lg max-w-sm w-full mx-4 animate-slide-up z-[2100]">
        <div className="p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-destructive/10 rounded-full">
              <AlertCircle className="h-5 w-5 text-destructive" />
            </div>
            <h2 className="text-lg font-semibold">Confirm Logout</h2>
          </div>

          <p className="text-muted-foreground mb-6">
            Are you sure you want to logout? You'll need to sign in again to access the admin dashboard.
          </p>

          <div className="flex gap-3">
            <Button variant="outline" onClick={onCancel} disabled={isLoading} className="flex-1 bg-transparent">
              Cancel
            </Button>
            <Button variant="destructive" onClick={onConfirm} disabled={isLoading} className="flex-1">
              {isLoading ? "Logging out..." : "Logout"}
            </Button>
          </div>
        </div>
      </div>
    </div>
  )

  return ReactDOM.createPortal(modal, document.body)
}
