import { useState, useRef, useEffect, useMemo } from 'react';
import { FileText, Pencil } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
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
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (renamingId && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [renamingId]);

  const filteredDocuments = useMemo(() => {
    if (statusFilter === 'all') return documents;
    return documents.filter((doc) => doc.status === statusFilter);
  }, [documents, statusFilter]);

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
    <Card className="h-full flex flex-col overflow-hidden">
      <CardHeader className="pb-2 pt-3 px-3 shrink-0">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base truncate">Documents</CardTitle>
          <Button size="sm" variant="outline" onClick={onNewDocument}>
            <FileText className="w-4 h-4" />
          </Button>
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="h-7 text-xs mt-2">
            <SelectValue placeholder="Filter by status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All</SelectItem>
            <SelectItem value="draft">Draft</SelectItem>
            <SelectItem value="in_progress">In Progress</SelectItem>
            <SelectItem value="final">Final</SelectItem>
          </SelectContent>
        </Select>
      </CardHeader>
      <CardContent className="p-0 flex-1 min-h-0 overflow-hidden">
        <ScrollArea className="h-full w-full">
          {loading && documents.length === 0 ? (
            <div className="p-2 space-y-2">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : filteredDocuments.length === 0 ? (
            <div className="p-3 text-center text-sm text-muted-foreground">
              {statusFilter === 'all'
                ? 'No documents yet. Create one to get started.'
                : `No ${statusFilter.replace('_', ' ')} documents.`}
            </div>
          ) : (
            <div className="space-y-1 p-2">
              {filteredDocuments.map((doc) => {
                const isSelected = currentId === doc.id;
                const isRenaming = renamingId === doc.id;

                return (
                  <button
                    key={doc.id}
                    onClick={() => !isRenaming && onSelect(doc.id)}
                    className={`w-full py-1.5 px-2 text-left rounded-md transition-colors group min-w-0 ${
                      isSelected 
                        ? 'bg-primary text-primary-foreground ring-1 ring-primary/40 hover:bg-primary/90' 
                        : 'hover:bg-secondary'
                    }`}
                  >
                    <div className="flex items-start gap-1.5">
                      <FileText className={`w-3.5 h-3.5 mt-0.5 shrink-0 ${isSelected ? 'text-primary-foreground' : 'text-muted-foreground'}`} />
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
                          <div className="flex items-center gap-1 min-w-0">
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
                        <p className={`text-xs capitalize ${isSelected ? 'text-primary-foreground/80' : 'text-muted-foreground'}`}>
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
