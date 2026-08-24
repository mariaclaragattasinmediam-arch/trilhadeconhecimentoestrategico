-- ============ 1. Carga horária nos blocos ============
ALTER TABLE public.lesson_blocks
  ADD COLUMN IF NOT EXISTS duration_seconds integer,
  ADD COLUMN IF NOT EXISTS estimated_duration_seconds integer,
  ADD COLUMN IF NOT EXISTS count_for_workload boolean NOT NULL DEFAULT true;

ALTER TABLE public.files ADD COLUMN IF NOT EXISTS duration_seconds integer;

UPDATE public.lesson_blocks SET count_for_workload = false WHERE tipo IN ('imagem','link');

-- ============ 2. Avaliações ============
CREATE TABLE IF NOT EXISTS public.assessments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id uuid NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  titulo text NOT NULL DEFAULT 'Avaliação Final — Trilha de Conhecimento Estratégico',
  descricao text NOT NULL DEFAULT '',
  instrucoes text NOT NULL DEFAULT '',
  passing_score integer NOT NULL DEFAULT 70,
  max_attempts integer DEFAULT 3,
  shuffle_questions boolean NOT NULL DEFAULT false,
  shuffle_options boolean NOT NULL DEFAULT false,
  status content_status NOT NULL DEFAULT 'rascunho',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.assessments TO authenticated;
GRANT ALL ON public.assessments TO service_role;
ALTER TABLE public.assessments ENABLE ROW LEVEL SECURITY;
CREATE POLICY assessments_admin ON public.assessments FOR ALL TO authenticated USING (is_admin()) WITH CHECK (is_admin());
CREATE POLICY assessments_read ON public.assessments FOR SELECT TO authenticated
  USING (is_admin() OR status = 'publicado');
CREATE TRIGGER t_assessments_upd BEFORE UPDATE ON public.assessments
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE IF NOT EXISTS public.assessment_questions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  assessment_id uuid NOT NULL REFERENCES public.assessments(id) ON DELETE CASCADE,
  module_id uuid REFERENCES public.modules(id) ON DELETE SET NULL,
  enunciado text NOT NULL DEFAULT '',
  tipo text NOT NULL DEFAULT 'multipla_escolha',
  ordem integer NOT NULL DEFAULT 0,
  peso numeric NOT NULL DEFAULT 1,
  explicacao text NOT NULL DEFAULT '',
  status content_status NOT NULL DEFAULT 'publicado',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.assessment_questions TO authenticated;
GRANT ALL ON public.assessment_questions TO service_role;
ALTER TABLE public.assessment_questions ENABLE ROW LEVEL SECURITY;
CREATE POLICY questions_admin ON public.assessment_questions FOR ALL TO authenticated USING (is_admin()) WITH CHECK (is_admin());
CREATE POLICY questions_read ON public.assessment_questions FOR SELECT TO authenticated
  USING (is_admin() OR (status = 'publicado' AND EXISTS (
    SELECT 1 FROM public.assessments a WHERE a.id = assessment_id AND a.status = 'publicado')));
CREATE TRIGGER t_questions_upd BEFORE UPDATE ON public.assessment_questions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE IF NOT EXISTS public.question_options (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  question_id uuid NOT NULL REFERENCES public.assessment_questions(id) ON DELETE CASCADE,
  texto text NOT NULL DEFAULT '',
  ordem integer NOT NULL DEFAULT 0,
  is_correct boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.question_options TO authenticated;
GRANT ALL ON public.question_options TO service_role;
ALTER TABLE public.question_options ENABLE ROW LEVEL SECURITY;
-- Somente administradores leem a tabela crua (contém a resposta correta).
CREATE POLICY options_admin ON public.question_options FOR ALL TO authenticated USING (is_admin()) WITH CHECK (is_admin());

-- Impede mais de uma alternativa correta por questão de múltipla escolha
CREATE OR REPLACE FUNCTION public.enforce_single_correct_option()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF NEW.is_correct THEN
    UPDATE public.question_options
      SET is_correct = false
      WHERE question_id = NEW.question_id AND id <> NEW.id AND is_correct;
  END IF;
  RETURN NEW;
END; $$;
CREATE TRIGGER t_options_single_correct AFTER INSERT OR UPDATE OF is_correct ON public.question_options
  FOR EACH ROW WHEN (NEW.is_correct) EXECUTE FUNCTION public.enforce_single_correct_option();

-- View sem a coluna is_correct para os alunos
CREATE OR REPLACE VIEW public.question_options_public AS
  SELECT o.id, o.question_id, o.texto, o.ordem
  FROM public.question_options o
  JOIN public.assessment_questions q ON q.id = o.question_id
  JOIN public.assessments a ON a.id = q.assessment_id
  WHERE q.status = 'publicado' AND a.status = 'publicado';
GRANT SELECT ON public.question_options_public TO authenticated;
GRANT SELECT ON public.question_options_public TO service_role;

-- ============ 3. Tentativas ============
CREATE TABLE IF NOT EXISTS public.assessment_attempts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  assessment_id uuid NOT NULL REFERENCES public.assessments(id) ON DELETE CASCADE,
  score numeric NOT NULL DEFAULT 0,
  total_questions integer NOT NULL DEFAULT 0,
  correct_answers integer NOT NULL DEFAULT 0,
  passed boolean NOT NULL DEFAULT false,
  attempt_number integer NOT NULL DEFAULT 1,
  answers jsonb NOT NULL DEFAULT '{}'::jsonb,
  started_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz
);
GRANT SELECT ON public.assessment_attempts TO authenticated;
GRANT ALL ON public.assessment_attempts TO service_role;
ALTER TABLE public.assessment_attempts ENABLE ROW LEVEL SECURITY;
CREATE POLICY attempts_select_own_or_admin ON public.assessment_attempts FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR is_admin());
CREATE INDEX IF NOT EXISTS idx_attempts_user ON public.assessment_attempts(user_id, assessment_id);

-- ============ 4. Certificados ============
CREATE SEQUENCE IF NOT EXISTS public.certificate_code_seq START 1;

CREATE TABLE IF NOT EXISTS public.certificates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  course_id uuid NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  certificate_code text NOT NULL UNIQUE,
  student_name text NOT NULL,
  course_name text NOT NULL,
  workload_minutes integer NOT NULL DEFAULT 0,
  workload_formatted text NOT NULL DEFAULT '',
  final_score numeric NOT NULL DEFAULT 0,
  completion_date date NOT NULL DEFAULT current_date,
  issued_at timestamptz NOT NULL DEFAULT now(),
  pdf_path text,
  verification_status text NOT NULL DEFAULT 'valido',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, course_id)
);
GRANT SELECT ON public.certificates TO authenticated;
GRANT ALL ON public.certificates TO service_role;
ALTER TABLE public.certificates ENABLE ROW LEVEL SECURITY;
CREATE POLICY certificates_select_own_or_admin ON public.certificates FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR is_admin());
CREATE TRIGGER t_certificates_upd BEFORE UPDATE ON public.certificates
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Políticas de Storage do bucket privado de certificados
CREATE POLICY "certificates_read_own_or_admin" ON storage.objects FOR SELECT TO authenticated
  USING (
    bucket_id = 'certificates'
    AND (public.is_admin() OR (storage.foldername(name))[1] = auth.uid()::text)
  );

-- ============ 5. Funções de carga horária ============
CREATE OR REPLACE FUNCTION public.lesson_workload_seconds(_lesson_id uuid)
RETURNS integer LANGUAGE sql STABLE SET search_path = public AS $$
  SELECT COALESCE(SUM(
    CASE WHEN lb.count_for_workload
      THEN COALESCE(NULLIF(lb.duration_seconds, 0), lb.estimated_duration_seconds, 0)
      ELSE 0 END), 0)::int
  FROM public.lesson_blocks lb WHERE lb.lesson_id = _lesson_id;
$$;

CREATE OR REPLACE FUNCTION public.course_workload_breakdown(_course_id uuid)
RETURNS TABLE(module_id uuid, titulo text, ordem integer, seconds integer)
LANGUAGE sql STABLE SET search_path = public AS $$
  SELECT m.id, m.titulo, m.ordem,
         COALESCE(SUM(public.lesson_workload_seconds(l.id)), 0)::int
  FROM public.modules m
  LEFT JOIN public.lessons l ON l.module_id = m.id AND l.status = 'publicado'
  WHERE m.course_id = _course_id AND m.status = 'publicado'
  GROUP BY m.id, m.titulo, m.ordem
  ORDER BY m.ordem;
$$;

CREATE OR REPLACE FUNCTION public.course_workload_seconds(_course_id uuid)
RETURNS integer LANGUAGE sql STABLE SET search_path = public AS $$
  SELECT COALESCE(SUM(seconds), 0)::int FROM public.course_workload_breakdown(_course_id);
$$;

-- ============ 6. Elegibilidade e correção ============
CREATE OR REPLACE FUNCTION public.course_completion_status(_course_id uuid)
RETURNS TABLE(
  total_lessons integer, completed_lessons integer, content_done boolean,
  assessment_id uuid, passing_score integer, max_attempts integer,
  attempts_used integer, best_score numeric, passed boolean,
  certificate_id uuid, workload_seconds integer
)
LANGUAGE sql STABLE SET search_path = public AS $$
WITH pl AS (
  SELECT l.id FROM public.lessons l
  JOIN public.modules m ON m.id = l.module_id
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

CREATE OR REPLACE FUNCTION private.submit_assessment(_user_id uuid, _assessment_id uuid, _answers jsonb)
RETURNS TABLE(attempt_id uuid, score numeric, total_questions integer, correct_answers integer, passed boolean, attempt_number integer)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_total int; v_correct int; v_score numeric; v_passing int; v_max int;
  v_used int; v_passed boolean; v_id uuid;
BEGIN
  SELECT passing_score, max_attempts INTO v_passing, v_max
  FROM public.assessments WHERE id = _assessment_id AND status = 'publicado';
  IF v_passing IS NULL THEN RAISE EXCEPTION 'Avaliação indisponível.'; END IF;

  SELECT COUNT(*)::int INTO v_used FROM public.assessment_attempts
  WHERE user_id = _user_id AND assessment_id = _assessment_id;
  IF v_max IS NOT NULL AND v_used >= v_max THEN
    RAISE EXCEPTION 'Você já utilizou todas as tentativas disponíveis.';
  END IF;

  SELECT COUNT(*)::int INTO v_total FROM public.assessment_questions
  WHERE assessment_id = _assessment_id AND status = 'publicado';
  IF v_total = 0 THEN RAISE EXCEPTION 'Esta avaliação ainda não possui questões.'; END IF;

  SELECT COUNT(*)::int INTO v_correct
  FROM public.assessment_questions q
  JOIN public.question_options o ON o.question_id = q.id AND o.is_correct
  WHERE q.assessment_id = _assessment_id AND q.status = 'publicado'
    AND (_answers ->> q.id::text) = o.id::text;

  v_score := ROUND((v_correct::numeric / v_total::numeric) * 100, 0);
  v_passed := v_score >= v_passing;

  INSERT INTO public.assessment_attempts
    (user_id, assessment_id, score, total_questions, correct_answers, passed, attempt_number, answers, completed_at)
  VALUES (_user_id, _assessment_id, v_score, v_total, v_correct, v_passed, v_used + 1, _answers, now())
  RETURNING id INTO v_id;

  RETURN QUERY SELECT v_id, v_score, v_total, v_correct, v_passed, v_used + 1;
END; $$;

CREATE OR REPLACE FUNCTION public.submit_assessment(_assessment_id uuid, _answers jsonb)
RETURNS TABLE(attempt_id uuid, score numeric, total_questions integer, correct_answers integer, passed boolean, attempt_number integer)
LANGUAGE sql SET search_path = public AS $$
  SELECT * FROM private.submit_assessment(auth.uid(), _assessment_id, _answers);
$$;

-- ============ 7. Código e validação de certificado ============
CREATE OR REPLACE FUNCTION private.next_certificate_code()
RETURNS text LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  SELECT 'INM-' || to_char(now(), 'YYYY') || '-' || lpad(nextval('public.certificate_code_seq')::text, 6, '0');
$$;

CREATE OR REPLACE FUNCTION public.validate_certificate(_code text)
RETURNS TABLE(certificate_code text, student_name text, course_name text,
              workload_minutes integer, workload_formatted text,
              completion_date date, issued_at timestamptz, verification_status text)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT c.certificate_code, c.student_name, c.course_name, c.workload_minutes,
         c.workload_formatted, c.completion_date, c.issued_at, c.verification_status
  FROM public.certificates c
  WHERE upper(c.certificate_code) = upper(trim(_code));
$$;
GRANT EXECUTE ON FUNCTION public.validate_certificate(text) TO anon, authenticated;

-- ============ 8. Avaliação final padrão da trilha ============
INSERT INTO public.assessments (course_id, titulo, descricao, instrucoes, status)
SELECT c.id,
       'Avaliação Final — Trilha de Conhecimento Estratégico',
       'Certificação — Trilha de Conhecimento Estratégico',
       'Leia cada questão com atenção e selecione a alternativa correta. Você pode navegar entre as questões antes de finalizar.',
       'publicado'
FROM public.courses c
WHERE NOT EXISTS (SELECT 1 FROM public.assessments a WHERE a.course_id = c.id);