import { useState, useMemo } from 'react';
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
import { FileText, Folder, GripVertical } from 'lucide-react';
import { FolderTreeItem, FolderTreeNode } from './FolderTreeItem';
import { useIsMobile } from '@/hooks/use-mobile';

interface DraggableFolderTreeProps {
  folderTree: FolderTreeNode[];
  selectedId?: string;
  expandedFolders: Set<string>;
  onSelect: (id: string) => void;
  onToggleFolder: (id: string) => void;
  onMoveDocument: (documentId: string, targetFolderId: string | null) => Promise<void>;
  onRenameFolder?: (id: string, name: string) => void;
  onDeleteFolder?: (id: string) => void;
  onRenameDocument?: (id: string, title: string) => void;
  onDeleteDocument?: (id: string) => void;
  onCreateDocumentInFolder?: (folderId: string) => void;
  onCreateSubfolder?: (parentFolderId: string) => void;
}

export function DraggableFolderTree({
  folderTree,
  selectedId,
  expandedFolders,
  onSelect,
  onToggleFolder,
  onMoveDocument,
  onRenameFolder,
  onDeleteFolder,
  onRenameDocument,
  onDeleteDocument,
  onCreateDocumentInFolder,
  onCreateSubfolder,
}: DraggableFolderTreeProps) {
  const isMobile = useIsMobile();
  const [activeId, setActiveId] = useState<string | null>(null);
  const [overId, setOverId] = useState<string | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: isMobile
        ? { delay: 300, tolerance: 5 } // Long press on mobile
        : { distance: 8 }, // 8px movement on desktop
    }),
    useSensor(KeyboardSensor)
  );

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
    collectIds(folderTree);
    return ids;
  }, [folderTree]);

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

    if (!draggedItem) return;

    // Only allow dragging documents, not folders (for simplicity)
    if (draggedItem.type !== 'document') return;

    // If dragging onto a folder, move into that folder
    if (targetItem?.type === 'folder') {
      await onMoveDocument(draggedId, targetId);
    }
    // If dragging onto another document, move to the same folder
    else if (targetItem?.type === 'document') {
      const targetFolderId = (targetItem.documentData as any)?.folder_id || null;
      await onMoveDocument(draggedId, targetFolderId);
    }
  };

  const handleDragCancel = () => {
    setActiveId(null);
    setOverId(null);
  };

  const activeItem = activeId ? findItemById(activeId, folderTree) : null;

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={handleDragStart}
      onDragOver={handleDragOver}
      onDragEnd={handleDragEnd}
      onDragCancel={handleDragCancel}
    >
      <SortableContext items={allIds} strategy={verticalListSortingStrategy}>
        <div className="space-y-0.5">
          {folderTree.map((node) => (
            <FolderTreeItem
              key={node.id}
              node={node}
              level={0}
              selectedId={selectedId}
              onSelect={onSelect}
              onToggleFolder={onToggleFolder}
              expandedFolders={expandedFolders}
              onRenameFolder={onRenameFolder}
              onDeleteFolder={onDeleteFolder}
              onRenameDocument={onRenameDocument}
              onDeleteDocument={onDeleteDocument}
              onMoveDocument={(docId) => {
                // Opens the dialog via parent handler
                onCreateDocumentInFolder?.(docId);
              }}
              onCreateDocumentInFolder={onCreateDocumentInFolder}
              onCreateSubfolder={onCreateSubfolder}
              isDragging={activeId === node.id}
              isDropTarget={overId === node.id && node.type === 'folder'}
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
  );
}
