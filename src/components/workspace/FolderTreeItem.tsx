import { useState } from 'react';
import { ChevronRight, Folder, FileText, MoreVertical, Pencil, Trash2, FolderInput, FilePlus, FolderPlus, GripVertical } from 'lucide-react';
import { format } from 'date-fns';
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from '@/components/ui/tooltip';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { useIsMobile } from '@/hooks/use-mobile';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { cn } from '@/lib/utils';
import type { WorkspaceDocument } from '@/lib/workspaceEngine';

export interface FolderTreeNode {
  type: 'folder' | 'document';
  id: string;
  name: string;
  children?: FolderTreeNode[];
  documentData?: WorkspaceDocument;
  isExpanded?: boolean;
}

interface FolderTreeItemProps {
  node: FolderTreeNode;
  level?: number;
  selectedId?: string;
  onSelect: (id: string) => void;
  onToggleFolder?: (id: string) => void;
  expandedFolders?: Set<string>;
  onRenameFolder?: (id: string, name: string) => void;
  onDeleteFolder?: (id: string) => void;
  onRenameDocument?: (id: string, title: string) => void;
  onDeleteDocument?: (id: string) => void;
  onMoveDocument?: (documentId: string) => void;
  onCreateDocumentInFolder?: (folderId: string) => void;
  onCreateSubfolder?: (parentFolderId: string) => void;
  isDragging?: boolean;
  isDropTarget?: boolean;
  searchQuery?: string;
}

export function FolderTreeItem({
  node,
  level = 0,
  selectedId,
  onSelect,
  onToggleFolder,
  expandedFolders,
  onRenameFolder,
  onDeleteFolder,
  onRenameDocument,
  onDeleteDocument,
  onMoveDocument,
  onCreateDocumentInFolder,
  onCreateSubfolder,
  isDragging = false,
  isDropTarget = false,
  searchQuery,
}: FolderTreeItemProps) {
  const isMobile = useIsMobile();
  const [localExpanded, setLocalExpanded] = useState(false);
  
  // Sortable hook for drag-and-drop
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
  } = useSortable({ id: node.id });
  
  const sortableStyle = {
    transform: CSS.Transform.toString(transform),
    transition,
  };
  
  const isExpanded = expandedFolders 
    ? expandedFolders.has(node.id) 
    : localExpanded;

  const handleToggle = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onToggleFolder) {
      onToggleFolder(node.id);
    } else {
      setLocalExpanded(!localExpanded);
    }
  };

  const indentPx = level * 16;

  if (node.type === 'folder') {
    return (
      <div
        ref={setNodeRef}
        style={sortableStyle}
        className={cn(
          isDragging && 'opacity-50',
          isDropTarget && 'ring-2 ring-primary ring-offset-1 rounded-md bg-primary/5'
        )}
      >
        {/* Folder row */}
        <div 
          className="w-full py-1.5 px-2 rounded-md transition-colors hover:bg-secondary flex items-center gap-1 group"
          style={{ paddingLeft: `${indentPx + 4}px` }}
        >
          <button
            onClick={handleToggle}
            className="flex items-center gap-2 flex-1 min-w-0"
          >
            <ChevronRight 
              className={cn(
                'w-4 h-4 text-muted-foreground transition-transform duration-150 shrink-0',
                isExpanded && 'rotate-90'
              )}
            />
            <Folder className="w-4 h-4 text-muted-foreground shrink-0" />
            <span className="text-sm font-medium truncate flex-1 text-left">{node.name}</span>
          </button>
          
          {/* Action menu for folders */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className={cn(
                  'h-6 w-6 p-0 shrink-0 transition-opacity',
                  isMobile ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
                )}
                onClick={(e) => e.stopPropagation()}
              >
                <MoreVertical className="w-3.5 h-3.5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              {onCreateDocumentInFolder && (
                <DropdownMenuItem onClick={() => onCreateDocumentInFolder(node.id)}>
                  <FilePlus className="w-4 h-4 mr-2" />
                  New Document Here
                </DropdownMenuItem>
              )}
              {onCreateSubfolder && (
                <DropdownMenuItem onClick={() => onCreateSubfolder(node.id)}>
                  <FolderPlus className="w-4 h-4 mr-2" />
                  New Subfolder
                </DropdownMenuItem>
              )}
              {onRenameFolder && (
                <DropdownMenuItem onClick={() => onRenameFolder(node.id, node.name)}>
                  <Pencil className="w-4 h-4 mr-2" />
                  Rename Folder
                </DropdownMenuItem>
              )}
              {(onCreateDocumentInFolder || onCreateSubfolder || onRenameFolder) && onDeleteFolder && <DropdownMenuSeparator />}
              {onDeleteFolder && (
                <DropdownMenuItem 
                  onClick={() => onDeleteFolder(node.id)}
                  className="text-destructive focus:text-destructive"
                >
                  <Trash2 className="w-4 h-4 mr-2" />
                  Delete Folder
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Children (nested folders and documents) */}
        {isExpanded && node.children && node.children.length > 0 && (
          <div className="transition-all duration-150">
            {node.children.map((child) => (
              <FolderTreeItem
                key={child.id}
                node={child}
                level={level + 1}
                selectedId={selectedId}
                onSelect={onSelect}
                onToggleFolder={onToggleFolder}
                expandedFolders={expandedFolders}
                onRenameFolder={onRenameFolder}
                onDeleteFolder={onDeleteFolder}
                onRenameDocument={onRenameDocument}
                onDeleteDocument={onDeleteDocument}
                onMoveDocument={onMoveDocument}
                onCreateDocumentInFolder={onCreateDocumentInFolder}
                onCreateSubfolder={onCreateSubfolder}
                searchQuery={searchQuery}
              />
            ))}
          </div>
        )}
      </div>
    );
  }

  // Document node
  const doc = node.documentData;
  const isSelected = selectedId === node.id;
  const docIndentPx = indentPx + 8;

  return (
    <div 
      ref={setNodeRef}
      style={sortableStyle}
      className={cn(
        'w-full py-2 px-2 rounded-md transition-colors group',
        isSelected
          ? 'bg-primary text-primary-foreground ring-1 ring-primary/40'
          : 'hover:bg-secondary',
        isDragging && 'opacity-50',
        isDropTarget && 'ring-2 ring-primary ring-offset-1'
      )}
    >
      <div 
        className="flex items-start gap-1"
        style={{ paddingLeft: `${docIndentPx}px` }}
      >
        {/* Drag handle - only for documents */}
        <button
          {...attributes}
          {...listeners}
          className={cn(
            'p-1 cursor-grab active:cursor-grabbing shrink-0 rounded hover:bg-secondary/50',
            isMobile ? 'opacity-100' : 'opacity-0 group-hover:opacity-100',
            isSelected && 'hover:bg-primary-foreground/10'
          )}
          onClick={(e) => e.stopPropagation()}
        >
          <GripVertical className={cn(
            'w-3 h-3',
            isSelected ? 'text-primary-foreground/70' : 'text-muted-foreground'
          )} />
        </button>

        <button
          onClick={() => onSelect(node.id)}
          className="flex items-start gap-2 flex-1 min-w-0 text-left"
        >
          <FileText 
            className={cn(
              'w-4 h-4 mt-0.5 shrink-0',
              isSelected ? 'text-primary-foreground' : 'text-muted-foreground'
            )} 
          />
          <div className="flex-1 min-w-0">
            <TooltipProvider delayDuration={300}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <p className="font-medium text-sm line-clamp-2 text-left leading-snug break-words">
                    {node.name}
                  </p>
                </TooltipTrigger>
                <TooltipContent side="right" align="start" className="max-w-[250px]">
                  <p className="whitespace-normal break-words">{node.name}</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
            {doc && (
              <p 
                className={cn(
                  'text-xs capitalize mt-1',
                  isSelected ? 'text-primary-foreground/80' : 'text-muted-foreground'
                )}
              >
                {doc.doc_type?.replace('_', ' ')} · {format(new Date(doc.updated_at), 'MMM d')}
              </p>
            )}
          </div>
        </button>
        
        {/* Action menu for documents */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className={cn(
                'h-6 w-6 p-0 shrink-0 transition-opacity',
                isMobile ? 'opacity-100' : 'opacity-0 group-hover:opacity-100',
                isSelected && 'text-primary-foreground hover:bg-primary-foreground/10'
              )}
              onClick={(e) => e.stopPropagation()}
            >
              <MoreVertical className="w-3.5 h-3.5" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            {onMoveDocument && (
              <DropdownMenuItem onClick={() => onMoveDocument(node.id)}>
                <FolderInput className="w-4 h-4 mr-2" />
                Move to Folder
              </DropdownMenuItem>
            )}
            {onRenameDocument && (
              <DropdownMenuItem onClick={() => onRenameDocument(node.id, node.name)}>
                <Pencil className="w-4 h-4 mr-2" />
                Rename
              </DropdownMenuItem>
            )}
            {(onMoveDocument || onRenameDocument) && onDeleteDocument && <DropdownMenuSeparator />}
            {onDeleteDocument && (
              <DropdownMenuItem 
                onClick={() => onDeleteDocument(node.id)}
                className="text-destructive focus:text-destructive"
              >
                <Trash2 className="w-4 h-4 mr-2" />
                Delete
              </DropdownMenuItem>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
}
