import { supabase } from "@/integrations/supabase/client";
import { purgeFilesForLessons } from "@/lib/files";
import type { Lesson } from "@/lib/api";

export interface ModuleLessonLink {
  id: string;
  module_id: string;
  lesson_id: string;
  ordem: number;
  obrigatorio: boolean;
}

export interface LessonUsage {
  courseId: string;
  courseTitulo: string;
  moduleId: string;
  moduleTitulo: string;
}

export const reuseKeys = {
  links: (moduleId?: string) => ["reuse", "links", moduleId ?? "all"] as const,
  usage: (lessonId: string) => ["reuse", "usage", lessonId] as const,
  usageAll: ["reuse", "usage", "all"] as const,
  library: ["reuse", "library"] as const,
};

function fail(error: { message: string } | null) {
  if (error) throw new Error(error.message);
}

export async function listLinks(moduleIds?: string[]): Promise<ModuleLessonLink[]> {
  let q = supabase
    .from("module_lessons")
    .select("id, module_id, lesson_id, ordem, obrigatorio")
    .order("ordem", { ascending: true });
  if (moduleIds) {
    if (moduleIds.length === 0) return [];
    q = q.in("module_id", moduleIds);
  }
  const { data, error } = await q;
  fail(error);
  return (data ?? []) as ModuleLessonLink[];
}

/** Aulas de um módulo, na ordem definida pela associação. */
export async function lessonsOfModule(moduleId: string): Promise<Lesson[]> {
  const links = await listLinks([moduleId]);
  if (links.length === 0) return [];
  const { data, error } = await supabase
    .from("lessons")
    .select("*")
    .in("id", links.map((l) => l.lesson_id));
  fail(error);
  const byId = new Map((data ?? []).map((l) => [l.id, l as Lesson]));
  return links.map((l) => byId.get(l.lesson_id)).filter((l): l is Lesson => Boolean(l));
}

/** Onde cada aula é utilizada (curso + módulo). */
export async function lessonUsageMap(): Promise<Map<string, LessonUsage[]>> {
  const [{ data: links, error }, { data: modules, error: mErr }, { data: courses, error: cErr }] =
    await Promise.all([
      supabase.from("module_lessons").select("lesson_id, module_id"),
      supabase.from("modules").select("id, titulo, course_id"),
      supabase.from("courses").select("id, titulo"),
    ]);
  fail(error);
  fail(mErr);
  fail(cErr);

  const courseById = new Map((courses ?? []).map((c) => [c.id, c.titulo]));
  const moduleById = new Map((modules ?? []).map((m) => [m.id, m]));
  const map = new Map<string, LessonUsage[]>();

  for (const link of links ?? []) {
    const mod = moduleById.get(link.module_id);
    if (!mod) continue;
    const list = map.get(link.lesson_id) ?? [];
    list.push({
      courseId: mod.course_id,
      courseTitulo: courseById.get(mod.course_id) ?? "Curso",
      moduleId: mod.id,
      moduleTitulo: mod.titulo,
    });
    map.set(link.lesson_id, list);
  }
  return map;
}

export function distinctCourses(usage: LessonUsage[] | undefined): LessonUsage[] {
  const seen = new Set<string>();
  return (usage ?? []).filter((u) => {
    if (seen.has(u.courseId)) return false;
    seen.add(u.courseId);
    return true;
  });
}

/** Associa uma aula já existente a um módulo (sem duplicar conteúdo). */
export async function attachLesson(moduleId: string, lessonId: string) {
  const links = await listLinks([moduleId]);
  if (links.some((l) => l.lesson_id === lessonId)) return;
  const { error } = await supabase
    .from("module_lessons")
    .insert({ module_id: moduleId, lesson_id: lessonId, ordem: links.length });
  fail(error);
}

/** Remove somente a associação — o conteúdo continua existindo. */
export async function detachLesson(moduleId: string, lessonId: string) {
  const { error } = await supabase
    .from("module_lessons")
    .delete()
    .eq("module_id", moduleId)
    .eq("lesson_id", lessonId);
  fail(error);
}

export async function reorderModuleLessons(moduleId: string, lessonIds: string[]) {
  await Promise.all(
    lessonIds.map((lessonId, index) =>
      supabase
        .from("module_lessons")
        .update({ ordem: index })
        .eq("module_id", moduleId)
        .eq("lesson_id", lessonId),
    ),
  );
}

export async function countLessonLinks(lessonId: string): Promise<number> {
  const { count, error } = await supabase
    .from("module_lessons")
    .select("id", { count: "exact", head: true })
    .eq("lesson_id", lessonId);
  fail(error);
  return count ?? 0;
}

/** Exclusão definitiva: só permitida quando a aula não está em nenhum módulo. */
export async function deleteLessonPermanently(lessonId: string) {
  const usos = await countLessonLinks(lessonId);
  if (usos > 0) {
    throw new Error(
      "Este conteúdo está sendo utilizado em outros cursos. Remova as associações antes de excluir definitivamente.",
    );
  }
  await purgeFilesForLessons([lessonId]);
  const { error } = await supabase.from("lessons").delete().eq("id", lessonId);
  fail(error);
}

/** Biblioteca de conteúdos para o buscador "Adicionar conteúdo existente". */
export async function searchLessonLibrary(term: string): Promise<Lesson[]> {
  const busca = term.trim();
  let q = supabase.from("lessons").select("*").order("titulo").limit(50);
  if (busca) q = q.or(`titulo.ilike.%${busca}%,descricao.ilike.%${busca}%`);
  const { data, error } = await q;
  fail(error);
  return (data ?? []) as Lesson[];
}
