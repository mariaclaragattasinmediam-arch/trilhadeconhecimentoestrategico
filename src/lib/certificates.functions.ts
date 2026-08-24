import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const BUCKET = "certificados";

function formatWorkloadServer(seconds: number) {
  const total = Math.max(0, Math.round(seconds / 60));
  const h = Math.floor(total / 60);
  const m = total % 60;
  if (h === 0) return `${m} ${m === 1 ? "minuto" : "minutos"}`;
  if (m === 0) return `${h} ${h === 1 ? "hora" : "horas"}`;
  return `${h} ${h === 1 ? "hora" : "horas"} e ${m} ${m === 1 ? "minuto" : "minutos"}`;
}

function baseUrl(): string {
  const explicit = process.env["PUBLIC_SITE_URL"];
  if (explicit) return explicit.replace(/\/+$/, "");
  return "https://trilhadeconhecimentoestrategico.lovable.app";
}

/** Emite (ou recupera) o certificado do aluno para uma trilha concluída e aprovada. */
export const issueCertificate = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { courseId: string }) => {
    if (!data?.courseId) throw new Error("Curso inválido.");
    return data;
  })
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;

    const existing = await supabase
      .from("certificates")
      .select("*")
      .eq("user_id", userId)
      .eq("course_id", data.courseId)
      .maybeSingle();
    if (existing.data) return existing.data as Record<string, unknown>;

    const statusRes = await supabase.rpc("course_completion_status", {
      _course_id: data.courseId,
    });
    if (statusRes.error) throw new Error(statusRes.error.message);
    const status = (statusRes.data as Array<Record<string, unknown>>)?.[0];
    if (!status || !status["content_done"] || !status["passed"]) {
      throw new Error("Você ainda não cumpriu os requisitos para emitir o certificado.");
    }

    const [profileRes, courseRes] = await Promise.all([
      supabase.from("profiles").select("nome, email").eq("id", userId).maybeSingle(),
      supabase.from("courses").select("titulo").eq("id", data.courseId).maybeSingle(),
    ]);
    const studentName =
      (profileRes.data?.nome as string)?.trim() ||
      (profileRes.data?.email as string) ||
      "Aluno";
    const courseName = (courseRes.data?.titulo as string) ?? "Trilha de Conhecimento Estratégico";

    const workloadSeconds = Number(status["workload_seconds"] ?? 0);
    const workloadFormatted = formatWorkloadServer(workloadSeconds);
    const finalScore = Number(status["best_score"] ?? 0);
    const completionDate = new Date().toISOString().slice(0, 10);

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { buildCertificatePdf } = await import("./certificate-pdf.server");

    const year = new Date().getFullYear();
    const countRes = await supabaseAdmin
      .from("certificates")
      .select("id", { count: "exact", head: true })
      .like("certificate_code", `INM-${year}-%`);
    let sequence = (countRes.count ?? 0) + 1;

    for (let attempt = 0; attempt < 5; attempt += 1) {
      const code = `INM-${year}-${String(sequence).padStart(6, "0")}`;
      const verifyUrl = `${baseUrl()}/validar-certificado?codigo=${code}`;
      const pdf = await buildCertificatePdf({
        code,
        studentName,
        courseName,
        workloadFormatted,
        finalScore,
        completionDate,
        verifyUrl,
      });
      const pdfPath = `${userId}/${code}.pdf`;

      const upload = await supabaseAdmin.storage
        .from(BUCKET)
        .upload(pdfPath, pdf, { contentType: "application/pdf", upsert: true });
      if (upload.error) throw new Error(upload.error.message);

      const inserted = await supabaseAdmin
        .from("certificates")
        .insert({
          user_id: userId,
          course_id: data.courseId,
          certificate_code: code,
          student_name: studentName,
          course_name: courseName,
          workload_minutes: Math.round(workloadSeconds / 60),
          workload_formatted: workloadFormatted,
          final_score: finalScore,
          completion_date: completionDate,
          pdf_path: pdfPath,
        })
        .select("*")
        .single();

      if (!inserted.error) return inserted.data as Record<string, unknown>;
      await supabaseAdmin.storage.from(BUCKET).remove([pdfPath]);
      if (!inserted.error.message.includes("duplicate")) throw new Error(inserted.error.message);
      sequence += 1;
    }
    throw new Error("Não foi possível gerar o código do certificado. Tente novamente.");
  });

/** URL assinada temporária para baixar o PDF do próprio certificado. */
export const getCertificateUrl = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { certificateId: string }) => {
    if (!data?.certificateId) throw new Error("Certificado inválido.");
    return data;
  })
  .handler(async ({ data, context }) => {
    const cert = await context.supabase
      .from("certificates")
      .select("id, pdf_path, certificate_code")
      .eq("id", data.certificateId)
      .maybeSingle();
    if (cert.error) throw new Error(cert.error.message);
    if (!cert.data?.pdf_path) throw new Error("Certificado não encontrado.");

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const signed = await supabaseAdmin.storage
      .from(BUCKET)
      .createSignedUrl(cert.data.pdf_path as string, 60 * 10, {
        download: `${cert.data.certificate_code}.pdf`,
      });
    if (signed.error) throw new Error(signed.error.message);
    return { url: signed.data.signedUrl };
  });
