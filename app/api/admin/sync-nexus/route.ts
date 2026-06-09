import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth/config'
import { syncFromNexus } from '@/lib/nexus'

export async function POST() {
  const session = await auth()
  const role = (session?.user as { role?: string } | undefined)?.role
  if (!session?.user || role !== 'ADMIN') {
    return NextResponse.json({ error: 'Sem permissão' }, { status: 403 })
  }
  try {
    const result = await syncFromNexus()
    return NextResponse.json(result)
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 })
  }
}
