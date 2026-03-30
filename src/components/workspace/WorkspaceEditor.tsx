import { useEffect, useRef } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Placeholder from '@tiptap/extension-placeholder';
import Typography from '@tiptap/extension-typography';
import TaskList from '@tiptap/extension-task-list';
import TaskItem from '@tiptap/extension-task-item';
import { marked } from 'marked';
import TurndownService from 'turndown';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import type { WorkspaceDocument } from '@/lib/workspaceEngine';

const turndown = new TurndownService({ headingStyle: 'atx', bulletListMarker: '-' });

// Convert markdown string to HTML for Tiptap
function markdownToHtml(md: string): string {
  if (!md || !md.trim()) return '';
  try {
    return marked(md) as string;
  } catch {
    return md;
  }
}

// Convert Tiptap HTML back to markdown for storage
function htmlToMarkdown(html: string): string {
  if (!html || !html.trim()) return '';
  try {
    return turndown.turndown(html);
  } catch {
    return html;
  }
}

interface WorkspaceEditorProps {
  document: WorkspaceDocument;
  onChange: (content: string) => void;
}

export function WorkspaceEditor({ document, onChange }: WorkspaceEditorProps) {
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;

  // Track which document is loaded so we can re-initialise on switch
  const loadedDocIdRef = useRef<string | null>(null);
  const loadedUpdatedAtRef = useRef<string | null>(null);

  const editor = useEditor({
    extensions: [
      StarterKit,
      Placeholder.configure({
        placeholder: 'Start writing or speaking your content here...',
      }),
      Typography,
      TaskList,
      TaskItem.configure({ nested: true }),
    ],
    content: markdownToHtml(document.content || ''),
    onUpdate({ editor }) {
      const markdown = htmlToMarkdown(editor.getHTML());
      onChangeRef.current(markdown);
    },
    editorProps: {
      attributes: {
        class: 'tiptap-editor',
      },
    },
  });

  // Sync content when switching documents or when an AI suggestion is applied
  useEffect(() => {
    if (!editor) return;
    const docChanged = document.id !== loadedDocIdRef.current;
    const updatedExternally = document.updated_at !== loadedUpdatedAtRef.current;

    if (docChanged || updatedExternally) {
      loadedDocIdRef.current = document.id;
      loadedUpdatedAtRef.current = document.updated_at ?? null;
      const html = markdownToHtml(document.content || '');
      // Only update if the content actually differs to avoid cursor jumps
      if (editor.getHTML() !== html) {
        editor.commands.setContent(html);
      }
    }
  }, [editor, document.id, document.updated_at, document.content]);

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
          <EditorContent
            editor={editor}
            className="tiptap-wrapper h-full overflow-y-auto p-4 md:p-6"
          />
        </CardContent>
      </Card>
    </div>
  );
}

// Export helpers so Workspace.tsx can use them when applying AI suggestions
export { markdownToHtml, htmlToMarkdown };
