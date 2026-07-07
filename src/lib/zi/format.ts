export const fmtCOP = (n: number) =>
  "$" + Math.round(n || 0).toLocaleString("es-CO", { maximumFractionDigits: 0 });

export const fmtDate = (ts: number) =>
  new Date(ts).toLocaleDateString("es-CO", { day: "2-digit", month: "short", year: "numeric" });

export const fmtDateTime = (ts: number) =>
  new Date(ts).toLocaleString("es-CO", {
    weekday: "short", day: "2-digit", month: "short", year: "numeric",
    hour: "2-digit", minute: "2-digit", hour12: true,
  });

export const maskCedula = (c?: string) => {
  if (!c) return "";
  return c.length <= 3 ? "***" : "***" + c.slice(-3);
};

export type Periodo = "hoy" | "semana" | "mes" | "anio" | "custom" | "todos";

export function dateInputToTime(value: string, endOfDay = false) {
  if (!value) return undefined;
  const m = value.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!m) return undefined;
  const d = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]), endOfDay ? 23 : 0, endOfDay ? 59 : 0, endOfDay ? 59 : 0, endOfDay ? 999 : 0);
  return Number.isFinite(d.getTime()) ? d.getTime() : undefined;
}

export function rangeFor(p: Periodo, from?: number, to?: number): [number, number] {
  const now = new Date();
  const start = new Date(now); const end = new Date(now);
  end.setHours(23, 59, 59, 999);
  switch (p) {
    case "hoy": start.setHours(0,0,0,0); break;
    case "semana": { const d = start.getDay(); start.setDate(start.getDate() - d); start.setHours(0,0,0,0); break; }
    case "mes": start.setDate(1); start.setHours(0,0,0,0); break;
    case "anio": start.setMonth(0,1); start.setHours(0,0,0,0); break;
    case "custom": return [from ?? 0, to ?? Date.now()];
    case "todos": return [0, Date.now() + 86400000];
  }
  return [start.getTime(), end.getTime()];
}
