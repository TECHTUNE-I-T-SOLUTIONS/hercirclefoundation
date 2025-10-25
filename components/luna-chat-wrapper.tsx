"use client"

import dynamic from 'next/dynamic'
import React from 'react'

const LunaChat = dynamic(() => import('./luna-chat'), { ssr: false })

export default function LunaChatWrapper() {
  return <LunaChat />
}

