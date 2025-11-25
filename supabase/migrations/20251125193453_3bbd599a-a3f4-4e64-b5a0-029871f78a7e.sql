-- Create function to update timestamps (if not exists)
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Create workspace_documents table
CREATE TABLE public.workspace_documents (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  idea_id UUID,
  source_type TEXT,
  source_id UUID,
  doc_type TEXT,
  title TEXT NOT NULL,
  content TEXT,
  ai_suggestions TEXT,
  status TEXT DEFAULT 'draft',
  metadata JSONB,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create index on user_id for performance
CREATE INDEX idx_workspace_documents_user_id ON public.workspace_documents(user_id);

-- Enable Row Level Security
ALTER TABLE public.workspace_documents ENABLE ROW LEVEL SECURITY;

-- Create policies for authenticated users
CREATE POLICY "Users can view their own documents"
ON public.workspace_documents
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own documents"
ON public.workspace_documents
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own documents"
ON public.workspace_documents
FOR UPDATE
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own documents"
ON public.workspace_documents
FOR DELETE
USING (auth.uid() = user_id);

-- Create trigger for automatic updated_at timestamp
CREATE TRIGGER update_workspace_documents_updated_at
BEFORE UPDATE ON public.workspace_documents
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();