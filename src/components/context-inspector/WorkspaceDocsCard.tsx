import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { FileText, Clock, ExternalLink } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { formatDistanceToNow } from "date-fns";

interface WorkspaceDocsCardProps {
  docs: any[];
  loading?: boolean;
}

export function WorkspaceDocsCard({ docs, loading }: WorkspaceDocsCardProps) {
  const navigate = useNavigate();

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-primary" />
            Recent Workspace Documents
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="space-y-2">
              <Skeleton className="h-4 w-1/2" />
              <Skeleton className="h-3 w-full" />
            </div>
          ))}
        </CardContent>
      </Card>
    );
  }

  if (!docs?.length) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-primary" />
            Recent Workspace Documents
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground text-sm mb-4">
            No workspace documents yet. Start creating notes and plans!
          </p>
          <Button variant="outline" size="sm" onClick={() => navigate("/workspace")}>
            Go to Workspace
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileText className="h-5 w-5 text-primary" />
          Recent Workspace Documents
          <Badge variant="secondary" className="ml-auto text-xs">{docs.length}</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {docs.map((doc) => (
          <div
            key={doc.id}
            className="p-3 rounded-lg border border-border hover:bg-accent/50 transition-colors cursor-pointer"
            onClick={() => navigate(`/workspace/${doc.id}`)}
          >
            <div className="flex items-start justify-between mb-2">
              <div className="flex items-center gap-2">
                <h4 className="font-medium text-sm">{doc.title}</h4>
                {doc.doc_type && (
                  <Badge variant="outline" className="text-xs capitalize">
                    {doc.doc_type.replace(/_/g, " ")}
                  </Badge>
                )}
              </div>
              <ExternalLink className="h-3 w-3 text-muted-foreground" />
            </div>
            
            {doc.content && (
              <p className="text-xs text-muted-foreground line-clamp-2 mb-2">
                {doc.content.slice(0, 300)}
                {doc.content.length > 300 && "..."}
              </p>
            )}
            
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <Clock className="h-3 w-3" />
              Updated {formatDistanceToNow(new Date(doc.updated_at), { addSuffix: true })}
            </div>
          </div>
        ))}

        <Button 
          variant="ghost" 
          size="sm" 
          className="w-full"
          onClick={() => navigate("/workspace")}
        >
          View All Documents
        </Button>
      </CardContent>
    </Card>
  );
}
