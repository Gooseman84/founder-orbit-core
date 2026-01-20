import { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useWorkspace } from '@/hooks/useWorkspace';
import { useVentureState } from '@/hooks/useVentureState';
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
import { FileText, CheckCircle2, Download, Archive, Menu, Plus, FolderPlus } from 'lucide-react';
import { exportWorkspaceDocToPdf } from '@/lib/pdfExport';
import { WorkspaceSidebar } from '@/components/workspace/WorkspaceSidebar';
import { WorkspaceEditor } from '@/components/workspace/WorkspaceEditor';
import { WorkspaceAssistantPanel, RefinementType } from '@/components/workspace/WorkspaceAssistantPanel';
import { ProBadge } from '@/components/billing/ProBadge';
import { ProUpgradeModal } from '@/components/billing/ProUpgradeModal';
import { useAnalytics } from '@/hooks/useAnalytics';
import { PLAN_FEATURES } from '@/config/plans';
import { useIsMobile } from '@/hooks/use-mobile';
import type { PaywallReasonCode } from '@/config/paywallCopy';
import type { TaskContext } from '@/types/tasks';

interface WorkspaceFolder {
  id: string;
  user_id: string;
  venture_id: string | null;
  name: string;
  parent_folder_id: string | null;
  created_at: string;
  updated_at: string;
}

export default function Workspace() {
  const { id: documentId } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();
  const { user } = useAuth();
  const { refresh: refreshXp } = useXP();
  const { plan } = useSubscription();
  const { activeVenture } = useVentureState();
  const isMobile = useIsMobile();
  const isPro = plan === 'pro' || plan === 'founder';

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
      
      // Filter by venture if in venture scope
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
  const [aiLoading, setAiLoading] = useState(false);
  const [taskCompleted, setTaskCompleted] = useState(false);
  const [completingTask, setCompletingTask] = useState(false);
  const [showPaywall, setShowPaywall] = useState(false);
  const [paywallReason, setPaywallReason] = useState<PaywallReasonCode>("EXPORT_REQUIRES_PRO");
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false);
  const [aiPanelCollapsed, setAiPanelCollapsed] = useState(true);
  const { track } = useAnalytics();
  
  // Get workspace doc limit for free users
  const maxWorkspaceDocs = isPro ? Infinity : PLAN_FEATURES.trial.maxWorkspaceDocs;

  // Extract taskContext from navigation state
  const taskContext = (location.state as { taskContext?: TaskContext } | null)?.taskContext;

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
      // Close mobile drawer when selecting a doc
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

    // Check workspace document limit for FREE users
    if (!isPro && documents.length >= maxWorkspaceDocs) {
      setPaywallReason("WORKSPACE_LIMIT");
      setShowPaywall(true);
      track("paywall_shown", { reasonCode: "WORKSPACE_LIMIT" });
      return;
    }

    // Associate document with active venture and folder if set
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
    const result = await requestAISuggestion(currentDocument.id, taskContext, {
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
  }, [currentDocument, taskContext, requestAISuggestion, toast]);

  const handleApplySuggestion = (mode: 'insert' | 'replace') => {
    if (!currentDocument?.ai_suggestions) return;

    let newContent: string;

    if (mode === 'replace') {
      newContent = currentDocument.ai_suggestions;
      toast({
        title: 'Content replaced',
        description: 'Editor content replaced with AI suggestion',
      });
    } else {
      // For insert, append at the end
      newContent = (currentDocument.content || '') + '\n\n' + currentDocument.ai_suggestions;
      toast({
        title: 'Suggestion inserted',
        description: 'AI content added to document',
      });
    }

    if (currentDocument) {
      updateContent(currentDocument.id, newContent);
    }
  };

  const handleDismissSuggestion = useCallback(async () => {
    if (!currentDocument) return;
    
    try {
      // Clear the AI suggestion from the database
      await supabase
        .from('workspace_documents')
        .update({ ai_suggestions: null })
        .eq('id', currentDocument.id);
      
      // Refresh the document to show cleared suggestion
      await loadDocument(currentDocument.id);
      
      toast({
        title: 'Suggestion dismissed',
      });
      
      // Collapse AI panel on mobile
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
      // Navigate to workspace root after archiving
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

    try {
      const { error } = await supabase
        .from('workspace_folders')
        .insert({
          user_id: user.id,
          name: newFolderName.trim(),
          venture_id: activeVenture?.id || null,
        });

      if (error) throw error;

      setIsNewFolderDialogOpen(false);
      setNewFolderName('');
      toast({
        title: 'Folder created',
        description: `Created folder "${newFolderName.trim()}"`,
      });
    } catch (err) {
      console.error('Error creating folder:', err);
      toast({
        title: 'Error',
        description: 'Failed to create folder',
        variant: 'destructive',
      });
    }
  };

  // Handle creating document in a specific folder
  const [targetFolderId, setTargetFolderId] = useState<string | null>(null);

  const handleOpenNewDocDialog = (folderId?: string) => {
    setTargetFolderId(folderId || null);
    setIsNewDocDialogOpen(true);
    if (isMobile) setMobileDrawerOpen(false);
  };

  const handleOpenNewFolderDialog = () => {
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
    />
  );

  return (
    <div className="flex flex-col h-[calc(100vh-4rem)] overflow-hidden">
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
          <aside className="w-56 shrink-0 min-w-0 hidden md:block">
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
            {/* Linked Task Card */}
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
            
            <div className="flex-1 min-h-0 overflow-y-auto">
              <WorkspaceAssistantPanel
                document={currentDocument}
                loading={aiLoading}
                onRequestSuggestion={handleRequestAI}
                onApplySuggestion={handleApplySuggestion}
                onDismissSuggestion={handleDismissSuggestion}
                onRefineSuggestion={handleRefineSuggestion}
                taskContext={taskContext}
              />
            </div>
          </aside>
        )}
      </div>

      {/* Mobile: AI Assistant below editor - collapsible */}
      {currentDocument && isMobile && (
        <div className="p-2 pt-0">
          <WorkspaceAssistantPanel
            document={currentDocument}
            loading={aiLoading}
            onRequestSuggestion={handleRequestAI}
            onApplySuggestion={handleApplySuggestion}
            onDismissSuggestion={handleDismissSuggestion}
            onRefineSuggestion={handleRefineSuggestion}
            taskContext={taskContext}
            isCollapsed={aiPanelCollapsed}
            onToggleCollapse={() => setAiPanelCollapsed(!aiPanelCollapsed)}
          />
        </div>
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
      <Dialog open={isNewFolderDialogOpen} onOpenChange={setIsNewFolderDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>New Folder</DialogTitle>
            <DialogDescription>
              Create a folder to organize your documents
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
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleCreateFolder();
                }}
              />
            </div>
            <Button onClick={handleCreateFolder} className="w-full">
              <FolderPlus className="w-4 h-4 mr-1.5" />
              Create Folder
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
    </div>
  );
}
