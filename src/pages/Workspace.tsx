import { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { useWorkspace } from '@/hooks/useWorkspace';
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
import { FileText, CheckCircle2, Download, Copy } from 'lucide-react';
import { exportWorkspaceDocToPdf } from '@/lib/pdfExport';
import { WorkspaceSidebar } from '@/components/workspace/WorkspaceSidebar';
import { WorkspaceEditor } from '@/components/workspace/WorkspaceEditor';
import { WorkspaceAssistantPanel } from '@/components/workspace/WorkspaceAssistantPanel';
import { ProBadge } from '@/components/billing/ProBadge';
import { ProUpgradeModal } from '@/components/billing/ProUpgradeModal';
import type { TaskContext } from '@/types/tasks';

export default function Workspace() {
  const { id: documentId } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();
  const { user } = useAuth();
  const { refresh: refreshXp } = useXP();
  const { plan } = useSubscription();
  const isPro = plan === 'pro' || plan === 'founder';
  const {
    documents,
    currentDocument,
    loading,
    loadDocument,
    createDocument,
    updateContent,
    renameDocument,
    requestAISuggestion,
    refreshList,
  } = useWorkspace();

  const [isNewDocDialogOpen, setIsNewDocDialogOpen] = useState(false);
  const [newDocTitle, setNewDocTitle] = useState('');
  const [newDocType, setNewDocType] = useState<string>('brain_dump');
  const [aiLoading, setAiLoading] = useState(false);
  const [taskCompleted, setTaskCompleted] = useState(false);
  const [completingTask, setCompletingTask] = useState(false);
  const [showPaywall, setShowPaywall] = useState(false);

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

  // Load documents list on mount
  useEffect(() => {
    refreshList();
  }, [refreshList]);

  // Load document if ID is in URL
  useEffect(() => {
    if (documentId) {
      loadDocument(documentId);
    }
  }, [documentId, loadDocument]);

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

    const doc = await createDocument({
      doc_type: newDocType,
      title: newDocTitle.trim(),
      source_type: 'manual',
    });

    if (doc) {
      setIsNewDocDialogOpen(false);
      setNewDocTitle('');
      setNewDocType('brain_dump');
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

  const handleDuplicateDocument = async () => {
    if (!currentDocument || !user) return;

    try {
      const { data, error } = await supabase
        .from('workspace_documents')
        .insert({
          user_id: user.id,
          idea_id: currentDocument.idea_id,
          source_type: currentDocument.source_type,
          source_id: currentDocument.source_id,
          doc_type: currentDocument.doc_type,
          title: `${currentDocument.title || 'Untitled'} (Copy)`,
          content: currentDocument.content || '',
          status: currentDocument.status || 'draft',
        })
        .select('id')
        .single();

      if (error) throw error;

      await refreshList();
      navigate(`/workspace/${data.id}`);
      toast({
        title: 'Document duplicated',
        description: 'A copy of the document has been created.',
      });
    } catch (err) {
      console.error('Error duplicating document:', err);
      toast({
        title: 'Error',
        description: 'Failed to duplicate document',
        variant: 'destructive',
      });
    }
  };

  return (
    <div className="flex flex-col md:flex-row h-[calc(100vh-4rem)] gap-4">
      {/* Left Sidebar - Documents List (hidden on mobile, shown as full-width section) */}
      <aside className="w-full md:w-56 shrink-0">
        <WorkspaceSidebar
          documents={documents}
          currentId={currentDocument?.id}
          loading={loading}
          onSelect={(id) => navigate(`/workspace/${id}`)}
          onNewDocument={() => setIsNewDocDialogOpen(true)}
          onRename={renameDocument}
        />
      </aside>

      {/* Main Editor Area */}
      <div className="flex-1 flex flex-col">
        {currentDocument && (
          <div className="flex items-center justify-between mb-2 gap-2">
            <div className="flex items-center gap-2">
              <Label className="text-sm text-muted-foreground">Status:</Label>
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
                <SelectTrigger className="w-[120px] h-8">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="draft">Draft</SelectItem>
                  <SelectItem value="in_progress">In Progress</SelectItem>
                  <SelectItem value="final">Final</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleDuplicateDocument}
              >
                <Copy className="w-4 h-4 mr-1" />
                Duplicate
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  if (!isPro) {
                    setShowPaywall(true);
                    return;
                  }
                  exportWorkspaceDocToPdf({
                    title: currentDocument.title || 'Workspace Document',
                    content: currentDocument.content || '',
                  });
                }}
                className="gap-1"
              >
                <Download className="w-4 h-4" />
                Export as PDF
                {!isPro && <ProBadge variant="pill" size="sm" locked />}
              </Button>
            </div>
          </div>
        )}
        {!currentDocument ? (
          <Card className="h-full flex items-center justify-center">
            <CardContent className="text-center">
              <FileText className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
              <p className="text-lg font-medium mb-2">Select a document or start a new one</p>
              <p className="text-sm text-muted-foreground mb-4">
                Choose from the sidebar or create a new workspace document
              </p>
            </CardContent>
          </Card>
        ) : (
          <WorkspaceEditor document={currentDocument} onChange={handleEditorChange} />
        )}
      </div>

      {/* Right Panel - AI Assistant (stacks below on mobile) */}
      {currentDocument && (
        <aside className="w-full md:w-80 shrink-0 flex flex-col gap-4">
          {/* Linked Task Card */}
          {taskContext && (
            <Card className="border-primary/20 bg-primary/5">
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  <CheckCircle2 className={`w-5 h-5 mt-0.5 ${taskCompleted ? 'text-green-500' : 'text-primary'}`} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{taskContext.title}</p>
                    {taskContext.description && (
                      <p className="text-xs text-muted-foreground line-clamp-2 mt-1">
                        {taskContext.description}
                      </p>
                    )}
                    <div className="flex items-center gap-2 mt-2 text-xs text-muted-foreground">
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
                  className="w-full mt-3"
                  onClick={handleCompleteLinkedTask}
                  disabled={taskCompleted || completingTask}
                >
                  {taskCompleted ? 'Completed ✓' : completingTask ? 'Completing...' : 'Mark Task Complete'}
                </Button>
              </CardContent>
            </Card>
          )}
          
          <WorkspaceAssistantPanel
            document={currentDocument}
            loading={aiLoading}
            onRequestSuggestion={handleRequestAI}
            onApplySuggestion={handleApplySuggestion}
            taskContext={taskContext}
          />
        </aside>
      )}

      {/* New Document Dialog */}
      <Dialog open={isNewDocDialogOpen} onOpenChange={setIsNewDocDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>New Document</DialogTitle>
            <DialogDescription>Create a new workspace document</DialogDescription>
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

      {/* Pro Upgrade Modal */}
      <ProUpgradeModal 
        open={showPaywall} 
        onClose={() => setShowPaywall(false)}
        reasonCode="EXPORT_REQUIRES_PRO"
      />
    </div>
  );
}
