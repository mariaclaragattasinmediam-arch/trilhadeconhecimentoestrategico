-- 1. Restrict files table reads to published content
DROP POLICY IF EXISTS "files_read" ON public.files;
CREATE POLICY "files_read" ON public.files
FOR SELECT TO authenticated
USING (
  public.is_admin()
  OR EXISTS (
    SELECT 1
    FROM public.lesson_blocks lb
    JOIN public.lessons l ON l.id = lb.lesson_id
    JOIN public.modules m ON m.id = l.module_id
    JOIN public.courses c ON c.id = m.course_id
    WHERE lb.id = files.lesson_block_id
      AND l.status = 'publicado'::content_status
      AND m.status = 'publicado'::content_status
      AND c.status = 'publicado'::content_status
  )
);

-- 2. Restrict storage reads on the private "materiais" bucket
DROP POLICY IF EXISTS "materiais_read_auth" ON storage.objects;
CREATE POLICY "materiais_read_auth" ON storage.objects
FOR SELECT TO authenticated
USING (
  bucket_id = 'materiais'
  AND (
    public.is_admin()
    OR EXISTS (
      SELECT 1
      FROM public.files f
      JOIN public.lesson_blocks lb ON lb.id = f.lesson_block_id
      JOIN public.lessons l ON l.id = lb.lesson_id
      JOIN public.modules m ON m.id = l.module_id
      JOIN public.courses c ON c.id = m.course_id
      WHERE f.path = storage.objects.name
        AND l.status = 'publicado'::content_status
        AND m.status = 'publicado'::content_status
        AND c.status = 'publicado'::content_status
    )
  )
);

-- 3. Trigger-only SECURITY DEFINER functions must not be callable via the API
REVOKE ALL ON FUNCTION public.handle_new_user() FROM public, anon, authenticated;
REVOKE ALL ON FUNCTION public.grant_bootstrap_admin() FROM public, anon, authenticated;
REVOKE ALL ON FUNCTION public.update_updated_at_column() FROM public, anon, authenticated;
REVOKE ALL ON FUNCTION public.has_role(uuid, app_role) FROM public, anon;
REVOKE ALL ON FUNCTION public.is_admin() FROM public, anon;
GRANT EXECUTE ON FUNCTION public.is_admin() TO authenticated;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, app_role) TO authenticated;