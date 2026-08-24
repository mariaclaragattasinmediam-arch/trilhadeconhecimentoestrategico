CREATE TABLE IF NOT EXISTS public.question_answers (
  question_id uuid PRIMARY KEY REFERENCES public.assessment_questions(id) ON DELETE CASCADE,
  option_id uuid NOT NULL REFERENCES public.question_options(id) ON DELETE CASCADE,
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.question_answers TO authenticated;
GRANT ALL ON public.question_answers TO service_role;
ALTER TABLE public.question_answers ENABLE ROW LEVEL SECURITY;
CREATE POLICY answers_admin ON public.question_answers FOR ALL TO authenticated
  USING (is_admin()) WITH CHECK (is_admin());

INSERT INTO public.question_answers (question_id, option_id)
SELECT o.question_id, o.id FROM public.question_options o WHERE o.is_correct
ON CONFLICT (question_id) DO NOTHING;

DROP TRIGGER IF EXISTS t_options_single_correct ON public.question_options;
DROP FUNCTION IF EXISTS public.enforce_single_correct_option();
ALTER TABLE public.question_options DROP COLUMN IF EXISTS is_correct;
GRANT SELECT ON public.question_options TO authenticated;

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
  JOIN public.question_answers ans ON ans.question_id = q.id
  WHERE q.assessment_id = _assessment_id AND q.status = 'publicado'
    AND (_answers ->> q.id::text) = ans.option_id::text;

  v_score := ROUND((v_correct::numeric / v_total::numeric) * 100, 0);
  v_passed := v_score >= v_passing;

  INSERT INTO public.assessment_attempts
    (user_id, assessment_id, score, total_questions, correct_answers, passed, attempt_number, answers, completed_at)
  VALUES (_user_id, _assessment_id, v_score, v_total, v_correct, v_passed, v_used + 1, _answers, now())
  RETURNING id INTO v_id;

  RETURN QUERY SELECT v_id, v_score, v_total, v_correct, v_passed, v_used + 1;
END; $$;