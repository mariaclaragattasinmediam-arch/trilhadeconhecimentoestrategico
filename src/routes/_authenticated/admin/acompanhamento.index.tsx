import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  BarChart,
  Bar,
  Cell,
  ResponsiveContainer,
  Tooltip as ReTooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  AlertTriangle,
  ArrowUpDown,
  Download,
  Search,
  TrendingDown,
  TrendingUp,
  Users,
} from "lucide-react";
import { listAllMemberships, listGroups } from "@/lib/access";
import { AdminBreadcrumbs } from "@/components/admin/breadcrumbs";
import { StudentStatusBadge } from "@/components/admin/student-status";
import { PageHeader, EmptyState } from "@/components/common/page-parts";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  daysSince,
  downloadCsv,
  formatLastAccess,
  inactivityLevel,
  studentsToCsv,
  tracking,
  trackingKeys,
  type StudentOverview,
} from "@/lib/tracking";

export const Route = createFileRoute("/_authenticated/admin/acompanhamento/")({
  head: () => ({
    meta: [
      { title: "Acompanhamento de alunos — Trilha Ongoing" },
      {
        name: "description",
        content:
          "Acompanhe o progresso individual e geral dos alunos na Trilha de Conhecimento Estratégico.",
      },
      { property: "og:title", content: "Acompanhamento de alunos — Trilha Ongoing" },
      {
        property: "og:description",
        content: "Painel administrativo de evolução da aprendizagem.",
      },
    ],
  }),
  component: AcompanhamentoPage,
});

type SortKey = "nome" | "percent" | "modulo" | "aulas" | "acesso" | "status";
const faixas = [
  { value: "todas", label: "Todas as faixas" },
  { value: "0", label: "0%" },
  { value: "1-25", label: "1–25%" },
  { value: "26-50", label: "26–50%" },
  { value: "51-75", label: "51–75%" },
  { value: "76-99", label: "76–99%" },
  { value: "100", label: "100%" },
];

function inFaixa(p: number, f: string) {
  switch (f) {
    case "0":
      return p === 0;
    case "1-25":
      return p >= 1 && p <= 25;
    case "26-50":
      return p > 25 && p <= 50;
    case "51-75":
      return p > 50 && p <= 75;
    case "76-99":
      return p > 75 && p <= 99;
    case "100":
      return p >= 100;
    default:
      return true;
  }
}

function inAcesso(iso: string | null, f: string) {
  if (f === "todos") return true;
  const d = daysSince(iso);
  if (f === "nunca") return d === null;
  if (d === null) return false;
  if (f === "hoje") return d <= 0;
  if (f === "7") return d <= 7;
  if (f === "30") return d <= 30;
  if (f === "mais30") return d > 30;
  return true;
}

function AcompanhamentoPage() {
  const alunos = useQuery({ queryKey: trackingKeys.overview, queryFn: tracking.listStudents });
  const modulos = useQuery({ queryKey: trackingKeys.modules, queryFn: tracking.moduleAverages });
  const grupos = useQuery({ queryKey: ["access", "groups"], queryFn: listGroups });
  const membros = useQuery({ queryKey: ["access", "all-memberships"], queryFn: listAllMemberships });

  const [busca, setBusca] = useState("");
  const [status, setStatus] = useState("todos");
  const [faixa, setFaixa] = useState("todas");
  const [modulo, setModulo] = useState("todos");
  const [acesso, setAcesso] = useState("todos");
  const [sort, setSort] = useState<SortKey>("percent");
  const [asc, setAsc] = useState(true);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const data = alunos.data ?? [];

  const filtrados = useMemo(() => {
    const termo = busca.trim().toLowerCase();
    const list = data.filter((a) => {
      if (termo && !`${a.nome} ${a.email}`.toLowerCase().includes(termo)) return false;
      if (status !== "todos" && a.status !== status) return false;
      if (!inFaixa(a.percent, faixa)) return false;
      if (modulo !== "todos" && a.currentModuleId !== modulo) return false;
      if (!inAcesso(a.lastAccess, acesso)) return false;
      return true;
    });
    const dir = asc ? 1 : -1;
    const order = (s: StudentOverview["status"]) =>
      s === "nao_iniciado" ? 0 : s === "em_andamento" ? 1 : 2;
    return [...list].sort((a, b) => {
      switch (sort) {
        case "nome":
          return a.nome.localeCompare(b.nome) * dir;
        case "modulo":
          return ((a.currentModuleOrdem ?? 999) - (b.currentModuleOrdem ?? 999)) * dir;
        case "aulas":
          return (a.completedLessons - b.completedLessons) * dir;
        case "acesso":
          return ((daysSince(a.lastAccess) ?? 99999) - (daysSince(b.lastAccess) ?? 99999)) * -dir;
        case "status":
          return (order(a.status) - order(b.status)) * dir;
        default:
          return (a.percent - b.percent) * dir || a.nome.localeCompare(b.nome);
      }
    });
  }, [data, busca, status, faixa, modulo, acesso, sort, asc]);

  const pageCount = Math.max(1, Math.ceil(filtrados.length / pageSize));
  const currentPage = Math.min(page, pageCount);
  const visiveis = filtrados.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  const stats = useMemo(() => {
    const total = data.length;
    const nao = data.filter((a) => a.status === "nao_iniciado").length;
    const andamento = data.filter((a) => a.status === "em_andamento").length;
    const concluido = data.filter((a) => a.status === "concluido").length;
    const media = total === 0 ? 0 : Math.round(data.reduce((s, a) => s + a.percent, 0) / total);
    return { total, nao, andamento, concluido, media };
  }, [data]);

  const distribuicao = useMemo(() => {
    const buckets = [
      { name: "Não iniciado", test: (p: number) => p === 0 },
      { name: "1–25%", test: (p: number) => p >= 1 && p <= 25 },
      { name: "26–50%", test: (p: number) => p > 25 && p <= 50 },
      { name: "51–75%", test: (p: number) => p > 50 && p <= 75 },
      { name: "76–99%", test: (p: number) => p > 75 && p <= 99 },
      { name: "100%", test: (p: number) => p >= 100 },
    ];
    return buckets.map((b) => ({
      name: b.name,
      alunos: data.filter((a) => b.test(a.percent)).length,
    }));
  }, [data]);

  const setores = useMemo(() => {
    const groupList = grupos.data ?? [];
    const membershipList = membros.data ?? [];
    const byId = new Map(data.map((a) => [a.userId, a]));
    const statsFor = (members: StudentOverview[]) => {
      const total = members.length;
      const media =
        total === 0 ? 0 : Math.round(members.reduce((s, m) => s + m.percent, 0) / total);
      return {
        total,
        media,
        nao: members.filter((m) => m.status === "nao_iniciado").length,
        andamento: members.filter((m) => m.status === "em_andamento").length,
        concluido: members.filter((m) => m.status === "concluido").length,
      };
    };
    const emGrupo = new Set(membershipList.map((m) => m.user_id));
    const rows = groupList.map((g) => {
      const ids = membershipList.filter((m) => m.group_id === g.id).map((m) => m.user_id);
      const members = ids
        .map((id) => byId.get(id))
        .filter((a): a is StudentOverview => Boolean(a));
      return { id: g.id, nome: g.name, ...statsFor(members) };
    });
    const semSetor = data.filter((a) => !emGrupo.has(a.userId));
    return { rows, semSetor: { nome: "Sem setor", ...statsFor(semSetor) } };
  }, [grupos.data, membros.data, data]);

  const destaques = useMemo(() => {
    const iniciados = data.filter((a) => a.percent > 0);
    const maior = [...data].sort((a, b) => b.percent - a.percent)[0] ?? null;
    const menor = [...iniciados].sort((a, b) => a.percent - b.percent)[0] ?? null;
    const ativo =
      [...data]
        .filter((a) => a.lastAccess)
        .sort((a, b) => (b.lastAccess ?? "").localeCompare(a.lastAccess ?? ""))[0] ?? null;
    const inativos = data.filter((a) => {
      const d = daysSince(a.lastAccess);
      return a.status !== "concluido" && (d === null || d > 30);
    }).length;
    return { maior, menor, ativo, inativos };
  }, [data]);

  const ranking = useMemo(() => {
    const list = [...(modulos.data ?? [])];
    return {
      top: [...list].sort((a, b) => b.avgPercent - a.avgPercent).slice(0, 3),
      bottom: [...list].sort((a, b) => a.avgPercent - b.avgPercent).slice(0, 3),
    };
  }, [modulos.data]);

  const limparFiltros = () => {
    setBusca("");
    setStatus("todos");
    setFaixa("todas");
    setModulo("todos");
    setAcesso("todos");
    setPage(1);
  };

  const toggleSort = (key: SortKey) => {
    if (sort === key) setAsc((v) => !v);
    else {
      setSort(key);
      setAsc(true);
    }
  };

  if (alunos.isError || modulos.isError) {
    return (
      <div className="space-y-6">
        <PageHeader title="Acompanhamento" />
        <EmptyState
          icon={AlertTriangle}
          title="Não foi possível carregar os dados de acompanhamento."
          description="Verifique sua conexão e tente novamente."
          action={
            <Button
              onClick={() => {
                void alunos.refetch();
                void modulos.refetch();
              }}
            >
              Tentar novamente
            </Button>
          }
        />
      </div>
    );
  }

  const carregando = alunos.isLoading;

  return (
    <div className="space-y-6">
      <AdminBreadcrumbs items={[{ label: "Dashboard", to: "/dashboard" }, { label: "Acompanhamento" }]} />
      <PageHeader
        title="Acompanhamento"
        description="Evolução individual e geral dos alunos na trilha."
        action={
          <Button
            variant="outline"
            onClick={() => {
              downloadCsv(
                `acompanhamento-${new Date().toISOString().slice(0, 10)}.csv`,
                studentsToCsv(filtrados),
              );
            }}
            disabled={filtrados.length === 0}
          >
            <Download className="mr-2 h-4 w-4" />
            Exportar relatório
          </Button>
        }
      />

      {carregando ? (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-24 rounded-2xl" />
          ))}
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
          <StatCard label="Total de alunos" value={String(stats.total)} />
          <StatCard label="Não iniciaram" value={String(stats.nao)} />
          <StatCard label="Em andamento" value={String(stats.andamento)} />
          <StatCard label="Concluídos" value={String(stats.concluido)} />
          <StatCard label="Progresso médio" value={`${String(stats.media)}%`} />
        </div>
      )}

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-base">Distribuição dos alunos por progresso</CardTitle>
          </CardHeader>
          <CardContent className="h-64">
            {carregando ? (
              <Skeleton className="h-full w-full rounded-xl" />
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={distribuicao} margin={{ top: 8, right: 8, left: -20, bottom: 0 }}>
                  <XAxis dataKey="name" tickLine={false} axisLine={false} fontSize={11} />
                  <YAxis allowDecimals={false} tickLine={false} axisLine={false} fontSize={11} />
                  <ReTooltip cursor={{ fill: "hsl(var(--muted))" }} />
                  <Bar dataKey="alunos" radius={[6, 6, 0, 0]} fill="hsl(var(--primary))" />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Status dos alunos</CardTitle>
          </CardHeader>
          <CardContent className="h-64">
            {carregando ? (
              <Skeleton className="h-full w-full rounded-xl" />
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  layout="vertical"
                  data={[
                    { name: "Não iniciados", alunos: stats.nao },
                    { name: "Em andamento", alunos: stats.andamento },
                    { name: "Concluídos", alunos: stats.concluido },
                  ]}
                  margin={{ top: 8, right: 16, left: 24, bottom: 0 }}
                >
                  <XAxis type="number" allowDecimals={false} hide />
                  <YAxis type="category" dataKey="name" width={100} tickLine={false} axisLine={false} fontSize={11} />
                  <ReTooltip cursor={{ fill: "hsl(var(--muted))" }} />
                  <Bar dataKey="alunos" radius={[0, 6, 6, 0]}>
                    {["hsl(var(--muted-foreground))", "hsl(var(--primary))", "hsl(var(--primary))"].map(
                      (c, i) => (
                        <Cell key={i} fill={c} />
                      ),
                    )}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <TrendingUp className="h-4 w-4" /> Módulos com maior progresso
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {ranking.top.map((m) => (
              <ModuleLine key={m.moduleId} titulo={m.titulo} percent={m.avgPercent} />
            ))}
            {ranking.top.length === 0 ? (
              <p className="text-sm text-muted-foreground">Sem módulos publicados.</p>
            ) : null}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <TrendingDown className="h-4 w-4" /> Módulos com menor progresso
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {ranking.bottom.map((m) => (
              <ModuleLine key={m.moduleId} titulo={m.titulo} percent={m.avgPercent} />
            ))}
            {ranking.bottom.length === 0 ? (
              <p className="text-sm text-muted-foreground">Sem módulos publicados.</p>
            ) : null}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Destaques</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <Destaque
              label="Maior progresso"
              value={destaques.maior ? `${destaques.maior.nome} — ${String(destaques.maior.percent)}%` : "—"}
            />
            <Destaque
              label="Menor progresso entre iniciados"
              value={destaques.menor ? `${destaques.menor.nome} — ${String(destaques.menor.percent)}%` : "—"}
            />
            <Destaque label="Mais ativo recentemente" value={destaques.ativo?.nome ?? "—"} />
            <Destaque label="Sem acesso há mais de 30 dias" value={String(destaques.inativos)} />
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Users className="h-4 w-4" /> Progresso por setor
          </CardTitle>
        </CardHeader>
        <CardContent>
          {carregando || grupos.isLoading || membros.isLoading ? (
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} className="h-28 rounded-xl" />
              ))}
            </div>
          ) : setores.rows.length === 0 && setores.semSetor.total === 0 ? (
            <p className="text-sm text-muted-foreground">
              Nenhum setor cadastrado. Crie grupos em <Link to="/admin/grupos" className="text-primary underline">Admin → Grupos</Link> para acompanhar por setor.
            </p>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {[...setores.rows]
                .sort((a, b) => b.media - a.media)
                .map((s) => (
                  <div key={s.id} className="space-y-3 rounded-xl border p-4">
                    <div className="flex items-center justify-between gap-2">
                      <Link
                        to="/admin/grupos/$groupId"
                        params={{ groupId: s.id }}
                        className="truncate font-medium hover:text-primary"
                      >
                        {s.nome}
                      </Link>
                      <span className="shrink-0 text-xs text-muted-foreground">
                        {s.total} {s.total === 1 ? "aluno" : "alunos"}
                      </span>
                    </div>
                    <div className="flex items-center gap-3">
                      <Progress value={s.media} className="h-2 flex-1" />
                      <span className="w-10 text-right text-sm font-semibold">{s.media}%</span>
                    </div>
                    <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                      <span>{s.nao} não iniciaram</span>
                      <span>{s.andamento} em andamento</span>
                      <span>{s.concluido} concluídos</span>
                    </div>
                  </div>
                ))}
              {setores.semSetor.total > 0 ? (
                <div className="space-y-3 rounded-xl border border-dashed p-4">
                  <div className="flex items-center justify-between gap-2">
                    <span className="truncate font-medium text-muted-foreground">Sem setor</span>
                    <span className="shrink-0 text-xs text-muted-foreground">
                      {setores.semSetor.total}{" "}
                      {setores.semSetor.total === 1 ? "aluno" : "alunos"}
                    </span>
                  </div>
                  <div className="flex items-center gap-3">
                    <Progress value={setores.semSetor.media} className="h-2 flex-1" />
                    <span className="w-10 text-right text-sm font-semibold">
                      {setores.semSetor.media}%
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                    <span>{setores.semSetor.nao} não iniciaram</span>
                    <span>{setores.semSetor.andamento} em andamento</span>
                    <span>{setores.semSetor.concluido} concluídos</span>
                  </div>
                </div>
              ) : null}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="gap-4">
          <CardTitle className="text-base">Alunos</CardTitle>
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
            <div className="relative xl:col-span-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={busca}
                onChange={(e) => {
                  setBusca(e.target.value);
                  setPage(1);
                }}
                placeholder="Buscar aluno..."
                className="pl-9"
              />
            </div>
            <Select
              value={status}
              onValueChange={(v) => {
                setStatus(v);
                setPage(1);
              }}
            >
              <SelectTrigger>
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos os status</SelectItem>
                <SelectItem value="nao_iniciado">Não iniciados</SelectItem>
                <SelectItem value="em_andamento">Em andamento</SelectItem>
                <SelectItem value="concluido">Concluídos</SelectItem>
              </SelectContent>
            </Select>
            <Select
              value={faixa}
              onValueChange={(v) => {
                setFaixa(v);
                setPage(1);
              }}
            >
              <SelectTrigger>
                <SelectValue placeholder="Progresso" />
              </SelectTrigger>
              <SelectContent>
                {faixas.map((f) => (
                  <SelectItem key={f.value} value={f.value}>
                    {f.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select
              value={modulo}
              onValueChange={(v) => {
                setModulo(v);
                setPage(1);
              }}
            >
              <SelectTrigger>
                <SelectValue placeholder="Módulo atual" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos os módulos</SelectItem>
                {(modulos.data ?? []).map((m) => (
                  <SelectItem key={m.moduleId} value={m.moduleId}>
                    {m.titulo}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select
              value={acesso}
              onValueChange={(v) => {
                setAcesso(v);
                setPage(1);
              }}
            >
              <SelectTrigger>
                <SelectValue placeholder="Último acesso" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Qualquer acesso</SelectItem>
                <SelectItem value="hoje">Hoje</SelectItem>
                <SelectItem value="7">Últimos 7 dias</SelectItem>
                <SelectItem value="30">Últimos 30 dias</SelectItem>
                <SelectItem value="mais30">Mais de 30 dias</SelectItem>
                <SelectItem value="nunca">Nunca acessou</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <Button variant="ghost" size="sm" onClick={limparFiltros}>
              Limpar filtros
            </Button>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <span>Por página</span>
              <Select
                value={String(pageSize)}
                onValueChange={(v) => {
                  setPageSize(Number(v));
                  setPage(1);
                }}
              >
                <SelectTrigger className="w-20">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="10">10</SelectItem>
                  <SelectItem value="25">25</SelectItem>
                  <SelectItem value="50">50</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {carregando ? (
            <div className="space-y-3">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-14 rounded-xl" />
              ))}
            </div>
          ) : filtrados.length === 0 ? (
            <EmptyState
              icon={Users}
              title="Nenhum aluno encontrado"
              description="Não encontramos alunos com os filtros selecionados."
              action={
                <Button variant="outline" onClick={limparFiltros}>
                  Limpar filtros
                </Button>
              }
            />
          ) : (
            <>
              <div className="hidden overflow-x-auto md:block">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <SortHead label="Aluno" onClick={() => toggleSort("nome")} />
                      <SortHead label="Progresso" onClick={() => toggleSort("percent")} />
                      <SortHead label="Módulo atual" onClick={() => toggleSort("modulo")} />
                      <SortHead label="Aulas" onClick={() => toggleSort("aulas")} />
                      <SortHead label="Último acesso" onClick={() => toggleSort("acesso")} />
                      <SortHead label="Status" onClick={() => toggleSort("status")} />
                      <TableHead className="text-right">Ação</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {visiveis.map((a) => (
                      <TableRow key={a.userId}>
                        <TableCell>
                          <p className="font-medium">{a.nome}</p>
                          <p className="text-xs text-muted-foreground">{a.email}</p>
                        </TableCell>
                        <TableCell className="w-40">
                          <div className="space-y-1">
                            <span className="text-sm font-medium">{a.percent}%</span>
                            <Progress value={a.percent} className="h-2" />
                          </div>
                        </TableCell>
                        <TableCell className="max-w-48 truncate text-sm">
                          {a.currentModuleTitulo ?? "Trilha concluída"}
                        </TableCell>
                        <TableCell className="text-sm">
                          {a.completedLessons} / {a.totalLessons}
                        </TableCell>
                        <TableCell className="text-sm">
                          <AccessLabel aluno={a} />
                        </TableCell>
                        <TableCell>
                          <StudentStatusBadge status={a.status} />
                        </TableCell>
                        <TableCell className="text-right">
                          <Button asChild size="sm" variant="outline">
                            <Link
                              to="/admin/acompanhamento/$userId"
                              params={{ userId: a.userId }}
                            >
                              Ver evolução
                            </Link>
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              <div className="space-y-3 md:hidden">
                {visiveis.map((a) => (
                  <div key={a.userId} className="surface space-y-3 rounded-2xl p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="truncate font-medium">{a.nome}</p>
                        <p className="truncate text-xs text-muted-foreground">{a.email}</p>
                      </div>
                      <StudentStatusBadge status={a.status} />
                    </div>
                    <div className="space-y-1">
                      <span className="text-sm font-medium">{a.percent}% concluído</span>
                      <Progress value={a.percent} className="h-2" />
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {a.currentModuleTitulo ?? "Trilha concluída"}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {a.completedLessons}/{a.totalLessons} aulas · <AccessLabel aluno={a} />
                    </p>
                    <Button asChild size="sm" variant="outline" className="w-full">
                      <Link to="/admin/acompanhamento/$userId" params={{ userId: a.userId }}>
                        Ver evolução
                      </Link>
                    </Button>
                  </div>
                ))}
              </div>

              <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
                <p className="text-sm text-muted-foreground">
                  {filtrados.length} aluno(s) · página {currentPage} de {pageCount}
                </p>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={currentPage <= 1}
                    onClick={() => setPage(currentPage - 1)}
                  >
                    Anterior
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={currentPage >= pageCount}
                    onClick={() => setPage(currentPage + 1)}
                  >
                    Próxima
                  </Button>
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function AccessLabel({ aluno }: { aluno: StudentOverview }) {
  const level = inactivityLevel(aluno.lastAccess, aluno.status);
  const dot =
    level === "critico" ? "bg-destructive" : level === "atencao" ? "bg-amber-500" : "bg-emerald-500";
  return (
    <span className="inline-flex items-center gap-2">
      <span className={`h-2 w-2 rounded-full ${dot}`} aria-hidden />
      {formatLastAccess(aluno.lastAccess)}
    </span>
  );
}

function SortHead({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <TableHead>
      <button
        type="button"
        onClick={onClick}
        className="inline-flex items-center gap-1 transition-colors hover:text-foreground"
      >
        {label}
        <ArrowUpDown className="h-3 w-3 opacity-60" />
      </button>
    </TableHead>
  );
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <Card>
      <CardContent className="space-y-1 p-5">
        <p className="text-xs uppercase tracking-wide text-muted-foreground">{label}</p>
        <p className="text-2xl font-semibold">{value}</p>
      </CardContent>
    </Card>
  );
}

function ModuleLine({ titulo, percent }: { titulo: string; percent: number }) {
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between gap-3 text-sm">
        <span className="truncate">{titulo}</span>
        <span className="shrink-0 font-medium">{percent}%</span>
      </div>
      <Progress value={percent} className="h-2" />
    </div>
  );
}

function Destaque({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-3">
      <span className="text-muted-foreground">{label}</span>
      <span className="text-right font-medium">{value}</span>
    </div>
  );
}
