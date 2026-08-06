import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import { ArrowLeft, ArrowRight, CheckCircle2, Loader2, PencilLine } from "lucide-react";
import { toast } from "sonner";
import { api, qk } from "@/lib/api";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { BlockRenderer } from "@/components/lesson/block-renderer";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";

export const Route = createFileRoute("/_authenticated/aula/$lessonId")({
  head: () => ({
    meta: [
      { title: "Aula — Trilha Ongoing" },
      { name: "description", content: "Conteúdo da aula na Trilha de Conhecimento Estratégico." },
      { property: "og:title", content: "Aula — Trilha Ongoing" },
      {
        property: "og:description",
        content: "Conteúdo da aula na Trilha de Conhecimento Estratégico.",
      },
    ],
  }),
  component: AulaPage,
});

function AulaPage() {
  const { lessonId } = Route.useParams();
  const { user, isAdmin } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const lesson = useQuery({ queryKey: qk.lesson(lessonId), queryFn: () => api.getLesson(lessonId) });
  const blocks = useQuery({ queryKey: qk.blocks(lessonId), queryFn: () => api.listBlocks(lessonId) });
  const modules = useQuery({ queryKey: qk.allModules, queryFn: () => api.listModules() });
  const lessons = useQuery({ queryKey: qk.allLessons, queryFn: () => api.listLessons() });
  const progress = useQuery({
    queryKey: [...qk.progress, user?.id],
    queryFn: () => api.listProgress(user!.id),
    enabled: Boolean(user?.id),
  });

  const modulo = modules.data?.find((m) => m.id === lesson.data?.module_id);
  const irmas = (lessons.data ?? []).filter((l) => l.module_id === lesson.data?.module_id);
  const indice = irmas.findIndex((l) => l.id === lessonId);
  const anterior = indice > 0 ? irmas[indice - 1] : undefined;
  const proxima = indice >= 0 && indice < irmas.length - 1 ? irmas[indice + 1] : undefined;
  const concluida = Boolean(progress.data?.find((p) => p.lesson_id === lessonId)?.completed);
  const feitas = (progress.data ?? []).filter(
    (p) => p.completed && irmas.some((l) => l.id === p.lesson_id),
  ).length;
  const percentModulo = irmas.length ? Math.round((feitas / irmas.length) * 100) : 0;

  useEffect(() => {
    if (!user?.id) return;
    void supabase.from("progress").upsert(
      { user_id: user.id, lesson_id: lessonId, last_accessed_at: new Date().toISOString() },
      { onConflict: "user_id,lesson_id" },
    );
  }, [user?.id, lessonId]);

  const toggle = useMutation({
    mutationFn: async (valor: boolean) => {
      const { error } = await supabase.from("progress").upsert(
        {
          user_id: user!.id,
          lesson_id: lessonId,
          completed: valor,
          completed_at: valor ? new Date().toISOString() : null,
          last_accessed_at: new Date().toISOString(),
        },
        { onConflict: "user_id,lesson_id" },
      );
      if (error) throw new Error(error.message);
      return valor;
    },
    onSuccess: (valor) => {
      void queryClient.invalidateQueries({ queryKey: qk.progress });
      toast.success(valor ? "Aula concluída!" : "Aula marcada como pendente");
      if (valor && proxima) void navigate({ to: "/aula/$lessonId", params: { lessonId: proxima.id } });
    },
    onError: (e: Error) => toast.error("Erro ao salvar progresso", { description: e.message }),
  });

  if (lesson.isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-2/3" />
        <Skeleton className="h-64 w-full rounded-2xl" />
      </div>
    );
  }

  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Button asChild variant="ghost" size="sm">
          <Link
            to="/curso/$courseId"
            params={{ courseId: modulo?.course_id ?? "" }}
            disabled={!modulo}
          >
            <ArrowLeft className="h-4 w-4" /> Voltar ao curso
          </Link>
        </Button>
        {isAdmin ? (
          <Button asChild variant="outline" size="sm">
            <Link to="/admin/aulas/$lessonId" params={{ lessonId }}>
              <PencilLine className="h-4 w-4" /> Editar conteúdo
            </Link>
          </Button>
        ) : null}
      </div>

      <header className="space-y-3">
        {modulo ? (
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Módulo {modulo.ordem} · {modulo.titulo}
          </p>
        ) : null}
        <h1 className="font-display text-2xl font-semibold tracking-tight sm:text-3xl">
          {lesson.data?.titulo}
        </h1>
        {lesson.data?.descricao ? (
          <p className="max-w-2xl text-sm text-muted-foreground">{lesson.data.descricao}</p>
        ) : null}
        <div className="space-y-1.5 pt-2">
          <Progress value={percentModulo} className="h-1.5" />
          <p className="text-xs text-muted-foreground">
            {feitas}/{irmas.length} aulas do módulo concluídas
          </p>
        </div>
      </header>

      <article className="surface space-y-6 p-6 sm:p-8">
        {blocks.isLoading ? (
          <Skeleton className="h-40 w-full rounded-xl" />
        ) : (blocks.data ?? []).length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Esta aula ainda não possui blocos de conteúdo.
          </p>
        ) : (
          blocks.data!.map((b) => <BlockRenderer key={b.id} block={b} />)
        )}
      </article>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <Button
          variant={concluida ? "outline" : "default"}
          onClick={() => toggle.mutate(!concluida)}
          disabled={toggle.isPending}
        >
          {toggle.isPending ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <CheckCircle2 className="h-4 w-4" />
          )}
          {concluida ? "Marcar como pendente" : "Marcar aula como concluída"}
        </Button>

        <div className="flex gap-2">
          {anterior ? (
            <Button asChild variant="outline" size="sm">
              <Link to="/aula/$lessonId" params={{ lessonId: anterior.id }}>
                <ArrowLeft className="h-4 w-4" /> Anterior
              </Link>
            </Button>
          ) : null}
          {proxima ? (
            <Button asChild variant="outline" size="sm">
              <Link to="/aula/$lessonId" params={{ lessonId: proxima.id }}>
                Próxima <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
          ) : null}
        </div>
      </div>
    </>
  );
}
