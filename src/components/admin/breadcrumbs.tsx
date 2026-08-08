import { Fragment } from "react";
import { Link } from "@tanstack/react-router";
import { ChevronRight } from "lucide-react";

export interface CrumbLink {
  label: string;
  to?: string;
  params?: Record<string, string>;
}

export function AdminBreadcrumbs({ items }: { items: CrumbLink[] }) {
  return (
    <nav aria-label="Trilha de navegação" className="min-w-0">
      <ol className="flex flex-wrap items-center gap-1 text-xs text-muted-foreground">
        {items.map((item, i) => (
          <Fragment key={`${item.label}-${String(i)}`}>
            {i > 0 ? <ChevronRight className="h-3 w-3 shrink-0 opacity-60" aria-hidden /> : null}
            <li className="max-w-[16rem] truncate">
              {item.to ? (
                <Link
                  to={item.to}
                  params={item.params as never}
                  className="transition-colors hover:text-foreground"
                >
                  {item.label}
                </Link>
              ) : (
                <span className="text-foreground">{item.label}</span>
              )}
            </li>
          </Fragment>
        ))}
      </ol>
    </nav>
  );
}
