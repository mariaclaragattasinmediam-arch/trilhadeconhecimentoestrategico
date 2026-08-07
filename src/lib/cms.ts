import { supabase } from "@/integrations/supabase/client";
import type {
  BlockContent,
  BlockType,
  ContentStatus,
  Course,
  Lesson,
  LessonBlock,
  Module,
} from "@/lib/api";

export const cmsKeys = {
  courses: ["cms", "courses"] as const,
  course: (id: string) => ["cms", "course", id] as const,
  modules: (courseId: string) => ["cms", "modules", courseId] as const,
  allModules: ["cms", "modules", "all"] as const,
  module: (id: string) => ["cms", "module", id] as const,
  lessons: (moduleId: string) => ["cms", "lessons", moduleId] as const,
  allLessons: ["cms", "lessons", "all"] as const,
  lesson: (id: string) => ["cms", "lesson", id] as const,
  blocks: (lessonId: string) => ["cms", "blocks", lessonId] as const,
};

export const STATUS_OPTIONS: { value: ContentStatus; label: string }[] = [
  { value: "rascunho", label: "Rascunho" },
  { value: "publicado", label: "Publicado" },
  { value: "arquivado", label: "Arquivado" },
];

export const BLOCK_LABELS: Record<BlockType, string> = {
  texto: "Texto",
  titulo: "Título",
  subtitulo: "Subtítulo",
  imagem: "Imagem",
  pdf: "PDF",
  video: "Vídeo",
  youtube: "Vídeo do YouTube",
  link: "Link externo",
  lista: "Lista",
  citacao: "Citação",
  destaque: "Caixa de destaque",
};

function check<T>(res: { data: T | null; error: { message: string } | null }): T {
  if (res.error) throw new Error(res.error.message);
  return res.data as T;
}

/* ---------------------------------- Cursos --------------------------------- */

export interface CourseWithCounts extends Course {
  modulos: number;
  aulas: number;
}

export async function listCoursesAdmin(): Promise<CourseWithCounts[]> {
  const [courses, modules, lessons] = await Promise.all([
    supabase.from("courses").select("*").order("created_at", { ascending: false }),
    supabase.from("modules").select("id, course_id"),
    supabase.from("lessons").select("id, module_id"),
  ]);
  const cs = check<Course[]>(courses as never) ?? [];
  const ms = check<{ id: string; course_id: string }[]>(modules as never) ?? [];
  const ls = check<{ id: string; module_id: string }[]>(lessons as never) ?? [];
  const lessonsByModule = new Map<string, number>();
  ls.forEach((l) => lessonsByModule.set(l.module_id, (lessonsByModule.get(l.module_id) ?? 0) + 1));
  return cs.map((c) => {
    const mods = ms.filter((m) => m.course_id === c.id);
    return {
      ...c,
      modulos: mods.length,
      aulas: mods.reduce((acc, m) => acc + (lessonsByModule.get(m.id) ?? 0), 0),
    };
  });
}

export async function getCourse(id: string) {
  const res = await supabase.from("courses").select("*").eq("id", id).maybeSingle();
  return check<Course | null>(res as never);
}

export interface CourseInput {
  titulo: string;
  descricao: string;
  status: ContentStatus;
  capa_url: string | null;
}

export async function createCourse(input: CourseInput) {
  const res = await supabase
    .from("courses")
    .insert({ ...input, publicado: input.status === "publicado" })
    .select("*")
    .single();
  return check<Course>(res as never);
}

export async function updateCourse(id: string, input: Partial<CourseInput>) {
  const patch: Record<string, unknown> = { ...input };
  if (input.status) patch['publicado'] = input.status === "publicado";
  const res = await supabase.from("courses").update(patch).eq("id", id).select("*").single();
  return check<Course>(res as never);
}

export async function deleteCourse(id: string) {
  const { error } = await supabase.from("courses").delete().eq("id", id);
  if (error) throw new Error(error.message);
}

/* --------------------------------- Módulos --------------------------------- */

export async function listModules(courseId?: string) {
  let q = supabase.from("modules").select("*").order("ordem", { ascending: true });
  if (courseId) q = q.eq("course_id", courseId);
  const res = await q;
  return check<Module[]>(res as never) ?? [];
}

export async function getModule(id: string) {
  const res = await supabase.from("modules").select("*").eq("id", id).maybeSingle();
  return check<Module | null>(res as never);
}

export interface ModuleInput {
  titulo: string;
  descricao: string;
  status: ContentStatus;
}

export async function createModule(courseId: string, input: ModuleInput) {
  const existing = await listModules(courseId);
  const res = await supabase
    .from("modules")
    .insert({ ...input, course_id: courseId, ordem: existing.length })
    .select("*")
    .single();
  return check<Module>(res as never);
}

export async function updateModule(id: string, input: Partial<ModuleInput>) {
  const res = await supabase.from("modules").update(input).eq("id", id).select("*").single();
  return check<Module>(res as never);
}

export async function deleteModule(id: string) {
  const { error } = await supabase.from("modules").delete().eq("id", id);
  if (error) throw new Error(error.message);
}

export async function reorderModules(ids: string[]) {
  await Promise.all(
    ids.map((id, index) => supabase.from("modules").update({ ordem: index }).eq("id", id)),
  );
}

/* ---------------------------------- Aulas ---------------------------------- */

export async function listLessons(moduleId?: string) {
  let q = supabase.from("lessons").select("*").order("ordem", { ascending: true });
  if (moduleId) q = q.eq("module_id", moduleId);
  const res = await q;
  return check<Lesson[]>(res as never) ?? [];
}

export async function listLessonsByModules(moduleIds: string[]) {
  if (moduleIds.length === 0) return [] as Lesson[];
  const res = await supabase
    .from("lessons")
    .select("*")
    .in("module_id", moduleIds)
    .order("ordem", { ascending: true });
  return check<Lesson[]>(res as never) ?? [];
}

export async function getLesson(id: string) {
  const res = await supabase.from("lessons").select("*").eq("id", id).maybeSingle();
  return check<Lesson | null>(res as never);
}

export interface LessonInput {
  titulo: string;
  descricao: string;
  status: ContentStatus;
}

export async function createLesson(moduleId: string, input: LessonInput) {
  const existing = await listLessons(moduleId);
  const res = await supabase
    .from("lessons")
    .insert({ ...input, module_id: moduleId, ordem: existing.length })
    .select("*")
    .single();
  return check<Lesson>(res as never);
}

export async function updateLesson(id: string, input: Partial<LessonInput>) {
  const res = await supabase.from("lessons").update(input).eq("id", id).select("*").single();
  return check<Lesson>(res as never);
}

export async function deleteLesson(id: string) {
  const { error } = await supabase.from("lessons").delete().eq("id", id);
  if (error) throw new Error(error.message);
}

export async function reorderLessons(ids: string[]) {
  await Promise.all(
    ids.map((id, index) => supabase.from("lessons").update({ ordem: index }).eq("id", id)),
  );
}

/* ---------------------------------- Blocos --------------------------------- */

export async function listBlocks(lessonId: string) {
  const res = await supabase
    .from("lesson_blocks")
    .select("*")
    .eq("lesson_id", lessonId)
    .order("ordem", { ascending: true });
  return check<LessonBlock[]>(res as never) ?? [];
}

export async function listBlockCounts(lessonIds: string[]) {
  if (lessonIds.length === 0) return new Map<string, number>();
  const res = await supabase.from("lesson_blocks").select("id, lesson_id").in("lesson_id", lessonIds);
  const rows = check<{ id: string; lesson_id: string }[]>(res as never) ?? [];
  const map = new Map<string, number>();
  rows.forEach((r) => map.set(r.lesson_id, (map.get(r.lesson_id) ?? 0) + 1));
  return map;
}

export async function createBlock(lessonId: string, tipo: BlockType, conteudo: BlockContent) {
  const existing = await listBlocks(lessonId);
  const res = await supabase
    .from("lesson_blocks")
    .insert({ lesson_id: lessonId, tipo, conteudo: conteudo as never, ordem: existing.length })
    .select("*")
    .single();
  return check<LessonBlock>(res as never);
}

export async function updateBlock(id: string, conteudo: BlockContent) {
  const res = await supabase
    .from("lesson_blocks")
    .update({ conteudo: conteudo as never })
    .eq("id", id)
    .select("*")
    .single();
  return check<LessonBlock>(res as never);
}

export async function deleteBlock(id: string) {
  const { error } = await supabase.from("lesson_blocks").delete().eq("id", id);
  if (error) throw new Error(error.message);
}

export async function reorderBlocks(ids: string[]) {
  await Promise.all(
    ids.map((id, index) => supabase.from("lesson_blocks").update({ ordem: index }).eq("id", id)),
  );
}

/* -------------------------------- Duplicação -------------------------------- */

async function copyBlocks(fromLessonId: string, toLessonId: string) {
  const blocks = await listBlocks(fromLessonId);
  if (blocks.length === 0) return;
  const { error } = await supabase.from("lesson_blocks").insert(
    blocks.map((b) => ({
      lesson_id: toLessonId,
      tipo: b.tipo,
      conteudo: b.conteudo as never,
      ordem: b.ordem,
    })),
  );
  if (error) throw new Error(error.message);
}

export async function duplicateLesson(lessonId: string, targetModuleId?: string) {
  const lesson = await getLesson(lessonId);
  if (!lesson) throw new Error("Aula não encontrada.");
  const moduleId = targetModuleId ?? lesson.module_id;
  const siblings = await listLessons(moduleId);
  const res = await supabase
    .from("lessons")
    .insert({
      module_id: moduleId,
      titulo: targetModuleId ? lesson.titulo : `${lesson.titulo} (cópia)`,
      descricao: lesson.descricao,
      status: "rascunho" as ContentStatus,
      ordem: targetModuleId ? lesson.ordem : siblings.length,
    })
    .select("*")
    .single();
  const nova = check<Lesson>(res as never);
  await copyBlocks(lessonId, nova.id);
  return nova;
}

export async function duplicateModule(moduleId: string, targetCourseId?: string) {
  const modulo = await getModule(moduleId);
  if (!modulo) throw new Error("Módulo não encontrado.");
  const courseId = targetCourseId ?? modulo.course_id;
  const siblings = await listModules(courseId);
  const res = await supabase
    .from("modules")
    .insert({
      course_id: courseId,
      titulo: targetCourseId ? modulo.titulo : `${modulo.titulo} (cópia)`,
      descricao: modulo.descricao,
      status: "rascunho" as ContentStatus,
      ordem: targetCourseId ? modulo.ordem : siblings.length,
    })
    .select("*")
    .single();
  const novo = check<Module>(res as never);
  const lessons = await listLessons(moduleId);
  for (const l of lessons) await duplicateLesson(l.id, novo.id);
  return novo;
}

export async function duplicateCourse(courseId: string) {
  const course = await getCourse(courseId);
  if (!course) throw new Error("Curso não encontrado.");
  const novo = await createCourse({
    titulo: `${course.titulo} (cópia)`,
    descricao: course.descricao,
    status: "rascunho",
    capa_url: course.capa_url,
  });
  const modules = await listModules(courseId);
  for (const m of modules) await duplicateModule(m.id, novo.id);
  return novo;
}
