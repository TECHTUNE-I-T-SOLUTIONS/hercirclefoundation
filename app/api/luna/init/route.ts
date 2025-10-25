import { NextResponse } from "next/server"
import { createClient as createServerSupabase } from "@/lib/supabase/server"

function generateToken() {
  return `${Math.random().toString(36).slice(2, 10)}${Date.now().toString(36).slice(-6)}`
}

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}))
    const { token, name, age_range, language, email, country } = body || {}

    const supabase = await createServerSupabase()

    // If token provided, try to find existing user
    if (token) {
      const { data: existingUser, error: selectError } = await supabase
        .from("ai_users")
        .select("*")
        .eq("user_token", token)
        .single()

      if (selectError && selectError.code !== "PGRST116") {
        // PGRST116 can mean no rows - ignore
      }

      if (existingUser) {
        // fetch recent history
        const { data: historyRows, error: historyError } = await supabase
          .from("ai_chat_history")
          .select('role, message, timestamp')
          .eq('user_id', existingUser.id)
          .order('timestamp', { ascending: true })
          .limit(50)

        const history = (historyRows || []).map((r: any) => ({ role: r.role, message: r.message, timestamp: r.timestamp }))

        return NextResponse.json({ user: existingUser, onboarding: false, history })
      }

      // If token given but no existing user, and we have profile data, create
      if (name || age_range || language || email || country) {
        const payload: any = {
          user_token: token,
          name: name || "",
          age_range: age_range || null,
          language: language || "en",
          email: email || null,
          country: country || null,
          ip_address: req.headers.get("x-forwarded-for") || req.headers.get("x-real-ip") || null,
        }

        const { data: created, error: insertError } = await supabase.from("ai_users").insert([payload]).select().single()
        if (insertError) return NextResponse.json({ error: insertError.message }, { status: 500 })
        return NextResponse.json({ user: created, onboarding: false })
      }

      // Token provided but no profile and no creation data -> ask to onboard
      return NextResponse.json({ onboarding: true, token })
    }

    // No token -> return onboarding required with a generated token
    const newToken = generateToken()
    return NextResponse.json({ onboarding: true, token: newToken })
  } catch (err: any) {
    return NextResponse.json({ error: err.message || String(err) }, { status: 500 })
  }
}
