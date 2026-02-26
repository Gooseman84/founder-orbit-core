import { useState } from "react";
import { HelpCircle, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Drawer, DrawerContent, DrawerClose } from "@/components/ui/drawer";
import { usePageHelp } from "@/contexts/PageHelpContext";
import { useIsMobile } from "@/hooks/use-mobile";

export function HelpPopover() {
  const { help } = usePageHelp();
  const isMobile = useIsMobile();
  const [open, setOpen] = useState(false);

  if (!help) return null;

  const content = (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-sm">{help.title}</h3>
        <Button
          variant="ghost"
          size="icon"
          className="h-6 w-6 -mr-1"
          onClick={() => setOpen(false)}
        >
          <X className="h-3.5 w-3.5" />
        </Button>
      </div>
      <ul className="space-y-2">
        {help.bullets.map((bullet, i) => (
          <li key={i} className="text-sm text-muted-foreground flex gap-2">
            <span className="text-primary mt-0.5 shrink-0">•</span>
            <span>{bullet}</span>
          </li>
        ))}
      </ul>
      <Button
        variant="secondary"
        size="sm"
        className="w-full"
        onClick={() => setOpen(false)}
      >
        Got it
      </Button>
    </div>
  );

  if (isMobile) {
    return (
      <>
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 rounded-full"
          onClick={() => setOpen(true)}
          aria-label="Page help"
        >
          <HelpCircle className="h-4 w-4 text-muted-foreground" />
        </Button>
        <Drawer open={open} onOpenChange={setOpen}>
          <DrawerContent className="px-4 pb-6 pt-4">
            {content}
          </DrawerContent>
        </Drawer>
      </>
    );
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 rounded-full"
          aria-label="Page help"
        >
          <HelpCircle className="h-4 w-4 text-muted-foreground" />
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80">
        {content}
      </PopoverContent>
    </Popover>
  );
}
