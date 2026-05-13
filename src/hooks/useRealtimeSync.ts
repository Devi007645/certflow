import { useEffect } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import { Certification } from '../queries/useCertifications'

export const useRealtimeSync = () => {
  const queryClient = useQueryClient()

  useEffect(() => {
    const channel = supabase
      .channel('public:certifications')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'certifications' },
        (payload) => {
          console.log('Realtime change received:', payload)

          queryClient.setQueryData<Certification[]>(['certifications'], (old = []) => {
            switch (payload.eventType) {
              case 'INSERT':
                return [payload.new as Certification, ...old]
              case 'UPDATE':
                return old.map((item) =>
                  item.id === payload.new.id ? { ...item, ...payload.new } : item
                )
              case 'DELETE':
                return old.filter((item) => item.id !== payload.old.id)
              default:
                return old
            }
          })
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [queryClient])
}
