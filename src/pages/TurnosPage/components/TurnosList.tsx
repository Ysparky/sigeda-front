import { useEffect, useRef } from "react";
import type { TurnoResponse } from "../types";
import { TurnoCard } from "./TurnoCard";

interface TurnosListProps {
  turnos: TurnoResponse[];
}

export function TurnosList({ turnos }: TurnosListProps) {
  const listRef = useRef<HTMLDivElement>(null);

  // Add staggered animation effect when the list changes
  useEffect(() => {
    if (!listRef.current) return;

    const cards = listRef.current.querySelectorAll(".turno-card");
    cards.forEach((card, index) => {
      // Add a staggered delay based on index
      (card as HTMLElement).style.animationDelay = `${index * 50}ms`;
    });
  }, [turnos]);

  return (
    <div
      ref={listRef}
      className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6 w-full"
    >
      {turnos.map((turno) => (
        <div
          key={turno.id}
          className="turno-card animate-fade-in opacity-0"
          style={{ animationFillMode: "forwards" }}
        >
          <TurnoCard turno={turno} />
        </div>
      ))}
    </div>
  );
}
