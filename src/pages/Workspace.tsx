import { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { useWorkspace } from '@/hooks/useWorkspace';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { FileText } from 'lucide-react';
import { WorkspaceSidebar } from '@/components/workspace/WorkspaceSidebar';
import { WorkspaceEditor } from '@/components/workspace/WorkspaceEditor';
import { WorkspaceAssistantPanel } from '@/components/workspace/WorkspaceAssistantPanel';
import type { TaskContext } from '@/types/tasks';

export default function Workspace() {
  const { id: documentId } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();
  const {
    documents,
    currentDocument,
    loading,
    loadDocument,
    createDocument,
    updateContent,
    requestAISuggestion,
    refreshList,
  } = useWorkspace();

  const [isNewDocDialogOpen, setIsNewDocDialogOpen] = useState(false);
  const [newDocTitle, setNewDocTitle] = useState('');
  const [newDocType, setNewDocType] = useState<string>('brain_dump');
  const [aiLoading, setAiLoading] = useState(false);

  // Extract taskContext from navigation state
  const taskContext = (location.state as { taskContext?: TaskContext } | null)?.taskContext;

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

  return (
    <div className="flex h-[calc(100vh-4rem)] gap-4">
      {/* Left Sidebar - Documents List */}
      <aside className="w-72">
        <WorkspaceSidebar
          documents={documents}
          currentId={currentDocument?.id}
          loading={loading}
          onSelect={(id) => navigate(`/workspace/${id}`)}
          onNewDocument={() => setIsNewDocDialogOpen(true)}
        />
      </aside>

      {/* Main Editor Area */}
      <div className="flex-1">
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

      {/* Right Panel - AI Assistant */}
      {currentDocument && (
        <aside className="w-80">
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
    </div>
  );
}
