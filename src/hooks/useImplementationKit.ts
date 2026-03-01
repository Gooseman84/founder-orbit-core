import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import type { 
  ImplementationKit, 
  CreateKitRequest,
  KitStatus
} from '@/types/implementationKit';

// Query key factory
export const implementationKitKeys = {
  all: ['implementation-kits'] as const,
  lists: () => [...implementationKitKeys.all, 'list'] as const,
  list: (filters: Record<string, unknown>) => [...implementationKitKeys.lists(), filters] as const,
  details: () => [...implementationKitKeys.all, 'detail'] as const,
  detail: (id: string) => [...implementationKitKeys.details(), id] as const,
  byBlueprint: (blueprintId: string) => [...implementationKitKeys.all, 'blueprint', blueprintId] as const,
  byVenture: (ventureId: string) => [...implementationKitKeys.all, 'venture', ventureId] as const,
};

// Fetch implementation kit by blueprint ID
export function useImplementationKitByBlueprint(blueprintId: string | undefined) {
  return useQuery({
    queryKey: implementationKitKeys.byBlueprint(blueprintId || ''),
    queryFn: async () => {
      if (!blueprintId) return null;
      
      const { data, error } = await supabase
        .from('implementation_kits')
        .select('*')
        .eq('blueprint_id', blueprintId)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      
      if (error) throw error;
      return data as unknown as ImplementationKit | null;
    },
    enabled: !!blueprintId,
  });
}

// Fetch all implementation kits for a venture
export function useImplementationKitsByVenture(ventureId: string | undefined) {
  return useQuery({
    queryKey: implementationKitKeys.byVenture(ventureId || ''),
    queryFn: async () => {
      if (!ventureId) return [];
      
      const { data, error } = await supabase
        .from('implementation_kits')
        .select('*')
        .eq('venture_id', ventureId)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data as unknown as ImplementationKit[];
    },
    enabled: !!ventureId,
  });
}

// Fetch single implementation kit
export function useImplementationKit(kitId: string | undefined) {
  return useQuery({
    queryKey: implementationKitKeys.detail(kitId || ''),
    queryFn: async () => {
      if (!kitId) return null;
      
      const { data, error } = await supabase
        .from('implementation_kits')
        .select('*')
        .eq('id', kitId)
        .single();
      
      if (error) throw error;
      return data as unknown as ImplementationKit;
    },
    enabled: !!kitId,
  });
}

// Create implementation kit mutation
export function useCreateImplementationKit() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  
  return useMutation({
    mutationFn: async ({ blueprintId, ventureId, techStack }: CreateKitRequest) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');
      
      // Call edge function to generate kit
      const { data, error } = await supabase.functions.invoke('generate-implementation-kit', {
        body: {
          blueprintId,
          ventureId,
          techStack,
          userId: user.id,
        },
      });
      
      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      toast({
        title: 'Implementation Kit Generated!',
        description: 'Your documents are ready in the workspace.',
      });
      
      // Invalidate relevant queries
      queryClient.invalidateQueries({ queryKey: implementationKitKeys.byBlueprint(variables.blueprintId) });
      queryClient.invalidateQueries({ queryKey: implementationKitKeys.byVenture(variables.ventureId) });
    },
    onError: (error: Error) => {
      toast({
        title: 'Generation Failed',
        description: error.message,
        variant: 'destructive',
      });
    },
  });
}

// Update kit status mutation
export function useUpdateKitStatus() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ 
      kitId, 
      status, 
      errorMessage 
    }: { 
      kitId: string; 
      status: KitStatus; 
      errorMessage?: string 
    }) => {
      const { error } = await supabase
        .from('implementation_kits')
        .update({ 
          status, 
          error_message: errorMessage ?? null 
        })
        .eq('id', kitId);
      
      if (error) throw error;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: implementationKitKeys.detail(variables.kitId) });
    },
  });
}

// Delete implementation kit mutation
export function useDeleteImplementationKit() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  
  return useMutation({
    mutationFn: async (kitId: string) => {
      const { error } = await supabase
        .from('implementation_kits')
        .delete()
        .eq('id', kitId);
      
      if (error) throw error;
    },
    onSuccess: () => {
      toast({
        title: 'Kit Deleted',
        description: 'Implementation kit has been removed.',
      });
      queryClient.invalidateQueries({ queryKey: implementationKitKeys.all });
    },
    onError: (error: Error) => {
      toast({
        title: 'Delete Failed',
        description: error.message,
        variant: 'destructive',
      });
    },
  });
}
