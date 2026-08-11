import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { statusLabel, type StudentStatus } from "@/lib/tracking";

const styles: Record<StudentStatus, string> = {
  nao_iniciado: "bg-muted text-muted-foreground",
  em_andamento: "bg-amber-500/15 text-amber-700 dark:text-amber-400",
  concluido: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400",
};

export function StudentStatusBadge({
  status,
  className,
}: {
  status: StudentStatus;
  className?: string;
}) {
  return (
    <Badge variant="secondary" className={cn("border-0", styles[status], className)}>
      {statusLabel[status]}
    </Badge>
  );
}
