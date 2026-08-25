-- =========================================================
-- FASE 6 — Etapa 1: conteúdo reutilizável + controle de acesso
-- =========================================================

-- ---------- 1. module_lessons ----------
CREATE TABLE IF NOT EXISTS public.module_lessons (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  module_id uuid NOT NULL REFERENCES public.modules(id) ON DELETE CASCADE,
  lesson_id uuid NOT NULL REFERENCES public.lessons(id) ON DELETE CASCADE,
  ordem integer NOT NULL DEFAULT 0,
  obrigatorio boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (module_id, lesson_id)
);
CREATE INDEX IF NOT EXISTS idx_module_lessons_module ON public.module_lessons(module_id, ordem);
CREATE INDEX IF NOT EXISTS idx_module_lessons_lesson ON public.module_lessons(lesson_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.module_lessons TO authenticated;
GRANT ALL ON public.module_lessons TO service_role;
ALTER TABLE public.module_lessons ENABLE ROW LEVEL SECURITY;

CREATE TRIGGER t_module_lessons_upd BEFORE UPDATE ON public.module_lessons
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- backfill a partir da estrutura atual
INSERT INTO public.module_lessons (module_id, lesson_id, ordem)
SELECT l.module_id, l.id, l.ordem FROM public.lessons l
ON CONFLICT (module_id, lesson_id) DO NOTHING;

-- manter compatibilidade: nova aula criada com module_id gera associação
CREATE OR REPLACE FUNCTION public.sync_lesson_module_link()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF NEW.module_id IS NOT NULL THEN
    INSERT INTO public.module_lessons (module_id, lesson_id, ordem)
    VALUES (NEW.module_id, NEW.id, NEW.ordem)
    ON CONFLICT (module_id, lesson_id) DO NOTHING;
  END IF;
  RETURN NEW;
END; $$;

CREATE TRIGGER t_lessons_link AFTER INSERT ON public.lessons
FOR EACH ROW EXECUTE FUNCTION public.sync_lesson_module_link();

-- ---------- 2. categorias ----------
CREATE TABLE IF NOT EXISTS public.categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nome text NOT NULL UNIQUE,
  descricao text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.categories TO authenticated;
GRANT ALL ON public.categories TO service_role;
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER t_categories_upd BEFORE UPDATE ON public.categories
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE POLICY categories_read ON public.categories FOR SELECT TO authenticated USING (true);
CREATE POLICY categories_admin ON public.categories FOR ALL TO authenticated
  USING (public.is_admin()) WITH CHECK (public.is_admin());

INSERT INTO public.categories (nome) VALUES
  ('Onboarding'), ('Produto'), ('Comercial'), ('Mercado'),
  ('Liderança'), ('Processos'), ('Compliance')
ON CONFLICT (nome) DO NOTHING;

-- ---------- 3. cursos: visibilidade, destaque, categoria ----------
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'course_visibility') THEN
    CREATE TYPE public.course_visibility AS ENUM ('publico', 'restrito');
  END IF;
END $$;

ALTER TABLE public.courses
  ADD COLUMN IF NOT EXISTS visibility public.course_visibility NOT NULL DEFAULT 'publico',
  ADD COLUMN IF NOT EXISTS destaque boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS category_id uuid REFERENCES public.categories(id) ON DELETE SET NULL;

-- ---------- 4. grupos e acessos ----------
CREATE TABLE IF NOT EXISTS public.user_groups (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  description text NOT NULL DEFAULT '',
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_groups TO authenticated;
GRANT ALL ON public.user_groups TO service_role;
ALTER TABLE public.user_groups ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER t_user_groups_upd BEFORE UPDATE ON public.user_groups
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE IF NOT EXISTS public.user_group_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  group_id uuid NOT NULL REFERENCES public.user_groups(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, group_id)
);
CREATE INDEX IF NOT EXISTS idx_ugm_user ON public.user_group_members(user_id);
CREATE INDEX IF NOT EXISTS idx_ugm_group ON public.user_group_members(group_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_group_members TO authenticated;
GRANT ALL ON public.user_group_members TO service_role;
ALTER TABLE public.user_group_members ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS public.group_courses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id uuid NOT NULL REFERENCES public.user_groups(id) ON DELETE CASCADE,
  course_id uuid NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (group_id, course_id)
);
CREATE INDEX IF NOT EXISTS idx_gc_group ON public.group_courses(group_id);
CREATE INDEX IF NOT EXISTS idx_gc_course ON public.group_courses(course_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.group_courses TO authenticated;
GRANT ALL ON public.group_courses TO service_role;
ALTER TABLE public.group_courses ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS public.user_courses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  course_id uuid NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, course_id)
);
CREATE INDEX IF NOT EXISTS idx_uc_user ON public.user_courses(user_id);
CREATE INDEX IF NOT EXISTS idx_uc_course ON public.user_courses(course_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_courses TO authenticated;
GRANT ALL ON public.user_courses TO service_role;
ALTER TABLE public.user_courses ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS public.access_audit (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id uuid,
  action text NOT NULL,
  group_id uuid,
  course_id uuid,
  target_user_id uuid,
  detalhe text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_access_audit_created ON public.access_audit(created_at DESC);
GRANT SELECT, INSERT ON public.access_audit TO authenticated;
GRANT ALL ON public.access_audit TO service_role;
ALTER TABLE public.access_audit ENABLE ROW LEVEL SECURITY;

-- ---------- 5. função de acesso ----------
CREATE OR REPLACE FUNCTION private.can_access_course(_user uuid, _course uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT
    private.has_role(_user, 'admin'::app_role)
    OR EXISTS (SELECT 1 FROM public.courses c WHERE c.id = _course AND c.visibility = 'publico')
    OR EXISTS (SELECT 1 FROM public.user_courses uc WHERE uc.user_id = _user AND uc.course_id = _course)
    OR EXISTS (
      SELECT 1 FROM public.group_courses gc
      JOIN public.user_group_members m ON m.group_id = gc.group_id
      JOIN public.user_groups g ON g.id = gc.group_id
      WHERE gc.course_id = _course AND m.user_id = _user AND g.active
    );
$$;
REVOKE ALL ON FUNCTION private.can_access_course(uuid, uuid) FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.can_access_course(_course_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY INVOKER SET search_path = public AS $$
  SELECT private.can_access_course(auth.uid(), _course_id);
$$;

-- ---------- 6. políticas RLS dos novos objetos ----------
CREATE POLICY user_groups_admin ON public.user_groups FOR ALL TO authenticated
  USING (public.is_admin()) WITH CHECK (public.is_admin());
CREATE POLICY user_groups_read_own ON public.user_groups FOR SELECT TO authenticated
  USING (public.is_admin() OR EXISTS (
    SELECT 1 FROM public.user_group_members m
    WHERE m.group_id = user_groups.id AND m.user_id = auth.uid()));

CREATE POLICY ugm_admin ON public.user_group_members FOR ALL TO authenticated
  USING (public.is_admin()) WITH CHECK (public.is_admin());
CREATE POLICY ugm_read_own ON public.user_group_members FOR SELECT TO authenticated
  USING (public.is_admin() OR user_id = auth.uid());

CREATE POLICY gc_admin ON public.group_courses FOR ALL TO authenticated
  USING (public.is_admin()) WITH CHECK (public.is_admin());
CREATE POLICY gc_read_own ON public.group_courses FOR SELECT TO authenticated
  USING (public.is_admin() OR EXISTS (
    SELECT 1 FROM public.user_group_members m
    WHERE m.group_id = group_courses.group_id AND m.user_id = auth.uid()));

CREATE POLICY uc_admin ON public.user_courses FOR ALL TO authenticated
  USING (public.is_admin()) WITH CHECK (public.is_admin());
CREATE POLICY uc_read_own ON public.user_courses FOR SELECT TO authenticated
  USING (public.is_admin() OR user_id = auth.uid());

CREATE POLICY audit_admin_read ON public.access_audit FOR SELECT TO authenticated
  USING (public.is_admin());
CREATE POLICY audit_admin_insert ON public.access_audit FOR INSERT TO authenticated
  WITH CHECK (public.is_admin() AND actor_id = auth.uid());

CREATE POLICY module_lessons_admin ON public.module_lessons FOR ALL TO authenticated
  USING (public.is_admin()) WITH CHECK (public.is_admin());
CREATE POLICY module_lessons_read ON public.module_lessons FOR SELECT TO authenticated
  USING (public.is_admin() OR EXISTS (
    SELECT 1 FROM public.modules m JOIN public.courses c ON c.id = m.course_id
    WHERE m.id = module_lessons.module_id
      AND m.status = 'publicado' AND c.status = 'publicado'
      AND public.can_access_course(c.id)));

-- ---------- 7. políticas de leitura com acesso por curso ----------
DROP POLICY IF EXISTS courses_read ON public.courses;
CREATE POLICY courses_read ON public.courses FOR SELECT TO authenticated
  USING (public.is_admin() OR (status = 'publicado' AND public.can_access_course(id)));

DROP POLICY IF EXISTS modules_read ON public.modules;
CREATE POLICY modules_read ON public.modules FOR SELECT TO authenticated
  USING (public.is_admin() OR (status = 'publicado' AND EXISTS (
    SELECT 1 FROM public.courses c
    WHERE c.id = modules.course_id AND c.status = 'publicado' AND public.can_access_course(c.id))));

DROP POLICY IF EXISTS lessons_read ON public.lessons;
CREATE POLICY lessons_read ON public.lessons FOR SELECT TO authenticated
  USING (public.is_admin() OR (status = 'publicado' AND EXISTS (
    SELECT 1 FROM public.module_lessons ml
    JOIN public.modules m ON m.id = ml.module_id
    JOIN public.courses c ON c.id = m.course_id
    WHERE ml.lesson_id = lessons.id
      AND m.status = 'publicado' AND c.status = 'publicado'
      AND public.can_access_course(c.id))));

DROP POLICY IF EXISTS blocks_read ON public.lesson_blocks;
CREATE POLICY blocks_read ON public.lesson_blocks FOR SELECT TO authenticated
  USING (public.is_admin() OR EXISTS (
    SELECT 1 FROM public.lessons l
    JOIN public.module_lessons ml ON ml.lesson_id = l.id
    JOIN public.modules m ON m.id = ml.module_id
    JOIN public.courses c ON c.id = m.course_id
    WHERE l.id = lesson_blocks.lesson_id
      AND l.status = 'publicado' AND m.status = 'publicado' AND c.status = 'publicado'
      AND public.can_access_course(c.id)));

DROP POLICY IF EXISTS files_read ON public.files;
CREATE POLICY files_read ON public.files FOR SELECT TO authenticated
  USING (public.is_admin() OR EXISTS (
    SELECT 1 FROM public.lesson_blocks lb
    JOIN public.lessons l ON l.id = lb.lesson_id
    JOIN public.module_lessons ml ON ml.lesson_id = l.id
    JOIN public.modules m ON m.id = ml.module_id
    JOIN public.courses c ON c.id = m.course_id
    WHERE lb.id = files.lesson_block_id
      AND l.status = 'publicado' AND m.status = 'publicado' AND c.status = 'publicado'
      AND public.can_access_course(c.id)));

-- ---------- 8. funções existentes passam a usar module_lessons ----------
CREATE OR REPLACE FUNCTION public.course_workload_breakdown(_course_id uuid)
RETURNS TABLE(module_id uuid, titulo text, ordem integer, seconds integer)
LANGUAGE sql STABLE SET search_path = public AS $$
  SELECT m.id, m.titulo, m.ordem,
         COALESCE(SUM(public.lesson_workload_seconds(l.id)), 0)::int
  FROM public.modules m
  LEFT JOIN public.module_lessons ml ON ml.module_id = m.id
  LEFT JOIN public.lessons l ON l.id = ml.lesson_id AND l.status = 'publicado'
  WHERE m.course_id = _course_id AND m.status = 'publicado'
  GROUP BY m.id, m.titulo, m.ordem
  ORDER BY m.ordem;
$$;

CREATE OR REPLACE FUNCTION public.course_completion_status(_course_id uuid)
RETURNS TABLE(total_lessons integer, completed_lessons integer, content_done boolean, assessment_id uuid, passing_score integer, max_attempts integer, attempts_used integer, best_score numeric, passed boolean, certificate_id uuid, workload_seconds integer)
LANGUAGE sql STABLE SET search_path = public AS $$
WITH pl AS (
  SELECT DISTINCT l.id FROM public.lessons l
  JOIN public.module_lessons ml ON ml.lesson_id = l.id
  JOIN public.modules m ON m.id = ml.module_id
  JOIN public.courses c ON c.id = m.course_id
  WHERE c.id = _course_id AND l.status = 'publicado' AND m.status = 'publicado' AND c.status = 'publicado'
),
done AS (
  SELECT COUNT(*)::int AS n FROM public.progress p
  WHERE p.user_id = auth.uid() AND p.completed AND p.lesson_id IN (SELECT id FROM pl)
),
a AS (
  SELECT * FROM public.assessments WHERE course_id = _course_id AND status = 'publicado'
  ORDER BY created_at LIMIT 1
),
att AS (
  SELECT COUNT(*)::int AS used, COALESCE(MAX(score), 0) AS best, BOOL_OR(passed) AS ok
  FROM public.assessment_attempts t
  WHERE t.user_id = auth.uid() AND t.assessment_id = (SELECT id FROM a)
)
SELECT (SELECT COUNT(*)::int FROM pl),
       (SELECT n FROM done),
       (SELECT COUNT(*) FROM pl) > 0 AND (SELECT n FROM done) >= (SELECT COUNT(*) FROM pl),
       (SELECT id FROM a),
       (SELECT passing_score FROM a),
       (SELECT max_attempts FROM a),
       COALESCE((SELECT used FROM att), 0),
       COALESCE((SELECT best FROM att), 0),
       COALESCE((SELECT ok FROM att), false),
       (SELECT id FROM public.certificates WHERE user_id = auth.uid() AND course_id = _course_id),
       public.course_workload_seconds(_course_id);
$$;
