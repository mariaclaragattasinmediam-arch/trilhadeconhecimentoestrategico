ALTER TABLE public.files ADD COLUMN IF NOT EXISTS mime_type text NOT NULL DEFAULT '';
ALTER TABLE public.files ADD COLUMN IF NOT EXISTS updated_at timestamp with time zone NOT NULL DEFAULT now();

UPDATE public.files SET mime_type = tipo WHERE mime_type = '' AND tipo <> '';

DROP TRIGGER IF EXISTS t_files_upd ON public.files;
CREATE TRIGGER t_files_upd BEFORE UPDATE ON public.files
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

ALTER TABLE public.files DROP CONSTRAINT IF EXISTS files_lesson_block_id_fkey;
ALTER TABLE public.files ADD CONSTRAINT files_lesson_block_id_fkey
  FOREIGN KEY (lesson_block_id) REFERENCES public.lesson_blocks(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_files_lesson_block_id ON public.files(lesson_block_id);