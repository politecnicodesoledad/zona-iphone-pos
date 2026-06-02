import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { MessageCircle, ArrowLeft, ShieldCheck, Truck, CreditCard, Smartphone } from "lucide-react";
import { useConfig, useProductos } from "@/lib/zi/store";
import { fmtCOP } from "@/lib/zi/format";
import type { ColorOpt } from "@/lib/zi/types";

export const Route = createFileRoute("/producto/$id")({
  head: () => ({ meta: [{ title: "Producto · Zona iPhone" }] }),
  component: ProductoPage,
});

function ProductoPage() {
  const { id } = Route.useParams();
  const [cfg] = useConfig();
  const [productos] = useProductos();
  const p = productos.find(x => x.id === id);
  const [color, setColor] = useState<ColorOpt | undefined>(p?.colores?.[0]);
  if (!p) throw notFound();

  const similares = useMemo(
    () => productos.filter(x => x.id !== p.id && x.categoria === p.categoria && x.stock > 0).slice(0, 4),
    [productos, p],
  );

  const msg = `Hola! Quiero comprar:\n📱 ${p.nombre}${color ? `\n🎨 Color: ${color.nombre}` : ""}\n💰 Precio: ${fmtCOP(p.precio)}`;
  const waHref = `https://wa.me/${cfg.whatsapp}?text=${encodeURIComponent(msg)}`;

  return (
    <div className="min-h-screen bg-white text-[var(--ink)]">
      {/* nav dark */}
      <nav className="sticky top-0 z-50 bg-[var(--ink)] text-white border-b border-black/40">
        <div className="max-w-7xl mx-auto h-16 px-4 sm:px-6 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2.5">
            <img src={cfg.logoUrl} alt="" className="w-10 h-10 rounded-lg bg-white/5 p-1" />
            <div className="font-display text-xl">ZONA<span className="text-[var(--gold)]">iPHONE</span></div>
          </Link>
          <Link to="/" className="text-xs font-bold uppercase tracking-wider text-gray-300 hover:text-[var(--gold)] flex items-center gap-1.5">
            <ArrowLeft className="w-4 h-4" /> Volver al catálogo
          </Link>
        </div>
      </nav>

      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-10 grid lg:grid-cols-2 gap-10 animate-fade-up">
        {/* imagen */}
        <div className="bg-[var(--mist)] rounded-3xl aspect-square flex items-center justify-center p-10 border border-[var(--line)] shadow-soft sticky top-24">
          {p.imagen
            ? <img src={p.imagen} alt={p.nombre} className="max-h-full object-contain" />
            : <Smartphone className="w-32 h-32 text-gray-300" />}
        </div>

        {/* info */}
        <div>
          <span className="zi-chip">{p.categoria}</span>
          <h1 className="font-display text-5xl md:text-6xl mt-3 leading-tight">{p.nombre}</h1>
          {p.descripcion && <p className="text-gray-600 mt-3">{p.descripcion}</p>}

          <div className="mt-6 font-display text-5xl text-[var(--gold-dark)]">{fmtCOP(p.precio)}</div>
          <div className="text-xs text-emerald-700 font-semibold mt-1 uppercase tracking-wider">✓ {p.stock} disponibles</div>

          {p.colores && p.colores.length > 0 && (
            <div className="mt-6">
              <div className="text-[10px] uppercase tracking-[0.18em] text-gray-500 font-bold mb-2">Color: <span className="text-[var(--ink)]">{color?.nombre}</span></div>
              <div className="flex gap-2">
                {p.colores.map(c => (
                  <button key={c.hex} onClick={() => setColor(c)} title={c.nombre}
                          className={`w-10 h-10 rounded-full border-2 transition ${color?.hex === c.hex ? "border-[var(--gold)] scale-110 shadow-md" : "border-gray-200 hover:scale-105"}`}
                          style={{ background: c.hex }} />
                ))}
              </div>
            </div>
          )}

          <a href={waHref} target="_blank" rel="noreferrer" className="mt-8 w-full inline-flex items-center justify-center gap-2 py-4 bg-[#25D366] hover:bg-[#1FB855] text-white rounded-2xl font-bold uppercase tracking-wider text-sm shadow-lg transition hover:-translate-y-0.5">
            <MessageCircle className="w-5 h-5" /> Comprar por WhatsApp
          </a>

          <div className="grid grid-cols-3 gap-3 mt-6">
            {[
              { Icon: ShieldCheck, t: "Garantía 30 días" },
              { Icon: CreditCard, t: "Crédito disponible" },
              { Icon: Truck, t: "Envíos a Colombia" },
            ].map(({ Icon, t }) => (
              <div key={t} className="bg-[var(--cream)] rounded-xl p-3 text-center border border-[var(--line)]">
                <Icon className="w-5 h-5 text-[var(--gold-dark)] mx-auto" />
                <div className="text-[10px] uppercase tracking-wider font-bold mt-1 text-gray-600">{t}</div>
              </div>
            ))}
          </div>
        </div>
      </main>

      {/* similares */}
      {similares.length > 0 && (
        <section className="bg-[var(--mist)] py-16 px-4 sm:px-6 border-t border-[var(--line)]">
          <div className="max-w-6xl mx-auto">
            <h2 className="font-display text-3xl md:text-4xl mb-6">Productos similares</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {similares.map(s => (
                <Link key={s.id} to="/producto/$id" params={{ id: s.id }}
                      className="group bg-white border border-[var(--line)] rounded-2xl overflow-hidden hover:border-[var(--gold)] hover:shadow-soft hover:-translate-y-1 transition">
                  <div className="aspect-square bg-[var(--mist)] flex items-center justify-center p-5">
                    {s.imagen
                      ? <img src={s.imagen} alt={s.nombre} className="max-h-full object-contain group-hover:scale-105 transition" />
                      : <Smartphone className="w-12 h-12 text-gray-300" />}
                  </div>
                  <div className="p-3">
                    <div className="font-bold text-sm truncate">{s.nombre}</div>
                    <div className="font-display text-xl text-[var(--gold-dark)]">{fmtCOP(s.precio)}</div>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}
    </div>
  );
}
