import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Instagram, Facebook, MessageCircle, Search, MapPin, Clock, Phone, Wrench, Menu, X, Volume2, VolumeX } from "lucide-react";
import { useConfig, useProductos, useOtros } from "@/lib/zi/store";
import { fmtCOP } from "@/lib/zi/format";
import type { Producto, ColorOpt } from "@/lib/zi/types";

export const Route = createFileRoute("/")({ component: PublicIndex });

const CAT_LABEL: Record<string, string> = {
  todos: "Todos", iphone: "iPhone", ipad: "iPad", macbook: "MacBook", accesorio: "Accesorios", otro: "Otros",
};

function PublicIndex() {
  const [cfg] = useConfig();
  const [productos] = useProductos();
  const [otros] = useOtros();
  const [loading, setLoading] = useState(true);
  const [menu, setMenu] = useState(false);
  const [muted, setMuted] = useState(true);
  const [quote, setQuote] = useState<{ p: Producto; color?: ColorOpt } | null>(null);

  // filtros
  const [q, setQ] = useState("");
  const [cat, setCat] = useState("todos");
  const [cond, setCond] = useState<"todos" | "nuevo" | "usado">("todos");
  const [sort, setSort] = useState<"reciente" | "asc" | "desc">("reciente");

  useEffect(() => { const t = setTimeout(() => setLoading(false), 1200); return () => clearTimeout(t); }, []);

  const visibles = useMemo(() => {
    let arr = productos.filter(p => p.stock > 0);
    if (cat !== "todos") arr = arr.filter(p => p.categoria === cat);
    if (cond !== "todos") arr = arr.filter(p => p.estado === cond);
    if (q.trim()) {
      const t = q.toLowerCase();
      arr = arr.filter(p => p.nombre.toLowerCase().includes(t) || (p.descripcion || "").toLowerCase().includes(t));
    }
    if (sort === "asc") arr = [...arr].sort((a, b) => a.precio - b.precio);
    if (sort === "desc") arr = [...arr].sort((a, b) => b.precio - a.precio);
    if (sort === "reciente") arr = [...arr].sort((a, b) => b.creadoEn - a.creadoEn);
    return arr;
  }, [productos, cat, cond, q, sort]);

  // Event countdown
  const [now, setNow] = useState(Date.now());
  useEffect(() => { const t = setInterval(() => setNow(Date.now()), 1000); return () => clearInterval(t); }, []);
  const countdown = useMemo(() => {
    if (!cfg.eventActive || !cfg.eventEndDate) return null;
    const end = new Date(cfg.eventEndDate).getTime();
    const diff = Math.max(0, end - now);
    return {
      d: Math.floor(diff / 86400000),
      h: Math.floor((diff % 86400000) / 3600000),
      m: Math.floor((diff % 3600000) / 60000),
      s: Math.floor((diff % 60000) / 1000),
    };
  }, [cfg.eventActive, cfg.eventEndDate, now]);
  const promoProduct = productos.find(p => p.id === cfg.eventPromoProductId);

  const waLink = (text: string) => `https://wa.me/${cfg.whatsapp}?text=${encodeURIComponent(text)}`;

  return (
    <div className="min-h-screen bg-white text-black">
      {/* LOADING */}
      {loading && (
        <div className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-[#0A0A0A] transition-opacity">
          <img src={cfg.logoUrl} alt="" className="w-20 h-20 animate-load-pulse" />
          <div className="mt-6 w-8 h-8 rounded-full border-2 border-[var(--gold)]/30 border-t-[var(--gold)] animate-spin" />
          <p className="mt-4 text-[var(--gold)]/70 text-xs tracking-[0.4em] font-semibold">CARGANDO</p>
        </div>
      )}

      {/* NAV */}
      <nav className="sticky top-0 z-50 bg-black/90 backdrop-blur border-b border-white/5">
        <div className="max-w-7xl mx-auto h-14 px-4 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2">
            <img src={cfg.logoUrl} alt="" className="w-9 h-9" />
            <div className="leading-tight">
              <div className="font-display text-white text-lg">ZONA iPHONE</div>
              <div className="text-[9px] text-[var(--gold)] font-bold tracking-widest">{cfg.direccion.split(",")[2]?.trim() || "Barranquilla · Colombia"}</div>
            </div>
          </Link>
          <div className="hidden md:flex items-center gap-6">
            {["catalogo","servicios","servicio-tecnico","ubicacion"].map(id => (
              <a key={id} href={"#"+id} className="text-[11px] font-semibold uppercase tracking-[1.5px] text-gray-400 hover:text-[var(--gold)] transition">
                {id === "catalogo" ? "Catálogo" : id === "servicios" ? "Servicios" : id === "servicio-tecnico" ? "Técnico" : "Ubicación"}
              </a>
            ))}
          </div>
          <div className="hidden md:flex items-center gap-2">
            <SocialIcon href={cfg.instagram}><Instagram className="w-4 h-4" /></SocialIcon>
            <SocialIcon href={cfg.facebook}><Facebook className="w-4 h-4" /></SocialIcon>
            <SocialIcon href={waLink("Hola Zona iPhone!")} hoverColor="#25D366"><MessageCircle className="w-4 h-4" /></SocialIcon>
          </div>
          <button className="md:hidden text-white" onClick={() => setMenu(v => !v)}>
            {menu ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>
        {menu && (
          <div className="md:hidden bg-black border-t border-white/5 px-4 py-4 flex flex-col gap-3">
            {["catalogo","servicios","servicio-tecnico","ubicacion"].map(id => (
              <a key={id} href={"#"+id} onClick={() => setMenu(false)} className="text-sm text-gray-300 uppercase font-semibold">
                {id === "catalogo" ? "Catálogo" : id === "servicios" ? "Servicios" : id === "servicio-tecnico" ? "Técnico" : "Ubicación"}
              </a>
            ))}
            <div className="flex gap-3 pt-2">
              <SocialIcon href={cfg.instagram}><Instagram className="w-4 h-4" /></SocialIcon>
              <SocialIcon href={cfg.facebook}><Facebook className="w-4 h-4" /></SocialIcon>
              <SocialIcon href={waLink("Hola!")}><MessageCircle className="w-4 h-4" /></SocialIcon>
            </div>
          </div>
        )}
      </nav>

      {/* TRUST BAR */}
      <div className="bg-gray-100 border-y border-gray-200 overflow-hidden">
        <div className="flex animate-marquee whitespace-nowrap py-2.5">
          {[...Array(2)].map((_, i) => (
            <div key={i} className="flex gap-10 px-5 text-xs text-gray-700 font-semibold">
              {["✅ Garantía incluida","💳 Crédito disponible","📱 Recibimos tu cel","🚀 Envío rápido","🔧 Servicio técnico","⭐ Máxima calidad","📍 San Andresito El Pupi"].map(t =>
                <span key={t}>{t}</span>)}
            </div>
          ))}
        </div>
      </div>

      {/* HERO */}
      <section className="relative bg-[#0A0A0A] text-white overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_30%,oklch(0.3_0.1_85_/_0.4),transparent_60%)]" />
        <div className="relative max-w-6xl mx-auto px-4 py-20 md:py-28 text-center">
          <img src={cfg.logoUrl} alt="" className="w-24 h-24 mx-auto animate-float" />
          <div className="mt-6 text-[10px] tracking-[0.4em] text-[var(--gold)] font-bold uppercase">📍 Barranquilla, Colombia</div>
          <h1 className="font-display mt-3 leading-none" style={{ fontSize: "clamp(64px, 12vw, 150px)" }}>
            ZONA<br />
            <span className="text-white">i</span><span className="text-[var(--gold)]">Phone</span>
          </h1>
          <p className="mt-4 text-xs md:text-sm uppercase tracking-[0.3em] text-gray-400">{cfg.storeSubtitle}</p>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <a href="#catalogo" className="px-7 py-3.5 rounded-md font-extrabold uppercase text-xs tracking-wider text-black bg-gradient-to-br from-[var(--gold-light)] via-[var(--gold)] to-[var(--gold-dark)]">Ver catálogo</a>
            <a href={waLink("Hola Zona iPhone!")} target="_blank" rel="noreferrer" className="px-7 py-3.5 rounded-md font-extrabold uppercase text-xs tracking-wider border border-white/25 text-white hover:border-[var(--gold)] hover:text-[var(--gold)] transition">Contáctanos</a>
          </div>
        </div>
      </section>

      {/* VIDEO */}
      {cfg.videoUrl && (
        <section className="relative bg-black h-[60vh] overflow-hidden">
          <video src={cfg.videoUrl} autoPlay loop muted={muted} playsInline className="absolute inset-0 w-full h-full object-cover" />
          <div className="absolute inset-0 bg-black/40" />
          <button onClick={() => setMuted(v => !v)} className="absolute bottom-6 right-6 w-12 h-12 rounded-full bg-black/70 border border-[var(--gold)] text-[var(--gold)] flex items-center justify-center">
            {muted ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
          </button>
        </section>
      )}

      {/* EVENT BANNER */}
      {cfg.eventActive && countdown && (
        <section className="bg-[#0A0A0A] text-white py-12 px-4 border-y-2 border-[var(--gold)]">
          <div className="max-w-5xl mx-auto text-center">
            <div className="inline-block px-3 py-1 rounded-full bg-[var(--gold)]/20 text-[var(--gold)] text-xs uppercase font-bold tracking-widest animate-pulse">{cfg.eventTitle || "Evento Especial"}</div>
            <h2 className="font-display mt-4 text-5xl md:text-7xl text-[var(--gold)]">{cfg.eventTitle}</h2>
            <p className="mt-2 text-gray-300">{cfg.eventSubtitle}</p>
            <div className="mt-6 flex justify-center gap-4">
              {[["d","Días"],["h","Horas"],["m","Min"],["s","Seg"]].map(([k,l]) => (
                <div key={k} className="px-4 py-3 bg-white/5 rounded-lg border border-[var(--gold)]/30 min-w-[70px]">
                  <div className="font-display text-3xl text-[var(--gold)]">{String(countdown[k as "d"]).padStart(2,"0")}</div>
                  <div className="text-[10px] uppercase text-gray-400 tracking-wider">{l}</div>
                </div>
              ))}
            </div>
            {promoProduct && (
              <div className="mt-8 max-w-xs mx-auto bg-white text-black rounded-xl p-5 border-4 border-[var(--gold)]">
                {promoProduct.imagen && <img src={promoProduct.imagen} alt="" className="w-full h-32 object-contain" />}
                <h3 className="mt-3 font-bold">{promoProduct.nombre}</h3>
                <div className="font-display text-3xl text-[var(--gold-dark)] line-through">{fmtCOP(promoProduct.precio)}</div>
                <div className="font-display text-4xl text-red-600">{fmtCOP(cfg.eventPromoPrice)}</div>
                <button onClick={() => setQuote({ p: promoProduct })} className="mt-3 w-full py-2 bg-black text-[var(--gold)] rounded font-bold uppercase text-xs">Aprovechar</button>
              </div>
            )}
          </div>
        </section>
      )}

      {/* CATALOGO */}
      <section id="catalogo" className="py-16 px-4 bg-white">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-8">
            <div className="text-[10px] uppercase tracking-[0.4em] text-[var(--gold-dark)] font-bold">Catálogo</div>
            <h2 className="font-display text-5xl md:text-6xl mt-2">NUESTROS DISPOSITIVOS</h2>
          </div>
          {/* filters */}
          <div className="flex flex-col gap-3 mb-8">
            <div className="relative max-w-md mx-auto w-full">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input value={q} onChange={e => setQ(e.target.value)} placeholder="Buscar producto..." className="w-full pl-10 pr-4 py-2.5 border rounded-lg text-sm" />
            </div>
            <div className="flex flex-wrap justify-center gap-2">
              {Object.entries(CAT_LABEL).map(([k, v]) => (
                <button key={k} onClick={() => setCat(k)} className={`px-4 py-1.5 rounded-full text-xs font-semibold uppercase tracking-wider transition ${cat===k ? "bg-black text-[var(--gold)]" : "bg-gray-100 text-gray-700 hover:bg-gray-200"}`}>{v}</button>
              ))}
            </div>
            <div className="flex flex-wrap justify-center gap-2">
              {(["todos","nuevo","usado"] as const).map(k => (
                <button key={k} onClick={() => setCond(k)} className={`px-3 py-1 rounded-full text-[11px] font-semibold uppercase border ${cond===k ? "border-[var(--gold)] bg-[var(--gold)]/10 text-[var(--gold-dark)]" : "border-gray-200 text-gray-600"}`}>{k}</button>
              ))}
              <select value={sort} onChange={e => setSort(e.target.value as never)} className="px-3 py-1 rounded-full text-[11px] border border-gray-200">
                <option value="reciente">Reciente</option>
                <option value="desc">Mayor precio</option>
                <option value="asc">Menor precio</option>
              </select>
            </div>
          </div>

          {visibles.length === 0 ? (
            <div className="text-center py-16 text-gray-500">
              <p className="text-sm">No hay productos disponibles en este momento.</p>
              <p className="text-xs mt-2">Agrega productos desde el panel admin.</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {visibles.map(p => <ProductCard key={p.id} p={p} cfg={cfg} onQuote={(c) => setQuote({ p, color: c })} promoId={cfg.eventActive ? cfg.eventPromoProductId : ""} promoPrice={cfg.eventPromoPrice} />)}
            </div>
          )}
        </div>
      </section>

      {/* OTROS */}
      {otros.filter(o => o.stock > 0).length > 0 && (
        <section className="bg-[#0A0A0A] text-white py-16 px-4">
          <div className="max-w-7xl mx-auto">
            <h2 className="font-display text-4xl text-center mb-8">OTROS PRODUCTOS</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
              {otros.filter(o => o.stock > 0).map(o => (
                <a key={o.id} href={waLink(`Hola! Me interesa: ${o.nombre} (${fmtCOP(o.precio)})`)} target="_blank" rel="noreferrer"
                   className="bg-white/5 border border-white/10 rounded-lg p-4 text-center hover:border-[var(--gold)] transition">
                  {o.imagen ? <img src={o.imagen} alt="" className="w-full h-20 object-contain" /> : <div className="text-3xl">📱</div>}
                  <div className="mt-2 text-xs font-semibold truncate">{o.nombre}</div>
                  <div className="font-display text-lg text-[var(--gold)]">{fmtCOP(o.precio)}</div>
                </a>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* SERVICIOS */}
      <section id="servicios" className="bg-black text-white py-20 px-4">
        <div className="max-w-6xl mx-auto">
          <h2 className="font-display text-5xl text-center text-[var(--gold)] mb-12">CÓMO COMPRAMOS</h2>
          <div className="grid md:grid-cols-4 gap-4">
            {[
              ["💳","Pago a Crédito","Lleva tu iPhone hoy y págalo en cuotas cómodas."],
              ["🔄","Tu Cel como Pago","Recibimos tu celular como parte de pago. Cotiza sin compromiso."],
              ["📦","Domicilio","Envíos a toda Barranquilla y Colombia por WhatsApp."],
              ["✅","Garantía","Todos nuestros productos tienen garantía. Respaldamos cada venta."],
            ].map(([icon,t,d]) => (
              <div key={t} className="bg-white/5 border border-[var(--gold)]/20 rounded-xl p-6 hover:border-[var(--gold)] transition">
                <div className="text-4xl">{icon}</div>
                <h3 className="font-display text-2xl mt-3 text-[var(--gold)]">{t}</h3>
                <p className="text-sm text-gray-300 mt-2">{d}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* MISION */}
      <section className="relative bg-[#0A0A0A] text-white py-20 px-4 overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,oklch(0.3_0.1_85_/_0.3),transparent_60%)]" />
        <div className="relative max-w-3xl mx-auto text-center">
          <div className="flex items-center justify-center gap-4">
            <img src={cfg.logoUrl} alt="" className="w-14 h-14" />
            <div className="w-px h-12 bg-[var(--gold)]/40" />
            <div className="font-display text-2xl text-[var(--gold)]">{cfg.slogan}</div>
          </div>
          <p className="mt-8 text-lg italic text-gray-300">"{cfg.misionQuote}"</p>
          <div className="mt-6 inline-block px-5 py-2 rounded-full border border-[var(--gold)] text-[var(--gold)] text-xs font-bold tracking-wider">{cfg.misionBadge}</div>
        </div>
      </section>

      {/* TECNICO */}
      <section id="servicio-tecnico" className="bg-gray-100 py-20 px-4 border-t-4 border-[var(--gold)]">
        <div className="max-w-6xl mx-auto grid md:grid-cols-2 gap-10 items-center">
          <div>
            <h2 className="font-display text-5xl">SERVICIO TÉCNICO para tu <span className="text-[var(--gold-dark)]">iPhone</span></h2>
            <p className="mt-4 text-gray-700">Reparamos tu equipo Apple con repuestos de calidad y garantía.</p>
            <ul className="mt-6 space-y-2">
              {["Cambio de pantalla iPhone","Reparación de batería","Diagnóstico gratuito","Reparación de cámara","Problemas de software / iCloud","Garantía en reparaciones"].map(t => (
                <li key={t} className="flex gap-2 text-sm"><span className="text-[var(--gold-dark)] font-bold">✓</span>{t}</li>
              ))}
            </ul>
            <a href={cfg.techWhatsapp} target="_blank" rel="noreferrer" className="mt-6 inline-flex items-center gap-2 px-6 py-3 rounded-md bg-[#25D366] text-white font-bold text-sm">
              <MessageCircle className="w-4 h-4" /> Cotizar por WhatsApp
            </a>
          </div>
          <div className="bg-[#0A0A0A] text-white rounded-2xl p-10 text-center border border-[var(--gold)]/30">
            <Wrench className="w-20 h-20 text-[var(--gold)] mx-auto" />
            <h3 className="font-display text-3xl mt-4 text-[var(--gold)]">SERVICIO TÉCNICO</h3>
            <p className="text-sm text-gray-400 mt-2">Diagnóstico, reparación y garantía</p>
          </div>
        </div>
      </section>

      {/* UBICACION */}
      <section id="ubicacion" className="bg-black text-white py-20 px-4">
        <div className="max-w-6xl mx-auto grid md:grid-cols-2 gap-10">
          <div>
            <h2 className="font-display text-5xl text-[var(--gold)]">{cfg.storeName}</h2>
            <div className="mt-6 space-y-3 text-sm">
              <p className="flex gap-2"><MapPin className="w-4 h-4 text-[var(--gold)]" /> {cfg.direccion}</p>
              <p className="flex gap-2"><MessageCircle className="w-4 h-4 text-[var(--gold)]" /> +{cfg.whatsapp.slice(0,2)} {cfg.whatsapp.slice(2)}</p>
              <p className="flex gap-2"><Instagram className="w-4 h-4 text-[var(--gold)]" /> @zona.iphonebq</p>
              <p className="flex gap-2"><Facebook className="w-4 h-4 text-[var(--gold)]" /> zona.iphonebq</p>
              <p className="flex gap-2"><Clock className="w-4 h-4 text-[var(--gold)]" /> {cfg.horario}</p>
            </div>
            <a href={cfg.mapsLink} target="_blank" rel="noreferrer" className="mt-6 inline-flex items-center gap-2 px-6 py-3 rounded-md bg-gradient-to-br from-[var(--gold-light)] via-[var(--gold)] to-[var(--gold-dark)] text-black font-bold text-sm uppercase">
              <MapPin className="w-4 h-4" /> Cómo llegar
            </a>
          </div>
          <iframe src={cfg.mapsEmbed} className="w-full h-72 md:h-full rounded-2xl border border-[var(--gold)]/30" loading="lazy" />
        </div>
      </section>

      {/* FOOTER */}
      <footer className="bg-[#050505] text-white py-12 px-4 border-t border-[var(--gold)]/20">
        <div className="max-w-6xl mx-auto grid md:grid-cols-3 gap-8">
          <div>
            <div className="flex items-center gap-2"><img src={cfg.logoUrl} alt="" className="w-10 h-10" /><span className="font-display text-2xl">{cfg.storeName}</span></div>
            <p className="text-xs text-gray-400 mt-2">Celulares y Accesorios · Barranquilla</p>
          </div>
          <div className="text-sm">
            <div className="font-bold text-[var(--gold)] mb-2 text-xs uppercase tracking-widest">Navegación</div>
            <div className="flex flex-col gap-1 text-gray-400 text-xs">
              <a href="#catalogo">Catálogo</a><a href="#servicios">Servicios</a><a href="#servicio-tecnico">Técnico</a><a href="#ubicacion">Ubicación</a>
            </div>
          </div>
          <div className="text-sm">
            <div className="font-bold text-[var(--gold)] mb-2 text-xs uppercase tracking-widest">Síguenos</div>
            <div className="flex flex-col gap-1 text-gray-400 text-xs">
              <a href={cfg.instagram} target="_blank" rel="noreferrer">📸 @zona.iphonebq</a>
              <a href={cfg.facebook} target="_blank" rel="noreferrer">👤 zona.iphonebq</a>
              <p>📍 {cfg.direccion}</p>
            </div>
          </div>
        </div>
        <div className="border-t border-white/10 mt-8 pt-4 text-center text-[11px] text-gray-500">
          © 2025 {cfg.storeName} – Todos los derechos reservados · Barranquilla, Colombia
        </div>
      </footer>

      {/* QUOTE MODAL */}
      {quote && <QuoteModal data={quote} cfg={cfg} onClose={() => setQuote(null)} />}
    </div>
  );
}

function SocialIcon({ href, children, hoverColor }: { href: string; children: React.ReactNode; hoverColor?: string }) {
  return (
    <a href={href} target="_blank" rel="noreferrer"
       className="w-8 h-8 rounded-md border border-white/15 text-white/70 flex items-center justify-center hover:border-[var(--gold)] hover:text-[var(--gold)] transition"
       style={hoverColor ? { ["--hover" as never]: hoverColor } : undefined}>
      {children}
    </a>
  );
}

function ProductCard({ p, cfg, onQuote, promoId, promoPrice }: { p: Producto; cfg: ReturnType<typeof useConfig>[0]; onQuote: (c?: ColorOpt) => void; promoId: string; promoPrice: number }) {
  const [color, setColor] = useState<ColorOpt | undefined>(p.colores?.[0]);
  const isPromo = p.id === promoId;
  const displayPrice = isPromo ? promoPrice : p.precio;
  return (
    <div className="bg-white border border-gray-200 rounded-xl overflow-hidden hover:border-[var(--gold)] hover:shadow-lg transition group">
      <div className="relative aspect-square bg-gray-50 flex items-center justify-center p-4">
        {p.imagen ? <img src={p.imagen} alt={p.nombre} className="max-h-full object-contain" /> : <div className="text-5xl">📱</div>}
        <span className={`absolute top-2 left-2 px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider ${BADGE_CLR[p.estado]}`}>{p.estado}</span>
        {isPromo && <span className="absolute top-2 right-2 px-2 py-0.5 rounded bg-[var(--gold)] text-black text-[9px] font-bold">PROMO</span>}
      </div>
      <div className="p-3">
        <h3 className="font-semibold text-sm truncate">{p.nombre}</h3>
        <p className="text-xs text-gray-500 truncate">{p.descripcion}</p>
        {p.colores && p.colores.length > 0 && (
          <div className="flex gap-1.5 mt-2">
            {p.colores.map(c => (
              <button key={c.hex} onClick={() => setColor(c)} title={c.nombre}
                      className={`w-4 h-4 rounded-full border ${color?.hex===c.hex ? "ring-2 ring-[var(--gold)]" : "border-gray-300"}`}
                      style={{ background: c.hex }} />
            ))}
          </div>
        )}
        <div className="mt-2 flex items-end justify-between">
          <div className="font-display text-2xl">{fmtCOP(displayPrice)}</div>
        </div>
        <button onClick={() => onQuote(color)} className="mt-2 w-full py-2 bg-black text-white rounded text-xs font-bold uppercase tracking-wider hover:bg-[var(--gold)] hover:text-black transition">
          💬 Cotizar
        </button>
      </div>
    </div>
  );
}

const BADGE_CLR: Record<string, string> = {
  nuevo: "bg-black text-[var(--gold)]",
  usado: "bg-[#5A4E3A] text-[var(--gold-light)]",
  promocion: "bg-[var(--gold)] text-black",
  descuento: "bg-[#C41E3A] text-white",
  personalizado: "bg-[#7C3AED] text-white",
};

function QuoteModal({ data, cfg, onClose }: { data: { p: Producto; color?: ColorOpt }; cfg: ReturnType<typeof useConfig>[0]; onClose: () => void }) {
  const [nombre, setNombre] = useState("");
  const [tel, setTel] = useState("");
  const [pago, setPago] = useState("contado");
  const [color, setColor] = useState(data.color?.nombre || data.p.colores?.[0]?.nombre || "");
  const [obs, setObs] = useState("");
  const send = () => {
    const msg = [
      "Hola Zona iPhone! Quiero cotizar:",
      `📱 ${data.p.nombre}`,
      color && `🎨 Color: ${color}`,
      `💰 Pago: ${pago === "contado" ? "Contado" : pago === "credito" ? "Crédito" : "Mi cel como pago"}`,
      nombre && `👤 ${nombre}`,
      tel && `📞 ${tel}`,
      obs && `📝 ${obs}`,
    ].filter(Boolean).join("\n");
    window.open(`https://wa.me/${cfg.whatsapp}?text=${encodeURIComponent(msg)}`, "_blank");
    onClose();
  };
  return (
    <div className="fixed inset-0 z-[90] bg-black/70 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl max-w-md w-full p-6" onClick={e => e.stopPropagation()}>
        <div className="flex justify-between items-start">
          <div>
            <h3 className="font-display text-2xl">{data.p.nombre}</h3>
            <div className="font-display text-3xl text-[var(--gold-dark)]">{fmtCOP(data.p.precio)}</div>
          </div>
          <button onClick={onClose}><X className="w-5 h-5" /></button>
        </div>
        <div className="mt-4 space-y-3">
          <input value={nombre} onChange={e => setNombre(e.target.value)} placeholder="Tu nombre" className="w-full px-3 py-2 border rounded-lg text-sm" />
          <input value={tel} onChange={e => setTel(e.target.value.replace(/\D/g,""))} placeholder="WhatsApp (solo números)" className="w-full px-3 py-2 border rounded-lg text-sm" />
          {data.p.colores && data.p.colores.length > 0 && (
            <select value={color} onChange={e => setColor(e.target.value)} className="w-full px-3 py-2 border rounded-lg text-sm">
              {data.p.colores.map(c => <option key={c.hex} value={c.nombre}>{c.nombre}</option>)}
            </select>
          )}
          <div className="grid grid-cols-3 gap-2">
            {[["contado","Contado"],["credito","Crédito"],["tradein","Mi cel"]].map(([v,l]) => (
              <button key={v} onClick={() => setPago(v)} className={`py-2 rounded-lg text-xs font-semibold ${pago===v ? "bg-black text-[var(--gold)]" : "bg-gray-100 text-gray-700"}`}>{l}</button>
            ))}
          </div>
          <textarea value={obs} onChange={e => setObs(e.target.value)} placeholder="Mensaje / observaciones" rows={3} className="w-full px-3 py-2 border rounded-lg text-sm" />
          <button onClick={send} className="w-full py-3 bg-[#25D366] text-white rounded-lg font-bold flex items-center justify-center gap-2">
            <MessageCircle className="w-4 h-4" /> Enviar por WhatsApp
          </button>
        </div>
      </div>
    </div>
  );
}
