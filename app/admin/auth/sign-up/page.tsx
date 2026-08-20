"use client"

import Link from "next/link"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Mail, Phone } from "lucide-react"

export default function AdminSignUpPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/10 to-transparent p-4">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <img src="/logo.png" alt="HerCircle" className="h-16 w-16 mx-auto mb-4" />
          <h1 className="text-3xl font-bold">Management Access</h1>
          <p className="text-muted-foreground mt-2">HerCircle Foundation</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Super Admin Access Only</CardTitle>
            <CardDescription>
              Self-signup for admin accounts is disabled. Please contact support if you want to join the management team.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="rounded-lg border p-4 space-y-3 text-sm">
              <div className="flex items-center gap-2">
                <Mail className="h-4 w-4" />
                <span>support@hercirclefoundation.app</span>
              </div>
              <div className="flex items-center gap-2">
                <Phone className="h-4 w-4" />
                <span>+234 810 625 5776</span>
              </div>
            </div>
            <Button asChild className="w-full">
              <Link href="/contact">Contact Support</Link>
            </Button>
            <p className="text-center text-sm text-muted-foreground">
              Already have access?{" "}
              <Link href="/admin/auth/login" className="text-primary hover:underline font-medium">
                Login
              </Link>
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
