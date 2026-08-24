import { supabase } from "@/integrations/supabase/client";
import type { ContentStatus } from "@/lib/api";

export interface Assessment {
  id: string;
  course_id: string;
  titulo: string;
  descricao: string;
  instrucoes: string;
  passing_score: number;
  max_attempts: number | null;
  shuffle_questions: boolean;
  shuffle_options: boolean;
  status: ContentStatus;
  created_at: string;
}

export interface Question {
  id: string;
  assessment_id: string;
  module_id: string | null;
  enunciado: string;
  tipo: string;
  ordem: number;
  peso: number;
  explicacao: string;
  status: ContentStatus;
}

export interface QuestionOption {
  id: string;
  question_id: string;
  texto: string;
  ordem: number;
}

export interface Attempt {
  id: string;
  user_id: string;
  assessment_id: string;
  score: number;
  total_questions: number;
  correct_answers: number;
  passed: boolean;
  attempt_number: number;
  started_at: string;
  completed_at: string | null;
}

export interface CompletionStatus {
  total_lessons: number;
  completed_lessons: number;
  content_done: boolean;
  assessment_id: string | null;
  passing_score: number | null;
  max_attempts: number | null;
  attempts_used: number;
  best_score: number;
  passed: boolean;
  certificate_id: string | null;
  workload_seconds: number;
}

export type TrackStatus =
  | "nao_iniciado"
  | "em_andamento"
  | "conteudo_concluido"
  | "avaliacao_pendente"
  | "reprovado"
  | "aprovado"
  | "certificado_emitido";

export const TRACK_STATUS_LABEL: Record<TrackStatus, string> = {
  nao_iniciado: "Não iniciado",
  em_andamento: "Em andamento",
  conteudo_concluido: "Conteúdo concluído",
  avaliacao_pendente: "Avaliação pendente",
  reprovado: "Reprovado",
  aprovado: "Aprovado",
  certificado_emitido: "Certificado emitido",
};

export function trackStatus(s: CompletionStatus | null | undefined): TrackStatus {
  if (!s) return "nao_iniciado";
  if (s.certificate_id) return "certificado_emitido";
  if (s.passed) return "aprovado";
  if (!s.content_done) return s.completed_lessons > 0 ? "em_andamento" : "nao_iniciado";
  if (s.attempts_used === 0) return "avaliacao_pendente";
  return "reprovado";
}

export const assessmentKeys = {
  all: ["assessments"] as const,
  byCourse: (courseId: string) => ["assessments", "course", courseId] as const,
  one: (id: string) => ["assessments", id] as const,
  questions: (assessmentId: string) => ["assessments", assessmentId, "questions"] as const,
  attempts: (assessmentId: string) => ["assessments", assessmentId, "attempts"] as const,
  completion: (courseId: string) => ["completion", courseId] as const,
};

function check<T>(res: { data: T | null; error: { message: string } | null }): T {
  if (res.error) throw new Error(res.error.message);
  return res.data as T;
}

/* ------------------------------- Avaliações ------------------------------- */

export async function listAssessments(): Promise<Assessment[]> {
  const res = await supabase.from("assessments").select("*").order("created_at");
  return (check<Assessment[]>(res as never) ?? []) as Assessment[];
}

export async function getAssessment(id: string): Promise<Assessment | null> {
  const res = await supabase.from("assessments").select("*").eq("id", id).maybeSingle();
  return check<Assessment | null>(res as never);
}

export async function getAssessmentByCourse(courseId: string): Promise<Assessment | null> {
  const res = await supabase
    .from("assessments")
    .select("*")
    .eq("course_id", courseId)
    .order("created_at")
    .limit(1)
    .maybeSingle();
  return check<Assessment | null>(res as never);
}

export type AssessmentInput = Partial<
  Pick<
    Assessment,
    | "titulo"
    | "descricao"
    | "instrucoes"
    | "passing_score"
    | "max_attempts"
    | "shuffle_questions"
    | "shuffle_options"
    | "status"
  >
>;

export async function createAssessment(courseId: string, input: AssessmentInput) {
  const res = await supabase
    .from("assessments")
    .insert({ course_id: courseId, ...input })
    .select("*")
    .single();
  return check<Assessment>(res as never);
}

export async function updateAssessment(id: string, input: AssessmentInput) {
  const res = await supabase.from("assessments").update(input).eq("id", id).select("*").single();
  return check<Assessment>(res as never);
}

export async function deleteAssessment(id: string) {
  const { error } = await supabase.from("assessments").delete().eq("id", id);
  if (error) throw new Error(error.message);
}

/* -------------------------------- Questões -------------------------------- */

export interface QuestionWithOptions extends Question {
  options: QuestionOption[];
  correct_option_id?: string | null;
}

export async function listQuestions(
  assessmentId: string,
  opts: { withAnswers?: boolean; onlyPublished?: boolean } = {},
): Promise<QuestionWithOptions[]> {
  let q = supabase
    .from("assessment_questions")
    .select("*")
    .eq("assessment_id", assessmentId)
    .order("ordem");
  if (opts.onlyPublished) q = q.eq("status", "publicado");
  const questions = (check<Question[]>((await q) as never) ?? []) as Question[];
  if (questions.length === 0) return [];
  const ids = questions.map((x) => x.id);

  const optRes = await supabase
    .from("question_options")
    .select("id, question_id, texto, ordem")
    .in("question_id", ids)
    .order("ordem");
  const options = (check<QuestionOption[]>(optRes as never) ?? []) as QuestionOption[];

  let answers: { question_id: string; option_id: string }[] = [];
  if (opts.withAnswers) {
    const ansRes = await supabase
      .from("question_answers")
      .select("question_id, option_id")
      .in("question_id", ids);
    answers = (ansRes.data ?? []) as { question_id: string; option_id: string }[];
  }

  return questions.map((question) => ({
    ...question,
    options: options.filter((o) => o.question_id === question.id),
    correct_option_id: answers.find((a) => a.question_id === question.id)?.option_id ?? null,
  }));
}

export async function createQuestion(assessmentId: string, ordem: number) {
  const res = await supabase
    .from("assessment_questions")
    .insert({ assessment_id: assessmentId, enunciado: "Nova questão", ordem })
    .select("*")
    .single();
  const question = check<Question>(res as never);
  await supabase.from("question_options").insert([
    { question_id: question.id, texto: "", ordem: 0 },
    { question_id: question.id, texto: "", ordem: 1 },
  ]);
  return question;
}

export async function updateQuestion(id: string, input: Partial<Question>) {
  const res = await supabase
    .from("assessment_questions")
    .update(input)
    .eq("id", id)
    .select("*")
    .single();
  return check<Question>(res as never);
}

export async function deleteQuestion(id: string) {
  const { error } = await supabase.from("assessment_questions").delete().eq("id", id);
  if (error) throw new Error(error.message);
}

export async function reorderQuestions(ids: string[]) {
  await Promise.all(
    ids.map((id, index) =>
      supabase.from("assessment_questions").update({ ordem: index }).eq("id", id),
    ),
  );
}

export async function addOption(questionId: string, ordem: number) {
  const res = await supabase
    .from("question_options")
    .insert({ question_id: questionId, texto: "", ordem })
    .select("id, question_id, texto, ordem")
    .single();
  return check<QuestionOption>(res as never);
}

export async function updateOption(id: string, texto: string) {
  const { error } = await supabase.from("question_options").update({ texto }).eq("id", id);
  if (error) throw new Error(error.message);
}

export async function deleteOption(id: string) {
  const { error } = await supabase.from("question_options").delete().eq("id", id);
  if (error) throw new Error(error.message);
}

export async function setCorrectOption(questionId: string, optionId: string) {
  const { error } = await supabase
    .from("question_answers")
    .upsert({ question_id: questionId, option_id: optionId }, { onConflict: "question_id" });
  if (error) throw new Error(error.message);
}

/* ------------------------------- Tentativas ------------------------------- */

export interface AttemptResult {
  attempt_id: string;
  score: number;
  total_questions: number;
  correct_answers: number;
  passed: boolean;
  attempt_number: number;
}

export async function submitAssessment(assessmentId: string, answers: Record<string, string>) {
  const { data, error } = await supabase.rpc("submit_assessment", {
    _assessment_id: assessmentId,
    _answers: answers,
  });
  if (error) throw new Error(error.message);
  const row = (data as AttemptResult[])?.[0];
  if (!row) throw new Error("Não foi possível registrar sua avaliação.");
  return row;
}

export async function listAttempts(assessmentId: string, userId?: string) {
  let q = supabase
    .from("assessment_attempts")
    .select("*")
    .eq("assessment_id", assessmentId)
    .order("attempt_number", { ascending: false });
  if (userId) q = q.eq("user_id", userId);
  return (check<Attempt[]>((await q) as never) ?? []) as Attempt[];
}

export async function getCompletionStatus(courseId: string): Promise<CompletionStatus | null> {
  const { data, error } = await supabase.rpc("course_completion_status", { _course_id: courseId });
  if (error) throw new Error(error.message);
  return ((data as CompletionStatus[])?.[0] ?? null) as CompletionStatus | null;
}

/** Embaralhamento estável durante a sessão do teste. */
export function shuffle<T>(items: T[]): T[] {
  const arr = [...items];
  for (let i = arr.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    const a = arr[i] as T;
    arr[i] = arr[j] as T;
    arr[j] = a;
  }
  return arr;
}
