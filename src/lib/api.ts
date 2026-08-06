import { supabase } from "@/integrations/supabase/client";

export type BlockType =
  | "titulo"
  | "subtitulo"
  | "texto"
  | "imagem"
  | "pdf"
  | "video"
  | "youtube"
  | "link"
  | "lista"
  | "citacao"
  | "destaque";

export interface BlockContent {
  texto?: string;
  itens?: string[];
  url?: string;
  rotulo?: string;
  legenda?: string;
  path?: string;
  nome?: string;
  autor?: string;
}

export interface Course {
  id: string;
  titulo: string;
  descricao: string;
  capa_url: string | null;
  publicado: boolean;
  created_at: string;
}

export interface Module {
  id: string;
  course_id: string;
  titulo: string;
  descricao: string;
  ordem: number;
}

export interface Lesson {
  id: string;
  module_id: string;
  titulo: string;
  descricao: string;
  ordem: number;
}

export interface LessonBlock {
  id: string;
  lesson_id: string;
  tipo: BlockType;
  conteudo: BlockContent;
  ordem: number;
}

export interface FileRecord {
  id: string;
  lesson_block_id: string | null;
  nome: string;
  url: string;
  path: string | null;
  tipo: string;
  tamanho: number | null;
  created_at: string;
}

export interface ProgressRow {
  id: string;
  user_id: string;
  lesson_id: string;
  completed: boolean;
  completed_at: string | null;
  last_accessed_at: string;
}

export const qk = {
  courses: ["courses"] as const,
  course: (id: string) => ["course", id] as const,
  modules: (courseId: string) => ["modules", courseId] as const,
  allModules: ["modules", "all"] as const,
  lessons: (moduleId: string) => ["lessons", moduleId] as const,
  allLessons: ["lessons", "all"] as const,
  lesson: (id: string) => ["lesson", id] as const,
  blocks: (lessonId: string) => ["blocks", lessonId] as const,
  files: ["files"] as const,
  progress: ["progress"] as const,
  profiles: ["profiles"] as const,
};

function unwrap<T>(res: { data: unknown; error: { message: string } | null }): T {
  if (res.error) throw new Error(res.error.message);
  return (res.data ?? []) as T;
}

export const api = {
  async listCourses() {
    return unwrap<Course[]>(
      await supabase.from("courses").select("*").order("created_at", { ascending: true }),
    );
  },
  async getCourse(id: string) {
    const res = await supabase.from("courses").select("*").eq("id", id).maybeSingle();
    if (res.error) throw new Error(res.error.message);
    return res.data as Course | null;
  },
  async listModules(courseId?: string) {
    let q = supabase.from("modules").select("*").order("ordem", { ascending: true });
    if (courseId) q = q.eq("course_id", courseId);
    return unwrap<Module[]>(await q);
  },
  async listLessons(moduleId?: string) {
    let q = supabase.from("lessons").select("*").order("ordem", { ascending: true });
    if (moduleId) q = q.eq("module_id", moduleId);
    return unwrap<Lesson[]>(await q);
  },
  async getLesson(id: string) {
    const res = await supabase.from("lessons").select("*").eq("id", id).maybeSingle();
    if (res.error) throw new Error(res.error.message);
    return res.data as Lesson | null;
  },
  async listBlocks(lessonId: string) {
    return unwrap<LessonBlock[]>(
      await supabase
        .from("lesson_blocks")
        .select("*")
        .eq("lesson_id", lessonId)
        .order("ordem", { ascending: true }),
    );
  },
  async listFiles() {
    return unwrap<FileRecord[]>(
      await supabase.from("files").select("*").order("created_at", { ascending: false }),
    );
  },
  async listProgress(userId: string) {
    return unwrap<ProgressRow[]>(
      await supabase.from("progress").select("*").eq("user_id", userId),
    );
  },
};

export function computeProgress(lessonIds: string[], progress: ProgressRow[]) {
  const done = new Set(progress.filter((p) => p.completed).map((p) => p.lesson_id));
  const total = lessonIds.length;
  const completed = lessonIds.filter((id) => done.has(id)).length;
  return {
    total,
    completed,
    percent: total === 0 ? 0 : Math.round((completed / total) * 100),
  };
}
