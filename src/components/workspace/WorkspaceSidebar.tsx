import { useState, useRef, useEffect, useMemo } from 'react';
import { FileText, Pencil, FolderOpen, Files } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { format } from 'date-fns';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import type { WorkspaceDocument } from '@/lib/workspaceEngine';
import type { WorkspaceScope } from '@/hooks/useWorkspace';

interface WorkspaceSidebarProps {
  documents: WorkspaceDocument[];
  currentId?: string;
  loading?: boolean;
  onSelect: (id: string) => void;
  onNewDocument: () => void;
  onRename?: (id: string, newTitle: string) => void;
  scope?: WorkspaceScope;
  onScopeChange?: (scope: WorkspaceScope) => void;
  ventureName?: string;
}

export function WorkspaceSidebar({
  documents,
  currentId,
  loading = false,
  onSelect,
  onNewDocument,
  onRename,
  scope = 'current_venture',
  onScopeChange,
  ventureName,
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
      <CardHeader className="pb-2 pt-3 px-3 shrink-0 space-y-2">
        <div className="flex items-center justify-between gap-2">
          <CardTitle className="text-sm font-medium truncate flex-1">Documents</CardTitle>
          <Button size="sm" variant="outline" onClick={onNewDocument} className="h-7 w-7 p-0 shrink-0">
            <FileText className="w-3.5 h-3.5" />
          </Button>
        </div>

        {/* Scope Toggle */}
        {onScopeChange && (
          <Tabs value={scope} onValueChange={(v) => onScopeChange(v as WorkspaceScope)} className="w-full">
            <TabsList className="w-full h-8 grid grid-cols-2 p-0.5">
              <Tooltip>
                <TooltipTrigger asChild>
                  <TabsTrigger value="current_venture" className="h-7 text-xs gap-1.5 data-[state=active]:shadow-sm">
                    <FolderOpen className="w-3 h-3" />
                    <span className="truncate max-w-[60px]">{ventureName || 'Venture'}</span>
                  </TabsTrigger>
                </TooltipTrigger>
                <TooltipContent side="bottom">
                  <p>Show only docs for current venture</p>
                </TooltipContent>
              </Tooltip>
              <Tooltip>
                <TooltipTrigger asChild>
                  <TabsTrigger value="all" className="h-7 text-xs gap-1.5 data-[state=active]:shadow-sm">
                    <Files className="w-3 h-3" />
                    All
                  </TabsTrigger>
                </TooltipTrigger>
                <TooltipContent side="bottom">
                  <p>Show all documents</p>
                </TooltipContent>
              </Tooltip>
            </TabsList>
          </Tabs>
        )}

        {/* Status Filter */}
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="h-7 text-xs">
            <SelectValue placeholder="Filter by status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="draft">Draft</SelectItem>
            <SelectItem value="in_progress">In Progress</SelectItem>
            <SelectItem value="final">Final</SelectItem>
          </SelectContent>
        </Select>
      </CardHeader>

      <CardContent className="p-0 flex-1 min-h-0 overflow-hidden">
        <ScrollArea className="h-full">
          {loading && documents.length === 0 ? (
            <div className="p-2 space-y-2">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : filteredDocuments.length === 0 ? (
            <div className="p-3 text-center text-sm text-muted-foreground">
              {scope === 'current_venture' 
                ? 'No documents for this venture yet.'
                : statusFilter === 'all'
                  ? 'No documents yet. Create one to get started.'
                  : `No ${statusFilter.replace('_', ' ')} documents.`
              }
            </div>
          ) : (
            <div className="p-2 space-y-1">
              {filteredDocuments.map((doc) => {
                const isSelected = currentId === doc.id;
                const isRenaming = renamingId === doc.id;

                return (
                  <button
                    key={doc.id}
                    onClick={() => !isRenaming && onSelect(doc.id)}
                    className={`w-full py-2.5 px-3 text-left rounded-md transition-colors group min-h-[56px] ${
                      isSelected 
                        ? 'bg-primary text-primary-foreground ring-1 ring-primary/40 hover:bg-primary/90' 
                        : 'hover:bg-secondary'
                    }`}
                  >
                    <div className="flex items-start gap-2.5">
                      <FileText className={`w-4 h-4 mt-0.5 shrink-0 ${isSelected ? 'text-primary-foreground' : 'text-muted-foreground'}`} />
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
                          <div className="flex items-start gap-1 min-w-0">
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <p className="font-medium text-sm line-clamp-2 flex-1 text-left leading-snug break-words">
                                  {doc.title}
                                </p>
                              </TooltipTrigger>
                              <TooltipContent side="right" align="start" className="max-w-[250px]">
                                <p className="whitespace-normal break-words">{doc.title}</p>
                              </TooltipContent>
                            </Tooltip>
                            {isSelected && onRename && (
                              <button
                                onClick={(e) => startRenaming(doc, e)}
                                className="opacity-0 group-hover:opacity-100 p-0.5 hover:bg-background/20 rounded transition-opacity shrink-0 mt-0.5"
                                title="Rename"
                              >
                                <Pencil className="w-3 h-3" />
                              </button>
                            )}
                          </div>
                        )}
                        <p className={`text-xs capitalize mt-1 ${isSelected ? 'text-primary-foreground/80' : 'text-muted-foreground'}`}>
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
