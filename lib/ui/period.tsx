'use client'
import { createContext, useContext, useState } from 'react'
import type { Period } from '@/lib/mock/dashboard'

const PeriodCtx = createContext<{ period: Period; setPeriod: (p: Period) => void }>({
  period: '30d',
  setPeriod: () => {},
})

export function PeriodProvider({ children }: { children: React.ReactNode }) {
  const [period, setPeriod] = useState<Period>('30d')
  return <PeriodCtx.Provider value={{ period, setPeriod }}>{children}</PeriodCtx.Provider>
}

export function usePeriod() {
  return useContext(PeriodCtx)
}
