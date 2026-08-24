import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Award, Clock, Download, QrCode, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/hooks/use-auth";
import { api, qk } from "@/lib/api";
import { certificateKeys, formatDateBr, listMyCertificates } from "@/lib/certificates";
import { assessmentKeys, getCompletionStatus } from "@/lib/assessments";
import { getCertificateUrl, issueCertificate } from "@/lib/certificates.functions";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { EmptyState, LoadingRows, PageHeader } from "@/components/common/page-parts";

export const Route = createFileRoute("/_authenticated/certificados")({
  head: () => ({
    meta: [
      { title: "Meus Certificados — Trilha Ongoing" },
      {
        name: "description",
        content: "Baixe e compartilhe os certificados das trilhas concluídas.",
      },
      { property: "og:title", content: "Meus Certificados — Trilha Ongoing" },
      {
        property: "og:description",
        content: "Certificados com carga horária calculada e validação por QR Code.",
      },
    ],
  }),
  component: CertificadosPage,
});

function CertificadosPage() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const emitir = useServerFn(issueCertificate);
  const baixarUrl = useServerFn(getCertificateUrl);

  const courses = useQuery({ queryKey: qk.courses, queryFn: api.listCourses });
  const course = (courses.data ?? [])[0];

  const completion = useQuery({
    queryKey: assessmentKeys.completion(course?.id ?? ""),
    queryFn: () => getCompletionStatus(course!.id),
    enabled: Boolean(course?.id),
  });

  const certificates = useQuery({
    queryKey: [...certificateKeys.mine, user?.id],
    queryFn: () => listMyCertificates(user!.id),
    enabled: Boolean(user?.id),
  });

  const gerar = useMutation({
    mutationFn: () => emitir({ data: { courseId: course!.id } }),
    onSuccess: () => {
      toast.success("Certificado emitido com sucesso!");
      qc.invalidateQueries({ queryKey: certificateKeys.mine });
      qc.invalidateQueries({ queryKey: ["completion"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const baixar = useMutation({
    mutationFn: (certificateId: string) => baixarUrl({ data: { certificateId } }),
    onSuccess: (res) => window.open(res.url, "_blank", "noopener"),
    onError: (e: Error) => toast.error(e.message),
  });

  const lista = certificates.data ?? [];
  const status = completion.data;
  const podeEmitir = Boolean(status?.content_done && status?.passed && !status?.certificate_id);

  return (
    <>
      <PageHeader
        title="Meus Certificados"
        description="Certificados emitidos com carga horária calculada automaticamente e código de validação."
      />

      {podeEmitir ? (
        <div className="surface flex flex-wrap items-center justify-between gap-4 border-primary/30 p-6">
          <div className="flex items-start gap-3">
            <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-success/15 text-success">
              <Award className="h-5 w-5" />
            </span>
            <div>
              <h2 className="font-display text-lg font-semibold">
                Você está aprovado na trilha!
              </h2>
              <p className="text-sm text-muted-foreground">
                Emita agora o seu certificado oficial em PDF.
              </p>
            </div>
          </div>
          <Button onClick={() => gerar.mutate()} disabled={gerar.isPending}>
            {gerar.isPending ? "Gerando..." : "Emitir certificado"}
          </Button>
        </div>
      ) : null}

      {certificates.isLoading ? (
        <LoadingRows />
      ) : lista.length === 0 ? (
        <EmptyState
          icon={Award}
          title="Nenhum certificado ainda"
          description="Conclua todas as aulas e seja aprovado na avaliação final para emitir seu certificado."
          action={
            <Button variant="outline" asChild>
              <Link to="/minha-trilha">Ver minha trilha</Link>
            </Button>
          }
        />
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          {lista.map((c) => (
            <article key={c.id} className="surface space-y-4 p-6">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h2 className="font-display text-lg font-semibold">{c.course_name}</h2>
                  <p className="text-sm text-muted-foreground">{c.student_name}</p>
                </div>
                <Badge variant={c.verification_status === "valido" ? "secondary" : "destructive"}>
                  {c.verification_status === "valido" ? "Válido" : "Revogado"}
                </Badge>
              </div>

              <dl className="grid gap-2 text-sm sm:grid-cols-2">
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-muted-foreground" />
                  <span>{c.workload_formatted}</span>
                </div>
                <div className="flex items-center gap-2">
                  <ShieldCheck className="h-4 w-4 text-muted-foreground" />
                  <span>Nota final: {Math.round(c.final_score)}%</span>
                </div>
                <div className="flex items-center gap-2">
                  <QrCode className="h-4 w-4 text-muted-foreground" />
                  <span className="font-mono text-xs">{c.certificate_code}</span>
                </div>
                <div className="text-muted-foreground">
                  Conclusão: {formatDateBr(c.completion_date)}
                </div>
              </dl>

              <div className="flex flex-wrap gap-2">
                <Button size="sm" onClick={() => baixar.mutate(c.id)} disabled={baixar.isPending}>
                  <Download className="mr-2 h-4 w-4" /> Baixar PDF
                </Button>
                <Button size="sm" variant="outline" asChild>
                  <Link to="/validar-certificado" search={{ codigo: c.certificate_code }}>
                    Validar
                  </Link>
                </Button>
              </div>
            </article>
          ))}
        </div>
      )}
    </>
  );
}
