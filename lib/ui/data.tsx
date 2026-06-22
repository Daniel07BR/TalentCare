'use client'
import { createContext, useContext } from 'react'
import type { TalentData } from '@/lib/mock/data'

const TalentDataCtx = createContext<TalentData>({ employees: [], departments: [], deptMeta: {} })

export function TalentDataProvider({ value, children }: { value: TalentData; children: React.ReactNode }) {
  return <TalentDataCtx.Provider value={value}>{children}</TalentDataCtx.Provider>
}

export function useTalentData(): TalentData {
  return useContext(TalentDataCtx)
}
