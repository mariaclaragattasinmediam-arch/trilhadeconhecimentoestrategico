import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { STATUS_OPTIONS } from "@/lib/cms";
import type { ContentStatus } from "@/lib/api";

const styles: Record<ContentStatus, string> = {
  rascunho: "border-transparent bg-muted text-muted-foreground",
  publicado: "border-transparent bg-accent/15 text-accent-foreground",
  arquivado: "border-border bg-background text-muted-foreground",
};

const labels: Record<ContentStatus, string> = {
  rascunho: "Rascunho",
  publicado: "Publicado",
  arquivado: "Arquivado",
};

export function StatusBadge({ status }: { status: ContentStatus }) {
  return (
    <Badge variant="outline" className={styles[status]}>
      {labels[status]}
    </Badge>
  );
}

export function StatusSelect({
  value,
  onChange,
  id,
}: {
  value: ContentStatus;
  onChange: (v: ContentStatus) => void;
  id?: string;
}) {
  return (
    <Select value={value} onValueChange={(v) => onChange(v as ContentStatus)}>
      <SelectTrigger id={id}>
        <SelectValue placeholder="Status" />
      </SelectTrigger>
      <SelectContent>
        {STATUS_OPTIONS.map((o) => (
          <SelectItem key={o.value} value={o.value}>
            {o.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
