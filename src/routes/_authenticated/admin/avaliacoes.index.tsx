import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ClipboardList, Plus } from "lucide-react";
import { toast } from "sonner";
import { listCoursesAdmin, cmsKeys } from "@/lib/cms";
import { assessmentKeys, createAssessment, listAssessments } from "@/lib/assessments";
import { StatusBadge } from "@/components/admin/status";
import { Button } from "@/components/ui/button";
import { EmptyState, LoadingRows, PageHeader } from "@/components/common/page-parts";

export const Route = createFileRoute("/_authenticated/admin/avaliacoes/")({
  head: () => ({
    meta: [
      { title: "Avaliações — Admin Trilha Ongoing" },
      { name: "description", content: "Gerencie as avaliações finais de cada trilha." },
      { property: "og:title", content: "Avaliações — Admin Trilha Ongoing" },
      { property: "og:description", content: "Configure questões, nota mínima e tentativas." },
    ],
  }),
  component: AvaliacoesPage,
});

function AvaliacoesPage() {
  const qc = useQueryClient();
  const navigate = useNavigate();
  const courses = useQuery({ queryKey: cmsKeys.courses, queryFn: listCoursesAdmin });
  const assessments = useQuery({ queryKey: assessmentKeys.all, queryFn: listAssessments });

  const criar = useMutation({
    mutationFn: (courseId: string) =>
      createAssessment(courseId, { titulo: "Avaliação Final", status: "rascunho" }),
    onSuccess: (a) => {
      qc.invalidateQueries({ queryKey: assessmentKeys.all });
      void navigate({
        to: "/admin/avaliacoes/$assessmentId",
        params: { assessmentId: a.id },
      });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const lista = courses.data ?? [];

  return (
    <>
      <PageHeader
        title="Avaliações"
        description="Cada trilha pode ter uma avaliação final que libera o certificado."
      />

      {courses.isLoading || assessments.isLoading ? (
        <LoadingRows />
      ) : lista.length === 0 ? (
        <EmptyState icon={ClipboardList} title="Nenhum curso cadastrado" />
      ) : (
        <div className="surface divide-y divide-border">
          {lista.map((c) => {
            const avaliacao = (assessments.data ?? []).find((a) => a.course_id === c.id);
            return (
              <div
                key={c.id}
                className="flex flex-wrap items-center justify-between gap-3 px-5 py-4"
              >
                <div className="min-w-0">
                  <p className="truncate font-medium">{c.titulo}</p>
                  <p className="text-xs text-muted-foreground">
                    {avaliacao
                      ? `${avaliacao.titulo} · nota mínima ${avaliacao.passing_score}%`
                      : "Sem avaliação final"}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  {avaliacao ? <StatusBadge status={avaliacao.status} /> : null}
                  {avaliacao ? (
                    <Button size="sm" variant="outline" asChild>
                      <Link
                        to="/admin/avaliacoes/$assessmentId"
                        params={{ assessmentId: avaliacao.id }}
                      >
                        Editar
                      </Link>
                    </Button>
                  ) : (
                    <Button size="sm" onClick={() => criar.mutate(c.id)} disabled={criar.isPending}>
                      <Plus className="mr-2 h-4 w-4" /> Criar avaliação
                    </Button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </>
  );
}
