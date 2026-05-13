import { useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { useFormStore } from '../store/useFormStore'
import { useAutosave } from './useAutosave'

export const useRealtimeForm = (userId: string | undefined) => {
  const { form, setForm } = useFormStore()

  useEffect(() => {
    if (!userId) return

    const channel = supabase.channel(`form-sync:${userId}`)

    channel
      .on('broadcast', { event: 'form-update' }, (payload) => {
        console.log('Received form update via broadcast:', payload)
        // Update store without triggering a save/broadcast loop
        useFormStore.setState((state) => ({
          form: { ...state.form, ...payload.payload },
          isDirty: false
        }))
      })
      .subscribe((status) => {
        console.log('Form sync channel status:', status)
      })

    return () => {
      supabase.removeChannel(channel)
    }
  }, [userId])

  // Function to broadcast changes
  const broadcastChange = (changes: any) => {
    if (!userId) return
    const channel = supabase.channel(`form-sync:${userId}`)
    channel.send({
      type: 'broadcast',
      event: 'form-update',
      payload: changes,
    })
  }

  // Use autosave to debounce broadcast of form changes
  useAutosave(form, 1000, async (currentForm) => {
    broadcastChange(currentForm)
  })

  const updateForm = (changes: any) => {
    setForm(changes)
  }

  return {
    form,
    updateForm,
  }
}
