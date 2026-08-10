import { supabase } from "@/integrations/supabase/client";
import type { FileRecord } from "@/lib/api";
import { removeFromStorage, type UploadResult } from "@/lib/uploads";

export const fileKeys = {
  all: ["cms", "files"] as const,
  byLesson: (lessonId: string) => ["cms", "files", "lesson", lessonId] as const,
};

function check<T>(res: { data: T | null; error: { message: string } | null }): T {
  if (res.error) throw new Error(res.error.message);
  return res.data as T;
}

export async function listAllFiles(): Promise<FileRecord[]> {
  const res = await supabase.from("files").select("*").order("created_at", { ascending: false });
  return check<FileRecord[]>(res as never) ?? [];
}

export async function listFilesByBlocks(blockIds: string[]): Promise<FileRecord[]> {
  if (blockIds.length === 0) return [];
  const res = await supabase
    .from("files")
    .select("*")
    .in("lesson_block_id", blockIds)
    .order("created_at", { ascending: false });
  return check<FileRecord[]>(res as never) ?? [];
}

export async function listFilesByLesson(lessonId: string): Promise<FileRecord[]> {
  const blocks = await supabase.from("lesson_blocks").select("id").eq("lesson_id", lessonId);
  const ids = (check<{ id: string }[]>(blocks as never) ?? []).map((b) => b.id);
  return listFilesByBlocks(ids);
}

/**
 * Registra no banco um arquivo já enviado. Se a gravação falhar, o arquivo
 * recém-enviado é removido do Storage para não ficar órfão.
 */
export async function registerFile(blockId: string, upload: UploadResult): Promise<FileRecord> {
  const res = await supabase
    .from("files")
    .insert({
      lesson_block_id: blockId,
      nome: upload.nome,
      url: upload.path,
      path: upload.path,
      tipo: upload.mime,
      mime_type: upload.mime,
      tamanho: upload.tamanho,
    })
    .select("*")
    .single();
  if (res.error) {
    await removeFromStorage([upload.path]);
    throw new Error(res.error.message);
  }
  return res.data as unknown as FileRecord;
}

/** Remove o registro do banco e o arquivo correspondente no Storage. */
export async function deleteFileRecord(file: Pick<FileRecord, "id" | "path">) {
  const { error } = await supabase.from("files").delete().eq("id", file.id);
  if (error) throw new Error(error.message);
  if (file.path) await removeFromStorage([file.path]);
}

/** Remove todos os arquivos de um bloco (banco + Storage). */
export async function purgeFilesForBlocks(blockIds: string[], keepPath?: string) {
  const files = await listFilesByBlocks(blockIds);
  const alvo = files.filter((f) => f.path !== keepPath);
  if (alvo.length === 0) return;
  await supabase
    .from("files")
    .delete()
    .in(
      "id",
      alvo.map((f) => f.id),
    );
  await removeFromStorage(alvo.map((f) => f.path ?? "").filter(Boolean));
}

async function blockIdsForLessons(lessonIds: string[]) {
  if (lessonIds.length === 0) return [];
  const res = await supabase.from("lesson_blocks").select("id").in("lesson_id", lessonIds);
  return (check<{ id: string }[]>(res as never) ?? []).map((b) => b.id);
}

export async function purgeFilesForLessons(lessonIds: string[]) {
  await purgeFilesForBlocks(await blockIdsForLessons(lessonIds));
}

export async function purgeFilesForModules(moduleIds: string[]) {
  if (moduleIds.length === 0) return;
  const res = await supabase.from("lessons").select("id").in("module_id", moduleIds);
  const lessonIds = (check<{ id: string }[]>(res as never) ?? []).map((l) => l.id);
  await purgeFilesForLessons(lessonIds);
}

export async function purgeFilesForCourse(courseId: string) {
  const res = await supabase.from("modules").select("id").eq("course_id", courseId);
  const moduleIds = (check<{ id: string }[]>(res as never) ?? []).map((m) => m.id);
  await purgeFilesForModules(moduleIds);
}
