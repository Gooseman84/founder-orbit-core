import { supabase } from '@/integrations/supabase/client';

/**
 * Downloads a workspace document as a markdown file
 */
export async function downloadAsMarkdown(documentId: string, filename: string): Promise<void> {
  // Fetch document content from workspace_documents table
  const { data, error } = await supabase
    .from('workspace_documents')
    .select('content, title')
    .eq('id', documentId)
    .single();

  if (error) {
    throw new Error(`Failed to fetch document: ${error.message}`);
  }

  if (!data?.content) {
    throw new Error('Document has no content to download');
  }

  // Use the provided filename or fall back to document title
  const sanitizedFilename = (filename || data.title || 'document')
    .replace(/[^a-z0-9\s-]/gi, '')
    .replace(/\s+/g, '-')
    .toLowerCase();

  // Create blob and trigger download
  const blob = new Blob([data.content], { type: 'text/markdown;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  
  const link = document.createElement('a');
  link.href = url;
  link.download = `${sanitizedFilename}.md`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  
  // Clean up the URL object
  URL.revokeObjectURL(url);
}
