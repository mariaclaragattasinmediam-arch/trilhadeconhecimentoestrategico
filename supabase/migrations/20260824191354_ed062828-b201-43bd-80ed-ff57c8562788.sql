DROP VIEW IF EXISTS public.question_options_public;

-- Alunos podem ler alternativas de avaliações publicadas...
CREATE POLICY options_read ON public.question_options FOR SELECT TO authenticated
  USING (is_admin() OR EXISTS (
    SELECT 1 FROM public.assessment_questions q
    JOIN public.assessments a ON a.id = q.assessment_id
    WHERE q.id = question_id AND q.status = 'publicado' AND a.status = 'publicado'));

-- ...mas nunca a coluna que revela a resposta correta.
REVOKE SELECT ON public.question_options FROM authenticated;
GRANT SELECT (id, question_id, texto, ordem, created_at) ON public.question_options TO authenticated;
GRANT INSERT, UPDATE, DELETE ON public.question_options TO authenticated;