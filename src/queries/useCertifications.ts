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

export const useUpdateCertification = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (updates: Partial<Certification> & { id: number }) => {
      const { data, error } = await supabase
        .from('certifications')
        .update(updates)
        .eq('id', updates.id)
        .select()

      if (error) throw error
      return data[0] as Certification
    },
    onMutate: async (newCert) => {
      await queryClient.cancelQueries({ queryKey: ['certifications'] })
      const previousCertifications = queryClient.getQueryData<Certification[]>(['certifications'])

      queryClient.setQueryData<Certification[]>(['certifications'], (old) =>
        old?.map((cert) => (cert.id === newCert.id ? { ...cert, ...newCert } : cert))
      )

      return { previousCertifications }
    },
    onError: (err, newCert, context) => {
      queryClient.setQueryData(['certifications'], context?.previousCertifications)
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['certifications'] })
    },
  })
}

export const useCreateCertification = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (newCert: Omit<Certification, 'id' | 'created_at'>) => {
      const { data, error } = await supabase
        .from('certifications')
        .insert([newCert])
        .select()

      if (error) throw error
      return data[0] as Certification
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['certifications'] })
    },
  })
}
