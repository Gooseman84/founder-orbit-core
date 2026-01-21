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
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
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
  onNewDocument: (folderId?: string) => void;
  onNewFolder?: (parentFolderId?: string) => void;
  onRename?: (id: string, newTitle: string) => void;
  onRefresh?: () => void;
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
  onRefresh,
  scope = 'current_venture',
  onScopeChange,
  ventureName,
}: WorkspaceSidebarProps) {
  const { toast } = useToast();
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [newTitle, setNewTitle] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  // Persist expanded folder state in localStorage
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(() => {
    try {
      const saved = localStorage.getItem('workspace_expanded_folders');
      return saved ? new Set(JSON.parse(saved)) : new Set();
    } catch {
      return new Set();
    }
  });
  const [moveDialogOpen, setMoveDialogOpen] = useState(false);
  const [documentToMove, setDocumentToMove] = useState<string | null>(null);
  const [selectedFolderId, setSelectedFolderId] = useState<string | null>(null);
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
          rootNodes.push(docNode);
        }
      } else {
        rootNodes.push(docNode);
      }
    });

    // Sort: folders first, then documents, alphabetically
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

  // Persist expanded folders to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(
        'workspace_expanded_folders',
        JSON.stringify(Array.from(expandedFolders))
      );
    } catch {
      // Ignore localStorage errors
    }
  }, [expandedFolders]);

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

  // Create subfolder handler
  const handleCreateSubfolder = (parentId: string) => {
    // Expand the parent folder so subfolder is visible
    setExpandedFolders((prev) => new Set(prev).add(parentId));
    onNewFolder?.(parentId);
  };

  const handleRenameFolder = async (folderId: string, currentName: string) => {
    const newName = prompt('Enter new folder name:', currentName);
    if (!newName || newName === currentName) return;

    try {
      const { error } = await supabase
        .from('workspace_folders')
        .update({ name: newName })
        .eq('id', folderId);

      if (error) throw error;
      toast({ title: 'Folder renamed' });
      onRefresh?.();
    } catch (err) {
      console.error('Error renaming folder:', err);
      toast({ title: 'Error renaming folder', variant: 'destructive' });
    }
  };

  const handleDeleteFolder = async (folderId: string) => {
    const confirmed = confirm('Delete this folder? Documents inside will be moved to root.');
    if (!confirmed) return;

    try {
      // Move documents to root first
      await supabase
        .from('workspace_documents')
        .update({ folder_id: null })
        .eq('folder_id', folderId);

      // Delete the folder
      const { error } = await supabase
        .from('workspace_folders')
        .delete()
        .eq('id', folderId);

      if (error) throw error;
      toast({ title: 'Folder deleted' });
      onRefresh?.();
    } catch (err) {
      console.error('Error deleting folder:', err);
      toast({ title: 'Error deleting folder', variant: 'destructive' });
    }
  };

  const handleRenameDocument = async (documentId: string, currentTitle: string) => {
    const newName = prompt('Enter new document name:', currentTitle);
    if (!newName || newName === currentTitle) return;

    try {
      const { error } = await supabase
        .from('workspace_documents')
        .update({ title: newName })
        .eq('id', documentId);

      if (error) throw error;
      toast({ title: 'Document renamed' });
      onRename?.(documentId, newName);
      onRefresh?.();
    } catch (err) {
      console.error('Error renaming document:', err);
      toast({ title: 'Error renaming document', variant: 'destructive' });
    }
  };

  const handleDeleteDocument = async (documentId: string) => {
    const confirmed = confirm('Delete this document? This cannot be undone.');
    if (!confirmed) return;

    try {
      const { error } = await supabase
        .from('workspace_documents')
        .delete()
        .eq('id', documentId);

      if (error) throw error;
      toast({ title: 'Document deleted' });
      onRefresh?.();
    } catch (err) {
      console.error('Error deleting document:', err);
      toast({ title: 'Error deleting document', variant: 'destructive' });
    }
  };

  const handleMoveDocument = (documentId: string) => {
    setDocumentToMove(documentId);
    setSelectedFolderId(null);
    setMoveDialogOpen(true);
  };

  const confirmMoveDocument = async () => {
    if (!documentToMove) return;

    try {
      const { error } = await supabase
        .from('workspace_documents')
        .update({ folder_id: selectedFolderId })
        .eq('id', documentToMove);

      if (error) throw error;
      toast({ title: selectedFolderId ? 'Document moved to folder' : 'Document moved to root' });
      setMoveDialogOpen(false);
      setDocumentToMove(null);
      onRefresh?.();
    } catch (err) {
      console.error('Error moving document:', err);
      toast({ title: 'Error moving document', variant: 'destructive' });
    }
  };

  const handleCreateDocumentInFolder = (folderId: string) => {
    // Expand the folder so the new doc is visible
    setExpandedFolders((prev) => new Set(prev).add(folderId));
    onNewDocument(folderId);
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
                  <Button size="sm" variant="ghost" onClick={() => onNewFolder()} className="h-7 w-7 p-0">
                    <FolderPlus className="w-3.5 h-3.5" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>New Folder</TooltipContent>
              </Tooltip>
            )}
            <Tooltip>
              <TooltipTrigger asChild>
                <Button size="sm" variant="outline" onClick={() => onNewDocument()} className="h-7 w-7 p-0">
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
                  onRenameFolder={handleRenameFolder}
                  onDeleteFolder={handleDeleteFolder}
                  onRenameDocument={handleRenameDocument}
                  onDeleteDocument={handleDeleteDocument}
                  onMoveDocument={handleMoveDocument}
                  onCreateDocumentInFolder={handleCreateDocumentInFolder}
                  onCreateSubfolder={handleCreateSubfolder}
                />
              ))}
            </div>
          )}
        </ScrollArea>
      </CardContent>

      {/* Move to Folder Dialog */}
      <Dialog open={moveDialogOpen} onOpenChange={setMoveDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Move to Folder</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-4">
            <Label>Select destination folder</Label>
            <Select value={selectedFolderId || 'root'} onValueChange={(v) => setSelectedFolderId(v === 'root' ? null : v)}>
              <SelectTrigger>
                <SelectValue placeholder="Select folder" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="root">📁 Root (No folder)</SelectItem>
                {folders.map((folder) => (
                  <SelectItem key={folder.id} value={folder.id}>
                    📁 {folder.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setMoveDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={confirmMoveDocument}>
              Move
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
