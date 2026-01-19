-- Create workspace_folders table for hierarchical folder organization
CREATE TABLE public.workspace_folders (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  venture_id UUID REFERENCES public.ventures(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  parent_folder_id UUID REFERENCES public.workspace_folders(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.workspace_folders ENABLE ROW LEVEL SECURITY;

-- RLS Policies for workspace_folders
CREATE POLICY "Users can view their own folders"
ON public.workspace_folders
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own folders"
ON public.workspace_folders
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own folders"
ON public.workspace_folders
FOR UPDATE
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own folders"
ON public.workspace_folders
FOR DELETE
USING (auth.uid() = user_id);

-- Indexes for performance on workspace_folders
CREATE INDEX idx_workspace_folders_user_id ON public.workspace_folders(user_id);
CREATE INDEX idx_workspace_folders_parent_folder_id ON public.workspace_folders(parent_folder_id);
CREATE INDEX idx_workspace_folders_venture_id ON public.workspace_folders(venture_id);

-- Add folder_id column to workspace_documents table
ALTER TABLE public.workspace_documents
ADD COLUMN folder_id UUID REFERENCES public.workspace_folders(id) ON DELETE SET NULL;

-- Index for folder_id on workspace_documents
CREATE INDEX idx_workspace_documents_folder_id ON public.workspace_documents(folder_id);

-- Create trigger for updated_at on workspace_folders
CREATE TRIGGER update_workspace_folders_updated_at
BEFORE UPDATE ON public.workspace_folders
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();