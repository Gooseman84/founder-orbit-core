import { useState, useRef, useEffect, useMemo } from 'react';
import { FileText, Pencil, FolderOpen, Files, FolderPlus } from 'lucide-react';
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
import { FolderTreeItem, FolderTreeNode } from './FolderTreeItem';
import type { WorkspaceDocument } from '@/lib/workspaceEngine';
import type { WorkspaceScope } from '@/hooks/useWorkspace';

interface WorkspaceFolder {
  id: string;
  user_id: string;
  venture_id: string | null;
  name: string;
  parent_folder_id: string | null;
  created_at: string;
  updated_at: string;
}

interface WorkspaceSidebarProps {
  documents: WorkspaceDocument[];
  folders?: WorkspaceFolder[];
  currentId?: string;
  loading?: boolean;
  onSelect: (id: string) => void;
  onNewDocument: () => void;
  onNewFolder?: () => void;
  onRename?: (id: string, newTitle: string) => void;
  scope?: WorkspaceScope;
  onScopeChange?: (scope: WorkspaceScope) => void;
  ventureName?: string;
}

export function WorkspaceSidebar({
  documents,
  folders = [],
  currentId,
  loading = false,
  onSelect,
  onNewDocument,
  onNewFolder,
  onRename,
  scope = 'current_venture',
  onScopeChange,
  ventureName,
}: WorkspaceSidebarProps) {
  const { toast } = useToast();
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [newTitle, setNewTitle] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set());
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (renamingId && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [renamingId]);

  // Filter documents by status
  const filteredDocuments = useMemo(() => {
    if (statusFilter === 'all') return documents;
    return documents.filter((doc) => doc.status === statusFilter);
  }, [documents, statusFilter]);

  // Build folder tree from flat data
  const folderTree = useMemo((): FolderTreeNode[] => {
    const folderMap = new Map<string, FolderTreeNode>();
    const rootNodes: FolderTreeNode[] = [];

    // Create folder nodes
    folders.forEach((folder) => {
      folderMap.set(folder.id, {
        type: 'folder',
        id: folder.id,
        name: folder.name,
        children: [],
      });
    });

    // Build folder hierarchy
    folders.forEach((folder) => {
      const node = folderMap.get(folder.id)!;
      if (folder.parent_folder_id) {
        const parent = folderMap.get(folder.parent_folder_id);
        if (parent && parent.children) {
          parent.children.push(node);
        } else {
          // Orphaned folder - add to root
          rootNodes.push(node);
        }
      } else {
        rootNodes.push(node);
      }
    });

    // Add documents to folders or root
    filteredDocuments.forEach((doc) => {
      const docNode: FolderTreeNode = {
        type: 'document',
        id: doc.id,
        name: doc.title,
        documentData: doc,
      };

      const folderId = (doc as any).folder_id;
      if (folderId) {
        const folder = folderMap.get(folderId);
        if (folder && folder.children) {
          folder.children.push(docNode);
        } else {
          // Orphaned document - add to root
          rootNodes.push(docNode);
        }
      } else {
        // Uncategorized document - add to root
        rootNodes.push(docNode);
      }
    });

    // Sort: folders first, then documents, alphabetically within each group
    const sortNodes = (nodes: FolderTreeNode[]) => {
      nodes.sort((a, b) => {
        if (a.type !== b.type) {
          return a.type === 'folder' ? -1 : 1;
        }
        return a.name.localeCompare(b.name);
      });
      nodes.forEach((node) => {
        if (node.children) {
          sortNodes(node.children);
        }
      });
    };
    sortNodes(rootNodes);

    return rootNodes;
  }, [folders, filteredDocuments]);

  const handleToggleFolder = (folderId: string) => {
    setExpandedFolders((prev) => {
      const next = new Set(prev);
      if (next.has(folderId)) {
        next.delete(folderId);
      } else {
        next.add(folderId);
      }
      return next;
    });
  };

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
          <div className="flex gap-1 shrink-0">
            {onNewFolder && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button size="sm" variant="ghost" onClick={onNewFolder} className="h-7 w-7 p-0">
                    <FolderPlus className="w-3.5 h-3.5" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>New Folder</TooltipContent>
              </Tooltip>
            )}
            <Tooltip>
              <TooltipTrigger asChild>
                <Button size="sm" variant="outline" onClick={onNewDocument} className="h-7 w-7 p-0">
                  <FileText className="w-3.5 h-3.5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>New Document</TooltipContent>
            </Tooltip>
          </div>
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
            <SelectItem value="archived">Archived</SelectItem>
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
          ) : folderTree.length === 0 ? (
            <div className="p-3 text-center text-sm text-muted-foreground">
              {scope === 'current_venture'
                ? 'No documents for this venture yet.'
                : statusFilter === 'all'
                ? 'No documents yet. Create one to get started.'
                : `No ${statusFilter.replace('_', ' ')} documents.`}
            </div>
          ) : (
            <div className="p-2 space-y-0.5">
              {folderTree.map((node) => (
                <FolderTreeItem
                  key={node.id}
                  node={node}
                  level={0}
                  selectedId={currentId}
                  onSelect={onSelect}
                  onToggleFolder={handleToggleFolder}
                  expandedFolders={expandedFolders}
                />
              ))}
            </div>
          )}
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
