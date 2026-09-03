'use client'
import { useEffect, useState } from 'react'
import { usePeriod } from '@/lib/ui/period'

export type ClassroomCourse = { courseId: string; title: string; createdAt: string; creatorNexusUserId: string }

// Busca a lista de cursos criados no período (ao vivo do ClassRoom) p/ o drill-down.
export function useClassroomCourses(): { courses: ClassroomCourse[]; loading: boolean } {
  const { period, query } = usePeriod()
  const [courses, setCourses] = useState<ClassroomCourse[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let alive = true
    setLoading(true)
    fetch(`/api/classroom-courses?${query}`, { cache: 'no-store' })
      .then((r) => r.json())
      .then((d: { courses: ClassroomCourse[] }) => {
        if (!alive) return
        setCourses(d.courses ?? [])
      })
      .catch(() => alive && setCourses([]))
      .finally(() => alive && setLoading(false))
    return () => {
      alive = false
    }
  }, [query])

  return { courses, loading }
}
