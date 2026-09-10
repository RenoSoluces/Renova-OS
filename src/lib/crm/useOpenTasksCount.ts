import { useEffect, useState } from 'react'
import { supabase } from '../supabase'

export function useOpenTasksCount(refreshTrigger?: unknown): number {
  const [count, setCount] = useState(0)

  useEffect(() => {
    let cancelled = false
    async function load() {
      const endOfToday = new Date()
      endOfToday.setHours(23, 59, 59, 999)
      const { data } = await supabase.from('tasks').select('id, due_at').eq('done', false)
      if (cancelled) return
      const due = (data || []).filter((t: any) => !t.due_at || new Date(t.due_at) <= endOfToday)
      setCount(due.length)
    }
    load()
    const interval = setInterval(load, 60000)
    return () => { cancelled = true; clearInterval(interval) }
  }, [refreshTrigger])

  return count
}
