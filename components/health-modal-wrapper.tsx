"use client"

import dynamic from 'next/dynamic'
import React from 'react'

const HealthModal = dynamic(() => import('./health-modal'), { ssr: false })

export default function HealthModalWrapper() {
  return <HealthModal />
}
