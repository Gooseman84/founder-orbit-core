import { Code, Sparkles, ArrowRight, Check, FileText, Layers, Terminal, Lock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { useNavigate } from 'react-router-dom';
import { useFeatureAccess } from '@/hooks/useFeatureAccess';
import { ProUpgradeModal } from '@/components/billing/ProUpgradeModal';
import { useState } from 'react';

interface GenerateKitButtonProps {
  blueprintId: string;
  ventureId: string;
  hasExistingKit: boolean;
  onGenerate: () => void;
}

export function GenerateKitButton({
  blueprintId,
  ventureId,
  hasExistingKit,
  onGenerate
}: GenerateKitButtonProps) {
  const navigate = useNavigate();
  const { hasPro, features } = useFeatureAccess();
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  
  const canGenerate = hasPro || features.canGenerateImplementationKit;

  if (hasExistingKit) {
    return (
      <Card className="border-primary/30 bg-primary/5">
        <CardContent className="pt-6">
          <div className="flex items-start gap-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
              <Check className="h-5 w-5 text-primary" />
            </div>
            <div className="flex-1">
              <h3 className="font-semibold text-foreground">Implementation Kit Ready</h3>
              <p className="text-sm text-muted-foreground">
                View your documents in the Workspace
              </p>
            </div>
          </div>
          <Button 
            className="w-full mt-4" 
            onClick={() => navigate('/workspace')}
          >
            View in Workspace
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </CardContent>
      </Card>
    );
  }
  
  // Show upgrade CTA for trial users
  if (!canGenerate) {
    return (
      <>
        <Card className="border-amber-500/30 bg-amber-500/5">
          <CardContent className="pt-6">
            <div className="flex items-start gap-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-amber-500/10">
                <Lock className="h-5 w-5 text-amber-500" />
              </div>
              <div className="flex-1 space-y-4">
                <div>
                  <h3 className="font-semibold text-foreground">
                    Implementation Kit — Pro Feature
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    Upgrade to Pro to generate your complete build specifications:
                  </p>
                </div>
                
                <ul className="space-y-2 text-sm">
                  <li className="flex items-center gap-2 text-muted-foreground">
                    <FileText className="h-4 w-4 text-amber-500 flex-shrink-0" />
                    North Star Spec (your product vision)
                  </li>
                  <li className="flex items-center gap-2 text-muted-foreground">
                    <Layers className="h-4 w-4 text-amber-500 flex-shrink-0" />
                    Architecture Contract (technical scaffold)
                  </li>
                  <li className="flex items-center gap-2 text-muted-foreground">
                    <Code className="h-4 w-4 text-amber-500 flex-shrink-0" />
                    Thin Vertical Slice Plan (week-by-week roadmap)
                  </li>
                  <li className="flex items-center gap-2 text-muted-foreground">
                    <Terminal className="h-4 w-4 text-amber-500 flex-shrink-0" />
                    Copy-paste AI prompts for your coding tool
                  </li>
                </ul>
                
                <Button 
                  onClick={() => setShowUpgradeModal(true)} 
                  className="w-full"
                  variant="default"
                >
                  <Lock className="mr-2 h-4 w-4" />
                  Upgrade to Pro
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <ProUpgradeModal
          open={showUpgradeModal}
          onClose={() => setShowUpgradeModal(false)}
          reasonCode="IMPLEMENTATION_KIT_REQUIRES_PRO"
        />
      </>
    );
  }
  
  return (
    <Card className="border-primary/30 bg-primary/5">
      <CardContent className="pt-6">
        <div className="flex items-start gap-4">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
            <Sparkles className="h-5 w-5 text-primary" />
          </div>
          <div className="flex-1 space-y-4">
            <div>
              <h3 className="font-semibold text-foreground">
                Ready to Build This?
              </h3>
              <p className="text-sm text-muted-foreground">
                Generate your complete Implementation Kit with:
              </p>
            </div>
            
            <ul className="space-y-2 text-sm">
              <li className="flex items-center gap-2 text-muted-foreground">
                <FileText className="h-4 w-4 text-primary flex-shrink-0" />
                North Star Spec (your product vision)
              </li>
              <li className="flex items-center gap-2 text-muted-foreground">
                <Layers className="h-4 w-4 text-primary flex-shrink-0" />
                Architecture Contract (technical scaffold)
              </li>
              <li className="flex items-center gap-2 text-muted-foreground">
                <Code className="h-4 w-4 text-primary flex-shrink-0" />
                Thin Vertical Slice Plan (week-by-week roadmap)
              </li>
              <li className="flex items-center gap-2 text-muted-foreground">
                <Terminal className="h-4 w-4 text-primary flex-shrink-0" />
                Copy-paste AI prompts for your coding tool
              </li>
            </ul>
            
            <Button onClick={onGenerate} className="w-full">
              <Sparkles className="mr-2 h-4 w-4" />
              Generate Implementation Kit
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
