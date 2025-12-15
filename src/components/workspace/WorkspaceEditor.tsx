import { useState, useCallback, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
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
    <div className="flex flex-col gap-4">
      <Card>
        <CardHeader className="pb-4">
          <CardTitle>{document.title}</CardTitle>
          <CardDescription className="capitalize">
            {document.doc_type?.replace('_', ' ')} • {document.status}
          </CardDescription>
        </CardHeader>
      </Card>

      <Card>
        <CardContent className="p-0">
          <Textarea
            value={content}
            onChange={handleChange}
            placeholder="Start writing your content here..."
            className="min-h-[500px] border-0 resize-y focus-visible:ring-0 font-mono text-sm p-6"
          />
        </CardContent>
      </Card>
    </div>
  );
}
