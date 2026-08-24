import { Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Award, ClipboardList, PartyPopper } from "lucide-react";
import { assessmentKeys, getCompletionStatus } from "@/lib/assessments";
import { formatWorkload } from "@/lib/workload";
import { Button } from "@/components/ui/button";

/**
 * Cartão do fluxo de conclusão: aparece quando o aluno termina o conteúdo,
 * conduzindo para a avaliação final e depois para o certificado.
 */
export function TrackCompletionCard({ courseId }: { courseId?: string }) {
  const completion = useQuery({
    queryKey: assessmentKeys.completion(courseId ?? ""),
    queryFn: () => getCompletionStatus(courseId!),
    enabled: Boolean(courseId),
  });

  const s = completion.data;
  if (!s || !s.content_done || !s.assessment_id) return null;

  const aprovado = s.passed;
  const semTentativas =
    !aprovado && s.max_attempts !== null && s.attempts_used >= (s.max_attempts ?? 0);

  return (
    <section className="surface flex flex-wrap items-center justify-between gap-4 border-primary/30 bg-primary/5 p-6">
      <div className="flex items-start gap-3">
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-accent/20 text-accent-foreground">
          {aprovado ? <Award className="h-5 w-5" /> : <PartyPopper className="h-5 w-5" />}
        </span>
        <div>
          <h2 className="font-display text-lg font-semibold">
            {aprovado
              ? "Trilha concluída e aprovada!"
              : "🎉 Parabéns! Você está apto a realizar a avaliação final"}
          </h2>
          <p className="text-sm text-muted-foreground">
            {aprovado
              ? `Carga horária: ${formatWorkload(s.workload_seconds)} · nota final ${Math.round(s.best_score)}%.`
              : semTentativas
                ? "Você utilizou todas as tentativas. Fale com o administrador da trilha."
                : `Você concluiu ${s.completed_lessons} de ${s.total_lessons} aulas. Nota mínima: ${s.passing_score}%.`}
          </p>
        </div>
      </div>
      {aprovado ? (
        <Button asChild>
          <Link to="/certificados">
            <Award className="mr-2 h-4 w-4" /> Ver certificado
          </Link>
        </Button>
      ) : semTentativas ? null : (
        <Button asChild>
          <Link to="/avaliacao/$assessmentId" params={{ assessmentId: s.assessment_id }}>
            <ClipboardList className="mr-2 h-4 w-4" />
            {s.attempts_used > 0 ? "Refazer avaliação" : "Iniciar avaliação"}
          </Link>
        </Button>
      )}
    </section>
  );
}
