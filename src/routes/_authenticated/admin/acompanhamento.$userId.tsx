import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  AlertTriangle,
  ArrowLeft,
  CheckCircle2,
  ChevronDown,
  Circle,
  CircleDot,
  Clock,
} from "lucide-react";
import { AdminBreadcrumbs } from "@/components/admin/breadcrumbs";
import { StudentStatusBadge } from "@/components/admin/student-status";
import { PageHeader, EmptyState } from "@/components/common/page-parts";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { formatLastAccess, tracking, trackingKeys } from "@/lib/tracking";

export const Route = createFileRoute("/_authenticated/admin/acompanhamento/$userId")({
  head: () => ({
    meta: [
      { title: "Evolução do aluno — Trilha Ongoing" },
      {
        name: "description",
        content: "Progresso detalhado do aluno por módulo e aula na Trilha de Conhecimento.",
      },
      { property: "og:title", content: "Evolução do aluno — Trilha Ongoing" },
      { property: "og:description", content: "Progresso detalhado por módulo e aula." },
    ],
  }),
  component: AlunoDetalhePage,
});

function AlunoDetalhePage() {
  const { userId } = Route.useParams();
  const [aberto, setAberto] = useState<string | null>(null);

  const detalhe = useQuery({
    queryKey: trackingKeys.student(userId),
    queryFn: () => tracking.studentDetail(userId),
  });

  if (detalhe.isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-64 rounded-lg" />
        <Skeleton className="h-32 w-full rounded-2xl" />
        <div className="grid gap-4 lg:grid-cols-3">
          <Skeleton className="h-40 rounded-2xl lg:col-span-2" />
          <Skeleton className="h-40 rounded-2xl" />
        </div>
        <Skeleton className="h-72 w-full rounded-2xl" />
      </div>
    );
  }

  if (detalhe.isError || !detalhe.data) {
    return (
      <div className="space-y-6">
        <PageHeader title="Evolução do aluno" />
        <EmptyState
          icon={AlertTriangle}
          title="Não foi possível carregar os dados de acompanhamento."
          description="Verifique sua conexão e tente novamente."
          action={<Button onClick={() => void detalhe.refetch()}>Tentar novamente</Button>}
        />
      </div>
    );
  }

  const d = detalhe.data;
  const restantes = d.totals.total - d.totals.completed;

  return (
    <div className="space-y-6">
      <AdminBreadcrumbs
        items={[
          { label: "Dashboard", to: "/dashboard" },
          { label: "Acompanhamento", to: "/admin/acompanhamento" },
          { label: d.profile.nome || d.profile.email },
        ]}
      />

      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="space-y-2">
          <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
            {d.profile.nome || d.profile.email}
          </h1>
          <p className="text-sm text-muted-foreground">{d.profile.email}</p>
          <div className="flex flex-wrap items-center gap-3 text-sm">
            <StudentStatusBadge status={d.status} />
            <span className="font-medium">{d.totals.percent}% concluído</span>
            <span className="text-muted-foreground">
              Último acesso: {formatLastAccess(d.lastAccess)}
            </span>
          </div>
        </div>
        <Button asChild variant="outline">
          <Link to="/admin/acompanhamento">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Voltar para acompanhamento
          </Link>
        </Button>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-base">Progresso da trilha</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-4xl font-semibold">{d.totals.percent}%</p>
            <Progress value={d.totals.percent} className="h-3" />
            <p className="text-sm text-muted-foreground">
              {d.totals.completed} de {d.totals.total} aulas concluídas
              {restantes > 0 ? ` · ${String(restantes)} aulas restantes` : ""}
            </p>
            {d.activity[0] ? (
              <p className="text-sm text-muted-foreground">
                Última aula acessada: <span className="text-foreground">{d.activity[0].titulo}</span>
              </p>
            ) : null}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Módulo atual</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {d.current ? (
              <>
                <p className="font-medium">{d.current.titulo}</p>
                <p className="text-2xl font-semibold">{d.current.percent}%</p>
                <Progress value={d.current.percent} className="h-2" />
                <p className="text-sm text-muted-foreground">
                  {d.current.completed} de {d.current.total} aulas concluídas
                </p>
                <Button asChild size="sm" variant="outline">
                  <Link to="/admin/modulos/$moduleId" params={{ moduleId: d.current.id }}>
                    Ver módulo
                  </Link>
                </Button>
              </>
            ) : (
              <p className="text-sm text-muted-foreground">Trilha concluída</p>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Progresso por módulo</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {d.modules.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nenhum módulo publicado.</p>
          ) : (
            d.modules.map((m, index) => {
              const expandido = aberto === m.module.id;
              return (
                <div key={m.module.id} className="rounded-xl border">
                  <button
                    type="button"
                    className="flex w-full items-center gap-4 p-4 text-left"
                    onClick={() => setAberto(expandido ? null : m.module.id)}
                    aria-expanded={expandido}
                  >
                    <span className="w-8 shrink-0 text-sm text-muted-foreground">
                      {String(index + 1).padStart(2, "0")}
                    </span>
                    <span className="min-w-0 flex-1 space-y-1">
                      <span className="flex flex-wrap items-center justify-between gap-2">
                        <span className="truncate font-medium">{m.module.titulo}</span>
                        <span className="text-sm font-medium">{m.percent}%</span>
                      </span>
                      <Progress value={m.percent} className="h-2" />
                      <span className="block text-xs text-muted-foreground">
                        {m.completed} de {m.total} aulas concluídas
                      </span>
                    </span>
                    <ChevronDown
                      className={`h-4 w-4 shrink-0 transition-transform ${expandido ? "rotate-180" : ""}`}
                      aria-hidden
                    />
                  </button>
                  {expandido ? (
                    <ul className="space-y-2 border-t px-4 py-3">
                      {m.lessons.length === 0 ? (
                        <li className="text-sm text-muted-foreground">Sem aulas publicadas.</li>
                      ) : (
                        m.lessons.map((l) => {
                          const emAndamento = !l.completed && !!l.lastAccess;
                          return (
                            <li key={l.lesson.id} className="flex items-center gap-3 text-sm">
                              {l.completed ? (
                                <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" />
                              ) : emAndamento ? (
                                <CircleDot className="h-4 w-4 shrink-0 text-amber-500" />
                              ) : (
                                <Circle className="h-4 w-4 shrink-0 text-muted-foreground" />
                              )}
                              <span className="min-w-0 flex-1 truncate">{l.lesson.titulo}</span>
                              <span className="shrink-0 text-xs text-muted-foreground">
                                {l.completed
                                  ? "Concluída"
                                  : emAndamento
                                    ? "Em andamento"
                                    : "Não iniciada"}
                              </span>
                            </li>
                          );
                        })
                      )}
                    </ul>
                  ) : null}
                </div>
              );
            })
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Atividade recente</CardTitle>
        </CardHeader>
        <CardContent>
          {d.activity.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nenhuma atividade registrada.</p>
          ) : (
            <ul className="space-y-4">
              {d.activity.map((a) => (
                <li key={a.lessonId} className="flex gap-3">
                  <Clock className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
                  <div className="min-w-0">
                    <p className="text-sm font-medium">{formatLastAccess(a.at)}</p>
                    <p className="truncate text-sm text-muted-foreground">{a.titulo}</p>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
