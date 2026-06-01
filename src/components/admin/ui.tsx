// shared admin primitives
import type { ReactNode, ButtonHTMLAttributes, InputHTMLAttributes, SelectHTMLAttributes, TextareaHTMLAttributes } from "react";

export function Card({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <div className={`bg-[#121110] border border-[var(--gold)]/15 rounded-xl p-5 ${className}`}>{children}</div>;
}

export function Stat({ label, value, hint, color = "var(--gold)" }: { label: string; value: ReactNode; hint?: string; color?: string }) {
  return (
    <Card>
      <div className="text-[11px] uppercase tracking-widest text-gray-500">{label}</div>
      <div className="font-display text-3xl mt-1" style={{ color }}>{value}</div>
      {hint && <div className="text-xs text-gray-500 mt-1">{hint}</div>}
    </Card>
  );
}

export function Btn({ variant = "gold", className = "", ...p }: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: "gold" | "ghost" | "danger" | "ok" }) {
  const v = {
    gold: "bg-gradient-to-br from-[var(--gold-light)] via-[var(--gold)] to-[var(--gold-dark)] text-black",
    ghost: "border border-white/10 text-gray-300 hover:border-[var(--gold)] hover:text-[var(--gold)]",
    danger: "bg-red-600/90 text-white hover:bg-red-600",
    ok: "bg-green-600 text-white hover:bg-green-500",
  }[variant];
  return <button {...p} className={`px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-wider transition ${v} ${className}`} />;
}

export function Input(p: InputHTMLAttributes<HTMLInputElement>) {
  return <input {...p} className={`w-full px-3 py-2 bg-black/40 border border-white/10 rounded-lg text-sm text-white placeholder:text-gray-600 focus:border-[var(--gold)] outline-none ${p.className || ""}`} />;
}
export function Select(p: SelectHTMLAttributes<HTMLSelectElement>) {
  return <select {...p} className={`w-full px-3 py-2 bg-black/40 border border-white/10 rounded-lg text-sm text-white focus:border-[var(--gold)] outline-none ${p.className || ""}`} />;
}
export function Textarea(p: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea {...p} className={`w-full px-3 py-2 bg-black/40 border border-white/10 rounded-lg text-sm text-white placeholder:text-gray-600 focus:border-[var(--gold)] outline-none ${p.className || ""}`} />;
}

export function Tabs({ tabs, active, onChange }: { tabs: { id: string; label: string }[]; active: string; onChange: (id: string) => void }) {
  return (
    <div className="flex flex-wrap gap-2 mb-4">
      {tabs.map(t => (
        <button key={t.id} onClick={() => onChange(t.id)}
                className={`px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-wider transition ${
                  active === t.id ? "bg-[var(--gold)] text-black" : "bg-transparent border border-white/10 text-gray-400 hover:border-[var(--gold)]"
                }`}>{t.label}</button>
      ))}
    </div>
  );
}

export function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="block">
      <span className="text-[11px] uppercase tracking-widest text-gray-500 mb-1 block">{label}</span>
      {children}
    </label>
  );
}

export function Modal({ open, onClose, title, children, size = "md" }: { open: boolean; onClose: () => void; title?: string; children: ReactNode; size?: "sm" | "md" | "lg" }) {
  if (!open) return null;
  const w = size === "sm" ? "max-w-sm" : size === "lg" ? "max-w-3xl" : "max-w-lg";
  return (
    <div className="fixed inset-0 z-[80] bg-black/70 flex items-center justify-center p-4 backdrop-blur-sm" onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()} className={`bg-[#121110] border border-[var(--gold)]/30 rounded-2xl ${w} w-full max-h-[90vh] overflow-auto scrollbar-thin`}>
        {title && (
          <div className="flex items-center justify-between p-4 border-b border-white/10 sticky top-0 bg-[#121110]">
            <h3 className="font-display text-xl text-[var(--gold)]">{title}</h3>
            <button onClick={onClose} className="text-gray-400 hover:text-white text-2xl leading-none">×</button>
          </div>
        )}
        <div className="p-5">{children}</div>
      </div>
    </div>
  );
}
