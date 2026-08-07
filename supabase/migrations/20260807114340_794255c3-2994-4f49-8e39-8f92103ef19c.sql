-- 1. Status enum
DO $$ BEGIN
  CREATE TYPE public.content_status AS ENUM ('rascunho','publicado','arquivado');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

ALTER TABLE public.courses ADD COLUMN IF NOT EXISTS status public.content_status NOT NULL DEFAULT 'rascunho';
ALTER TABLE public.modules ADD COLUMN IF NOT EXISTS status public.content_status NOT NULL DEFAULT 'rascunho';
ALTER TABLE public.lessons ADD COLUMN IF NOT EXISTS status public.content_status NOT NULL DEFAULT 'rascunho';

UPDATE public.courses SET status = CASE WHEN publicado THEN 'publicado'::public.content_status ELSE 'rascunho'::public.content_status END;
UPDATE public.modules SET status = 'publicado';
UPDATE public.lessons SET status = 'publicado';

-- 2. Cascades
ALTER TABLE public.modules DROP CONSTRAINT IF EXISTS modules_course_id_fkey;
ALTER TABLE public.modules ADD CONSTRAINT modules_course_id_fkey FOREIGN KEY (course_id) REFERENCES public.courses(id) ON DELETE CASCADE;

ALTER TABLE public.lessons DROP CONSTRAINT IF EXISTS lessons_module_id_fkey;
ALTER TABLE public.lessons ADD CONSTRAINT lessons_module_id_fkey FOREIGN KEY (module_id) REFERENCES public.modules(id) ON DELETE CASCADE;

ALTER TABLE public.lesson_blocks DROP CONSTRAINT IF EXISTS lesson_blocks_lesson_id_fkey;
ALTER TABLE public.lesson_blocks ADD CONSTRAINT lesson_blocks_lesson_id_fkey FOREIGN KEY (lesson_id) REFERENCES public.lessons(id) ON DELETE CASCADE;

ALTER TABLE public.progress DROP CONSTRAINT IF EXISTS progress_lesson_id_fkey;
ALTER TABLE public.progress ADD CONSTRAINT progress_lesson_id_fkey FOREIGN KEY (lesson_id) REFERENCES public.lessons(id) ON DELETE CASCADE;

ALTER TABLE public.files DROP CONSTRAINT IF EXISTS files_lesson_block_id_fkey;
ALTER TABLE public.files ADD CONSTRAINT files_lesson_block_id_fkey FOREIGN KEY (lesson_block_id) REFERENCES public.lesson_blocks(id) ON DELETE SET NULL;

-- 3. Indexes
CREATE INDEX IF NOT EXISTS idx_modules_course ON public.modules(course_id, ordem);
CREATE INDEX IF NOT EXISTS idx_lessons_module ON public.lessons(module_id, ordem);
CREATE INDEX IF NOT EXISTS idx_blocks_lesson ON public.lesson_blocks(lesson_id, ordem);
CREATE INDEX IF NOT EXISTS idx_progress_user ON public.progress(user_id);

-- 4. RLS: alunos veem apenas publicados
DROP POLICY IF EXISTS courses_read ON public.courses;
CREATE POLICY courses_read ON public.courses FOR SELECT TO authenticated
  USING (public.is_admin() OR status = 'publicado');

DROP POLICY IF EXISTS modules_read ON public.modules;
CREATE POLICY modules_read ON public.modules FOR SELECT TO authenticated
  USING (public.is_admin() OR (status = 'publicado' AND EXISTS (
    SELECT 1 FROM public.courses c WHERE c.id = modules.course_id AND c.status = 'publicado')));

DROP POLICY IF EXISTS lessons_read ON public.lessons;
CREATE POLICY lessons_read ON public.lessons FOR SELECT TO authenticated
  USING (public.is_admin() OR (status = 'publicado' AND EXISTS (
    SELECT 1 FROM public.modules m JOIN public.courses c ON c.id = m.course_id
    WHERE m.id = lessons.module_id AND m.status = 'publicado' AND c.status = 'publicado')));

DROP POLICY IF EXISTS blocks_read ON public.lesson_blocks;
CREATE POLICY blocks_read ON public.lesson_blocks FOR SELECT TO authenticated
  USING (public.is_admin() OR EXISTS (
    SELECT 1 FROM public.lessons l JOIN public.modules m ON m.id = l.module_id
    JOIN public.courses c ON c.id = m.course_id
    WHERE l.id = lesson_blocks.lesson_id AND l.status = 'publicado'
      AND m.status = 'publicado' AND c.status = 'publicado'));