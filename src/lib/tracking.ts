import { supabase } from "@/integrations/supabase/client";
import { api, type Lesson, type Module, type ProgressRow } from "@/lib/api";

export type StudentStatus = "nao_iniciado" | "em_andamento" | "concluido";

export interface StudentOverview {
  userId: string;
  nome: string;
  email: string;
  completedLessons: number;
  totalLessons: number;
  percent: number;
  status: StudentStatus;
  lastAccess: string | null;
  lastLessonTitulo: string | null;
  currentModuleId: string | null;
  currentModuleTitulo: string | null;
  currentModuleOrdem: number | null;
  currentModuleCompleted: number | null;
  currentModuleTotal: number | null;
}

export interface ModuleAverage {
  moduleId: string;
  titulo: string;
  ordem: number;
  totalLessons: number;
  avgPercent: number;
}

export interface StudentDetail {
  profile: { id: string; nome: string; email: string };
  modules: {
    module: Module;
    lessons: { lesson: Lesson; completed: boolean; lastAccess: string | null }[];
    completed: number;
    total: number;
    percent: number;
  }[];
  progress: ProgressRow[];
  totals: { completed: number; total: number; percent: number };
  status: StudentStatus;
  current: { titulo: string; percent: number; completed: number; total: number; id: string } | null;
  lastAccess: string | null;
  activity: { lessonId: string; titulo: string; at: string; completed: boolean }[];
}

export const trackingKeys = {
  overview: ["admin-tracking", "overview"] as const,
  modules: ["admin-tracking", "modules"] as const,
  student: (id: string) => ["admin-tracking", "student", id] as const,
};

export function percentOf(completed: number, total: number) {
  return total === 0 ? 0 : Math.round((completed / total) * 100);
}

export function statusOf(percent: number, total: number): StudentStatus {
  if (total > 0 && percent >= 100) return "concluido";
  if (percent <= 0) return "nao_iniciado";
  return "em_andamento";
}

export const statusLabel: Record<StudentStatus, string> = {
  nao_iniciado: "Não iniciado",
  em_andamento: "Em andamento",
  concluido: "Concluído",
};

const TZ = "America/Sao_Paulo";

/** Normaliza timestamps do banco (sem fuso explícito são UTC). */
function parseDate(iso: string): Date {
  const hasZone = /(?:z|[+-]\d{2}:?\d{2})$/i.test(iso.trim());
  return new Date(hasZone ? iso : `${iso.replace(" ", "T")}Z`);
}

/** Data no formato AAAA-MM-DD no fuso de São Paulo. */
function localDayKey(d: Date): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(d);
}

/** Diferença em dias de calendário (fuso de São Paulo). */
export function daysSince(iso: string | null): number | null {
  if (!iso) return null;
  const then = Date.parse(`${localDayKey(parseDate(iso))}T00:00:00Z`);
  const today = Date.parse(`${localDayKey(new Date())}T00:00:00Z`);
  return Math.round((today - then) / 86_400_000);
}

export function formatLastAccess(iso: string | null): string {
  if (!iso) return "Nunca acessou";
  const d = parseDate(iso);
  const days = daysSince(iso) ?? 0;
  const hora = d.toLocaleTimeString("pt-BR", {
    timeZone: TZ,
    hour: "2-digit",
    minute: "2-digit",
  });
  if (days <= 0) return `Hoje às ${hora}`;
  if (days === 1) return `Ontem às ${hora}`;
  if (days < 30) return `Há ${String(days)} dias`;
  return d.toLocaleDateString("pt-BR", { timeZone: TZ });
}


/** Sinalização visual de inatividade (alunos concluídos nunca são inativos). */
export function inactivityLevel(
  iso: string | null,
  status: StudentStatus,
): "ok" | "atencao" | "critico" {
  if (status === "concluido") return "ok";
  const days = daysSince(iso);
  if (days === null) return "critico";
  if (days > 30) return "critico";
  if (days > 7) return "atencao";
  return "ok";
}

export const tracking = {
  async listStudents(): Promise<StudentOverview[]> {
    const { data, error } = await supabase.rpc("admin_student_overview");
    if (error) throw new Error(error.message);
    return (data ?? []).map((r) => {
      const percent = percentOf(r.completed_lessons ?? 0, r.total_lessons ?? 0);
      return {
        userId: r.user_id,
        nome: r.nome || r.email,
        email: r.email,
        completedLessons: r.completed_lessons ?? 0,
        totalLessons: r.total_lessons ?? 0,
        percent,
        status: statusOf(percent, r.total_lessons ?? 0),
        lastAccess: r.last_access,
        lastLessonTitulo: r.last_lesson_titulo,
        currentModuleId: r.current_module_id,
        currentModuleTitulo: r.current_module_titulo,
        currentModuleOrdem: r.current_module_ordem,
        currentModuleCompleted: r.current_module_completed,
        currentModuleTotal: r.current_module_total,
      };
    });
  },

  async moduleAverages(): Promise<ModuleAverage[]> {
    const { data, error } = await supabase.rpc("admin_module_averages");
    if (error) throw new Error(error.message);
    return (data ?? [])
      .map((r) => ({
        moduleId: r.module_id,
        titulo: r.titulo,
        ordem: r.ordem,
        totalLessons: r.total_lessons,
        avgPercent: Number(r.avg_percent ?? 0),
      }))
      .sort((a, b) => a.ordem - b.ordem);
  },

  async studentDetail(userId: string): Promise<StudentDetail> {
    const [{ data: prof, error: profError }, modules, lessons, { data: prog, error: progError }] =
      await Promise.all([
        supabase.from("profiles").select("id, nome, email").eq("id", userId).maybeSingle(),
        api.listModules(),
        api.listLessons(),
        supabase.from("progress").select("*").eq("user_id", userId),
      ]);
    if (profError) throw new Error(profError.message);
    if (progError) throw new Error(progError.message);
    if (!prof) throw new Error("Aluno não encontrado");

    const progress = (prog ?? []) as ProgressRow[];
    const byLesson = new Map(progress.map((p) => [p.lesson_id, p]));
    const publishedModules = modules
      .filter((m) => m.status === "publicado")
      .sort((a, b) => a.ordem - b.ordem);

    const grouped = publishedModules.map((module) => {
      const list = lessons
        .filter((l) => l.module_id === module.id && l.status === "publicado")
        .sort((a, b) => a.ordem - b.ordem)
        .map((lesson) => {
          const p = byLesson.get(lesson.id);
          return {
            lesson,
            completed: p?.completed ?? false,
            lastAccess: p?.last_accessed_at ?? null,
          };
        });
      const completed = list.filter((l) => l.completed).length;
      return {
        module,
        lessons: list,
        completed,
        total: list.length,
        percent: percentOf(completed, list.length),
      };
    });

    const total = grouped.reduce((acc, m) => acc + m.total, 0);
    const completed = grouped.reduce((acc, m) => acc + m.completed, 0);
    const percent = percentOf(completed, total);
    const currentGroup = grouped.find((m) => m.total > 0 && m.completed < m.total) ?? null;

    const activity = progress
      .filter((p) => p.last_accessed_at)
      .sort((a, b) => b.last_accessed_at.localeCompare(a.last_accessed_at))
      .slice(0, 10)
      .map((p) => ({
        lessonId: p.lesson_id,
        titulo: lessons.find((l) => l.id === p.lesson_id)?.titulo ?? "Aula removida",
        at: p.last_accessed_at,
        completed: p.completed,
      }));

    return {
      profile: prof,
      modules: grouped,
      progress,
      totals: { completed, total, percent },
      status: statusOf(percent, total),
      current: currentGroup
        ? {
            id: currentGroup.module.id,
            titulo: currentGroup.module.titulo,
            percent: currentGroup.percent,
            completed: currentGroup.completed,
            total: currentGroup.total,
          }
        : null,
      lastAccess: activity[0]?.at ?? null,
      activity,
    };
  },
};

export function studentsToCsv(rows: StudentOverview[]): string {
  const header = [
    "Nome",
    "Email",
    "Progresso",
    "Módulo atual",
    "Aulas concluídas",
    "Total de aulas",
    "Último acesso",
    "Status",
  ];
  const escape = (v: string) => `"${v.replace(/"/g, '""')}"`;
  const lines = rows.map((r) =>
    [
      r.nome,
      r.email,
      `${String(r.percent)}%`,
      r.currentModuleTitulo ?? "Trilha concluída",
      String(r.completedLessons),
      String(r.totalLessons),
      formatLastAccess(r.lastAccess),
      statusLabel[r.status],
    ]
      .map(escape)
      .join(","),
  );
  return [header.map(escape).join(","), ...lines].join("\n");
}

export function downloadCsv(filename: string, csv: string) {
  const blob = new Blob([`\uFEFF${csv}`], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
