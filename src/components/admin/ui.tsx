// shared admin primitives — LIGHT THEME
import type { ReactNode, ButtonHTMLAttributes, InputHTMLAttributes, SelectHTMLAttributes, TextareaHTMLAttributes } from "react";

export function Card({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <div className={`bg-white border border-[var(--line)] rounded-2xl p-5 shadow-soft ${className}`}>{children}</div>;
}

export function Stat({ label, value, hint, color }: { label: string; value: ReactNode; hint?: string; color?: string }) {
  return (
    <Card>
      <div className="text-[10px] uppercase tracking-[0.18em] text-gray-500 font-semibold">{label}</div>
      <div className="font-display text-3xl mt-2 text-[var(--ink)]" style={color ? { color } : undefined}>{value}</div>
      {hint && <div className="text-xs text-gray-500 mt-1">{hint}</div>}
    </Card>
  );
}

export function Btn({ variant = "gold", className = "", ...p }: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: "gold" | "ghost" | "danger" | "ok" | "ink" }) {
  const v = {
    gold: "bg-gradient-to-br from-[var(--gold-light)] via-[var(--gold)] to-[var(--gold-dark)] text-[var(--ink)] shadow-[0_4px_14px_rgba(201,168,76,0.35)] hover:-translate-y-0.5",
    ink: "bg-[var(--ink)] text-white hover:bg-[#1f1f1f]",
    ghost: "border border-[var(--line)] text-gray-700 bg-white hover:border-[var(--gold)] hover:text-[var(--gold-dark)]",
    danger: "bg-red-600 text-white hover:bg-red-700",
    ok: "bg-emerald-600 text-white hover:bg-emerald-700",
  }[variant];
  return <button {...p} className={`px-4 py-2 rounded-lg text-[11px] font-bold uppercase tracking-[0.08em] transition ${v} ${className}`} />;
}

export function Input(p: InputHTMLAttributes<HTMLInputElement>) {
  return <input {...p} className={`w-full px-3 py-2 bg-white border border-[var(--line)] rounded-lg text-sm text-[var(--ink)] placeholder:text-gray-400 focus:border-[var(--gold)] focus:ring-2 focus:ring-[var(--gold)]/20 outline-none transition ${p.className || ""}`} />;
}
export function Select(p: SelectHTMLAttributes<HTMLSelectElement>) {
  return <select {...p} className={`w-full px-3 py-2 bg-white border border-[var(--line)] rounded-lg text-sm text-[var(--ink)] focus:border-[var(--gold)] focus:ring-2 focus:ring-[var(--gold)]/20 outline-none transition ${p.className || ""}`} />;
}
export function Textarea(p: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea {...p} className={`w-full px-3 py-2 bg-white border border-[var(--line)] rounded-lg text-sm text-[var(--ink)] placeholder:text-gray-400 focus:border-[var(--gold)] focus:ring-2 focus:ring-[var(--gold)]/20 outline-none transition ${p.className || ""}`} />;
}

export function Tabs({ tabs, active, onChange }: { tabs: { id: string; label: string }[]; active: string; onChange: (id: string) => void }) {
  return (
    <div className="flex flex-wrap gap-2 mb-5 p-1 bg-white rounded-xl border border-[var(--line)] w-fit shadow-soft">
      {tabs.map(t => (
        <button key={t.id} onClick={() => onChange(t.id)}
                className={`px-4 py-2 rounded-lg text-[11px] font-bold uppercase tracking-[0.08em] transition ${
                  active === t.id
                    ? "bg-[var(--ink)] text-white shadow"
                    : "text-gray-500 hover:text-[var(--ink)]"
                }`}>{t.label}</button>
      ))}
    </div>
  );
}

export function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="block">
      <span className="text-[10px] uppercase tracking-[0.15em] text-gray-500 font-semibold mb-1.5 block">{label}</span>
      {children}
    </label>
  );
}

export function Modal({ open, onClose, title, children, size = "md" }: { open: boolean; onClose: () => void; title?: string; children: ReactNode; size?: "sm" | "md" | "lg" }) {
  if (!open) return null;
  const w = size === "sm" ? "max-w-sm" : size === "lg" ? "max-w-3xl" : "max-w-lg";
  return (
    <div className="fixed inset-0 z-[80] bg-[var(--ink)]/40 flex items-center justify-center p-4 backdrop-blur-sm animate-fade-up" onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()} className={`bg-white border border-[var(--line)] rounded-2xl ${w} w-full max-h-[90vh] overflow-auto scrollbar-thin shadow-2xl`}>
        {title && (
          <div className="flex items-center justify-between p-5 border-b border-[var(--line)] sticky top-0 bg-white z-10">
            <h3 className="font-display text-2xl text-[var(--ink)]">{title}</h3>
            <button onClick={onClose} className="w-8 h-8 rounded-full hover:bg-[var(--mist)] text-gray-500 hover:text-[var(--ink)] text-2xl leading-none flex items-center justify-center">×</button>
          </div>
        )}
        <div className="p-5">{children}</div>
      </div>
    </div>
  );
}
