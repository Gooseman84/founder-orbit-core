-- 1) Add columns (if they don't already exist)

ALTER TABLE public.tasks
ADD COLUMN IF NOT EXISTS workspace_document_id uuid;

ALTER TABLE public.workspace_documents
ADD COLUMN IF NOT EXISTS linked_task_id uuid;

-- 2) Add foreign key from tasks → workspace_documents
ALTER TABLE public.tasks
ADD CONSTRAINT tasks_workspace_document_id_fkey
FOREIGN KEY (workspace_document_id)
REFERENCES public.workspace_documents (id)
ON DELETE SET NULL;

-- 3) Enforce that each workspace doc is linked to at most ONE task
CREATE UNIQUE INDEX IF NOT EXISTS idx_tasks_workspace_document_id_unique
ON public.tasks (workspace_document_id)
WHERE workspace_document_id IS NOT NULL;

-- 4) Add foreign key from workspace_documents → tasks
ALTER TABLE public.workspace_documents
ADD CONSTRAINT workspace_documents_linked_task_id_fkey
FOREIGN KEY (linked_task_id)
REFERENCES public.tasks (id)
ON DELETE SET NULL;

-- 5) Indexes to keep lookups snappy
CREATE INDEX IF NOT EXISTS idx_tasks_workspace_document_id
ON public.tasks (workspace_document_id);

CREATE INDEX IF NOT EXISTS idx_workspace_documents_linked_task_id
ON public.workspace_documents (linked_task_id);