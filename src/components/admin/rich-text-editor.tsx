import { useEffect, useRef } from "react";
import {
  AlignCenter,
  AlignLeft,
  AlignRight,
  Bold,
  Italic,
  Link2,
  List,
  ListOrdered,
  Underline,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";

interface Props {
  value: string;
  onChange: (html: string) => void;
  placeholder?: string;
}

/** Editor de texto formatado leve, sem dependências pesadas. */
export function RichTextEditor({ value, onChange, placeholder }: Props) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (el && el.innerHTML !== value) el.innerHTML = value || "";
  }, [value]);

  const exec = (command: string, arg?: string) => {
    ref.current?.focus();
    document.execCommand(command, false, arg);
    onChange(ref.current?.innerHTML ?? "");
  };

  const tools = [
    { icon: Bold, label: "Negrito", run: () => exec("bold") },
    { icon: Italic, label: "Itálico", run: () => exec("italic") },
    { icon: Underline, label: "Sublinhado", run: () => exec("underline") },
    { icon: List, label: "Lista", run: () => exec("insertUnorderedList") },
    { icon: ListOrdered, label: "Lista numerada", run: () => exec("insertOrderedList") },
    { icon: AlignLeft, label: "Alinhar à esquerda", run: () => exec("justifyLeft") },
    { icon: AlignCenter, label: "Centralizar", run: () => exec("justifyCenter") },
    { icon: AlignRight, label: "Alinhar à direita", run: () => exec("justifyRight") },
  ];

  return (
    <div className="overflow-hidden rounded-xl border border-border bg-background">
      <div className="flex flex-wrap items-center gap-0.5 border-b border-border bg-muted/40 p-1">
        {tools.map((t) => (
          <Button
            key={t.label}
            type="button"
            size="icon"
            variant="ghost"
            className="h-8 w-8"
            aria-label={t.label}
            title={t.label}
            onMouseDown={(e) => e.preventDefault()}
            onClick={t.run}
          >
            <t.icon className="h-4 w-4" />
          </Button>
        ))}
        <Separator orientation="vertical" className="mx-1 h-5" />
        <Button
          type="button"
          size="icon"
          variant="ghost"
          className="h-8 w-8"
          aria-label="Inserir link"
          title="Inserir link"
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => {
            const url = window.prompt("URL do link");
            if (url) exec("createLink", url);
          }}
        >
          <Link2 className="h-4 w-4" />
        </Button>
      </div>
      <div
        ref={ref}
        role="textbox"
        aria-multiline="true"
        tabIndex={0}
        contentEditable
        suppressContentEditableWarning
        data-placeholder={placeholder ?? "Escreva o conteúdo…"}
        onInput={(e) => onChange((e.target as HTMLDivElement).innerHTML)}
        onBlur={(e) => onChange((e.target as HTMLDivElement).innerHTML)}
        className="prose-lesson min-h-32 px-4 py-3 text-[15px] outline-none empty:before:text-muted-foreground empty:before:content-[attr(data-placeholder)] [&_a]:text-primary [&_a]:underline [&_ol]:list-decimal [&_ol]:pl-5 [&_ul]:list-disc [&_ul]:pl-5"
      />
    </div>
  );
}
