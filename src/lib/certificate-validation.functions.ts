import { createServerFn } from "@tanstack/react-start";

export interface CertificateValidationDto {
  certificate_code: string;
  student_name: string;
  course_name: string;
  workload_minutes: number;
  workload_formatted: string;
  completion_date: string;
  issued_at: string;
  verification_status: string;
}

/**
 * Consulta pública de autenticidade (QR Code do certificado).
 * Faz correspondência exata do código e devolve apenas dados não sensíveis
 * do documento — sem ids de usuário, e-mails ou caminho do PDF.
 */
export const validateCertificatePublic = createServerFn({ method: "POST" })
  .inputValidator((data: { code: string }) => {
    const code = (data?.code ?? "").trim().toUpperCase();
    if (!/^[A-Z0-9-]{4,40}$/.test(code)) throw new Error("Código inválido.");
    return { code };
  })
  .handler(async ({ data }): Promise<CertificateValidationDto | null> => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const res = await supabaseAdmin
      .from("certificates")
      .select(
        "certificate_code, student_name, course_name, workload_minutes, workload_formatted, completion_date, issued_at, verification_status",
      )
      .eq("certificate_code", data.code)
      .maybeSingle();
    if (res.error) throw new Error("Não foi possível validar o certificado.");
    const row = res.data as Record<string, unknown> | null;
    if (!row) return null;
    return {
      certificate_code: String(row["certificate_code"]),
      student_name: String(row["student_name"]),
      course_name: String(row["course_name"]),
      workload_minutes: Number(row["workload_minutes"] ?? 0),
      workload_formatted: String(row["workload_formatted"] ?? ""),
      completion_date: String(row["completion_date"]),
      issued_at: String(row["issued_at"]),
      verification_status: String(row["verification_status"] ?? "valido"),
    };
  });
