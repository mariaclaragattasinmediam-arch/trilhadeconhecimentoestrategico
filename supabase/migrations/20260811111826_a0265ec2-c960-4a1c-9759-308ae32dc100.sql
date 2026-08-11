CREATE OR REPLACE FUNCTION public.admin_student_overview()
RETURNS TABLE (
  user_id uuid,
  nome text,
  email text,
  completed_lessons integer,
  total_lessons integer,
  last_access timestamptz,
  last_lesson_titulo text,
  current_module_id uuid,
  current_module_titulo text,
  current_module_ordem integer,
  current_module_completed integer,
  current_module_total integer
)
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
WITH pl AS (
  SELECT l.id AS lesson_id, m.id AS module_id, m.titulo AS module_titulo, m.ordem AS module_ordem
  FROM lessons l
  JOIN modules m ON m.id = l.module_id
  JOIN courses c ON c.id = m.course_id
  WHERE l.status = 'publicado' AND m.status = 'publicado' AND c.status = 'publicado'
),
students AS (
  SELECT p.id, p.nome, p.email
  FROM profiles p
  WHERE EXISTS (SELECT 1 FROM user_roles ur WHERE ur.user_id = p.id AND ur.role = 'aluno')
    AND NOT EXISTS (SELECT 1 FROM user_roles ur WHERE ur.user_id = p.id AND ur.role = 'admin')
),
done AS (
  SELECT pr.user_id, pr.lesson_id FROM progress pr WHERE pr.completed
),
per_module AS (
  SELECT s.id AS uid, pl.module_id, pl.module_titulo, pl.module_ordem,
         COUNT(*)::int AS total,
         COUNT(d.lesson_id)::int AS completed
  FROM students s
  CROSS JOIN pl
  LEFT JOIN done d ON d.user_id = s.id AND d.lesson_id = pl.lesson_id
  GROUP BY 1, 2, 3, 4
),
totals AS (
  SELECT uid, SUM(total)::int AS total, SUM(completed)::int AS completed
  FROM per_module GROUP BY uid
),
current_mod AS (
  SELECT DISTINCT ON (uid) uid, module_id, module_titulo, module_ordem, completed, total
  FROM per_module
  WHERE completed < total
  ORDER BY uid, module_ordem, module_titulo
),
acc AS (
  SELECT DISTINCT ON (pr.user_id) pr.user_id, pr.last_accessed_at, l.titulo
  FROM progress pr
  JOIN lessons l ON l.id = pr.lesson_id
  ORDER BY pr.user_id, pr.last_accessed_at DESC
)
SELECT s.id,
       s.nome,
       s.email,
       COALESCE(t.completed, 0),
       COALESCE(t.total, 0),
       a.last_accessed_at,
       a.titulo,
       cm.module_id,
       cm.module_titulo,
       cm.module_ordem,
       cm.completed,
       cm.total
FROM students s
LEFT JOIN totals t ON t.uid = s.id
LEFT JOIN current_mod cm ON cm.uid = s.id
LEFT JOIN acc a ON a.user_id = s.id;
$$;

GRANT EXECUTE ON FUNCTION public.admin_student_overview() TO authenticated;

CREATE OR REPLACE FUNCTION public.admin_module_averages()
RETURNS TABLE (
  module_id uuid,
  titulo text,
  ordem integer,
  total_lessons integer,
  avg_percent numeric
)
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
WITH pl AS (
  SELECT l.id AS lesson_id, m.id AS module_id, m.titulo, m.ordem
  FROM lessons l
  JOIN modules m ON m.id = l.module_id
  JOIN courses c ON c.id = m.course_id
  WHERE l.status = 'publicado' AND m.status = 'publicado' AND c.status = 'publicado'
),
students AS (
  SELECT p.id
  FROM profiles p
  WHERE EXISTS (SELECT 1 FROM user_roles ur WHERE ur.user_id = p.id AND ur.role = 'aluno')
    AND NOT EXISTS (SELECT 1 FROM user_roles ur WHERE ur.user_id = p.id AND ur.role = 'admin')
),
done AS (
  SELECT pr.user_id, pr.lesson_id FROM progress pr WHERE pr.completed
),
per_student AS (
  SELECT s.id AS uid, pl.module_id, pl.titulo, pl.ordem,
         COUNT(*)::numeric AS total,
         COUNT(d.lesson_id)::numeric AS completed
  FROM students s
  CROSS JOIN pl
  LEFT JOIN done d ON d.user_id = s.id AND d.lesson_id = pl.lesson_id
  GROUP BY 1, 2, 3, 4
)
SELECT module_id,
       titulo,
       ordem,
       MAX(total)::int,
       ROUND(AVG(CASE WHEN total = 0 THEN 0 ELSE completed / total * 100 END), 0)
FROM per_student
GROUP BY module_id, titulo, ordem;
$$;

GRANT EXECUTE ON FUNCTION public.admin_module_averages() TO authenticated;