import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { recordXpEvent } from '@/lib/xpEngine';
import { invokeAuthedFunction, AuthSessionMissingError } from '@/lib/invokeAuthedFunction';
import type { WorkspaceDocument } from '@/lib/workspaceEngine';
import type { TaskContext } from '@/types/tasks';

interface CreateDocumentParams {
  doc_type: string;
  title: string;
  source_type?: string;
  source_id?: string;
  idea_id?: string;
  venture_id?: string;
  folder_id?: string; // Added: associate doc with a folder
}

export type WorkspaceScope = 'current_venture' | 'all';

interface UseWorkspaceOptions {
  ventureId?: string | null;
  scope?: WorkspaceScope;
}

export function useWorkspace(options: UseWorkspaceOptions = {}) {
  const { user } = useAuth();
  const [documents, setDocuments] = useState<WorkspaceDocument[]>([]);
  const [currentDocument, setCurrentDocument] = useState<WorkspaceDocument | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [scope, setScope] = useState<WorkspaceScope>(options.scope ?? 'current_venture');

  const ventureId = options.ventureId;

  /**
   * Load a single document by ID
   */
  const loadDocument = useCallback(async (id: string) => {
    if (!user) {
      setError('User not authenticated');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const { data, error: fetchError } = await supabase
        .from('workspace_documents')
        .select('*')
        .eq('id', id)
        .eq('user_id', user.id)
        .maybeSingle();

      if (fetchError) throw fetchError;

      if (!data) {
        setError('Document not found');
        setCurrentDocument(null);
        return;
      }

      setCurrentDocument(data as WorkspaceDocument);
    } catch (err) {
      console.error('Error loading document:', err);
      setError(err instanceof Error ? err.message : 'Failed to load document');
      setCurrentDocument(null);
    } finally {
      setLoading(false);
    }
  }, [user]);

  /**
   * Create a new workspace document
   */
  const createDocument = useCallback(async (params: CreateDocumentParams) => {
    if (!user) {
      setError('User not authenticated');
      return null;
    }

    setLoading(true);
    setError(null);

    try {
      const { data, error: insertError } = await supabase
        .from('workspace_documents')
        .insert({
          user_id: user.id,
          doc_type: params.doc_type,
          title: params.title,
          source_type: params.source_type || 'manual',
          source_id: params.source_id || null,
          idea_id: params.idea_id || null,
          venture_id: params.venture_id || null,
          folder_id: params.folder_id || null, // Associate with folder
          content: '',
          status: 'draft',
        })
        .select()
        .single();

      if (insertError) throw insertError;

      const newDoc = data as WorkspaceDocument;
      setDocuments(prev => [newDoc, ...prev]);
      setCurrentDocument(newDoc);
      
      return newDoc;
    } catch (err) {
      console.error('Error creating document:', err);
      setError(err instanceof Error ? err.message : 'Failed to create document');
      return null;
    } finally {
      setLoading(false);
    }
  }, [user]);

  /**
   * Update document content
   */
  const updateContent = useCallback(async (id: string, newContent: string) => {
    if (!user) {
      setError('User not authenticated');
      return;
    }

    try {
      // Get current document to compare content length
      const { data: currentDoc, error: fetchError } = await supabase
        .from('workspace_documents')
        .select('content, metadata')
        .eq('id', id)
        .eq('user_id', user.id)
        .single();

      if (fetchError) throw fetchError;

      const oldContent = currentDoc?.content || '';
      const oldLength = oldContent.length;
      const newLength = newContent.length;
      const contentGrowth = newLength - oldLength;

      // Check if we should award XP (meaningful growth + rate limiting)
      const shouldAwardXP = contentGrowth >= 50; // At least 50 characters added
      
      // Safely parse metadata
      const metadata = currentDoc?.metadata && typeof currentDoc.metadata === 'object' && !Array.isArray(currentDoc.metadata)
        ? currentDoc.metadata as Record<string, any>
        : {};
      
      const lastXpAwarded = metadata.last_xp_awarded 
        ? new Date(metadata.last_xp_awarded as string).getTime() 
        : 0;
      const now = Date.now();
      const fiveMinutes = 5 * 60 * 1000; // 5 minutes in milliseconds
      const canAwardXP = (now - lastXpAwarded) > fiveMinutes;

      // Update metadata if awarding XP
      const updatedMetadata = shouldAwardXP && canAwardXP
        ? { ...metadata, last_xp_awarded: new Date().toISOString() }
        : metadata;

      const { error: updateError } = await supabase
        .from('workspace_documents')
        .update({
          content: newContent,
          metadata: updatedMetadata,
          updated_at: new Date().toISOString(),
        })
        .eq('id', id)
        .eq('user_id', user.id);

      if (updateError) throw updateError;

      // Award XP if conditions met
      if (shouldAwardXP && canAwardXP) {
        await recordXpEvent(user.id, 'workspace_saved', 15, { documentId: id });
      }

      // Update documents list (for sidebar display), but NOT currentDocument
      // The editor maintains its own local state - updating currentDocument causes race conditions
      setDocuments(prev =>
        prev.map(doc =>
          doc.id === id
            ? { 
                ...doc, 
                content: newContent, 
                metadata: updatedMetadata as any,
                updated_at: new Date().toISOString() 
              }
            : doc
        )
      );
      // Note: We intentionally do NOT update currentDocument here
      // The editor's local state is the source of truth during active editing
    } catch (err) {
      console.error('Error updating content:', err);
      setError(err instanceof Error ? err.message : 'Failed to update content');
    }
  }, [user]);

  /**
   * Request AI suggestion for a document (with optional refinement)
   */
  const requestAISuggestion = useCallback(async (
    documentId: string, 
    taskContext?: TaskContext,
    refinementOptions?: {
      previousSuggestion?: string;
      refinementType?: 'shorter' | 'detailed' | 'different' | 'actionable';
    }
  ) => {
    if (!user) {
      setError('User not authenticated');
      return null;
    }

    setLoading(true);
    setError(null);

    try {
      const { data, error } = await invokeAuthedFunction<{ suggestion?: string }>(
        'generate-workspace-suggestion',
        {
          body: {
            documentId,
            taskContext: taskContext ?? null,
            previousSuggestion: refinementOptions?.previousSuggestion,
            refinementType: refinementOptions?.refinementType,
          },
        }
      );

      if (error) throw error;

      // If we got a suggestion, update ai_suggestions directly
      if (data?.suggestion) {
        await supabase
          .from('workspace_documents')
          .update({ ai_suggestions: data.suggestion })
          .eq('id', documentId);
      }

      // Refresh documents list based on current scope
      await refreshList();

      // Reload the current document to update state
      const { data: updatedDoc } = await supabase
        .from('workspace_documents')
        .select('*')
        .eq('id', documentId)
        .eq('user_id', user.id)
        .maybeSingle();
      
      if (updatedDoc) {
        setCurrentDocument(updatedDoc as WorkspaceDocument);
      }

      return data?.suggestion as string | null;
    } catch (err) {
      console.error('Error requesting AI suggestion:', err);
      setError(err instanceof Error ? err.message : 'Failed to generate AI suggestion');
      return null;
    } finally {
      setLoading(false);
    }
  }, [user]);

  /**
   * Rename a document
   */
  const renameDocument = useCallback(async (id: string, newTitle: string) => {
    if (!user) {
      setError('User not authenticated');
      return;
    }

    try {
      const { error: updateError } = await supabase
        .from('workspace_documents')
        .update({ title: newTitle, updated_at: new Date().toISOString() })
        .eq('id', id)
        .eq('user_id', user.id);

      if (updateError) throw updateError;

      setDocuments(prev =>
        prev.map(doc => (doc.id === id ? { ...doc, title: newTitle } : doc))
      );
      if (currentDocument?.id === id) {
        setCurrentDocument(prev => prev ? { ...prev, title: newTitle } : prev);
      }
    } catch (err) {
      console.error('Error renaming document:', err);
      setError(err instanceof Error ? err.message : 'Failed to rename document');
    }
  }, [user, currentDocument?.id]);

  /**
   * Refresh the list of documents based on scope
   */
  const refreshList = useCallback(async (overrideScope?: WorkspaceScope) => {
    if (!user) {
      setDocuments([]);
      return;
    }

    const effectiveScope = overrideScope ?? scope;
    setLoading(true);
    setError(null);

    try {
      let query = supabase
        .from('workspace_documents')
        .select('*')
        .eq('user_id', user.id)
        .order('updated_at', { ascending: false });

      // Apply venture scoping if in current_venture mode and ventureId is provided
      if (effectiveScope === 'current_venture' && ventureId) {
        query = query.eq('venture_id', ventureId);
      }

      const { data, error: fetchError } = await query;

      if (fetchError) throw fetchError;

      setDocuments((data || []) as WorkspaceDocument[]);
    } catch (err) {
      console.error('Error refreshing documents:', err);
      setError(err instanceof Error ? err.message : 'Failed to refresh documents');
      setDocuments([]);
    } finally {
      setLoading(false);
    }
  }, [user, scope, ventureId]);

  /**
   * Change the scope and refresh documents
   */
  const changeScope = useCallback((newScope: WorkspaceScope) => {
    setScope(newScope);
    refreshList(newScope);
  }, [refreshList]);

  return {
    documents,
    currentDocument,
    loading,
    error,
    scope,
    loadDocument,
    createDocument,
    updateContent,
    renameDocument,
    requestAISuggestion,
    refreshList,
    changeScope,
  };
}
