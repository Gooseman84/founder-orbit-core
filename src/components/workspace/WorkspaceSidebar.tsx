import { useState, useRef, useEffect } from 'react';
import { FileText, Pencil } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { format } from 'date-fns';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import type { WorkspaceDocument } from '@/lib/workspaceEngine';

interface WorkspaceSidebarProps {
  documents: WorkspaceDocument[];
  currentId?: string;
  loading?: boolean;
  onSelect: (id: string) => void;
  onNewDocument: () => void;
  onRename?: (id: string, newTitle: string) => void;
}

export function WorkspaceSidebar({
  documents,
  currentId,
  loading = false,
  onSelect,
  onNewDocument,
  onRename,
}: WorkspaceSidebarProps) {
  const { toast } = useToast();
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [newTitle, setNewTitle] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (renamingId && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [renamingId]);

  const startRenaming = (doc: WorkspaceDocument, e: React.MouseEvent) => {
    e.stopPropagation();
    setRenamingId(doc.id);
    setNewTitle(doc.title);
  };

  const saveRename = async () => {
    if (!renamingId || !newTitle.trim()) {
      setRenamingId(null);
      setNewTitle('');
      return;
    }

    try {
      const { error } = await supabase
        .from('workspace_documents')
        .update({ title: newTitle.trim() })
        .eq('id', renamingId);

      if (error) throw error;

      // Update parent state on success
      if (onRename) {
        onRename(renamingId, newTitle.trim());
      }
      setRenamingId(null);
      setNewTitle('');
    } catch (err) {
      console.error('Error renaming document:', err);
      toast({
        title: 'Error',
        description: 'Failed to rename document',
        variant: 'destructive',
      });
    }
  };

  const cancelRename = () => {
    setRenamingId(null);
    setNewTitle('');
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      saveRename();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      cancelRename();
    }
  };

  return (
    <Card className="h-full flex flex-col">
      <CardHeader className="pb-2 pt-3 px-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base">Documents</CardTitle>
          <Button size="sm" variant="outline" onClick={onNewDocument}>
            <FileText className="w-4 h-4" />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="p-0 flex-1">
        <ScrollArea className="h-full">
          {loading && documents.length === 0 ? (
            <div className="p-2 space-y-2">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : documents.length === 0 ? (
            <div className="p-3 text-center text-sm text-muted-foreground">
              No documents yet. Create one to get started.
            </div>
          ) : (
            <div className="space-y-1 p-2">
              {documents.map((doc) => {
                const isSelected = currentId === doc.id;
                const isRenaming = renamingId === doc.id;

                return (
                  <button
                    key={doc.id}
                    onClick={() => !isRenaming && onSelect(doc.id)}
                    className={`w-full py-1.5 px-2 text-left rounded-md hover:bg-accent transition-colors group ${
                      isSelected ? 'bg-accent border-l-2 border-primary' : ''
                    }`}
                  >
                    <div className="flex items-start gap-1.5">
                      <FileText className="w-3.5 h-3.5 mt-0.5 text-muted-foreground shrink-0" />
                      <div className="flex-1 min-w-0">
                        {isRenaming ? (
                          <Input
                            ref={inputRef}
                            value={newTitle}
                            onChange={(e) => setNewTitle(e.target.value)}
                            onKeyDown={handleKeyDown}
                            onBlur={saveRename}
                            onClick={(e) => e.stopPropagation()}
                            className="h-6 text-sm py-0 px-1"
                          />
                        ) : (
                          <div className="flex items-center gap-1">
                            <p className="font-medium text-sm truncate flex-1">{doc.title}</p>
                            {isSelected && onRename && (
                              <button
                                onClick={(e) => startRenaming(doc, e)}
                                className="opacity-0 group-hover:opacity-100 p-0.5 hover:bg-muted rounded transition-opacity"
                                title="Rename"
                              >
                                <Pencil className="w-3 h-3 text-muted-foreground" />
                              </button>
                            )}
                          </div>
                        )}
                        <p className="text-xs text-muted-foreground capitalize">
                          {doc.doc_type?.replace('_', ' ')} · {format(new Date(doc.updated_at), 'MMM d')}
                        </p>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
