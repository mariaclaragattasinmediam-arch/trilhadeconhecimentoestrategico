import { useQuery } from "@tanstack/react-query";
import { Clock } from "lucide-react";
import { getCourseWorkload, formatWorkload, formatWorkloadShort, workloadKeys } from "@/lib/workload";
import { Skeleton } from "@/components/ui/skeleton";

/** Resumo da carga horária calculada de um curso, com a composição por módulo. */
export function WorkloadSummary({ courseId }: { courseId: string }) {
  const workload = useQuery({
    queryKey: workloadKeys.course(courseId),
    queryFn: () => getCourseWorkload(courseId),
  });

  if (workload.isLoading) return <Skeleton className="h-40 w-full rounded-2xl" />;
  if (!workload.data) return null;

  const { modules, totalSeconds } = workload.data;

  return (
    <section className="surface space-y-4 p-5">
      <div className="flex items-start gap-3">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
          <Clock className="h-5 w-5" />
        </span>
        <div>
          <h2 className="text-lg font-semibold">Carga horária total</h2>
          <p className="text-2xl font-semibold text-primary">{formatWorkload(totalSeconds)}</p>
          <p className="text-xs text-muted-foreground">
            Calculada automaticamente a partir dos conteúdos da trilha.
          </p>
        </div>
      </div>

      {modules.length > 0 ? (
        <div className="space-y-1 border-t border-border pt-3 text-sm">
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Resumo da carga horária
          </p>
          {modules.map((m) => (
            <div key={m.module_id} className="flex items-center justify-between gap-3">
              <span className="truncate text-muted-foreground">{m.titulo}</span>
              <span className="font-medium">{formatWorkloadShort(m.seconds)}</span>
            </div>
          ))}
          <div className="flex items-center justify-between gap-3 border-t border-border pt-2 font-semibold">
            <span>Total</span>
            <span>{formatWorkloadShort(totalSeconds)}</span>
          </div>
        </div>
      ) : null}
    </section>
  );
}
