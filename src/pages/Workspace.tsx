import { useEffect, useState, useCallback, useRef } from 'react';
import { useParams, useNavigate, useLocation, useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useWorkspace } from '@/hooks/useWorkspace';
import { useVentureState } from '@/hooks/useVentureState';
import { useBlueprint } from '@/hooks/useBlueprint';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { useXP } from '@/hooks/useXP';
import { useSubscription } from '@/hooks/useSubscription';
import { recordXpEvent } from '@/lib/xpEngine';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Sheet, SheetContent } from '@/components/ui/sheet';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { FileText, CheckCircle2, Download, Archive, Menu, Plus, FolderPlus, X, CheckSquare, Square, Rocket } from 'lucide-react';
import { exportWorkspaceDocToPdf } from '@/lib/pdfExport';
import { WorkspaceSidebar } from '@/components/workspace/WorkspaceSidebar';
import { WorkspaceEditor } from '@/components/workspace/WorkspaceEditor';
import { WorkspaceAssistantPanel, RefinementType } from '@/components/workspace/WorkspaceAssistantPanel';
import { ProBadge } from '@/components/billing/ProBadge';
import { ProUpgradeModal } from '@/components/billing/ProUpgradeModal';
import { useAnalytics } from '@/hooks/useAnalytics';
import { PLAN_FEATURES } from '@/config/plans';
import { useIsMobile } from '@/hooks/use-mobile';
import FeaturePlanner from '@/pages/FeaturePlanner';
import type { PaywallReasonCode } from '@/config/paywallCopy';
import type { TaskContext } from '@/types/tasks';
import type { Json } from '@/integrations/supabase/types';

interface WorkspaceFolder {
  id: string;
  user_id: string;
  venture_id: string | null;
  name: string;
  parent_folder_id: string | null;
  created_at: string;
  updated_at: string;
}

// Deep-link state from ExecutionTaskCard "Work on This"
interface ExecutionTaskDeepLink {
  id: string;
  title: string;
  description: string;
  category: string;
  estimatedMinutes: number;
  completed: boolean;
  aiPrompt: string;
  linkedSection: string | null;
  ventureId?: string;
}

export default function Workspace() {
  const { id: documentId } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams, setSearchParams] = useSearchParams();
  const { toast } = useToast();
  const { user } = useAuth();
  const { refresh: refreshXp } = useXP();
  const { plan } = useSubscription();
  const { activeVenture } = useVentureState();
  const { blueprint } = useBlueprint();
  const isMobile = useIsMobile();
  const isPro = plan === 'pro' || plan === 'founder';
  const deepLinkProcessed = useRef(false);

  // Tab state from URL search params
  const activeTab = searchParams.get('tab') === 'feature-builder' ? 'feature-builder' : 'documents';

  const handleTabChange = (tab: string) => {
    setSearchParams(tab === 'documents' ? {} : { tab }, { replace: true });
  };

  // Initialize workspace with venture scoping
  const {
    documents,
    currentDocument,
    loading,
    scope,
    loadDocument,
    createDocument,
    updateContent,
    renameDocument,
    requestAISuggestion,
    refreshList,
    changeScope,
  } = useWorkspace({
    ventureId: activeVenture?.id,
    scope: activeVenture ? 'current_venture' : 'all',
  });

  // Fetch workspace folders
  const { data: folders = [] } = useQuery<WorkspaceFolder[]>({
    queryKey: ['workspace-folders', user?.id, activeVenture?.id, scope],
    queryFn: async () => {
      if (!user?.id) return [];
      
      let query = supabase
        .from('workspace_folders')
        .select('*')
        .eq('user_id', user.id)
        .order('name');
      
      if (scope === 'current_venture' && activeVenture?.id) {
        query = query.or(`venture_id.eq.${activeVenture.id},venture_id.is.null`);
      }
      
      const { data, error } = await query;
      if (error) {
        console.error('Error fetching folders:', error);
        return [];
      }
      return data || [];
    },
    enabled: !!user?.id,
  });

  const [isNewDocDialogOpen, setIsNewDocDialogOpen] = useState(false);
  const [isNewFolderDialogOpen, setIsNewFolderDialogOpen] = useState(false);
  const [newDocTitle, setNewDocTitle] = useState('');
  const [newDocType, setNewDocType] = useState<string>('brain_dump');
  const [newFolderName, setNewFolderName] = useState('');
  const [parentFolderId, setParentFolderId] = useState<string | null>(null);
  const [isCreatingFolder, setIsCreatingFolder] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);
  const [taskCompleted, setTaskCompleted] = useState(false);
  const [completingTask, setCompletingTask] = useState(false);
  const [showPaywall, setShowPaywall] = useState(false);
  const [paywallReason, setPaywallReason] = useState<PaywallReasonCode>("EXPORT_REQUIRES_PRO");
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false);
  const [aiPanelCollapsed, setAiPanelCollapsed] = useState(true);
  const { track } = useAnalytics();
  
  // Execution task deep-link state
  const [executionTask, setExecutionTask] = useState<ExecutionTaskDeepLink | null>(null);
  const [taskIndicatorDismissed, setTaskIndicatorDismissed] = useState(false);

  // Get workspace doc limit for free users
  const maxWorkspaceDocs = isPro ? Infinity : PLAN_FEATURES.trial.maxWorkspaceDocs;

  // Extract taskContext from navigation state (legacy path)
  const taskContext = (location.state as { taskContext?: TaskContext } | null)?.taskContext;

  // Extract execution task deep-link from navigation state
  useEffect(() => {
    const state = location.state as { executionTask?: ExecutionTaskDeepLink } | null;
    if (state?.executionTask && !deepLinkProcessed.current) {
      const et = state.executionTask;
      setExecutionTask(et);
      setTaskCompleted(et.completed);
      setTaskIndicatorDismissed(false);
      
      // Auto-open AI panel
      setAiPanelCollapsed(false);
      
      deepLinkProcessed.current = true;

      // Clear the navigation state so refresh doesn't re-trigger
      window.history.replaceState({}, '', location.pathname);
    }
  }, [location.state, location.pathname]);

  // Reset deep-link processed flag when navigating to a different doc
  useEffect(() => {
    deepLinkProcessed.current = false;
  }, [documentId]);

  // Build a TaskContext from executionTask for the AI panel
  const effectiveTaskContext: TaskContext | undefined = taskContext || (executionTask ? {
    id: executionTask.id,
    title: executionTask.title,
    description: executionTask.description,
    category: executionTask.category,
    estimated_minutes: executionTask.estimatedMinutes,
    xp_reward: 10,
  } : undefined);

  // Handle completing an execution task (JSONB in venture_daily_tasks)
  const handleCompleteExecutionTask = async () => {
    if (!user || !executionTask) return;

    setCompletingTask(true);
    try {
      const today = new Date().toISOString().split("T")[0];
      const ventureId = executionTask.ventureId;
      if (!ventureId) throw new Error("No venture ID for task");

      // Fetch current daily tasks
      const { data: dailyRow, error: fetchError } = await supabase
        .from("venture_daily_tasks")
        .select("tasks")
        .eq("venture_id", ventureId)
        .eq("task_date", today)
        .maybeSingle();

      if (fetchError) throw fetchError;
      if (!dailyRow) throw new Error("No daily tasks found for today");

      const tasks = dailyRow.tasks as unknown as Array<Record<string, unknown>>;
      const updatedTasks = tasks.map((t) =>
        t.id === executionTask.id ? { ...t, completed: !taskCompleted } : t
      );

      const { error: updateError } = await supabase
        .from("venture_daily_tasks")
        .update({ tasks: JSON.parse(JSON.stringify(updatedTasks)) as Json })
        .eq("venture_id", ventureId)
        .eq("task_date", today);

      if (updateError) throw updateError;

      const newCompleted = !taskCompleted;
      setTaskCompleted(newCompleted);
      setExecutionTask(prev => prev ? { ...prev, completed: newCompleted } : prev);

      if (newCompleted) {
        await recordXpEvent(user.id, 'task_completed_from_workspace', 10, {
          taskId: executionTask.id,
          task_title: executionTask.title,
        });
        await refreshXp();
      }

      toast({
        title: newCompleted ? 'Task completed! 🎉' : 'Task uncompleted',
        description: newCompleted
          ? `You earned 10 XP for finishing "${executionTask.title}".`
          : `"${executionTask.title}" marked as incomplete.`,
      });
    } catch (err) {
      console.error('Error completing execution task:', err);
      toast({
        title: 'Error',
        description: 'Failed to update task status. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setCompletingTask(false);
    }
  };

  // Legacy task completion handler (for tasks table)
  const handleCompleteLinkedTask = async () => {
    if (!user || !taskContext) return;

    setCompletingTask(true);
    try {
      const { error } = await supabase
        .from('tasks')
        .update({
          status: 'completed',
          completed_at: new Date().toISOString(),
        })
        .eq('id', taskContext.id)
        .eq('user_id', user.id);

      if (error) throw error;

      const xpAmount = taskContext.xp_reward ?? 10;

      await recordXpEvent(user.id, 'task_completed_from_workspace', xpAmount, {
        taskId: taskContext.id,
        task_title: taskContext.title,
      });

      await refreshXp();
      setTaskCompleted(true);

      toast({
        title: 'Task completed! 🎉',
        description: `You earned ${xpAmount} XP for finishing "${taskContext.title}".`,
      });
    } catch (err) {
      console.error('Error completing linked task from workspace:', err);
      toast({
        title: 'Error',
        description: 'Failed to complete this task. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setCompletingTask(false);
    }
  };

  // Load documents list on mount and when venture/scope changes
  useEffect(() => {
    refreshList();
  }, [refreshList, activeVenture?.id, scope]);

  // Load document if ID is in URL
  useEffect(() => {
    if (documentId) {
      loadDocument(documentId);
      if (isMobile) setMobileDrawerOpen(false);
    }
  }, [documentId, loadDocument, isMobile]);

  // Debounced content update
  const debouncedUpdate = useCallback(
    (() => {
      let timeoutId: NodeJS.Timeout;
      return (id: string, content: string) => {
        clearTimeout(timeoutId);
        timeoutId = setTimeout(() => {
          updateContent(id, content);
        }, 1000);
      };
    })(),
    [updateContent]
  );

  const handleEditorChange = (content: string) => {
    if (currentDocument) {
      debouncedUpdate(currentDocument.id, content);
    }
  };

  const handleCreateDocument = async () => {
    if (!newDocTitle.trim()) {
      toast({
        title: 'Title required',
        description: 'Please enter a document title',
        variant: 'destructive',
      });
      return;
    }

    if (!isPro && documents.length >= maxWorkspaceDocs) {
      setPaywallReason("WORKSPACE_LIMIT");
      setShowPaywall(true);
      track("paywall_shown", { reasonCode: "WORKSPACE_LIMIT" });
      return;
    }

    const doc = await createDocument({
      doc_type: newDocType,
      title: newDocTitle.trim(),
      source_type: 'manual',
      venture_id: activeVenture?.id || undefined,
      folder_id: targetFolderId || undefined,
    });

    if (doc) {
      setIsNewDocDialogOpen(false);
      setNewDocTitle('');
      setNewDocType('brain_dump');
      setTargetFolderId(null);
      navigate(`/workspace/${doc.id}`);
      toast({
        title: 'Document created',
        description: `Created ${doc.title}`,
      });
    }
  };

  const handleRequestAI = async (ctx?: TaskContext) => {
    if (!currentDocument) return;

    setAiLoading(true);
    const result = await requestAISuggestion(currentDocument.id, ctx);
    setAiLoading(false);

    if (result) {
      toast({
        title: 'AI suggestions ready',
        description: ctx
          ? 'Your cofounder drafted ideas to move this task forward.'
          : 'Check the AI Assistant panel',
      });
    }
  };

  const handleRefineSuggestion = useCallback(async (refinementType: RefinementType) => {
    if (!currentDocument?.ai_suggestions) return;
    
    setAiLoading(true);
    const result = await requestAISuggestion(currentDocument.id, effectiveTaskContext, {
      previousSuggestion: currentDocument.ai_suggestions,
      refinementType,
    });
    setAiLoading(false);

    if (result) {
      toast({
        title: 'Suggestion refined',
        description: `Applied "${refinementType}" refinement to the suggestion.`,
      });
    }
  }, [currentDocument, effectiveTaskContext, requestAISuggestion, toast]);

  const handleApplySuggestion = useCallback(async (mode: 'insert' | 'replace') => {
    if (!currentDocument?.ai_suggestions) return;

    let newContent: string;

    if (mode === 'replace') {
      newContent = currentDocument.ai_suggestions;
    } else {
      newContent = (currentDocument.content || '') + '\n\n' + currentDocument.ai_suggestions;
    }

    try {
      const { error } = await supabase
        .from('workspace_documents')
        .update({ 
          content: newContent,
          ai_suggestions: null,
          updated_at: new Date().toISOString()
        })
        .eq('id', currentDocument.id);

      if (error) throw error;

      await loadDocument(currentDocument.id);

      toast({
        title: mode === 'replace' ? 'Content replaced' : 'Suggestion applied',
        description: mode === 'replace' 
          ? 'Editor content replaced with AI suggestion' 
          : 'AI content added to document',
      });

      if (isMobile) {
        setAiPanelCollapsed(true);
      }
    } catch (err) {
      console.error('Error applying suggestion:', err);
      toast({
        title: 'Error',
        description: 'Failed to apply suggestion',
        variant: 'destructive',
      });
    }
  }, [currentDocument, loadDocument, toast, isMobile]);

  const handleDismissSuggestion = useCallback(async () => {
    if (!currentDocument) return;
    
    try {
      await supabase
        .from('workspace_documents')
        .update({ ai_suggestions: null })
        .eq('id', currentDocument.id);
      
      await loadDocument(currentDocument.id);
      
      toast({
        title: 'Suggestion dismissed',
      });
      
      if (isMobile) {
        setAiPanelCollapsed(true);
      }
    } catch (err) {
      console.error('Error dismissing suggestion:', err);
      toast({
        title: 'Error',
        description: 'Failed to dismiss suggestion',
        variant: 'destructive',
      });
    }
  }, [currentDocument, loadDocument, toast, isMobile]);

  const handleArchiveDocument = async () => {
    if (!currentDocument || !user) return;

    try {
      const { error } = await supabase
        .from('workspace_documents')
        .update({ status: 'archived' })
        .eq('id', currentDocument.id);

      if (error) throw error;

      await refreshList();
      navigate('/workspace');
      toast({
        title: 'Document archived',
        description: 'Document has been moved to archive.',
      });
    } catch (err) {
      console.error('Error archiving document:', err);
      toast({
        title: 'Error',
        description: 'Failed to archive document',
        variant: 'destructive',
      });
    }
  };

  const handleSelectDocument = (id: string) => {
    navigate(`/workspace/${id}`);
    if (isMobile) setMobileDrawerOpen(false);
  };

  const handleCreateFolder = async () => {
    if (!newFolderName.trim() || !user) {
      toast({
        title: 'Folder name required',
        description: 'Please enter a folder name',
        variant: 'destructive',
      });
      return;
    }

    setIsCreatingFolder(true);
    try {
      const { error } = await supabase
        .from('workspace_folders')
        .insert({
          user_id: user.id,
          name: newFolderName.trim(),
          venture_id: activeVenture?.id || null,
          parent_folder_id: parentFolderId,
        });

      if (error) throw error;

      setIsNewFolderDialogOpen(false);
      setNewFolderName('');
      setParentFolderId(null);
      toast({
        title: parentFolderId ? 'Subfolder created' : 'Folder created',
        description: `Created "${newFolderName.trim()}"`,
      });
      
      await refreshList();
    } catch (err) {
      console.error('Error creating folder:', err);
      toast({
        title: 'Error',
        description: 'Failed to create folder',
        variant: 'destructive',
      });
    } finally {
      setIsCreatingFolder(false);
    }
  };

  const [targetFolderId, setTargetFolderId] = useState<string | null>(null);

  const handleOpenNewDocDialog = (folderId?: string) => {
    setTargetFolderId(folderId || null);
    setIsNewDocDialogOpen(true);
    if (isMobile) setMobileDrawerOpen(false);
  };

  const handleOpenNewFolderDialog = (parentId?: string) => {
    setParentFolderId(parentId || null);
    setIsNewFolderDialogOpen(true);
    if (isMobile) setMobileDrawerOpen(false);
  };

  // Sidebar component (reused in both desktop and mobile)
  const sidebarContent = (
    <WorkspaceSidebar
      documents={documents}
      folders={folders}
      currentId={currentDocument?.id}
      loading={loading}
      onSelect={handleSelectDocument}
      onNewDocument={handleOpenNewDocDialog}
      onNewFolder={handleOpenNewFolderDialog}
      onRename={renameDocument}
      onRefresh={refreshList}
      scope={scope}
      onScopeChange={changeScope}
      ventureName={activeVenture?.name}
      blueprintId={blueprint?.id}
      ventureId={activeVenture?.id}
    />
  );

  // Floating task indicator for execution tasks
  const showTaskIndicator = executionTask && !taskIndicatorDismissed;

  return (
    <div className="flex flex-col h-[calc(100vh-4rem)] overflow-hidden">
      {/* Workspace Tab Bar */}
      <div className="px-3 pt-2 shrink-0">
        <Tabs value={activeTab} onValueChange={handleTabChange}>
          <TabsList className="h-9">
            <TabsTrigger value="documents" className="gap-1.5 text-xs">
              <FileText className="w-3.5 h-3.5" />
              Documents
            </TabsTrigger>
            <TabsTrigger value="feature-builder" className="gap-1.5 text-xs">
              <Rocket className="w-3.5 h-3.5" />
              Feature Builder
            </TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {/* Feature Builder Tab */}
      {activeTab === 'feature-builder' ? (
        <div className="flex-1 overflow-y-auto p-2 md:p-4">
          <FeaturePlanner />
        </div>
      ) : (
      <>
      {/* Floating execution task indicator */}
      {showTaskIndicator && (
        <div className="mx-2 mt-1 mb-0 md:mx-3 shrink-0">
          <div className="flex items-center gap-2 rounded-lg border border-primary/20 bg-primary/5 px-3 py-2">
            <button
              onClick={handleCompleteExecutionTask}
              disabled={completingTask}
              className="shrink-0 text-primary hover:text-primary/80 transition-colors"
              aria-label={taskCompleted ? "Mark task incomplete" : "Mark task complete"}
            >
              {taskCompleted ? (
                <CheckSquare className="h-4 w-4" />
              ) : (
                <Square className="h-4 w-4" />
              )}
            </button>
            <div className="flex-1 min-w-0">
              <p className={`text-sm font-medium truncate ${taskCompleted ? 'line-through text-muted-foreground' : ''}`}>
                {taskCompleted ? '✓ ' : 'Working on: '}{executionTask.title}
              </p>
            </div>
            {taskCompleted && (
              <span className="text-xs text-muted-foreground shrink-0">Completed</span>
            )}
            <button
              onClick={() => setTaskIndicatorDismissed(true)}
              className="shrink-0 text-muted-foreground hover:text-foreground transition-colors"
              aria-label="Dismiss task indicator"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      )}

      {/* Mobile Header with hamburger menu */}
      {isMobile && (
        <div className="flex items-center gap-2 px-3 py-2 border-b bg-background shrink-0">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setMobileDrawerOpen(true)}
            className="h-9 w-9 shrink-0"
            aria-label="Open documents"
          >
            <Menu className="h-5 w-5" />
          </Button>
          <div className="flex-1 min-w-0">
            {currentDocument ? (
              <div>
                <p className="font-medium text-sm truncate">{currentDocument.title}</p>
                <p className="text-xs text-muted-foreground capitalize">
                  {currentDocument.doc_type?.replace('_', ' ')} · {currentDocument.status}
                </p>
              </div>
            ) : (
              <p className="font-medium text-sm">Workspace</p>
            )}
          </div>
          {currentDocument && (
            <div className="flex items-center gap-1 shrink-0">
              <Button
                variant="ghost"
                size="icon"
                onClick={handleArchiveDocument}
                className="h-9 w-9"
              >
                <Archive className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => {
                  if (!isPro) {
                    setPaywallReason("EXPORT_REQUIRES_PRO");
                    setShowPaywall(true);
                    track("paywall_shown", { reasonCode: "EXPORT_REQUIRES_PRO" });
                    return;
                  }
                  exportWorkspaceDocToPdf({
                    title: currentDocument.title || 'Workspace Document',
                    content: currentDocument.content || '',
                  });
                }}
                className="h-9 w-9"
              >
                <Download className="h-4 w-4" />
              </Button>
            </div>
          )}
        </div>
      )}

      {/* Mobile: Drawer for documents/folders */}
      {isMobile && (
        <Sheet open={mobileDrawerOpen} onOpenChange={setMobileDrawerOpen}>
          <SheetContent side="left" className="w-[85vw] max-w-sm p-0">
            <div className="h-full pt-6">
              {sidebarContent}
            </div>
          </SheetContent>
        </Sheet>
      )}

      <div className="flex flex-1 min-h-0 gap-2 p-1 md:gap-3 md:p-2">
        {/* Desktop: Left Sidebar - Documents List */}
        {!isMobile && (
          <aside className="w-64 shrink-0 min-w-0 hidden md:block">
            {sidebarContent}
          </aside>
        )}

        {/* Main Editor Area */}
        <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
          {/* Desktop: Document toolbar */}
          {currentDocument && !isMobile && (
            <div className="flex items-center justify-between mb-3 gap-2 flex-wrap px-1">
              <div className="flex items-center gap-2">
                <Label className="text-sm text-muted-foreground hidden sm:inline">Status:</Label>
                <Select
                  value={currentDocument.status || 'draft'}
                  onValueChange={async (value) => {
                    try {
                      const { error } = await supabase
                        .from('workspace_documents')
                        .update({ status: value })
                        .eq('id', currentDocument.id);
                      if (error) throw error;
                      await loadDocument(currentDocument.id);
                      await refreshList();
                      toast({ title: 'Status updated' });
                    } catch (err) {
                      console.error('Error updating status:', err);
                      toast({
                        title: 'Error',
                        description: 'Failed to update status',
                        variant: 'destructive',
                      });
                    }
                  }}
                >
                  <SelectTrigger className="w-[100px] sm:w-[120px] h-8">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="draft">Draft</SelectItem>
                    <SelectItem value="in_progress">In Progress</SelectItem>
                    <SelectItem value="final">Final</SelectItem>
                    <SelectItem value="archived">Archived</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex gap-1.5">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleArchiveDocument}
                  className="h-8"
                >
                  <Archive className="w-4 h-4 sm:mr-1" />
                  <span className="hidden sm:inline">Archive</span>
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    if (!isPro) {
                      setPaywallReason("EXPORT_REQUIRES_PRO");
                      setShowPaywall(true);
                      track("paywall_shown", { reasonCode: "EXPORT_REQUIRES_PRO" });
                      return;
                    }
                    exportWorkspaceDocToPdf({
                      title: currentDocument.title || 'Workspace Document',
                      content: currentDocument.content || '',
                    });
                  }}
                  className="h-8 gap-1"
                >
                  <Download className="w-4 h-4" />
                  <span className="hidden sm:inline">Export</span>
                  {!isPro && <ProBadge variant="pill" size="sm" locked />}
                </Button>
              </div>
            </div>
          )}
          {!currentDocument ? (
            <Card className="h-full flex items-center justify-center">
              <CardContent className="text-center py-12 px-6">
                <FileText className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
                <p className="text-lg font-medium mb-2">Select a document or start a new one</p>
                <p className="text-sm text-muted-foreground mb-4 max-w-xs mx-auto">
                  {isMobile ? 'Tap the menu icon to browse documents' : 'Choose from the sidebar or create a new workspace document'}
                </p>
                <div className="flex flex-col sm:flex-row gap-2 justify-center">
                  {isMobile && (
                    <Button variant="outline" onClick={() => setMobileDrawerOpen(true)} size="sm">
                      <Menu className="w-4 h-4 mr-1.5" />
                      Browse Documents
                    </Button>
                  )}
                  <Button onClick={() => setIsNewDocDialogOpen(true)} size="sm">
                    <FileText className="w-4 h-4 mr-1.5" />
                    New Document
                  </Button>
                </div>
              </CardContent>
            </Card>
          ) : (
            <div className="flex-1 min-h-0 overflow-y-auto px-1">
              <WorkspaceEditor document={currentDocument} onChange={handleEditorChange} />
            </div>
          )}
        </div>

        {/* Right Panel - AI Assistant (hidden on mobile, shown below editor) */}
        {currentDocument && !isMobile && (
          <aside className="w-72 shrink-0 min-w-0 flex flex-col gap-2 overflow-hidden">
            {/* Linked Task Card (legacy tasks table path) */}
            {taskContext && (
              <Card className="border-primary/20 bg-primary/5 shrink-0">
                <CardContent className="p-3">
                  <div className="flex items-start gap-2">
                    <CheckCircle2 className={`w-4 h-4 mt-0.5 ${taskCompleted ? 'text-green-500' : 'text-primary'}`} />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{taskContext.title}</p>
                      {taskContext.description && (
                        <p className="text-xs text-muted-foreground line-clamp-2 mt-0.5">
                          {taskContext.description}
                        </p>
                      )}
                      <div className="flex items-center gap-2 mt-1.5 text-xs text-muted-foreground">
                        {taskContext.estimated_minutes && (
                          <span>{taskContext.estimated_minutes} min</span>
                        )}
                        {taskContext.xp_reward && (
                          <span className="text-primary">+{taskContext.xp_reward} XP</span>
                        )}
                      </div>
                    </div>
                  </div>
                  <Button
                    size="sm"
                    className="w-full mt-2 h-7"
                    onClick={handleCompleteLinkedTask}
                    disabled={taskCompleted || completingTask}
                  >
                    {taskCompleted ? 'Completed ✓' : completingTask ? 'Completing...' : 'Mark Task Complete'}
                  </Button>
                </CardContent>
              </Card>
            )}

            {/* AI prompt context label for execution tasks */}
            {executionTask?.aiPrompt && (
              <div className="rounded-lg border border-primary/20 bg-primary/5 px-3 py-2 shrink-0">
                <p className="text-xs font-medium text-primary mb-1">
                  Suggested prompt for: {executionTask.title}
                </p>
                <p className="text-xs text-muted-foreground line-clamp-3">
                  {executionTask.aiPrompt}
                </p>
              </div>
            )}
            
            <div className="flex-1 min-h-0 overflow-y-auto">
              <WorkspaceAssistantPanel
                document={currentDocument}
                loading={aiLoading}
                onRequestSuggestion={handleRequestAI}
                onApplySuggestion={handleApplySuggestion}
                onDismissSuggestion={handleDismissSuggestion}
                onRefineSuggestion={handleRefineSuggestion}
                taskContext={effectiveTaskContext}
              />
            </div>
          </aside>
        )}
      </div>

      {/* Mobile: AI Assistant as a bottom sheet */}
      {currentDocument && isMobile && (
        <>
          <div className="p-2 pt-0">
            <WorkspaceAssistantPanel
              document={currentDocument}
              loading={aiLoading}
              onRequestSuggestion={handleRequestAI}
              onApplySuggestion={handleApplySuggestion}
              onDismissSuggestion={handleDismissSuggestion}
              onRefineSuggestion={handleRefineSuggestion}
              taskContext={effectiveTaskContext}
              isCollapsed={aiPanelCollapsed}
              onToggleCollapse={() => setAiPanelCollapsed(!aiPanelCollapsed)}
            />
          </div>

          <Sheet
            open={!aiPanelCollapsed}
            onOpenChange={(open) => setAiPanelCollapsed(!open)}
          >
            <SheetContent side="bottom" className="h-[80vh] flex flex-col p-0">
              <div
                className="flex-1 overflow-y-auto"
                style={{
                  paddingBottom: 'max(160px, calc(128px + env(safe-area-inset-bottom)))',
                }}
              >
                <div className="p-2">
                  <WorkspaceAssistantPanel
                    document={currentDocument}
                    loading={aiLoading}
                    onRequestSuggestion={handleRequestAI}
                    onApplySuggestion={handleApplySuggestion}
                    onDismissSuggestion={handleDismissSuggestion}
                    onRefineSuggestion={handleRefineSuggestion}
                    taskContext={effectiveTaskContext}
                    isCollapsed={false}
                    onToggleCollapse={() => setAiPanelCollapsed(true)}
                  />
                </div>
              </div>
            </SheetContent>
          </Sheet>
        </>
      )}

      {/* New Document Dialog */}
      <Dialog open={isNewDocDialogOpen} onOpenChange={setIsNewDocDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>New Document</DialogTitle>
            <DialogDescription>
              {activeVenture 
                ? `Create a document for "${activeVenture.name}"`
                : 'Create a new workspace document'
              }
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 mt-4">
            <div>
              <Label htmlFor="title">Title</Label>
              <Input
                id="title"
                value={newDocTitle}
                onChange={(e) => setNewDocTitle(e.target.value)}
                placeholder="My document"
              />
            </div>
            <div>
              <Label htmlFor="doc_type">Document Type</Label>
              <Select value={newDocType} onValueChange={setNewDocType}>
                <SelectTrigger id="doc_type">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="brain_dump">Brain Dump</SelectItem>
                  <SelectItem value="outline">Outline</SelectItem>
                  <SelectItem value="offer">Offer</SelectItem>
                  <SelectItem value="script">Script</SelectItem>
                  <SelectItem value="plan">Plan</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button onClick={handleCreateDocument} className="w-full">
              Create Document
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* New Folder Dialog */}
      <Dialog 
        open={isNewFolderDialogOpen} 
        onOpenChange={(open) => {
          setIsNewFolderDialogOpen(open);
          if (!open) {
            setNewFolderName('');
            setParentFolderId(null);
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {parentFolderId ? 'Create Subfolder' : 'New Folder'}
            </DialogTitle>
            <DialogDescription>
              {parentFolderId 
                ? 'Create a subfolder inside the selected folder'
                : 'Create a folder to organize your documents'
              }
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 mt-4">
            <div>
              <Label htmlFor="folder-name">Folder Name</Label>
              <Input
                id="folder-name"
                value={newFolderName}
                onChange={(e) => setNewFolderName(e.target.value)}
                placeholder="My Folder"
                autoFocus
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && newFolderName.trim()) handleCreateFolder();
                }}
              />
            </div>
            <Button 
              onClick={handleCreateFolder} 
              className="w-full"
              disabled={!newFolderName.trim() || isCreatingFolder}
            >
              <FolderPlus className="w-4 h-4 mr-1.5" />
              {isCreatingFolder ? 'Creating...' : parentFolderId ? 'Create Subfolder' : 'Create Folder'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Pro Upgrade Modal */}
      <ProUpgradeModal 
        open={showPaywall} 
        onClose={() => setShowPaywall(false)}
        reasonCode={paywallReason}
      />

      {/* Mobile FAB for new document */}
      {isMobile && (
        <Button
          onClick={() => setIsNewDocDialogOpen(true)}
          className="fixed bottom-20 right-4 z-50 h-14 w-14 rounded-full shadow-lg md:hidden"
          size="lg"
          aria-label="New Document"
        >
          <Plus className="w-6 h-6" />
        </Button>
      )}
      </>
      )}
    </div>
  );
}
