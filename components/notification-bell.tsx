"use client"

import { useEffect, useState } from "react"
import { Bell } from "lucide-react"

export default function NotificationBell() {
  const [unread, setUnread] = useState<number | null>(null)
  const [subscribed, setSubscribed] = useState(false)

  useEffect(() => {
    let mounted = true
    const check = async () => {
      try {
        if (typeof navigator !== 'undefined' && 'serviceWorker' in navigator) {
          const reg = await navigator.serviceWorker.getRegistration()
          if (reg) {
            const sub = await reg.pushManager.getSubscription()
            setSubscribed(Boolean(sub))
          } else {
            setSubscribed(false)
          }
        }
      } catch (err) {
        console.error(err)
      }
    }

    check()

    const handler = () => setSubscribed(true)
    window.addEventListener('pushSubscribed', handler)

    return () => {
      mounted = false
      window.removeEventListener('pushSubscribed', handler)
    }
  }, [])
  if (subscribed) return null

  const handleClick = async () => {
    try {
      if (!('serviceWorker' in navigator) || !('PushManager' in window) || !('Notification' in window)) {
        alert('Push notifications are not supported in this browser')
        return
      }

      const reg = await navigator.serviceWorker.register('/sw.js')

      // check current permission
      if (Notification.permission === 'denied') {
        // open help modal
        window.dispatchEvent(new Event('openPushHelp'))
        return
      }

      if (Notification.permission === 'default') {
        const p = await Notification.requestPermission()
        if (p !== 'granted') {
          // if blocked or dismissed, open help modal to instruct how to enable
          window.dispatchEvent(new Event('openPushHelp'))
          return
        }
      }

      // now permission is granted
      const subExisting = await reg.pushManager.getSubscription()
      let sub = subExisting
      if (!sub) {
        // fetch VAPID public key from server to ensure correct formatting
        const keyRes = await fetch('/api/push/public-key')
        if (!keyRes.ok) {
          alert('Server VAPID key not available')
          return
        }
        const { publicKey } = await keyRes.json()
        sub = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: urlBase64ToUint8Array(publicKey) })
      }

      // send to server
      await fetch('/api/push/subscribe', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(sub) })

      setSubscribed(true)
      window.dispatchEvent(new CustomEvent('pushSubscribed'))
    } catch (err) {
      console.error('Subscribe failed', err)
      alert('Subscription failed. Check console for details.')
    }
  }

  return (
    <div className="fixed bottom-6 right-6 z-50">
      <button onClick={handleClick} title="Enable notifications" aria-label="Enable notifications" className="relative inline-flex items-center justify-center h-12 w-12 rounded-full bg-primary text-white shadow-lg hover:scale-105 transition-transform">
        <Bell className="h-6 w-6" />
      </button>
    </div>
  )
}

function urlBase64ToUint8Array(base64String: string) {
  if (!base64String) return new Uint8Array()
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
  const rawData = window.atob(base64)
  const outputArray = new Uint8Array(rawData.length)
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i)
  }
  return outputArray
}
