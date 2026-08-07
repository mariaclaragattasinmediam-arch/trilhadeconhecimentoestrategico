import { useState } from "react";
import type { DragEvent } from "react";

/**
 * Reordenação leve por drag and drop (HTML5), sem bibliotecas externas.
 * No mobile, use os botões "mover para cima/baixo" como alternativa.
 */
export function useDragSort(onReorder: (from: number, to: number) => void) {
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [overIndex, setOverIndex] = useState<number | null>(null);

  const getItemProps = (index: number) => ({
    draggable: true,
    onDragStart: (e: DragEvent) => {
      setDragIndex(index);
      e.dataTransfer.effectAllowed = "move";
      e.dataTransfer.setData("text/plain", String(index));
    },
    onDragOver: (e: DragEvent) => {
      e.preventDefault();
      e.dataTransfer.dropEffect = "move";
      if (overIndex !== index) setOverIndex(index);
    },
    onDrop: (e: DragEvent) => {
      e.preventDefault();
      const from = dragIndex ?? Number(e.dataTransfer.getData("text/plain"));
      setDragIndex(null);
      setOverIndex(null);
      if (Number.isInteger(from) && from !== index) onReorder(from, index);
    },
    onDragEnd: () => {
      setDragIndex(null);
      setOverIndex(null);
    },
    "data-dragging": dragIndex === index ? "true" : undefined,
    "data-dragover": overIndex === index && dragIndex !== index ? "true" : undefined,
    className:
      "transition-all data-[dragging=true]:opacity-50 data-[dragover=true]:ring-2 data-[dragover=true]:ring-primary/50",
  });

  return { getItemProps, dragIndex };
}

export function move<T>(list: T[], from: number, to: number): T[] {
  const next = [...list];
  const [item] = next.splice(from, 1);
  if (item === undefined) return list;
  next.splice(to, 0, item);
  return next;
}
