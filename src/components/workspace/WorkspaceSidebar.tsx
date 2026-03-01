import { useState, useRef, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { FileText, Pencil, FolderOpen, Files, FolderPlus, Folder, Package, ChevronDown, ChevronRight, Download, Loader2 } from 'lucide-react';
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
import { Badge } from '@/components/ui/badge';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { format } from 'date-fns';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import {
  DndContext,
  DragOverlay,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragStartEvent,
  DragEndEvent,
} from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { FolderTreeItem, FolderTreeNode } from './FolderTreeItem';
import { WorkspaceSearch, SearchResultsInfo } from './WorkspaceSearch';
import { useImplementationKitByBlueprint } from '@/hooks/useImplementationKit';
import { downloadAsMarkdown } from '@/lib/documentExport';
import { useIsMobile } from '@/hooks/use-mobile';
import { useFeatureAccess } from '@/hooks/useFeatureAccess';
import { ProUpgradeModal } from '@/components/billing/ProUpgradeModal';
import { GripVertical } from 'lucide-react';
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
  blueprintId?: string;
  ventureId?: string;
}

// Collapsible Implementation Kit quick access for sidebar
function ImplementationKitQuickAccess({ blueprintId }: { blueprintId?: string }) {
  const { toast } = useToast();
  const { hasPro } = useFeatureAccess();
  const [isOpen, setIsOpen] = useState(true);
  const [downloadingDoc, setDownloadingDoc] = useState<string | null>(null);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  
  const { data: kit, isLoading } = useImplementationKitByBlueprint(blueprintId);

  const handleDownload = async (docId: string, filename: string) => {
    if (!hasPro) {
      setShowUpgradeModal(true);
      return;
    }
    setDownloadingDoc(docId);
    try {
      await downloadAsMarkdown(docId, filename);
      toast({
        title: "Download started",
        description: `${filename}.md is downloading`,
      });
    } catch (error) {
      toast({
        title: "Download failed",
        description: error instanceof Error ? error.message : "Failed to download",
        variant: "destructive",
      });
    } finally {
      setDownloadingDoc(null);
    }
  };

  // Don't show if no blueprint or no kit
  if (!blueprintId || isLoading) return null;
  if (!kit || kit.status !== 'complete') return null;

  const documents = [
    { id: kit.north_star_spec_id, name: "North Star Spec" },
    { id: kit.architecture_contract_id, name: "Architecture Contract" },
    { id: kit.vertical_slice_plan_id, name: "Vertical Slice Plan" },
    { id: (kit as any).launch_playbook_id, name: "Launch Playbook" },
  ].filter(doc => doc.id);

  if (documents.length === 0) return null;

  return (
    <Card className="shrink-0">
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <CollapsibleTrigger asChild>
          <CardHeader className="py-2 px-3 cursor-pointer hover:bg-muted/50 transition-colors">
            <CardTitle className="text-xs font-medium flex items-center gap-2">
              {isOpen ? (
                <ChevronDown className="h-3 w-3" />
              ) : (
                <ChevronRight className="h-3 w-3" />
              )}
              <Package className="h-3.5 w-3.5 text-primary" />
              Implementation Kit
              <Badge variant="secondary" className="ml-auto text-[10px] px-1.5 py-0">
                {documents.length}
              </Badge>
            </CardTitle>
          </CardHeader>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <CardContent className="pt-0 px-2 pb-2 space-y-0.5">
            {documents.map((doc) => (
              <div 
                key={doc.id} 
                className="flex items-center gap-1 py-1 px-1 rounded hover:bg-muted/50 transition-colors group"
              >
                <FileText className="h-3 w-3 text-muted-foreground shrink-0" />
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="h-6 px-1.5 text-xs flex-1 justify-start font-normal" 
                  asChild
                >
                  <Link to={`/workspace/${doc.id}`}>
                    <span className="truncate">{doc.name}</span>
                  </Link>
                </Button>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                      onClick={() => handleDownload(doc.id!, doc.name)}
                      disabled={downloadingDoc === doc.id}
                    >
                      {downloadingDoc === doc.id ? (
                        <Loader2 className="h-3 w-3 animate-spin" />
                      ) : (
                        <Download className="h-3 w-3" />
                      )}
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent side="right">Download as Markdown</TooltipContent>
                </Tooltip>
              </div>
            ))}
          </CardContent>
        </CollapsibleContent>
      </Collapsible>
      <ProUpgradeModal
        open={showUpgradeModal}
        onClose={() => setShowUpgradeModal(false)}
        reasonCode="EXPORT_REQUIRES_PRO"
      />
    </Card>
  );
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
  blueprintId,
  ventureId,
}: WorkspaceSidebarProps) {
  const { toast } = useToast();
  const isMobile = useIsMobile();
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [newTitle, setNewTitle] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  
  // Drag and drop state
  const [activeId, setActiveId] = useState<string | null>(null);
  const [overId, setOverId] = useState<string | null>(null);
  
  // Persist expanded folder state in localStorage
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(() => {
    try {
      const saved = localStorage.getItem('workspace_expanded_folders');
      return saved ? new Set(JSON.parse(saved)) : new Set();
    } catch {
      return new Set();
    }
  });
  // Track folders expanded due to search (to collapse when search clears)
  const [searchExpandedFolders, setSearchExpandedFolders] = useState<Set<string>>(new Set());
  
  const [moveDialogOpen, setMoveDialogOpen] = useState(false);
  const [documentToMove, setDocumentToMove] = useState<string | null>(null);
  const [selectedFolderId, setSelectedFolderId] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  
  // DnD sensors
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: isMobile
        ? { delay: 300, tolerance: 5 }
        : { distance: 8 },
    }),
    useSensor(KeyboardSensor)
  );

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

  // Filter folder tree based on search query
  const filterTree = (nodes: FolderTreeNode[], query: string): { filtered: FolderTreeNode[]; matchingFolderIds: string[] } => {
    if (!query.trim()) return { filtered: nodes, matchingFolderIds: [] };
    
    const lowerQuery = query.toLowerCase();
    const matchingFolderIds: string[] = [];
    
    const filterNode = (node: FolderTreeNode): FolderTreeNode | null => {
      if (node.type === 'document') {
        const matchesTitle = node.name.toLowerCase().includes(lowerQuery);
        const matchesContent = node.documentData?.content?.toLowerCase().includes(lowerQuery);
        return (matchesTitle || matchesContent) ? node : null;
      }
      
      if (node.type === 'folder') {
        const matchingChildren = node.children
          ?.map(child => filterNode(child))
          .filter(Boolean) as FolderTreeNode[];
        
        if (matchingChildren && matchingChildren.length > 0) {
          matchingFolderIds.push(node.id);
          return { ...node, children: matchingChildren };
        }
        
        if (node.name.toLowerCase().includes(lowerQuery)) {
          return node;
        }
        
        return null;
      }
      return null;
    };
    
    const filtered = nodes.map(node => filterNode(node)).filter(Boolean) as FolderTreeNode[];
    return { filtered, matchingFolderIds };
  };

  const { filtered: filteredFolderTree, matchingFolderIds } = useMemo(() => {
    return filterTree(folderTree, searchQuery);
  }, [folderTree, searchQuery]);

  // Count documents in tree
  const countDocuments = (nodes: FolderTreeNode[]): number => {
    return nodes.reduce((count, node) => {
      if (node.type === 'document') return count + 1;
      if (node.children) return count + countDocuments(node.children);
      return count;
    }, 0);
  };

  // Flatten tree to get all IDs for sortable context
  const allIds = useMemo(() => {
    const ids: string[] = [];
    const collectIds = (nodes: FolderTreeNode[]) => {
      nodes.forEach((node) => {
        ids.push(node.id);
        if (node.children) {
          collectIds(node.children);
        }
      });
    };
    collectIds(filteredFolderTree);
    return ids;
  }, [filteredFolderTree]);

  // Find item in tree by ID
  const findItemById = (id: string, nodes: FolderTreeNode[]): FolderTreeNode | null => {
    for (const node of nodes) {
      if (node.id === id) return node;
      if (node.children) {
        const found = findItemById(id, node.children);
        if (found) return found;
      }
    }
    return null;
  };

  // Expand matching folders when searching
  useEffect(() => {
    if (searchQuery && matchingFolderIds.length > 0) {
      setSearchExpandedFolders(new Set(matchingFolderIds));
    } else {
      setSearchExpandedFolders(new Set());
    }
  }, [searchQuery, matchingFolderIds]);

  // Combine regular expanded + search expanded folders
  const effectiveExpandedFolders = useMemo(() => {
    const combined = new Set(expandedFolders);
    searchExpandedFolders.forEach(id => combined.add(id));
    return combined;
  }, [expandedFolders, searchExpandedFolders]);

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

  // DnD handlers
  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string);
  };

  const handleDragOver = (event: any) => {
    setOverId(event.over?.id as string | null);
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveId(null);
    setOverId(null);

    if (!over) return;

    const draggedId = active.id as string;
    const targetId = over.id as string;

    if (draggedId === targetId) return;

    const draggedItem = findItemById(draggedId, folderTree);
    const targetItem = findItemById(targetId, folderTree);

    if (!draggedItem || draggedItem.type !== 'document') return;

    let newFolderId: string | null = null;
    
    if (targetItem?.type === 'folder') {
      newFolderId = targetId;
    } else if (targetItem?.type === 'document') {
      newFolderId = (targetItem.documentData as any)?.folder_id || null;
    }

    try {
      const { error } = await supabase
        .from('workspace_documents')
        .update({ folder_id: newFolderId })
        .eq('id', draggedId);

      if (error) throw error;
      toast({ title: newFolderId ? 'Moved to folder' : 'Moved to root' });
      onRefresh?.();
    } catch (err) {
      console.error('Error moving document:', err);
      toast({ title: 'Error moving document', variant: 'destructive' });
    }
  };

  const handleDragCancel = () => {
    setActiveId(null);
    setOverId(null);
  };

  const activeItem = activeId ? findItemById(activeId, folderTree) : null;

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
    <div className="h-full flex flex-col overflow-hidden gap-2">
      {/* Implementation Kit Quick Access - Collapsible Section */}
      <ImplementationKitQuickAccess blueprintId={blueprintId} />
      
      <Card className="flex-1 flex flex-col overflow-hidden min-h-0">
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

        {/* Search Input */}
        <WorkspaceSearch
          value={searchQuery}
          onChange={setSearchQuery}
          resultsCount={countDocuments(filteredFolderTree)}
        />
      </CardHeader>

      <CardContent className="p-0 flex-1 min-h-0 overflow-hidden">
        {/* Search results info */}
        <SearchResultsInfo query={searchQuery} count={countDocuments(filteredFolderTree)} />
        
        <ScrollArea className="h-full">
          {loading && documents.length === 0 ? (
            <div className="p-2 space-y-2">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : filteredFolderTree.length === 0 ? (
            <div className="p-3 text-center text-sm text-muted-foreground">
              {searchQuery
                ? `No results for "${searchQuery}"`
                : scope === 'current_venture'
                ? 'No documents for this venture yet.'
                : statusFilter === 'all'
                ? 'No documents yet. Create one to get started.'
                : `No ${statusFilter.replace('_', ' ')} documents.`}
            </div>
          ) : (
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragStart={handleDragStart}
              onDragOver={handleDragOver}
              onDragEnd={handleDragEnd}
              onDragCancel={handleDragCancel}
            >
              <SortableContext items={allIds} strategy={verticalListSortingStrategy}>
                <div className="p-2 space-y-0.5">
                  {filteredFolderTree.map((node) => (
                    <FolderTreeItem
                      key={node.id}
                      node={node}
                      level={0}
                      selectedId={currentId}
                      onSelect={onSelect}
                      onToggleFolder={handleToggleFolder}
                      expandedFolders={effectiveExpandedFolders}
                      onRenameFolder={handleRenameFolder}
                      onDeleteFolder={handleDeleteFolder}
                      onRenameDocument={handleRenameDocument}
                      onDeleteDocument={handleDeleteDocument}
                      onMoveDocument={handleMoveDocument}
                      onCreateDocumentInFolder={handleCreateDocumentInFolder}
                      onCreateSubfolder={handleCreateSubfolder}
                      isDragging={activeId === node.id}
                      isDropTarget={overId === node.id && node.type === 'folder'}
                      searchQuery={searchQuery}
                    />
                  ))}
                </div>
              </SortableContext>

              <DragOverlay>
                {activeItem ? (
                  <div className="flex items-center gap-2 px-3 py-2 bg-background border rounded-md shadow-lg opacity-90">
                    <GripVertical className="w-4 h-4 text-muted-foreground" />
                    {activeItem.type === 'folder' ? (
                      <Folder className="w-4 h-4 text-muted-foreground" />
                    ) : (
                      <FileText className="w-4 h-4 text-muted-foreground" />
                    )}
                    <span className="text-sm font-medium truncate max-w-[150px]">
                      {activeItem.name}
                    </span>
                  </div>
                ) : null}
              </DragOverlay>
            </DndContext>
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
    </div>
  );
}
