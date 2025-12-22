import * as React from 'react';
import { Input } from '@/components/ui/input';
import { VoiceInputButton } from '@/components/ui/VoiceInputButton';
import { cn } from '@/lib/utils';

export interface InputWithVoiceProps extends React.ComponentProps<'input'> {
  onVoiceInput?: (text: string) => void;
  voiceDisabled?: boolean;
}

const InputWithVoice = React.forwardRef<HTMLInputElement, InputWithVoiceProps>(
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
        } as React.ChangeEvent<HTMLInputElement>;
        onChange(syntheticEvent);
      }
    }, [onVoiceInput, onChange, value]);

    return (
      <div className="relative">
        <Input
          ref={ref}
          className={cn('pr-10', className)}
          disabled={disabled}
          onChange={onChange}
          value={value}
          {...props}
        />
        <div className="absolute right-1 top-1/2 -translate-y-1/2">
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

InputWithVoice.displayName = 'InputWithVoice';

export { InputWithVoice };
