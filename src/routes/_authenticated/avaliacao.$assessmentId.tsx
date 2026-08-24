import { useMemo, useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AlertTriangle, Award, CheckCircle2, ClipboardList, XCircle } from "lucide-react";
import { toast } from "sonner";
import {
  assessmentKeys,
  getAssessment,
  listAttempts,
  listQuestions,
  shuffle,
  submitAssessment,
  type AttemptResult,
} from "@/lib/assessments";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { EmptyState, LoadingRows, PageHeader } from "@/components/common/page-parts";

export const Route = createFileRoute("/_authenticated/avaliacao/$assessmentId")({
  head: () => ({
    meta: [
      { title: "Avaliação Final — Trilha Ongoing" },
      {
        name: "description",
        content: "Realize a avaliação final da trilha e conquiste seu certificado.",
      },
      { property: "og:title", content: "Avaliação Final — Trilha Ongoing" },
      {
        property: "og:description",
        content: "Avaliação final da Trilha de Conhecimento Estratégico – Ongoing.",
      },
    ],
  }),
  component: AvaliacaoPage,
});

function AvaliacaoPage() {
  const { assessmentId } = Route.useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [result, setResult] = useState<AttemptResult | null>(null);

  const assessment = useQuery({
    queryKey: assessmentKeys.one(assessmentId),
    queryFn: () => getAssessment(assessmentId),
  });
  const questions = useQuery({
    queryKey: assessmentKeys.questions(assessmentId),
    queryFn: () => listQuestions(assessmentId, { onlyPublished: true }),
  });
  const attempts = useQuery({
    queryKey: [...assessmentKeys.attempts(assessmentId), user?.id],
    queryFn: () => listAttempts(assessmentId, user!.id),
    enabled: Boolean(user?.id),
  });

  const shuffled = useMemo(() => {
    const list = questions.data ?? [];
    if (!assessment.data) return list;
    const base = assessment.data.shuffle_questions ? shuffle(list) : list;
    return assessment.data.shuffle_options
      ? base.map((q) => ({ ...q, options: shuffle(q.options) }))
      : base;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [questions.data, assessment.data?.id]);

  const submit = useMutation({
    mutationFn: () => submitAssessment(assessmentId, answers),
    onSuccess: (res) => {
      setResult(res);
      qc.invalidateQueries({ queryKey: ["completion"] });
      qc.invalidateQueries({ queryKey: assessmentKeys.attempts(assessmentId) });
      window.scrollTo({ top: 0, behavior: "smooth" });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  if (assessment.isLoading || questions.isLoading) return <LoadingRows />;
  if (!assessment.data)
    return <EmptyState icon={ClipboardList} title="Avaliação não encontrada" />;

  const total = shuffled.length;
  const answered = Object.keys(answers).length;
  const used = attempts.data?.length ?? 0;
  const max = assessment.data.max_attempts;
  const semTentativas = max !== null && used >= max && !result;
  const jaAprovado = (attempts.data ?? []).some((a) => a.passed);

  if (result) {
    return (
      <>
        <PageHeader title="Resultado da avaliação" description={assessment.data.titulo} />
        <div className="surface space-y-5 p-8 text-center">
          <span
            className={`mx-auto flex h-16 w-16 items-center justify-center rounded-2xl ${
              result.passed ? "bg-success/15 text-success" : "bg-destructive/10 text-destructive"
            }`}
          >
            {result.passed ? (
              <CheckCircle2 className="h-8 w-8" />
            ) : (
              <XCircle className="h-8 w-8" />
            )}
          </span>
          <div>
            <h2 className="font-display text-2xl font-semibold">
              {result.passed ? "Parabéns, você foi aprovado!" : "Você não atingiu a nota mínima"}
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              {result.correct_answers} de {result.total_questions} questões corretas · nota mínima{" "}
              {assessment.data.passing_score}%
            </p>
          </div>
          <p className="font-display text-5xl font-semibold text-primary">
            {Math.round(result.score)}%
          </p>
          <div className="flex flex-wrap justify-center gap-2">
            {result.passed ? (
              <Button onClick={() => navigate({ to: "/certificados" })}>
                <Award className="mr-2 h-4 w-4" /> Emitir certificado
              </Button>
            ) : max === null || used + 1 < max ? (
              <Button
                onClick={() => {
                  setResult(null);
                  setAnswers({});
                }}
              >
                Refazer avaliação
              </Button>
            ) : null}
            <Button variant="outline" asChild>
              <Link to="/dashboard">Voltar ao dashboard</Link>
            </Button>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <PageHeader
        title={assessment.data.titulo}
        description={assessment.data.descricao || "Avaliação final da trilha."}
        action={
          <Badge variant="secondary">
            Tentativa {used + 1}
            {max ? ` de ${max}` : ""}
          </Badge>
        }
      />

      {assessment.data.instrucoes ? (
        <div className="surface flex gap-3 p-5 text-sm text-muted-foreground">
          <AlertTriangle className="h-4 w-4 shrink-0 text-accent" />
          <p className="whitespace-pre-line">{assessment.data.instrucoes}</p>
        </div>
      ) : null}

      {jaAprovado ? (
        <div className="surface flex flex-wrap items-center justify-between gap-3 p-5">
          <p className="text-sm">Você já foi aprovado nesta avaliação.</p>
          <Button asChild size="sm">
            <Link to="/certificados">Ver certificado</Link>
          </Button>
        </div>
      ) : null}

      {total === 0 ? (
        <EmptyState
          icon={ClipboardList}
          title="Avaliação sem questões"
          description="O administrador ainda não publicou questões para esta avaliação."
        />
      ) : semTentativas ? (
        <EmptyState
          icon={XCircle}
          title="Tentativas esgotadas"
          description="Você utilizou todas as tentativas disponíveis. Fale com o administrador."
        />
      ) : (
        <>
          <div className="surface space-y-2 p-5">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">
                {answered} de {total} questões respondidas
              </span>
              <span className="font-medium">{Math.round((answered / total) * 100)}%</span>
            </div>
            <Progress value={(answered / total) * 100} className="h-2" />
          </div>

          <div className="space-y-4">
            {shuffled.map((q, index) => (
              <div key={q.id} className="surface space-y-4 p-5">
                <div className="flex gap-3">
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-xs font-semibold text-primary">
                    {index + 1}
                  </span>
                  <p className="whitespace-pre-line font-medium">{q.enunciado}</p>
                </div>
                <RadioGroup
                  value={answers[q.id] ?? ""}
                  onValueChange={(v) => setAnswers((prev) => ({ ...prev, [q.id]: v }))}
                  className="gap-2 pl-10"
                >
                  {q.options.map((o) => (
                    <Label
                      key={o.id}
                      htmlFor={o.id}
                      className="flex cursor-pointer items-center gap-3 rounded-xl border border-border p-3 text-sm font-normal transition hover:border-primary/40 hover:bg-muted/40 has-[:checked]:border-primary has-[:checked]:bg-primary/5"
                    >
                      <RadioGroupItem id={o.id} value={o.id} />
                      <span>{o.texto}</span>
                    </Label>
                  ))}
                </RadioGroup>
              </div>
            ))}
          </div>

          <div className="surface flex flex-wrap items-center justify-between gap-3 p-5">
            <p className="text-sm text-muted-foreground">
              Responda todas as questões para enviar a avaliação.
            </p>
            <Button
              disabled={answered < total || submit.isPending}
              onClick={() => submit.mutate()}
            >
              {submit.isPending ? "Enviando..." : "Enviar avaliação"}
            </Button>
          </div>
        </>
      )}
    </>
  );
}
