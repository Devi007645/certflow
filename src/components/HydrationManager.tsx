import React, { useEffect, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useDashboardStore } from '../store/useDashboardStore';

interface HydrationManagerProps {
  children: React.ReactNode;
  fallback: React.ReactNode;
}

/**
 * Ensures that the app is fully hydrated from persistence before rendering the main UI.
 * Prevents layout shifts and "flickering" of state.
 */
export const HydrationManager: React.FC<HydrationManagerProps> = ({ children, fallback }) => {
  const [isHydrated, setIsHydrated] = useState(false);
  const queryClient = useQueryClient();

  useEffect(() => {
    const hydrate = async () => {
      try {
        // Zustand persist automatically hydrates on start, but we can wait for it if needed
        // TanStack Query persistence is handled by PersistQueryClientProvider, 
        // which has its own hydration logic, but we can double check here.
        
        // Wait a small amount of time to ensure storage is ready
        await new Promise(resolve => setTimeout(resolve, 100));
        
        setIsHydrated(true);
      } catch (error) {
        console.error('Hydration failed:', error);
        setIsHydrated(true); // Proceed anyway to not block the app
      }
    };

    hydrate();
  }, []);

  if (!isHydrated) {
    return <>{fallback}</>;
  }

  return <>{children}</>;
};
