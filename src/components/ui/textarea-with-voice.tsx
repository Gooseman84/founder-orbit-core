import * as React from 'react';
import { Textarea } from '@/components/ui/textarea';
import { VoiceInputButton } from '@/components/ui/VoiceInputButton';
import { cn } from '@/lib/utils';

export interface TextareaWithVoiceProps extends React.ComponentProps<'textarea'> {
  onVoiceInput?: (text: string) => void;
  voiceDisabled?: boolean;
}

const TextareaWithVoice = React.forwardRef<HTMLTextAreaElement, TextareaWithVoiceProps>(
  ({ className, onVoiceInput, voiceDisabled, disabled, onChange, value, ...props }, ref) => {
    const handleVoiceTranscript = React.useCallback((text: string) => {
      if (!text.trim()) return;
      if (onVoiceInput) {
        onVoiceInput(text);
      } else if (onChange) {
        const currentValue = typeof value === 'string' ? value : '';
        const separator = currentValue.trim() ? ' ' : '';
        const newValue = currentValue + separator + text.trim();
        const syntheticEvent = {
          target: { value: newValue },
          currentTarget: { value: newValue },
        } as React.ChangeEvent<HTMLTextAreaElement>;
        onChange(syntheticEvent);
      }
    }, [onVoiceInput, onChange, value]);

    return (
      <div className="relative">
        <Textarea
          ref={ref}
          className={cn('pr-10', className)}
          disabled={disabled}
          onChange={onChange}
          value={value}
          {...props}
        />
        <div className="absolute right-2 top-2">
          <VoiceInputButton
            onTranscript={handleVoiceTranscript}
            disabled={disabled || voiceDisabled}
            size="sm"
          />
        </div>
      </div>
    );
  }
);

TextareaWithVoice.displayName = 'TextareaWithVoice';

export { TextareaWithVoice };
