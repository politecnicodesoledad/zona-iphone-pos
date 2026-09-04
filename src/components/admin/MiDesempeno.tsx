import { useMemo, useEffect, useState } from "react";
import { useVentas, useSession } from "@/lib/zi/store";
import { fmtCOP, fmtDate } from "@/lib/zi/format";
import { ziSupabase } from "@/integrations/supabase/zi-client";
import { Card } from "./ui";
import { TrendingUp, Calendar, Award, ShieldCheck } from "lucide-react";

function mesActualISO() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

// Panel del ASESOR: solo su propio rendimiento. Nunca costos de producto,
// nunca la utilidad neta global del negocio, nunca ventas de otros asesores
// — eso ya lo bloquea RLS en Supabase, esta pantalla solo evita mostrar
// campos que el asesor de todas formas no debería estar viendo.
export function MiDesempeno() {
  const [ventas] = useVentas();
  const { profile } = useSession();
  const [cierre, setCierre] = useState<{ ganancia_neta: number; porcentaje: number; comision: number; estado: string } | null>(null);

  const periodo = mesActualISO();

  useEffect(() => {
    if (!profile) return;
    ziSupabase.from("zi_comisiones").select("*").eq("id", `${profile.id}-${periodo}`).maybeSingle()
      .then(({ data }) => setCierre(data as typeof cierre));
  }, [profile, periodo]);

  const misVentas = useMemo(() => ventas.filter(v => v.asesorId === profile?.id && !v.cancelada).sort((a, b) => b.fecha - a.fecha), [ventas, profile]);

  const { hoy, mes, gananciaMes } = useMemo(() => {
    const now = new Date();
    const inicioHoy = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    const inicioMes = new Date(now.getFullYear(), now.getMonth(), 1).getTime();
    const vHoy = misVentas.filter(v => v.fecha >= inicioHoy);
    const vMes = misVentas.filter(v => v.fecha >= inicioMes);
    const ganancia = vMes.reduce((s, v) => s + (v.total - v.productos.reduce((a, p) => a + (p.costo || 0) * p.cantidad, 0)), 0);
    return {
      hoy: { cantidad: vHoy.length, total: vHoy.reduce((s, v) => s + v.total, 0) },
      mes: { cantidad: vMes.length, total: vMes.reduce((s, v) => s + v.total, 0) },
      gananciaMes: ganancia,
    };
  }, [misVentas]);

  const pct = profile?.comision_pct ?? 0;
  const comisionEstimada = Math.round(gananciaMes * (pct / 100));
  const cerrado = cierre?.estado === "cerrado" || cierre?.estado === "pagado";

  return (
    <div className="space-y-5">
      <div>
        <h2 className="font-display text-xl text-[var(--ink)]">Hola, {profile?.nombre} 👋</h2>
        <p className="text-sm text-gray-500">Este es tu rendimiento — solo tus propias ventas.</p>
      </div>

      <div className="grid sm:grid-cols-3 gap-3">
        <Card>
          <div className="flex items-center gap-2 text-gray-400 text-xs uppercase tracking-widest"><Calendar className="w-3.5 h-3.5" /> Hoy</div>
          <div className="font-display text-3xl text-[var(--ink)] mt-1">{hoy.cantidad}</div>
          <div className="text-sm text-gray-500">{fmtCOP(hoy.total)}</div>
        </Card>
        <Card>
          <div className="flex items-center gap-2 text-gray-400 text-xs uppercase tracking-widest"><TrendingUp className="w-3.5 h-3.5" /> Este mes</div>
          <div className="font-display text-3xl text-[var(--ink)] mt-1">{mes.cantidad}</div>
          <div className="text-sm text-gray-500">{fmtCOP(mes.total)}</div>
        </Card>
        <Card className="bg-gradient-to-br from-[var(--gold-dark)]/20 to-[var(--gold)]/5 border-[var(--gold)]/40">
          <div className="flex items-center gap-2 text-[var(--gold-dark)] text-xs uppercase tracking-widest font-bold"><Award className="w-3.5 h-3.5" /> Comisión ({pct}%)</div>
          <div className="font-display text-3xl text-[var(--gold)] mt-1">{fmtCOP(cerrado ? cierre!.comision : comisionEstimada)}</div>
          <div className="text-[11px] text-gray-500">{cerrado ? "Cerrada por el admin este mes" : "Generada hasta ahora — se confirma al cierre de mes"}</div>
        </Card>
      </div>

      <Card>
        <h3 className="font-display text-lg text-[var(--ink)] mb-3">Mis últimas ventas</h3>
        {misVentas.length === 0 ? (
          <p className="text-sm text-gray-400 py-4 text-center">Aún no has registrado ventas.</p>
        ) : (
          <div className="divide-y divide-[var(--line)]">
            {misVentas.slice(0, 15).map(v => (
              <div key={v.id} className="py-2.5 flex items-center justify-between text-sm">
                <div>
                  <div className="font-semibold text-[var(--ink)]">{v.factura} · {v.cliente?.nombre || "—"}</div>
                  <div className="text-xs text-gray-500 flex items-center gap-2">
                    {fmtDate(v.fecha)}
                    {v.garantiaMeses ? (
                      <span className="inline-flex items-center gap-1 text-emerald-600"><ShieldCheck className="w-3 h-3" /> {v.garantiaMeses} meses</span>
                    ) : null}
                  </div>
                </div>
                <div className="font-display text-lg text-[var(--gold)]">{fmtCOP(v.total)}</div>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
