import { useEffect, useRef, useCallback } from 'react'
import { useFormStore } from '../store/useFormStore'

export const useAutosave = <T>(
  value: T,
  delay: number,
  onSave: (val: T) => Promise<void>
) => {
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const lastSavedValueRef = useRef<T>(value)
  const setSaveStatus = useFormStore((state) => state.setSaveStatus)

  const debouncedSave = useCallback(async (currentValue: T) => {
    if (JSON.stringify(currentValue) === JSON.stringify(lastSavedValueRef.current)) {
      return;
    }

    setSaveStatus('saving')
    try {
      await onSave(currentValue)
      lastSavedValueRef.current = currentValue
      setSaveStatus('saved')
      // Reset to idle after a short delay
      setTimeout(() => setSaveStatus('idle'), 2000)
    } catch (error) {
      console.error('Autosave failed:', error)
      setSaveStatus('error')
    }
  }, [onSave, setSaveStatus])

  useEffect(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current)
    }

    timerRef.current = setTimeout(() => {
      debouncedSave(value)
    }, delay)

    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current)
      }
    }
  }, [value, delay, debouncedSave])

  return {
    forceSave: () => debouncedSave(value)
  }
}
