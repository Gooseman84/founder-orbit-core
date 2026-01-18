import { useState, useCallback, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { TextareaWithVoice } from '@/components/ui/textarea-with-voice';
import type { WorkspaceDocument } from '@/lib/workspaceEngine';

interface WorkspaceEditorProps {
  document: WorkspaceDocument;
  onChange: (content: string) => void;
}

export function WorkspaceEditor({ document, onChange }: WorkspaceEditorProps) {
  const [content, setContent] = useState(document.content || '');

  // Only sync local content when switching to a different document
  // Do NOT include document.content in deps - that causes race conditions during typing
  useEffect(() => {
    setContent(document.content || '');
  }, [document.id]);

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      const newContent = e.target.value;
      setContent(newContent);
      onChange(newContent);
    },
    [onChange]
  );

  return (
    <div className="flex flex-col gap-4 h-full overflow-hidden">
      <Card className="shrink-0">
        <CardHeader className="pb-4 px-4 md:px-6">
          <CardTitle className="whitespace-normal break-words leading-tight text-lg md:text-xl">
            {document.title}
          </CardTitle>
          <CardDescription className="capitalize">
            {document.doc_type?.replace('_', ' ')} • {document.status}
          </CardDescription>
        </CardHeader>
      </Card>

      <Card className="flex-1 min-h-0 overflow-hidden">
        <CardContent className="p-0 relative h-full">
          <TextareaWithVoice
            value={content}
            onChange={handleChange}
            placeholder="Start writing or speaking your content here..."
            className="min-h-[400px] h-full border-0 resize-none focus-visible:ring-0 font-mono text-sm p-4 md:p-6 pr-12 whitespace-pre-wrap overflow-y-auto"
          />
        </CardContent>
      </Card>
    </div>
  );
}
