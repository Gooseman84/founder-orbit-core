import { FileText } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { format } from 'date-fns';
import type { WorkspaceDocument } from '@/lib/workspaceEngine';

interface WorkspaceSidebarProps {
  documents: WorkspaceDocument[];
  currentId?: string;
  loading?: boolean;
  onSelect: (id: string) => void;
  onNewDocument: () => void;
}

export function WorkspaceSidebar({
  documents,
  currentId,
  loading = false,
  onSelect,
  onNewDocument,
}: WorkspaceSidebarProps) {
  return (
    <Card className="h-full flex flex-col">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">Documents</CardTitle>
          <Button size="sm" variant="outline" onClick={onNewDocument}>
            <FileText className="w-4 h-4" />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="p-0 flex-1">
        <ScrollArea className="h-full">
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
                  onClick={() => onSelect(doc.id)}
                  className={`w-full p-4 text-left hover:bg-accent transition-colors ${
                    currentId === doc.id ? 'bg-accent border-l-2 border-primary' : ''
                  }`}
                >
                  <div className="flex items-start gap-2">
                    <FileText className="w-4 h-4 mt-1 text-muted-foreground shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm truncate">{doc.title}</p>
                      <p className="text-xs text-muted-foreground capitalize">
                        {doc.doc_type?.replace('_', ' ')}
                      </p>
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
  );
}
