import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import type { 
  FeaturePRD, 
  CreateFeaturePRDRequest,
  FeatureStatus 
} from '@/types/implementationKit';

// Query key factory
export const featurePRDKeys = {
  all: ['feature-prds'] as const,
  lists: () => [...featurePRDKeys.all, 'list'] as const,
  list: (filters: Record<string, unknown>) => [...featurePRDKeys.lists(), filters] as const,
  details: () => [...featurePRDKeys.all, 'detail'] as const,
  detail: (id: string) => [...featurePRDKeys.details(), id] as const,
  byKit: (kitId: string) => [...featurePRDKeys.all, 'kit', kitId] as const,
};

// Fetch all PRDs for an implementation kit
export function useFeaturePRDsByKit(kitId: string | undefined) {
  return useQuery({
    queryKey: featurePRDKeys.byKit(kitId || ''),
    queryFn: async () => {
      if (!kitId) return [];
      
      const { data, error } = await supabase
        .from('feature_prds')
        .select('*')
        .eq('implementation_kit_id', kitId)
        .order('priority', { ascending: true })
        .order('created_at', { ascending: true });
      
      if (error) throw error;
      return data as FeaturePRD[];
    },
    enabled: !!kitId,
  });
}

// Fetch single PRD
export function useFeaturePRD(prdId: string | undefined) {
  return useQuery({
    queryKey: featurePRDKeys.detail(prdId || ''),
    queryFn: async () => {
      if (!prdId) return null;
      
      const { data, error } = await supabase
        .from('feature_prds')
        .select('*')
        .eq('id', prdId)
        .single();
      
      if (error) throw error;
      return data as FeaturePRD;
    },
    enabled: !!prdId,
  });
}

// Create feature PRD mutation
export function useCreateFeaturePRD() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  
  return useMutation({
    mutationFn: async (request: CreateFeaturePRDRequest) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');
      
      // Call edge function to generate PRD
      const { data, error } = await supabase.functions.invoke('generate-feature-prd', {
        body: {
          ...request,
          userId: user.id,
        },
      });
      
      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      toast({
        title: 'Feature PRD Generated!',
        description: `PRD for "${variables.featureName}" is ready.`,
      });
      
      queryClient.invalidateQueries({ queryKey: featurePRDKeys.byKit(variables.implementationKitId) });
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

// Update PRD status mutation
export function useUpdatePRDStatus() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  
  return useMutation({
    mutationFn: async ({ 
      prdId, 
      status,
      blockedReason 
    }: { 
      prdId: string; 
      status: FeatureStatus;
      blockedReason?: string;
    }) => {
      const updateData: Record<string, unknown> = { status };
      if (status === 'blocked' && blockedReason) {
        updateData.blocked_reason = blockedReason;
      } else if (status !== 'blocked') {
        updateData.blocked_reason = null;
      }
      
      const { error } = await supabase
        .from('feature_prds')
        .update(updateData)
        .eq('id', prdId);
      
      if (error) throw error;
    },
    onSuccess: (_, variables) => {
      toast({
        title: 'Status Updated',
      });
      queryClient.invalidateQueries({ queryKey: featurePRDKeys.detail(variables.prdId) });
    },
    onError: (error: Error) => {
      toast({
        title: 'Update Failed',
        description: error.message,
        variant: 'destructive',
      });
    },
  });
}

// Update PRD tracking data
export function useUpdatePRDTracking() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ 
      prdId, 
      estimatedDays,
      actualDays 
    }: { 
      prdId: string; 
      estimatedDays?: number;
      actualDays?: number;
    }) => {
      const updateData: Record<string, unknown> = {};
      if (estimatedDays !== undefined) updateData.estimated_days = estimatedDays;
      if (actualDays !== undefined) updateData.actual_days = actualDays;
      
      const { error } = await supabase
        .from('feature_prds')
        .update(updateData)
        .eq('id', prdId);
      
      if (error) throw error;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: featurePRDKeys.detail(variables.prdId) });
    },
  });
}

// Delete feature PRD mutation
export function useDeleteFeaturePRD() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  
  return useMutation({
    mutationFn: async (prdId: string) => {
      const { error } = await supabase
        .from('feature_prds')
        .delete()
        .eq('id', prdId);
      
      if (error) throw error;
    },
    onSuccess: () => {
      toast({
        title: 'PRD Deleted',
        description: 'Feature PRD has been removed.',
      });
      queryClient.invalidateQueries({ queryKey: featurePRDKeys.all });
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
