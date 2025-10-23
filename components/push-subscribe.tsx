"use client"

import { useEffect, useState } from "react"

export default function PushSubscribe() {
  const [supported, setSupported] = useState(false)
  const [subscribed, setSubscribed] = useState(false)
  const [permission, setPermission] = useState<NotificationPermission>("default")

  useEffect(() => {
    const can = typeof window !== "undefined" && "serviceWorker" in navigator && "PushManager" in window && "Notification" in window
    setSupported(can)

    if (!can) return

    ;(async () => {
      try {
        // auto-register service worker on page load
        const reg = await navigator.serviceWorker.register("/sw.js")

        const sub = await reg.pushManager.getSubscription()
        if (sub) {
          setSubscribed(true)
        }

        setPermission(Notification.permission)

        // If permission is default (browser will ask on first attempt) or promptable, request permission now
        if (Notification.permission === "default") {
          const p = await Notification.requestPermission()
          setPermission(p)
          if (p === "granted") {
            // subscribe immediately
            await subscribeWithRegistration(reg)
          }
        } else if (Notification.permission === "granted") {
          // ensure subscription exists
          if (!sub) await subscribeWithRegistration(reg)
        } else if (Notification.permission === "denied") {
          // inform the user they denied; we won't spam prompts but show instructions via console or UI
          console.warn("Notifications denied. To enable, update browser site settings.")
        }
      } catch (err) {
        console.error("SW registration/subscribe failed", err)
      }
    })()
  }, [])

  async function subscribeWithRegistration(reg: ServiceWorkerRegistration) {
    try {
      const key = (typeof (globalThis as any).NEXT_PUBLIC_VAPID_PUBLIC_KEY === "string")
        ? (globalThis as any).NEXT_PUBLIC_VAPID_PUBLIC_KEY
        : (process?.env?.NEXT_PUBLIC_VAPID_PUBLIC_KEY || "")

      if (!key) {
        console.warn("VAPID public key not found. Set NEXT_PUBLIC_VAPID_PUBLIC_KEY.")
        return
      }

      const applicationServerKey = urlBase64ToUint8Array(key)
      const subscription = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey })

      await fetch("/api/push/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(subscription),
      })

      setSubscribed(true)
      // notify other components that subscription exists
      window.dispatchEvent(new CustomEvent('pushSubscribed'))
    } catch (err) {
      console.error("Failed to subscribe", err)
    }
  }

  if (!supported) return null

  return (
    <div>
      {permission === "denied" ? (
        <div className="p-3 rounded border bg-yellow-50">
          <div className="font-semibold mb-2">Notifications blocked</div>
          <div className="text-sm text-muted-foreground mb-2">It looks like notifications are blocked for this site. To enable them, follow the instructions for your browser:</div>
          <ul className="list-disc ml-5 text-sm">
            <li><strong>Chrome/Edge:</strong> Click the lock icon in the address bar → Site settings → Notifications → Allow.</li>
            <li><strong>Firefox:</strong> Click the shield/lock → Permissions → Notifications → Allow.</li>
            <li><strong>Safari (macOS):</strong> Safari → Settings for This Website → Notifications → Allow.</li>
          </ul>
          <div className="mt-3 flex gap-2">
            <button className="px-3 py-1 rounded border" onClick={() => window.location.reload()}>I enabled, reload</button>
            <button className="px-3 py-1 rounded border" onClick={() => window.dispatchEvent(new Event('openPushHelp'))}>Help</button>
            <button className="px-3 py-1 rounded bg-primary text-white" onClick={async () => {
              // Attempt to re-register/subscribe if user toggles setting
              try {
                const reg = await navigator.serviceWorker.getRegistration() || await navigator.serviceWorker.register('/sw.js')
                await subscribeWithRegistration(reg)
              } catch (err) {
                console.error(err)
                alert('Unable to subscribe. Check browser settings.')
              }
            }}>Try subscribe</button>
          </div>
        </div>
      ) : (
        <button
          className="rounded px-3 py-1 bg-primary text-white"
          onClick={async () => {
            try {
              const reg = await navigator.serviceWorker.getRegistration()
              if (!reg) {
                const newReg = await navigator.serviceWorker.register("/sw.js")
                await subscribeWithRegistration(newReg)
              } else {
                await subscribeWithRegistration(reg)
              }
            } catch (err) {
              console.error(err)
            }
          }}
        >
          {subscribed ? "Subscribed" : "Subscribe"}
        </button>
      )}
    </div>
  )
}

function urlBase64ToUint8Array(base64String: string) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/")
  const rawData = window.atob(base64)
  const outputArray = new Uint8Array(rawData.length)
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i)
  }
  return outputArray
}
