import { useState } from "react";
import { Link } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, Package, FileText, AlertCircle, ExternalLink } from "lucide-react";
import { useImplementationKitByBlueprint, useCreateImplementationKit } from "@/hooks/useImplementationKit";
import { TechStackDialog } from "./TechStackDialog";
import type { TechStack } from "@/types/implementationKit";

interface ImplementationKitStatusProps {
  blueprintId: string | undefined;
  ventureId: string | undefined;
  showGenerateButton?: boolean;
  compact?: boolean;
}

export function ImplementationKitStatus({ 
  blueprintId, 
  ventureId, 
  showGenerateButton = false,
  compact = false 
}: ImplementationKitStatusProps) {
  const [showTechStackDialog, setShowTechStackDialog] = useState(false);
  
  const { data: kit, isLoading } = useImplementationKitByBlueprint(blueprintId);
  const createKit = useCreateImplementationKit();

  const handleGenerateKit = (techStack: TechStack) => {
    if (!blueprintId || !ventureId) return;
    
    createKit.mutate({
      blueprintId,
      ventureId,
      techStack,
    });
    setShowTechStackDialog(false);
  };

  // Loading state
  if (isLoading) {
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground py-2">
        <Loader2 className="h-4 w-4 animate-spin" />
        <span>Loading kit status...</span>
      </div>
    );
  }

  // No kit exists - show generate button if allowed
  if (!kit) {
    if (!showGenerateButton || !blueprintId || !ventureId) {
      return null;
    }
    
    return (
      <>
        <Card className="border-dashed border-2">
          <CardContent className="py-4">
            <div className="flex flex-col items-center text-center gap-3">
              <Package className="h-8 w-8 text-muted-foreground" />
              <div>
                <p className="font-medium">No Implementation Kit</p>
                <p className="text-sm text-muted-foreground">
                  Generate a coding kit with tech specs, architecture, and a roadmap
                </p>
              </div>
              <Button 
                onClick={() => setShowTechStackDialog(true)}
                disabled={createKit.isPending}
              >
                {createKit.isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Generating...
                  </>
                ) : (
                  <>
                    <Package className="h-4 w-4 mr-2" />
                    Generate Implementation Kit
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
        
        <TechStackDialog
          open={showTechStackDialog}
          onOpenChange={setShowTechStackDialog}
          onSubmit={handleGenerateKit}
          isGenerating={createKit.isPending}
        />
      </>
    );
  }

  // Kit is generating
  if (kit.status === 'generating') {
    return (
      <Card className="border-primary/30 bg-primary/5">
        <CardContent className="py-4">
          <div className="flex items-center gap-3">
            <Loader2 className="h-5 w-5 animate-spin text-primary" />
            <div>
              <p className="font-medium">Generating Kit...</p>
              <p className="text-sm text-muted-foreground">
                This usually takes 1-2 minutes
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Kit has error
  if (kit.status === 'error') {
    return (
      <Card className="border-destructive/30 bg-destructive/5">
        <CardContent className="py-4">
          <div className="flex items-center gap-3">
            <AlertCircle className="h-5 w-5 text-destructive" />
            <div className="flex-1">
              <p className="font-medium text-destructive">Generation Failed</p>
              <p className="text-sm text-muted-foreground">
                {kit.error_message || "An error occurred while generating the kit"}
              </p>
            </div>
            {showGenerateButton && (
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => setShowTechStackDialog(true)}
              >
                Retry
              </Button>
            )}
          </div>
        </CardContent>
        
        {showGenerateButton && (
          <TechStackDialog
            open={showTechStackDialog}
            onOpenChange={setShowTechStackDialog}
            onSubmit={handleGenerateKit}
            isGenerating={createKit.isPending}
          />
        )}
      </Card>
    );
  }

  // Kit is complete - show document links
  if (kit.status === 'complete') {
    // Compact view for Tasks page
    if (compact) {
      return (
        <Card className="border-border/50 bg-muted/30">
          <CardContent className="py-3 flex items-center justify-between">
            <span className="text-sm text-muted-foreground flex items-center gap-2">
              <FileText className="h-4 w-4" />
              Implementation Kit ready
            </span>
            <Button variant="ghost" size="sm" asChild>
              <Link to={`/workspace?folderId=${kit.implementation_folder_id}`}>
                View Documents
                <ExternalLink className="h-3 w-3 ml-1" />
              </Link>
            </Button>
          </CardContent>
        </Card>
      );
    }

    // Full view for Workspace sidebar
    return (
      <Card>
        <CardHeader className="pb-2 pt-3 px-3">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Package className="h-4 w-4 text-primary" />
            Implementation Kit
            <Badge variant="secondary" className="ml-auto text-xs">Complete</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0 px-3 pb-3 space-y-1">
          {kit.north_star_spec_id && (
            <Button variant="ghost" size="sm" className="w-full justify-start h-8 text-xs" asChild>
              <Link to={`/workspace/${kit.north_star_spec_id}`}>
                <FileText className="h-3 w-3 mr-2" />
                North Star Spec
              </Link>
            </Button>
          )}
          {kit.architecture_contract_id && (
            <Button variant="ghost" size="sm" className="w-full justify-start h-8 text-xs" asChild>
              <Link to={`/workspace/${kit.architecture_contract_id}`}>
                <FileText className="h-3 w-3 mr-2" />
                Architecture Contract
              </Link>
            </Button>
          )}
          {kit.vertical_slice_plan_id && (
            <Button variant="ghost" size="sm" className="w-full justify-start h-8 text-xs" asChild>
              <Link to={`/workspace/${kit.vertical_slice_plan_id}`}>
                <FileText className="h-3 w-3 mr-2" />
                Vertical Slice Plan
              </Link>
            </Button>
          )}
        </CardContent>
      </Card>
    );
  }

  return null;
}
