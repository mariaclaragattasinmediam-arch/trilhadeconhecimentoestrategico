import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Award,
  ArrowRight,
  BookOpen,
  CheckCircle2,
  Clock,
  GraduationCap,
  Layers,
  PlaySquare,
  Search,
  Sparkles,
  TrendingUp,
  Users,
} from "lucide-react";
import { api, computeProgress, qk, type Course } from "@/lib/api";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";
import { formatLastAccess } from "@/lib/tracking";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { EmptyState, LoadingGrid, PageHeader } from "@/components/common/page-parts";
import { TrackCompletionCard } from "@/components/lesson/track-completion-card";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({
    meta: [
      { title: "Dashboard — Trilha de Conhecimento InMediam" },
      {
        name: "description",
        content: "Continue sua jornada de aprendizagem: cursos, progresso e certificados.",
      },
      { property: "og:title", content: "Dashboard — Trilha de Conhecimento InMediam" },
      {
        property: "og:description",
        content: "Continue sua jornada de aprendizagem: cursos, progresso e certificados.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: DashboardPage,
});

function StatCard({
  icon: Icon,
  label,
  value,
  hint,
}: {
  icon: typeof BookOpen;
  label: string;
  value: string | number;
  hint?: string;
}) {
  return (
    <div className="surface p-5">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">{label}</p>
        <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-secondary text-primary">
          <Icon className="h-4 w-4" />
        </span>
      </div>
      <p className="mt-3 font-display text-2xl font-semibold">{value}</p>
      {hint ? <p className="mt-1 text-xs text-muted-foreground">{hint}</p> : null}
    </div>
  );
}

function DashboardPage() {
  const { isAdmin } = useAuth();
  return isAdmin ? <AdminDashboard /> : <StudentDashboard />;
}

/* ------------------------------- Aluno ---------------------------------- */

type Filtro = "todos" | "andamento" | "nao_iniciados" | "concluidos";

function StudentDashboard() {
  const { profile, user } = useAuth();
  const [busca, setBusca] = useState("");
  const [filtro, setFiltro] = useState<Filtro>("todos");

  const courses = useQuery({ queryKey: qk.courses, queryFn: api.listCourses });
  const modules = useQuery({ queryKey: qk.allModules, queryFn: () => api.listModules() });
  const lessons = useQuery({ queryKey: qk.allLessons, queryFn: () => api.listLessons() });
  const links = useQuery({ queryKey: qk.moduleLinks, queryFn: () => api.listModuleLinks() });
  const progress = useQuery({
    queryKey: [...qk.progress, user?.id],
    queryFn: () => api.listProgress(user!.id),
    enabled: Boolean(user?.id),
  });
  const certificados = useQuery({
    queryKey: ["certificados", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("certificates")
        .select("id, course_name, issued_at")
        .order("issued_at", { ascending: false });
      if (error) throw new Error(error.message);
      return data ?? [];
    },
    enabled: Boolean(user?.id),
  });

  const prog = progress.data ?? [];
  const allLessons = lessons.data ?? [];

  const cursos = useMemo(() => {
    const mods = modules.data ?? [];
    const ls = links.data ?? [];
    return (courses.data ?? [])
      .filter((c) => c.status === "publicado")
      .map((course) => {
        const modIds = mods.filter((m) => m.course_id === course.id).map((m) => m.id);
        const lessonIds = Array.from(
          new Set(ls.filter((l) => modIds.includes(l.module_id)).map((l) => l.lesson_id)),
        );
        return {
          course,
          modulos: modIds.length,
          ...computeProgress(lessonIds, prog),
          lessonIds,
        };
      });
  }, [courses.data, modules.data, links.data, prog]);

  const emAndamento = cursos.filter((c) => c.percent > 0 && c.percent < 100).length;
  const concluidos = cursos.filter((c) => c.total > 0 && c.percent === 100).length;
  const totalAulas = cursos.reduce((acc, c) => acc + c.total, 0);
  const totalFeitas = cursos.reduce((acc, c) => acc + c.completed, 0);
  const percentGeral = totalAulas === 0 ? 0 : Math.round((totalFeitas / totalAulas) * 100);

  const ultimoAcesso = [...prog].sort((a, b) =>
    a.last_accessed_at < b.last_accessed_at ? 1 : -1,
  )[0];
  const ultimaAula = allLessons.find((l) => l.id === ultimoAcesso?.lesson_id);
  const cursoAtual = ultimaAula
    ? cursos.find((c) => c.lessonIds.includes(ultimaAula.id))
    : cursos.find((c) => c.percent > 0 && c.percent < 100);

  const termo = busca.trim().toLowerCase();
  const listaFiltrada = cursos.filter((c) => {
    const combina =
      !termo ||
      c.course.titulo.toLowerCase().includes(termo) ||
      c.course.descricao.toLowerCase().includes(termo);
    if (!combina) return false;
    if (filtro === "andamento") return c.percent > 0 && c.percent < 100;
    if (filtro === "nao_iniciados") return c.percent === 0;
    if (filtro === "concluidos") return c.total > 0 && c.percent === 100;
    return true;
  });

  const destaques = cursos.filter((c) => c.course.destaque);

  const atividade = [...prog]
    .sort((a, b) => (a.last_accessed_at < b.last_accessed_at ? 1 : -1))
    .slice(0, 5)
    .map((p) => ({
      id: p.id,
      lessonId: p.lesson_id,
      titulo: allLessons.find((l) => l.id === p.lesson_id)?.titulo ?? "Conteúdo",
      completed: p.completed,
      at: p.last_accessed_at,
    }));

  const loading = courses.isLoading || modules.isLoading || links.isLoading;

  return (
    <>
      <PageHeader
        title={`Olá, ${profile?.nome?.split(" ")[0] || "colaborador"}! 👋`}
        description="Continue sua jornada de aprendizagem."
      />

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="surface p-6 lg:col-span-2">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="font-medium">Meu progresso</p>
              <p className="text-sm text-muted-foreground">
                {emAndamento} curso(s) em andamento · {concluidos} concluído(s)
              </p>
            </div>
            <span className="font-display text-3xl font-semibold text-primary">
              {percentGeral}%
            </span>
          </div>
          <Progress value={percentGeral} className="mt-4 h-2" />
          <p className="mt-2 text-xs text-muted-foreground">
            {totalFeitas} de {totalAulas} conteúdos concluídos
          </p>
        </div>

        <div className="surface flex flex-col justify-between gap-4 p-6">
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-secondary text-primary">
              <Award className="h-5 w-5" />
            </span>
            <div>
              <p className="font-medium">Meus certificados</p>
              <p className="text-sm text-muted-foreground">
                {certificados.data?.length ?? 0} certificado(s)
              </p>
            </div>
          </div>
          <Button asChild variant="outline">
            <Link to="/certificados">Ver certificados</Link>
          </Button>
        </div>
      </div>

      {cursoAtual ? (
        <section className="space-y-3">
          <h2 className="text-lg font-semibold">Continue de onde parou</h2>
          <div className="surface flex flex-col gap-4 p-6 sm:flex-row sm:items-center sm:justify-between">
            <div className="min-w-0 space-y-2">
              <p className="truncate font-medium">{cursoAtual.course.titulo}</p>
              <Progress value={cursoAtual.percent} className="h-1.5 w-full sm:w-64" />
              <p className="text-sm text-muted-foreground">
                {cursoAtual.percent}%
                {ultimaAula ? ` · Último conteúdo: ${ultimaAula.titulo}` : ""}
              </p>
            </div>
            <Button asChild>
              <Link to="/curso/$courseId" params={{ courseId: cursoAtual.course.id }}>
                Continuar curso <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
          </div>
        </section>
      ) : null}

      {cursos.length === 1 ? <TrackCompletionCard courseId={cursos[0]?.course.id} /> : null}

      {destaques.length > 0 ? (
        <section className="space-y-3">
          <h2 className="flex items-center gap-2 text-lg font-semibold">
            <Sparkles className="h-4 w-4 text-primary" /> Em destaque
          </h2>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {destaques.map((c) => (
              <CourseCard key={c.course.id} {...c} />
            ))}
          </div>
        </section>
      ) : null}

      <section className="space-y-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <h2 className="text-lg font-semibold">Meus cursos</h2>
          <div className="relative w-full sm:max-w-xs">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              className="pl-9"
              placeholder="Buscar cursos"
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
            />
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          {(
            [
              ["todos", "Todos"],
              ["andamento", "Em andamento"],
              ["nao_iniciados", "Não iniciados"],
              ["concluidos", "Concluídos"],
            ] as [Filtro, string][]
          ).map(([valor, rotulo]) => (
            <Button
              key={valor}
              size="sm"
              variant={filtro === valor ? "default" : "outline"}
              onClick={() => {
                setFiltro(valor);
              }}
            >
              {rotulo}
            </Button>
          ))}
        </div>

        {loading ? (
          <LoadingGrid />
        ) : cursos.length === 0 ? (
          <EmptyState
            icon={GraduationCap}
            title="Nenhum curso disponível"
            description="Você ainda não possui cursos liberados. Fale com o administrador para solicitar acesso."
          />
        ) : listaFiltrada.length === 0 ? (
          <EmptyState icon={BookOpen} title="Nenhum curso encontrado com esses filtros" />
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {listaFiltrada.map((c) => (
              <CourseCard key={c.course.id} {...c} />
            ))}
          </div>
        )}
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">Atividade recente</h2>
        {atividade.length === 0 ? (
          <p className="text-sm text-muted-foreground">Nenhuma atividade registrada ainda.</p>
        ) : (
          <div className="surface divide-y divide-border">
            {atividade.map((a) => (
              <Link
                key={a.id}
                to="/aula/$lessonId"
                params={{ lessonId: a.lessonId }}
                className="flex items-center justify-between gap-4 px-5 py-4 transition-colors hover:bg-muted/60"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">
                    {a.completed ? `Você concluiu a aula ${a.titulo}` : `Você acessou ${a.titulo}`}
                  </p>
                  <p className="text-xs text-muted-foreground">{formatLastAccess(a.at)}</p>
                </div>
                {a.completed ? (
                  <CheckCircle2 className="h-4 w-4 shrink-0 text-primary" />
                ) : (
                  <Clock className="h-4 w-4 shrink-0 text-muted-foreground" />
                )}
              </Link>
            ))}
          </div>
        )}
      </section>
    </>
  );
}

function CourseCard({
  course,
  modulos,
  percent,
  completed,
  total,
}: {
  course: Course;
  modulos: number;
  percent: number;
  completed: number;
  total: number;
}) {
  return (
    <article className="surface flex flex-col gap-4 p-5 transition-shadow hover:shadow-[var(--shadow-lift)]">
      <div className="flex items-start justify-between gap-3">
        <h3 className="min-w-0 text-base font-semibold">{course.titulo}</h3>
        <Badge variant={percent === 100 ? "default" : percent > 0 ? "secondary" : "outline"}>
          {percent === 100 ? "Concluído" : percent > 0 ? "Em andamento" : "Não iniciado"}
        </Badge>
      </div>
      <p className="line-clamp-2 text-sm text-muted-foreground">{course.descricao}</p>
      <p className="text-xs text-muted-foreground">
        {modulos} módulos · {total} conteúdos
      </p>
      <div className="space-y-1.5">
        <Progress value={percent} className="h-1.5" />
        <p className="text-xs text-muted-foreground">
          {completed}/{total} concluídos · {percent}%
        </p>
      </div>
      <Button asChild size="sm" className="mt-auto w-full">
        <Link to="/curso/$courseId" params={{ courseId: course.id }}>
          Continuar <ArrowRight className="h-4 w-4" />
        </Link>
      </Button>
    </article>
  );
}

/* ---------------------------- Administrador ------------------------------ */

function AdminDashboard() {
  const courses = useQuery({ queryKey: qk.courses, queryFn: api.listCourses });
  const modules = useQuery({ queryKey: qk.allModules, queryFn: () => api.listModules() });
  const lessons = useQuery({ queryKey: qk.allLessons, queryFn: () => api.listLessons() });
  const links = useQuery({ queryKey: qk.moduleLinks, queryFn: () => api.listModuleLinks() });

  const dados = useQuery({
    queryKey: ["admin-dashboard"],
    queryFn: async () => {
      const [{ data: profiles }, { data: progresso }, { data: certificados }] = await Promise.all([
        supabase.from("profiles").select("id"),
        supabase.from("progress").select("user_id, lesson_id, completed, last_accessed_at"),
        supabase.from("certificates").select("id"),
      ]);
      return {
        alunos: profiles?.length ?? 0,
        progresso: progresso ?? [],
        certificados: certificados?.length ?? 0,
      };
    },
  });

  const prog = dados.data?.progresso ?? [];
  const allLinks = links.data ?? [];
  const mods = modules.data ?? [];
  const allLessons = lessons.data ?? [];

  const lessonToCourses = useMemo(() => {
    const modCourse = new Map(mods.map((m) => [m.id, m.course_id]));
    const map = new Map<string, Set<string>>();
    allLinks.forEach((l) => {
      const courseId = modCourse.get(l.module_id);
      if (!courseId) return;
      const set = map.get(l.lesson_id) ?? new Set<string>();
      set.add(courseId);
      map.set(l.lesson_id, set);
    });
    return map;
  }, [allLinks, mods]);

  const matriculasEmAndamento = useMemo(() => {
    const pares = new Set<string>();
    prog.forEach((p) => {
      lessonToCourses.get(p.lesson_id)?.forEach((courseId) => {
        pares.add(`${p.user_id}:${courseId}`);
      });
    });
    return pares.size;
  }, [prog, lessonToCourses]);

  const taxaMedia = useMemo(() => {
    const totalPorCurso = new Map<string, number>();
    lessonToCourses.forEach((cursosSet) => {
      cursosSet.forEach((c) => totalPorCurso.set(c, (totalPorCurso.get(c) ?? 0) + 1));
    });
    const feitasPorPar = new Map<string, number>();
    prog
      .filter((p) => p.completed)
      .forEach((p) => {
        lessonToCourses.get(p.lesson_id)?.forEach((courseId) => {
          const chave = `${p.user_id}:${courseId}`;
          feitasPorPar.set(chave, (feitasPorPar.get(chave) ?? 0) + 1);
        });
      });
    if (feitasPorPar.size === 0) return 0;
    let soma = 0;
    feitasPorPar.forEach((feitas, chave) => {
      const courseId = chave.split(":")[1] ?? "";
      const total = totalPorCurso.get(courseId) ?? 0;
      soma += total === 0 ? 0 : (feitas / total) * 100;
    });
    return Math.round(soma / feitasPorPar.size);
  }, [prog, lessonToCourses]);

  const alunosAtivos = useMemo(() => {
    const limite = Date.now() - 7 * 86_400_000;
    const ativos = new Set(
      prog
        .filter((p) => new Date(p.last_accessed_at).getTime() >= limite)
        .map((p) => p.user_id),
    );
    return ativos.size;
  }, [prog]);

  const rankingCursos = useMemo(() => {
    const contagem = new Map<string, number>();
    prog.forEach((p) => {
      lessonToCourses.get(p.lesson_id)?.forEach((courseId) => {
        contagem.set(courseId, (contagem.get(courseId) ?? 0) + 1);
      });
    });
    return [...contagem.entries()]
      .map(([id, acessos]) => ({
        titulo: (courses.data ?? []).find((c) => c.id === id)?.titulo ?? "Curso",
        acessos,
      }))
      .sort((a, b) => b.acessos - a.acessos)
      .slice(0, 5);
  }, [prog, lessonToCourses, courses.data]);

  const rankingConteudos = useMemo(() => {
    const contagem = new Map<string, number>();
    prog.forEach((p) => {
      contagem.set(p.lesson_id, (contagem.get(p.lesson_id) ?? 0) + 1);
    });
    return [...contagem.entries()]
      .map(([id, acessos]) => ({
        titulo: allLessons.find((l) => l.id === id)?.titulo ?? "Conteúdo",
        acessos,
      }))
      .sort((a, b) => b.acessos - a.acessos)
      .slice(0, 5);
  }, [prog, allLessons]);

  return (
    <>
      <PageHeader
        title="Dashboard administrativo"
        description="Visão geral de cursos, conteúdos e evolução dos colaboradores."
        action={
          <Button asChild>
            <Link to="/admin/cursos">
              Gerenciar cursos <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <StatCard icon={BookOpen} label="Cursos" value={courses.data?.length ?? 0} />
        <StatCard icon={PlaySquare} label="Conteúdos" value={allLessons.length} />
        <StatCard icon={Users} label="Alunos" value={dados.data?.alunos ?? 0} />
        <StatCard icon={Layers} label="Cursos em andamento" value={matriculasEmAndamento} />
        <StatCard icon={Award} label="Certificados emitidos" value={dados.data?.certificados ?? 0} />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <StatCard
          icon={TrendingUp}
          label="Taxa média de conclusão"
          value={`${taxaMedia}%`}
          hint="Média entre alunos e cursos iniciados"
        />
        <StatCard
          icon={Clock}
          label="Alunos ativos"
          value={alunosAtivos}
          hint="Acessaram nos últimos 7 dias"
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <section className="surface p-5">
          <h2 className="mb-3 text-base font-semibold">Cursos mais acessados</h2>
          {rankingCursos.length === 0 ? (
            <p className="text-sm text-muted-foreground">Sem acessos registrados.</p>
          ) : (
            <ol className="space-y-2 text-sm">
              {rankingCursos.map((r, i) => (
                <li key={r.titulo} className="flex items-center justify-between gap-3">
                  <span className="min-w-0 truncate">
                    {i + 1}. {r.titulo}
                  </span>
                  <Badge variant="secondary">{r.acessos}</Badge>
                </li>
              ))}
            </ol>
          )}
        </section>

        <section className="surface p-5">
          <h2 className="mb-3 text-base font-semibold">Conteúdos mais acessados</h2>
          {rankingConteudos.length === 0 ? (
            <p className="text-sm text-muted-foreground">Sem acessos registrados.</p>
          ) : (
            <ol className="space-y-2 text-sm">
              {rankingConteudos.map((r, i) => (
                <li key={r.titulo} className="flex items-center justify-between gap-3">
                  <span className="min-w-0 truncate">
                    {i + 1}. {r.titulo}
                  </span>
                  <Badge variant="secondary">{r.acessos}</Badge>
                </li>
              ))}
            </ol>
          )}
        </section>
      </div>
    </>
  );
}
