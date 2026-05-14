import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'

export type Certification = {
  id: number
  user_id: string
  title: string
  issuing_organization: string
  issue_date: string
  file_url: string
  fileName: string
  admin_review: string
  created_at: string
  probable_completion_time?: string
  notes?: string
  tags?: string[]
  emoji?: string
}

export const useCertifications = () => {
  return useQuery({
    queryKey: ['certifications'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('certifications')
        .select('*')
        .order('created_at', { ascending: false })

      if (error) throw error
      return data as Certification[]
    },
  })
}

import { useOptimisticMutation } from '../hooks/useOptimisticMutation'

export const useUpdateCertification = () => {
  return useOptimisticMutation<Certification[]>(
    async (updates: Partial<Certification> & { id: number }) => {
      const { data, error } = await supabase
        .from('certifications')
        .update(updates)
        .eq('id', updates.id)
        .select()

      if (error) throw error
      return data[0] as Certification
    },
    {
      queryKey: ['certifications'],
      updateFn: (old, variables) => 
        old?.map((cert) => (cert.id === variables.id ? { ...cert, ...variables } : cert)) ?? [],
    }
  )
}

export const useCreateCertification = () => {
  return useOptimisticMutation<Certification[]>(
    async (newCert: Omit<Certification, 'id' | 'created_at'>) => {
      const { data, error } = await supabase
        .from('certifications')
        .insert([newCert])
        .select()

      if (error) throw error
      return data[0] as Certification
    },
    {
      queryKey: ['certifications'],
      updateFn: (old, variables) => [
        { ...variables, id: Math.random(), created_at: new Date().toISOString() } as Certification,
        ...(old ?? []),
      ],
    }
  )
}

export const useDeleteCertification = () => {
  return useOptimisticMutation<Certification[]>(
    async (id: number) => {
      const { data, error } = await supabase
        .from('certifications')
        .delete()
        .eq('id', id)
        .select()

      if (error) throw error
      return data[0] as Certification
    },
    {
      queryKey: ['certifications'],
      updateFn: (old, variables) => old?.filter((cert) => cert.id !== variables) ?? [],
    }
  )
}
