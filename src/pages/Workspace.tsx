import { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useWorkspace } from '@/hooks/useWorkspace';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import { Plus, FileText, Sparkles, ArrowDownToLine, RefreshCw } from 'lucide-react';
import { format } from 'date-fns';

export default function Workspace() {
  const { id: documentId } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  const {
    documents,
    currentDocument,
    loading,
    error,
    loadDocument,
    createDocument,
    updateContent,
    requestAISuggestion,
    refreshList,
  } = useWorkspace();

  const [editorContent, setEditorContent] = useState('');
  const [isNewDocDialogOpen, setIsNewDocDialogOpen] = useState(false);
  const [newDocTitle, setNewDocTitle] = useState('');
  const [newDocType, setNewDocType] = useState<string>('brain_dump');
  const [aiLoading, setAiLoading] = useState(false);
  const [cursorPosition, setCursorPosition] = useState(0);
  const textareaRef = useState<HTMLTextAreaElement | null>(null)[1];

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

  // Sync editor content when currentDocument changes
  useEffect(() => {
    if (currentDocument) {
      setEditorContent(currentDocument.content || '');
    } else {
      setEditorContent('');
    }
  }, [currentDocument]);

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

  const handleEditorChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newContent = e.target.value;
    setEditorContent(newContent);
    setCursorPosition(e.target.selectionStart);

    if (currentDocument) {
      debouncedUpdate(currentDocument.id, newContent);
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

  const handleRequestAI = async () => {
    if (!currentDocument) return;

    setAiLoading(true);
    const result = await requestAISuggestion(currentDocument.id);
    setAiLoading(false);

    if (result) {
      toast({
        title: 'AI suggestions ready',
        description: 'Check the AI Assistant panel',
      });
    }
  };

  const handleInsertSuggestion = () => {
    if (!currentDocument?.ai_suggestions) return;

    const before = editorContent.slice(0, cursorPosition);
    const after = editorContent.slice(cursorPosition);
    const newContent = before + '\n\n' + currentDocument.ai_suggestions + '\n\n' + after;

    setEditorContent(newContent);
    if (currentDocument) {
      updateContent(currentDocument.id, newContent);
    }

    toast({
      title: 'Suggestion inserted',
      description: 'AI content added at cursor position',
    });
  };

  const handleReplaceSuggestion = () => {
    if (!currentDocument?.ai_suggestions) return;

    setEditorContent(currentDocument.ai_suggestions);
    if (currentDocument) {
      updateContent(currentDocument.id, currentDocument.ai_suggestions);
    }

    toast({
      title: 'Content replaced',
      description: 'Editor content replaced with AI suggestion',
    });
  };

  return (
    <div className="flex h-[calc(100vh-4rem)] gap-4">
      {/* Left Sidebar - Documents List */}
      <aside className="w-72 flex flex-col gap-4">
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg">Documents</CardTitle>
              <Dialog open={isNewDocDialogOpen} onOpenChange={setIsNewDocDialogOpen}>
                <DialogTrigger asChild>
                  <Button size="sm" variant="outline">
                    <Plus className="w-4 h-4" />
                  </Button>
                </DialogTrigger>
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
          </CardHeader>
          <CardContent className="p-0">
            <ScrollArea className="h-[calc(100vh-16rem)]">
              {loading && documents.length === 0 ? (
                <div className="p-4 space-y-3">
                  {[1, 2, 3].map((i) => (
                    <Skeleton key={i} className="h-20 w-full" />
                  ))}
                </div>
              ) : documents.length === 0 ? (
                <div className="p-4 text-center text-sm text-muted-foreground">
                  No documents yet. Create one to get started.
                </div>
              ) : (
                <div className="divide-y divide-border">
                  {documents.map((doc) => (
                    <button
                      key={doc.id}
                      onClick={() => navigate(`/workspace/${doc.id}`)}
                      className={`w-full p-4 text-left hover:bg-accent transition-colors ${
                        currentDocument?.id === doc.id ? 'bg-accent' : ''
                      }`}
                    >
                      <div className="flex items-start gap-2">
                        <FileText className="w-4 h-4 mt-1 text-muted-foreground shrink-0" />
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-sm truncate">{doc.title}</p>
                          <p className="text-xs text-muted-foreground capitalize">{doc.doc_type}</p>
                          <p className="text-xs text-muted-foreground mt-1">
                            {format(new Date(doc.updated_at), 'MMM d, h:mm a')}
                          </p>
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </ScrollArea>
          </CardContent>
        </Card>
      </aside>

      {/* Main Editor Area */}
      <div className="flex-1 flex flex-col gap-4">
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
          <>
            <Card>
              <CardHeader>
                <CardTitle>{currentDocument.title}</CardTitle>
                <CardDescription className="capitalize">
                  {currentDocument.doc_type} • {currentDocument.status}
                </CardDescription>
              </CardHeader>
            </Card>

            <Card className="flex-1 flex flex-col">
              <CardContent className="flex-1 p-0">
                <Textarea
                  ref={(el) => textareaRef(el)}
                  value={editorContent}
                  onChange={handleEditorChange}
                  placeholder="Start writing..."
                  className="h-full min-h-[500px] border-0 resize-none focus-visible:ring-0 font-mono text-sm"
                />
              </CardContent>
            </Card>
          </>
        )}
      </div>

      {/* Right Panel - AI Assistant */}
      {currentDocument && (
        <aside className="w-80 flex flex-col gap-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Sparkles className="w-5 h-5" />
                AI Assistant
              </CardTitle>
              <CardDescription>Get AI-powered suggestions for your content</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Button
                onClick={handleRequestAI}
                disabled={aiLoading || loading}
                className="w-full"
              >
                {aiLoading ? (
                  <>
                    <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                    Generating...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4 mr-2" />
                    Ask AI to help expand this
                  </>
                )}
              </Button>

              {currentDocument.ai_suggestions && (
                <>
                  <div className="border-t pt-4">
                    <p className="text-sm font-medium mb-2">Latest Suggestion:</p>
                    <ScrollArea className="h-64 border rounded-md p-3">
                      <p className="text-sm whitespace-pre-wrap">{currentDocument.ai_suggestions}</p>
                    </ScrollArea>
                  </div>

                  <div className="space-y-2">
                    <Button
                      onClick={handleInsertSuggestion}
                      variant="outline"
                      size="sm"
                      className="w-full"
                    >
                      <ArrowDownToLine className="w-4 h-4 mr-2" />
                      Insert at cursor
                    </Button>
                    <Button
                      onClick={handleReplaceSuggestion}
                      variant="outline"
                      size="sm"
                      className="w-full"
                    >
                      <RefreshCw className="w-4 h-4 mr-2" />
                      Replace all content
                    </Button>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </aside>
      )}
    </div>
  );
}
