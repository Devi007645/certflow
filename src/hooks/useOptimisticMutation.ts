import { useMutation, useQueryClient, UseMutationOptions } from '@tanstack/react-query';

interface OptimisticOptions<TData, TVariables, TContext> {
  queryKey: unknown[];
  updateFn: (oldData: TData | undefined, variables: TVariables) => TData;
}

/**
 * A generic hook for optimistic mutations.
 * Automatically handles canceling queries, updating cache, and rolling back on error.
 */
export function useOptimisticMutation<TData = any, TVariables = any, TContext = any>(
  mutationFn: (variables: TVariables) => Promise<any>,
  options: OptimisticOptions<TData, TVariables, TContext> & UseMutationOptions<any, any, TVariables, any>
) {
  const queryClient = useQueryClient();
  const { queryKey, updateFn, ...mutationOptions } = options;

  return useMutation({
    mutationFn,
    ...mutationOptions,
    onMutate: async (variables: TVariables) => {
      // Cancel any outgoing refetches so they don't overwrite our optimistic update
      await queryClient.cancelQueries({ queryKey });

      // Snapshot the previous value
      const previousData = queryClient.getQueryData<TData>(queryKey);

      // Optimistically update to the new value
      queryClient.setQueryData<TData>(queryKey, (old) => updateFn(old, variables));

      // Return a context object with the snapshotted value
      return { previousData };
    },
    onError: (err, variables, context: any) => {
      // Rollback to the previous value if the mutation fails
      if (context?.previousData) {
        queryClient.setQueryData(queryKey, context.previousData);
      }
    },
    onSettled: () => {
      // Always refetch after error or success to ensure we are in sync with the server
      queryClient.invalidateQueries({ queryKey });
    },
  });
}
