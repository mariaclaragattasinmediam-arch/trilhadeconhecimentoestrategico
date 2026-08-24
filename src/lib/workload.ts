import { supabase } from "@/integrations/supabase/client";
import type { BlockType, LessonBlock } from "@/lib/api";

export const workloadKeys = {
  course: (courseId: string) => ["workload", "course", courseId] as const,
};

/** Tipos que, por padrão, não contam carga horária. */
export const DEFAULT_NO_WORKLOAD: BlockType[] = ["imagem", "link"];

/** Duração efetiva de um bloco em segundos (duração real do vídeo > estimada). */
export function blockDurationSeconds(block: LessonBlock): number {
  if (block.count_for_workload === false) return 0;
  const real = block.duration_seconds ?? 0;
  if (real > 0) return real;
  return block.estimated_duration_seconds ?? 0;
}

export function lessonWorkloadSeconds(blocks: LessonBlock[]): number {
  return blocks.reduce((acc, b) => acc + blockDurationSeconds(b), 0);
}

/** "20 horas e 35 minutos" — formato amigável usado no CMS e no certificado. */
export function formatWorkload(seconds: number): string {
  const minutes = Math.round((seconds ?? 0) / 60);
  if (minutes <= 0) return "0 minutos";
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  const horas = h === 1 ? "1 hora" : `${h} horas`;
  const mins = m === 1 ? "1 minuto" : `${m} minutos`;
  if (h === 0) return mins;
  if (m === 0) return horas;
  return `${horas} e ${mins}`;
}

/** "2h15" / "45 min" — formato compacto para listas e tabelas. */
export function formatWorkloadShort(seconds: number): string {
  const minutes = Math.round((seconds ?? 0) / 60);
  if (minutes <= 0) return "0 min";
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h === 0) return `${m} min`;
  if (m === 0) return `${h}h`;
  return `${h}h${String(m).padStart(2, "0")}`;
}

/** "00:32:45" — duração detectada de um vídeo. */
export function formatDuration(seconds?: number | null): string {
  if (!seconds || seconds <= 0) return "—";
  const s = Math.round(seconds);
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  const pad = (n: number) => String(n).padStart(2, "0");
  return h > 0 ? `${h}h${pad(m)}min${pad(sec)}s` : `${m}min ${pad(sec)}s`;
}

export interface WorkloadModule {
  module_id: string;
  titulo: string;
  ordem: number;
  seconds: number;
}

export interface CourseWorkload {
  modules: WorkloadModule[];
  totalSeconds: number;
}

export async function getCourseWorkload(courseId: string): Promise<CourseWorkload> {
  const { data, error } = await supabase.rpc("course_workload_breakdown", {
    _course_id: courseId,
  });
  if (error) throw new Error(error.message);
  const modules = (data ?? []) as WorkloadModule[];
  return {
    modules,
    totalSeconds: modules.reduce((acc, m) => acc + (m.seconds ?? 0), 0),
  };
}
