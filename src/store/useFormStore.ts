import { create } from 'zustand'
import { persist } from 'zustand/middleware'

interface FormState {
  title: string;
  issuing_organization: string;
  issue_date: string;
  fileName: string;
  fileData?: string;
  probable_completion_time?: string;
  tags: string[];
  progress: number;
}

interface StoreState {
  form: FormState;
  isDirty: boolean;
  isLoading: boolean;
  isSaving: boolean;
  saveStatus: 'idle' | 'saving' | 'saved' | 'error';
  setForm: (form: Partial<FormState>) => void;
  setSaveStatus: (status: 'idle' | 'saving' | 'saved' | 'error') => void;
  resetForm: () => void;
}

const initialFormState: FormState = {
  title: '',
  issuing_organization: '',
  issue_date: '',
  fileName: '',
  fileData: '',
  probable_completion_time: '',
  tags: [],
  progress: 0,
};

export const useFormStore = create<StoreState>()(
  persist(
    (set) => ({
      form: initialFormState,
      isDirty: false,
      isLoading: false,
      isSaving: false,
      saveStatus: 'idle',
      setForm: (newForm) => set((state) => ({
        form: { ...state.form, ...newForm },
        isDirty: true,
      })),
      setSaveStatus: (status) => set({ saveStatus: status }),
      resetForm: () => set({ form: initialFormState, isDirty: false, saveStatus: 'idle' }),
    }),
    {
      name: 'proofly-form-storage', // name of the item in the storage (must be unique)
      partialize: (state) => ({ form: state.form }), // only persist the form state
    }
  )
)
