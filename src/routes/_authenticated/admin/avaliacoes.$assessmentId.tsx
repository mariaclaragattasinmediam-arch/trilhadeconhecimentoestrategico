import { useEffect, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { CheckCircle2, ClipboardList, Plus, Save, Trash2 } from "lucide-react";
import { toast } from "sonner";
import {
  addOption,
  assessmentKeys,
  createQuestion,
  deleteOption,
  deleteQuestion,
  getAssessment,
  listQuestions,
  setCorrectOption,
  updateAssessment,
  updateOption,
  updateQuestion,
  type Assessment,
} from "@/lib/assessments";
import type { ContentStatus } from "@/lib/api";
import { StatusSelect } from "@/components/admin/status";
import { ConfirmDelete } from "@/components/common/confirm-delete";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { EmptyState, LoadingRows, PageHeader } from "@/components/common/page-parts";

export const Route = createFileRoute("/_authenticated/admin/avaliacoes/$assessmentId")({
  head: () => ({
    meta: [
      { title: "Editar avaliação — Admin Trilha Ongoing" },
      { name: "description", content: "Configure questões, alternativas e critérios de aprovação." },
      { property: "og:title", content: "Editar avaliação — Admin Trilha Ongoing" },
      { property: "og:description", content: "Editor da avaliação final da trilha." },
    ],
  }),
  component: EditarAvaliacaoPage,
});

function EditarAvaliacaoPage() {
  const { assessmentId } = Route.useParams();
  const qc = useQueryClient();

  const assessment = useQuery({
    queryKey: assessmentKeys.one(assessmentId),
    queryFn: () => getAssessment(assessmentId),
  });
  const questions = useQuery({
    queryKey: [...assessmentKeys.questions(assessmentId), "admin"],
    queryFn: () => listQuestions(assessmentId, { withAnswers: true }),
  });

  const [form, setForm] = useState<Assessment | null>(null);
  useEffect(() => {
    if (assessment.data) setForm(assessment.data);
  }, [assessment.data]);

  const salvar = useMutation({
    mutationFn: () =>
      updateAssessment(assessmentId, {
        titulo: form!.titulo,
        descricao: form!.descricao,
        instrucoes: form!.instrucoes,
        passing_score: Number(form!.passing_score) || 70,
        max_attempts: form!.max_attempts,
        shuffle_questions: form!.shuffle_questions,
        shuffle_options: form!.shuffle_options,
        status: form!.status,
      }),
    onSuccess: () => {
      toast.success("Avaliação salva.");
      qc.invalidateQueries({ queryKey: assessmentKeys.one(assessmentId) });
      qc.invalidateQueries({ queryKey: assessmentKeys.all });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const refetchQuestions = () =>
    qc.invalidateQueries({ queryKey: assessmentKeys.questions(assessmentId) });

  const novaQuestao = useMutation({
    mutationFn: () => createQuestion(assessmentId, questions.data?.length ?? 0),
    onSuccess: () => refetchQuestions(),
    onError: (e: Error) => toast.error(e.message),
  });

  if (assessment.isLoading || !form) return <LoadingRows />;
  if (!assessment.data) return <EmptyState icon={ClipboardList} title="Avaliação não encontrada" />;

  const lista = questions.data ?? [];
  const semResposta = lista.filter((q) => !q.correct_option_id).length;

  return (
    <>
      <PageHeader
        title="Avaliação final"
        description="Defina as questões e os critérios de aprovação que liberam o certificado."
        action={
          <>
            <Button variant="outline" asChild>
              <Link to="/admin/avaliacoes">Voltar</Link>
            </Button>
            <Button onClick={() => salvar.mutate()} disabled={salvar.isPending}>
              <Save className="mr-2 h-4 w-4" /> Salvar
            </Button>
          </>
        }
      />

      <section className="surface grid gap-4 p-5 sm:grid-cols-2">
        <div className="space-y-1.5 sm:col-span-2">
          <Label htmlFor="titulo">Título</Label>
          <Input
            id="titulo"
            value={form.titulo}
            onChange={(e) => setForm({ ...form, titulo: e.target.value })}
          />
        </div>
        <div className="space-y-1.5 sm:col-span-2">
          <Label htmlFor="descricao">Descrição</Label>
          <Textarea
            id="descricao"
            rows={2}
            value={form.descricao}
            onChange={(e) => setForm({ ...form, descricao: e.target.value })}
          />
        </div>
        <div className="space-y-1.5 sm:col-span-2">
          <Label htmlFor="instrucoes">Instruções para o aluno</Label>
          <Textarea
            id="instrucoes"
            rows={3}
            value={form.instrucoes}
            onChange={(e) => setForm({ ...form, instrucoes: e.target.value })}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="nota">Nota mínima (%)</Label>
          <Input
            id="nota"
            type="number"
            min={0}
            max={100}
            value={form.passing_score}
            onChange={(e) => setForm({ ...form, passing_score: Number(e.target.value) })}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="tentativas">Tentativas (vazio = ilimitado)</Label>
          <Input
            id="tentativas"
            type="number"
            min={1}
            value={form.max_attempts ?? ""}
            onChange={(e) =>
              setForm({ ...form, max_attempts: e.target.value ? Number(e.target.value) : null })
            }
          />
        </div>
        <div className="flex items-center justify-between rounded-xl border border-border p-3">
          <Label htmlFor="sq" className="font-normal">
            Embaralhar questões
          </Label>
          <Switch
            id="sq"
            checked={form.shuffle_questions}
            onCheckedChange={(v) => setForm({ ...form, shuffle_questions: v })}
          />
        </div>
        <div className="flex items-center justify-between rounded-xl border border-border p-3">
          <Label htmlFor="so" className="font-normal">
            Embaralhar alternativas
          </Label>
          <Switch
            id="so"
            checked={form.shuffle_options}
            onCheckedChange={(v) => setForm({ ...form, shuffle_options: v })}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="status">Status</Label>
          <StatusSelect
            id="status"
            value={form.status}
            onChange={(status: ContentStatus) => setForm({ ...form, status })}
          />
        </div>
      </section>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold">Questões ({lista.length})</h2>
          {semResposta > 0 ? (
            <p className="text-xs text-destructive">
              {semResposta} questão(ões) sem alternativa correta definida.
            </p>
          ) : null}
        </div>
        <Button size="sm" onClick={() => novaQuestao.mutate()} disabled={novaQuestao.isPending}>
          <Plus className="mr-2 h-4 w-4" /> Nova questão
        </Button>
      </div>

      {lista.length === 0 ? (
        <EmptyState
          icon={ClipboardList}
          title="Nenhuma questão"
          description="Adicione questões de múltipla escolha com uma alternativa correta."
        />
      ) : (
        <div className="space-y-4">
          {lista.map((q, index) => (
            <QuestionCard
              key={q.id}
              index={index}
              question={q}
              onChanged={() => refetchQuestions()}
            />
          ))}
        </div>
      )}
    </>
  );
}

function QuestionCard({
  question,
  index,
  onChanged,
}: {
  question: Awaited<ReturnType<typeof listQuestions>>[number];
  index: number;
  onChanged: () => void;
}) {
  const [enunciado, setEnunciado] = useState(question.enunciado);
  const [explicacao, setExplicacao] = useState(question.explicacao);

  useEffect(() => {
    setEnunciado(question.enunciado);
    setExplicacao(question.explicacao);
  }, [question.enunciado, question.explicacao]);

  const salvar = useMutation({
    mutationFn: () => updateQuestion(question.id, { enunciado, explicacao }),
    onSuccess: () => {
      toast.success("Questão salva.");
      onChanged();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const marcar = useMutation({
    mutationFn: (optionId: string) => setCorrectOption(question.id, optionId),
    onSuccess: onChanged,
    onError: (e: Error) => toast.error(e.message),
  });

  const publicar = useMutation({
    mutationFn: (status: ContentStatus) => updateQuestion(question.id, { status }),
    onSuccess: onChanged,
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <section className="surface space-y-4 p-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Questão {index + 1}
        </span>
        <div className="flex items-center gap-2">
          <StatusSelect value={question.status} onChange={(v) => publicar.mutate(v)} />
          <ConfirmDelete
            title="Excluir questão?"
            description="A questão e suas alternativas serão removidas."
            onConfirm={async () => {
              await deleteQuestion(question.id);
              onChanged();
            }}
          >
            <Button size="icon" variant="ghost">
              <Trash2 className="h-4 w-4" />
            </Button>
          </ConfirmDelete>
        </div>
      </div>

      <Textarea
        rows={2}
        value={enunciado}
        onChange={(e) => setEnunciado(e.target.value)}
        placeholder="Enunciado da questão"
      />

      <div className="space-y-2">
        {question.options.map((o) => (
          <div key={o.id} className="flex items-center gap-2">
            <Button
              type="button"
              size="icon"
              variant={question.correct_option_id === o.id ? "default" : "outline"}
              title="Marcar como correta"
              onClick={() => marcar.mutate(o.id)}
            >
              <CheckCircle2 className="h-4 w-4" />
            </Button>
            <Input
              defaultValue={o.texto}
              placeholder="Texto da alternativa"
              onBlur={(e) => {
                if (e.target.value !== o.texto) void updateOption(o.id, e.target.value);
              }}
            />
            <Button
              size="icon"
              variant="ghost"
              onClick={async () => {
                await deleteOption(o.id);
                onChanged();
              }}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        ))}
        <Button
          size="sm"
          variant="outline"
          onClick={async () => {
            await addOption(question.id, question.options.length);
            onChanged();
          }}
        >
          <Plus className="mr-2 h-4 w-4" /> Alternativa
        </Button>
      </div>

      <Textarea
        rows={2}
        value={explicacao}
        onChange={(e) => setExplicacao(e.target.value)}
        placeholder="Explicação (opcional, exibida após a correção)"
      />

      <div className="flex justify-end">
        <Button size="sm" onClick={() => salvar.mutate()} disabled={salvar.isPending}>
          <Save className="mr-2 h-4 w-4" /> Salvar questão
        </Button>
      </div>
    </section>
  );
}
