import { useEffect } from 'react';
import { Mic, MicOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { useVoiceToText } from '@/hooks/useVoiceToText';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

interface VoiceInputButtonProps {
  onTranscript: (text: string) => void;
  disabled?: boolean;
  className?: string;
  size?: 'sm' | 'default';
}

export function VoiceInputButton({ 
  onTranscript, 
  disabled = false, 
  className,
  size = 'sm'
}: VoiceInputButtonProps) {
  const { toast } = useToast();
  const {
    isListening,
    transcript,
    error,
    isSupported,
    toggleListening,
    resetTranscript,
  } = useVoiceToText();

  // Send transcript to parent when listening stops and we have text
  useEffect(() => {
    if (!isListening && transcript) {
      onTranscript(transcript);
      resetTranscript();
    }
  }, [isListening, transcript, onTranscript, resetTranscript]);

  // Show error toast
  useEffect(() => {
    if (error) {
      toast({
        title: 'Voice input error',
        description: error,
        variant: 'destructive',
      });
    }
  }, [error, toast]);

  if (!isSupported) {
    return null; // Don't show button if not supported
  }

  const iconSize = size === 'sm' ? 'h-4 w-4' : 'h-5 w-5';
  const buttonSize = size === 'sm' ? 'h-7 w-7' : 'h-8 w-8';

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={toggleListening}
            disabled={disabled}
            className={cn(
              buttonSize,
              'shrink-0 rounded-full transition-all duration-200',
              isListening && 'bg-destructive text-destructive-foreground hover:bg-destructive/90 animate-pulse',
              !isListening && 'text-muted-foreground hover:text-foreground hover:bg-muted',
              className
            )}
            aria-label={isListening ? 'Stop voice input' : 'Start voice input'}
          >
            {isListening ? (
              <MicOff className={iconSize} />
            ) : (
              <Mic className={iconSize} />
            )}
          </Button>
        </TooltipTrigger>
        <TooltipContent side="top">
          <p>{isListening ? 'Stop recording' : 'Voice input'}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
