import { useState } from 'react';
import { ChevronRight, Folder, FileText } from 'lucide-react';
import { format } from 'date-fns';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
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
}

export function FolderTreeItem({
  node,
  level = 0,
  selectedId,
  onSelect,
  onToggleFolder,
  expandedFolders,
}: FolderTreeItemProps) {
  // Local expanded state fallback if not controlled
  const [localExpanded, setLocalExpanded] = useState(false);
  
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
      <div>
        {/* Folder row */}
        <button
          onClick={handleToggle}
          className="w-full py-1.5 px-2 text-left rounded-md transition-colors hover:bg-secondary flex items-center gap-2 group"
          style={{ paddingLeft: `${indentPx + 8}px` }}
        >
          <ChevronRight 
            className={`w-4 h-4 text-muted-foreground transition-transform duration-150 shrink-0 ${
              isExpanded ? 'rotate-90' : ''
            }`}
          />
          <Folder className="w-4 h-4 text-muted-foreground shrink-0" />
          <span className="text-sm font-medium truncate flex-1">{node.name}</span>
        </button>

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
  const docIndentPx = indentPx + 24; // Extra indent for documents

  return (
    <button
      onClick={() => onSelect(node.id)}
      className={`w-full py-2 px-2 text-left rounded-md transition-colors group ${
        isSelected
          ? 'bg-primary text-primary-foreground ring-1 ring-primary/40'
          : 'hover:bg-secondary'
      }`}
      style={{ paddingLeft: `${docIndentPx}px` }}
    >
      <div className="flex items-start gap-2">
        <FileText 
          className={`w-4 h-4 mt-0.5 shrink-0 ${
            isSelected ? 'text-primary-foreground' : 'text-muted-foreground'
          }`} 
        />
        <div className="flex-1 min-w-0">
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
          {doc && (
            <p 
              className={`text-xs capitalize mt-1 ${
                isSelected ? 'text-primary-foreground/80' : 'text-muted-foreground'
              }`}
            >
              {doc.doc_type?.replace('_', ' ')} · {format(new Date(doc.updated_at), 'MMM d')}
            </p>
          )}
        </div>
      </div>
    </button>
  );
}
