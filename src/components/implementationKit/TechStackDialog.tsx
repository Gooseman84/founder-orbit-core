import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Loader2 } from 'lucide-react';
import type { 
  TechStack, 
  FrontendFramework, 
  BackendPlatform, 
  AICodingTool, 
  DeploymentPlatform 
} from '@/types/implementationKit';

interface TechStackDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (techStack: TechStack) => void;
  isGenerating?: boolean;
}

export function TechStackDialog({
  open,
  onOpenChange,
  onSubmit,
  isGenerating = false
}: TechStackDialogProps) {
  const [techStack, setTechStack] = useState<TechStack>({
    frontend: 'react',
    backend: 'supabase',
    aiTool: 'cursor',
    deployment: 'vercel'
  });
  
  const handleSubmit = () => {
    onSubmit(techStack);
  };
  
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Choose Your Tech Stack</DialogTitle>
          <DialogDescription>
            Select the technologies you want to use. We'll generate implementation 
            guides and AI prompts specific to your choices.
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4 py-4">
          {/* Frontend Framework */}
          <div className="space-y-2">
            <Label>Frontend Framework</Label>
            <Select
              value={techStack.frontend}
              onValueChange={(value) => setTechStack({ ...techStack, frontend: value as FrontendFramework })}
              disabled={isGenerating}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select frontend" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="react">
                  <div className="flex flex-col items-start">
                    <span className="font-medium">React + TypeScript</span>
                    <span className="text-xs text-muted-foreground">Most popular, great ecosystem</span>
                  </div>
                </SelectItem>
                <SelectItem value="nextjs">
                  <div className="flex flex-col items-start">
                    <span className="font-medium">Next.js 14+ (App Router)</span>
                    <span className="text-xs text-muted-foreground">Full-stack React framework</span>
                  </div>
                </SelectItem>
                <SelectItem value="vue">
                  <div className="flex flex-col items-start">
                    <span className="font-medium">Vue 3 + TypeScript</span>
                    <span className="text-xs text-muted-foreground">Progressive framework</span>
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          {/* Backend Platform */}
          <div className="space-y-2">
            <Label>Backend Platform</Label>
            <Select
              value={techStack.backend}
              onValueChange={(value) => setTechStack({ ...techStack, backend: value as BackendPlatform })}
              disabled={isGenerating}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select backend" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="supabase">
                  <div className="flex flex-col items-start">
                    <span className="font-medium">Supabase</span>
                    <span className="text-xs text-muted-foreground">PostgreSQL + Auth + Storage</span>
                  </div>
                </SelectItem>
                <SelectItem value="firebase">
                  <div className="flex flex-col items-start">
                    <span className="font-medium">Firebase</span>
                    <span className="text-xs text-muted-foreground">Firestore + Auth + Cloud Functions</span>
                  </div>
                </SelectItem>
                <SelectItem value="nodejs">
                  <div className="flex flex-col items-start">
                    <span className="font-medium">Node.js + PostgreSQL</span>
                    <span className="text-xs text-muted-foreground">Full control, more setup</span>
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          {/* AI Coding Tool */}
          <div className="space-y-2">
            <Label>AI Coding Tool</Label>
            <Select
              value={techStack.aiTool}
              onValueChange={(value) => setTechStack({ ...techStack, aiTool: value as AICodingTool })}
              disabled={isGenerating}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select AI tool" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="cursor">
                  <div className="flex flex-col items-start">
                    <span className="font-medium">Cursor</span>
                    <span className="text-xs text-muted-foreground">AI-first code editor</span>
                  </div>
                </SelectItem>
                <SelectItem value="lovable">
                  <div className="flex flex-col items-start">
                    <span className="font-medium">Lovable</span>
                    <span className="text-xs text-muted-foreground">Prompt-to-app platform</span>
                  </div>
                </SelectItem>
                <SelectItem value="claude">
                  <div className="flex flex-col items-start">
                    <span className="font-medium">Claude (Anthropic)</span>
                    <span className="text-xs text-muted-foreground">Best for complex reasoning</span>
                  </div>
                </SelectItem>
                <SelectItem value="copilot">
                  <div className="flex flex-col items-start">
                    <span className="font-medium">GitHub Copilot</span>
                    <span className="text-xs text-muted-foreground">Integrated with VS Code</span>
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          {/* Deployment */}
          <div className="space-y-2">
            <Label>Deployment Platform</Label>
            <Select
              value={techStack.deployment}
              onValueChange={(value) => setTechStack({ ...techStack, deployment: value as DeploymentPlatform })}
              disabled={isGenerating}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select deployment" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="vercel">
                  <div className="flex flex-col items-start">
                    <span className="font-medium">Vercel</span>
                    <span className="text-xs text-muted-foreground">Best for Next.js, easy deploys</span>
                  </div>
                </SelectItem>
                <SelectItem value="netlify">
                  <div className="flex flex-col items-start">
                    <span className="font-medium">Netlify</span>
                    <span className="text-xs text-muted-foreground">Great for static sites</span>
                  </div>
                </SelectItem>
                <SelectItem value="railway">
                  <div className="flex flex-col items-start">
                    <span className="font-medium">Railway</span>
                    <span className="text-xs text-muted-foreground">Full-stack deployments</span>
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        
        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isGenerating}
          >
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={isGenerating}>
            {isGenerating ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Generating...
              </>
            ) : (
              'Generate Kit'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
