import { Link } from "react-router-dom";
import { useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import {
  Instagram, Facebook, MessageCircle, Search, MapPin, Clock, Wrench, Menu, X,
  Volume2, VolumeX, ShieldCheck, CreditCard, Truck, Smartphone, ArrowRight, Sparkles, Star,
} from "lucide-react";
import { useConfig, useProductos, useOtros } from "@/lib/zi/store";
import { fmtCOP } from "@/lib/zi/format";
import type { Producto, ColorOpt } from "@/lib/zi/types";

const CAT_LABEL: Record<string, string> = {
  todos: "Todos", iphone: "iPhone", ipad: "iPad", macbook: "MacBook", accesorio: "Accesorios", otro: "Otros",
};

export function PublicIndex() {
  const [cfg] = useConfig();
  const [productos] = useProductos();
  const [otros] = useOtros();
  const [loading, setLoading] = useState(true);
  const [menu, setMenu] = useState(false);
  const [muted, setMuted] = useState(true);
  const [quote, setQuote] = useState<{ p: Producto; color?: ColorOpt } | null>(null);

  const [q, setQ] = useState("");
  const [cat, setCat] = useState("todos");
  const [cond, setCond] = useState<"todos" | "nuevo" | "usado">("todos");
  const [sort, setSort] = useState<"reciente" | "asc" | "desc">("reciente");

  useEffect(() => { const t = setTimeout(() => setLoading(false), 900); return () => clearTimeout(t); }, []);

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
    <div className="min-h-screen bg-white text-[var(--ink)]">
      {/* LOADING */}
      {loading && (
        <div className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-white">
          <img src={cfg.logoUrl} alt="" className="w-20 h-20 animate-load-pulse" />
          <div className="mt-6 w-8 h-8 rounded-full border-2 border-[var(--gold)]/25 border-t-[var(--gold)] animate-spin" />
          <p className="mt-4 text-[var(--gold-dark)] text-[11px] tracking-[0.4em] font-bold">CARGANDO</p>
        </div>
      )}

      {/* NAV — black, sticky */}
      <nav className="sticky top-0 z-50 bg-[var(--ink)] text-white border-b border-white/10 shadow-xl">
        <div className="max-w-7xl mx-auto h-16 px-4 sm:px-6 flex items-center justify-between gap-4">
          <Link to="/" className="flex items-center gap-2.5">
            <img src={cfg.logoUrl} alt="" className="w-10 h-10 rounded-lg" />
            <div className="leading-tight">
              <div className="font-display text-white text-xl">ZONA<span className="text-[var(--gold)]">iPHONE</span></div>
              <div className="text-[9px] text-gray-400 font-semibold tracking-[0.25em]">BARRANQUILLA · CO</div>
            </div>
          </Link>
          <div className="hidden md:flex items-center gap-7">
            {[["catalogo","Catálogo"],["servicios","Servicios"],["servicio-tecnico","Técnico"],["ubicacion","Ubicación"]].map(([id,l]) => (
              <a key={id} href={"#"+id} className="text-[12px] font-semibold text-gray-300 hover:text-[var(--gold)] transition relative after:absolute after:left-0 after:-bottom-1 after:w-0 after:h-[2px] after:bg-[var(--gold)] hover:after:w-full after:transition-all">
                {l}
              </a>
            ))}
          </div>
          <div className="hidden md:flex items-center gap-2">
            <SocialIcon href={cfg.instagram}><Instagram className="w-4 h-4" /></SocialIcon>
            <SocialIcon href={cfg.facebook}><Facebook className="w-4 h-4" /></SocialIcon>
            <a href={waLink("Hola Zona iPhone!")} target="_blank" rel="noreferrer" className="ml-2 zi-btn-ink text-[11px] py-2.5 px-4 inline-flex items-center gap-1.5">
              <MessageCircle className="w-3.5 h-3.5" /> Escríbenos
            </a>
          </div>
            <button className="md:hidden w-10 h-10 rounded-lg flex items-center justify-center hover:bg-white/10" onClick={() => setMenu(v => !v)}>
            {menu ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
        {menu && (
          <div className="md:hidden bg-[var(--ink)] border-t border-white/10 px-4 py-4 flex flex-col gap-3">
            {[["catalogo","Catálogo"],["servicios","Servicios"],["servicio-tecnico","Técnico"],["ubicacion","Ubicación"]].map(([id,l]) => (
               <a key={id} href={"#"+id} onClick={() => setMenu(false)} className="text-sm text-gray-200 font-semibold py-1.5">{l}</a>
            ))}
            <a href={waLink("Hola!")} target="_blank" rel="noreferrer" className="zi-btn-gold text-xs mt-2 text-center">Escríbenos por WhatsApp</a>
          </div>
        )}
      </nav>

      {/* HERO — profesional */}
      <section className="relative overflow-hidden bg-[var(--ink)] text-white">
        <div className="absolute inset-0 opacity-25 bg-[linear-gradient(120deg,transparent_0%,rgba(201,168,76,.18)_45%,transparent_70%)]" />
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 py-14 md:py-24 grid lg:grid-cols-[1.05fr_.95fr] gap-10 items-center">
          <div className="animate-fade-up">
            <span className="zi-chip bg-white/10 text-[var(--gold)] border-white/10"><Sparkles className="w-3 h-3" /> {cfg.heroTagline}</span>
            <h1 className="font-display mt-5 leading-[0.95] text-white" style={{ fontSize: "clamp(54px, 9vw, 120px)" }}>
              {cfg.storeName.split(" ")[0] || "ZONA"}<br />
              <span className="text-[var(--gold)]">{cfg.storeName.split(" ")[1] || "iPhone"}</span>
            </h1>
            <p className="mt-5 text-base md:text-lg text-gray-300 max-w-md leading-relaxed">
              {cfg.misionQuote}
            </p>
            <div className="mt-7 flex flex-wrap gap-3">
              <a href="#catalogo" className="zi-btn-gold inline-flex items-center gap-2 text-sm">
                Ver catálogo <ArrowRight className="w-4 h-4" />
              </a>
              <a href={waLink("Hola Zona iPhone!")} target="_blank" rel="noreferrer" className="zi-btn-ink text-sm inline-flex items-center gap-2">
                <MessageCircle className="w-4 h-4" /> Cotizar ahora
              </a>
            </div>
            <div className="mt-10 flex gap-6 flex-wrap">
              {[["+5", "años de confianza"],["1k+","clientes felices"],["100%","garantía"]].map(([n,l]) => (
                <div key={l}>
                  <div className="font-display text-3xl text-white">{n}</div>
                  <div className="text-[11px] uppercase tracking-[0.15em] text-gray-400 font-semibold">{l}</div>
                </div>
              ))}
            </div>
          </div>
          {/* visual — iPad-style frame */}
          <div className="relative aspect-[3/4] max-w-md mx-auto w-full">
            {/* Outer bezel */}
            <div className="absolute inset-0 rounded-[2.5rem] bg-gradient-to-br from-gray-800 via-gray-900 to-black shadow-2xl p-3 md:p-4 border border-white/10">
              {/* Camera dot */}
              <div className="absolute top-4 left-1/2 -translate-x-1/2 w-2 h-2 rounded-full bg-gray-700 ring-1 ring-white/10 z-10" />
              {/* Screen */}
              <div className="relative h-full w-full rounded-[1.75rem] overflow-hidden bg-white">
                {cfg.heroMediaType === "video" && (cfg.heroMediaUrl || cfg.videoUrl) ? (
                  <video
                    key={cfg.heroMediaUrl || cfg.videoUrl}
                    src={cfg.heroMediaUrl || cfg.videoUrl}
                    autoPlay muted={muted} loop playsInline
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <img
                    src={cfg.heroMediaUrl || cfg.heroImageUrl || cfg.logoUrl}
                    alt="Zona iPhone"
                    className="h-full w-full object-contain p-6 md:p-8 animate-float drop-shadow-2xl"
                  />
                )}
              </div>
            </div>
            <div className="absolute top-6 -right-2 md:right-2 bg-white rounded-2xl shadow-soft border border-[var(--line)] p-3 animate-float" style={{ animationDelay: "1s" }}>
              <div className="flex items-center gap-2">
                <div className="w-9 h-9 rounded-lg bg-[var(--cream)] flex items-center justify-center"><ShieldCheck className="w-4 h-4 text-[var(--gold-dark)]" /></div>
                <div>
                  <div className="text-[10px] uppercase tracking-wider text-gray-500 font-bold">Garantía</div>
                  <div className="text-xs font-bold text-[var(--ink)]">30 días</div>
                </div>
              </div>
            </div>
            <div className="absolute bottom-6 -left-2 md:left-0 bg-white rounded-2xl shadow-soft border border-[var(--line)] p-3 animate-float" style={{ animationDelay: "2s" }}>
              <div className="flex items-center gap-2">
                <div className="w-9 h-9 rounded-lg bg-[var(--cream)] flex items-center justify-center"><CreditCard className="w-4 h-4 text-[var(--gold-dark)]" /></div>
                <div>
                  <div className="text-[10px] uppercase tracking-wider text-gray-500 font-bold">Pago</div>
                  <div className="text-xs font-bold text-[var(--ink)]">A crédito</div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* trust marquee */}
        <div className="relative border-y border-[var(--line)] bg-white/60 overflow-hidden">
          <div className="flex animate-marquee whitespace-nowrap py-3.5">
            {[...Array(2)].map((_, i) => (
              <div key={i} className="flex gap-12 px-6 text-[11px] text-gray-600 font-semibold uppercase tracking-[0.15em]">
                {["✦ Garantía incluida","✦ Crédito disponible","✦ Recibimos tu cel","✦ Envío rápido","✦ Servicio técnico","✦ Apple original","✦ San Andresito El Pupi"].map(t =>
                  <span key={t}>{t}</span>)}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* VIDEO opcional */}
      {cfg.videoUrl && (
        <section className="relative bg-[var(--ink)] h-[55vh] overflow-hidden">
          <video src={cfg.videoUrl} autoPlay loop muted={muted} playsInline className="absolute inset-0 w-full h-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-t from-[var(--ink)]/80 via-transparent to-transparent" />
          <button onClick={() => setMuted(v => !v)} className="absolute bottom-6 right-6 w-12 h-12 rounded-full bg-white text-[var(--ink)] flex items-center justify-center shadow-lg hover:scale-105 transition">
            {muted ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
          </button>
        </section>
      )}

      {/* EVENT BANNER */}
      {cfg.eventActive && countdown && (
        <section className="py-16 px-4 bg-gradient-to-br from-[var(--cream)] via-white to-[var(--cream)] border-y border-[var(--gold)]/20">
          <div className="max-w-5xl mx-auto text-center">
            <span className="zi-chip animate-pulse"><Sparkles className="w-3 h-3" /> {cfg.eventTitle || "Evento especial"}</span>
            <h2 className="font-display mt-4 text-5xl md:text-7xl text-[var(--ink)]">{cfg.eventTitle}</h2>
            <p className="mt-2 text-gray-600">{cfg.eventSubtitle}</p>
            <div className="mt-7 flex justify-center gap-3 flex-wrap">
              {[["d","Días"],["h","Horas"],["m","Min"],["s","Seg"]].map(([k,l]) => (
                <div key={k} className="px-5 py-3 bg-white rounded-2xl border border-[var(--line)] shadow-soft min-w-[80px]">
                  <div className="font-display text-3xl text-[var(--gold-dark)]">{String(countdown[k as "d"]).padStart(2,"0")}</div>
                  <div className="text-[10px] uppercase text-gray-500 tracking-[0.15em] font-bold">{l}</div>
                </div>
              ))}
            </div>
            {promoProduct && (
              <div className="mt-8 max-w-xs mx-auto bg-white rounded-2xl p-5 shadow-soft border-2 border-[var(--gold)]">
                {promoProduct.imagen && <img src={promoProduct.imagen} alt="" className="w-full h-32 object-contain" />}
                <h3 className="mt-3 font-bold text-[var(--ink)]">{promoProduct.nombre}</h3>
                <div className="font-display text-xl text-gray-400 line-through">{fmtCOP(promoProduct.precio)}</div>
                <div className="font-display text-4xl text-[var(--gold-dark)]">{fmtCOP(cfg.eventPromoPrice)}</div>
                <button onClick={() => setQuote({ p: promoProduct })} className="zi-btn-ink w-full mt-3 text-xs">Aprovechar</button>
              </div>
            )}
          </div>
        </section>
      )}

      {/* CATALOGO */}
      <section id="catalogo" className="py-20 px-4 sm:px-6 bg-white">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-10">
            <span className="zi-chip"><Smartphone className="w-3 h-3" /> Catálogo</span>
            <h2 className="font-display text-5xl md:text-6xl mt-4 text-[var(--ink)]">Nuestros dispositivos</h2>
            <p className="mt-3 text-gray-500 max-w-xl mx-auto">Selección curada de productos Apple con garantía y soporte local.</p>
          </div>

          <div className="bg-[var(--mist)] rounded-2xl p-4 md:p-5 mb-8 border border-[var(--line)]">
            <div className="relative mb-3">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input value={q} onChange={e => setQ(e.target.value)} placeholder="¿Qué estás buscando?"
                     className="w-full pl-11 pr-4 py-3 bg-white border border-[var(--line)] rounded-xl text-sm focus:border-[var(--gold)] focus:ring-2 focus:ring-[var(--gold)]/20 outline-none transition" />
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {Object.entries(CAT_LABEL).map(([k, v]) => (
                <button key={k} onClick={() => setCat(k)} className={`px-4 py-1.5 rounded-full text-[11px] font-bold uppercase tracking-[0.08em] transition ${cat===k ? "bg-[var(--ink)] text-white shadow" : "bg-white text-gray-600 border border-[var(--line)] hover:border-[var(--gold)]"}`}>{v}</button>
              ))}
              <div className="w-px h-6 bg-[var(--line)] mx-1 hidden sm:block" />
              {(["todos","nuevo","usado"] as const).map(k => (
                <button key={k} onClick={() => setCond(k)} className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-[0.08em] border transition ${cond===k ? "border-[var(--gold)] bg-[var(--cream)] text-[var(--gold-dark)]" : "border-[var(--line)] bg-white text-gray-500"}`}>{k}</button>
              ))}
              <select value={sort} onChange={e => setSort(e.target.value as never)} className="ml-auto px-3 py-1.5 rounded-full text-[11px] bg-white border border-[var(--line)] font-semibold text-gray-600">
                <option value="reciente">Más recientes</option>
                <option value="desc">Mayor precio</option>
                <option value="asc">Menor precio</option>
              </select>
            </div>
          </div>

          {visibles.length === 0 ? (
            <div className="text-center py-20 text-gray-400 bg-[var(--mist)] rounded-2xl border border-dashed border-[var(--line)]">
              <p className="text-sm">No hay productos disponibles en este momento.</p>
              <p className="text-xs mt-1">Agrega productos desde el panel admin.</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-5">
              {visibles.map(p => <ProductCard key={p.id} p={p} onQuote={(c) => setQuote({ p, color: c })} promoId={cfg.eventActive ? cfg.eventPromoProductId : ""} promoPrice={cfg.eventPromoPrice} />)}
            </div>
          )}
        </div>
      </section>

      {/* OTROS */}
      {otros.filter(o => o.stock > 0).length > 0 && (
        <section className="bg-[var(--cream)] py-16 px-4 sm:px-6">
          <div className="max-w-7xl mx-auto">
            <div className="flex items-end justify-between mb-8">
              <div>
                <span className="zi-chip">Otros</span>
                <h2 className="font-display text-4xl mt-3 text-[var(--ink)]">Otros productos</h2>
              </div>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
              {otros.filter(o => o.stock > 0).map(o => (
                <a key={o.id} href={waLink(`Hola! Me interesa: ${o.nombre} (${fmtCOP(o.precio)})`)} target="_blank" rel="noreferrer"
                   className="bg-white rounded-xl p-4 text-center border border-[var(--line)] hover:border-[var(--gold)] hover:shadow-soft hover:-translate-y-0.5 transition">
                  {o.imagen ? <img src={o.imagen} alt="" className="w-full h-20 object-contain" /> : <div className="text-3xl">📱</div>}
                  <div className="mt-2 text-xs font-semibold truncate text-[var(--ink)]">{o.nombre}</div>
                  <div className="font-display text-lg text-[var(--gold-dark)]">{fmtCOP(o.precio)}</div>
                </a>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* SERVICIOS */}
      <section id="servicios" className="bg-white py-20 px-4 sm:px-6">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-12">
            <span className="zi-chip">Servicios</span>
            <h2 className="font-display text-5xl mt-4 text-[var(--ink)]">Cómo compramos</h2>
            <p className="mt-3 text-gray-500">Más formas de llevarte tu Apple favorito.</p>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-5">
            {[
              { Icon: CreditCard, t: "Pago a crédito", d: "Lleva tu iPhone hoy y págalo en cuotas cómodas." },
              { Icon: Smartphone, t: "Tu cel como pago", d: "Recibimos tu celular como parte de pago. Cotiza sin compromiso." },
              { Icon: Truck, t: "Domicilio", d: "Envíos a toda Barranquilla y Colombia por WhatsApp." },
              { Icon: ShieldCheck, t: "Garantía", d: "Todos nuestros productos tienen garantía respaldada." },
            ].map(({ Icon, t, d }) => (
              <div key={t} className="group bg-white border border-[var(--line)] rounded-2xl p-6 hover:border-[var(--gold)] hover:shadow-soft transition">
                <div className="w-12 h-12 rounded-xl bg-[var(--cream)] flex items-center justify-center group-hover:bg-[var(--gold)] transition">
                  <Icon className="w-5 h-5 text-[var(--gold-dark)] group-hover:text-[var(--ink)] transition" />
                </div>
                <h3 className="font-display text-2xl mt-4 text-[var(--ink)]">{t}</h3>
                <p className="text-sm text-gray-500 mt-2 leading-relaxed">{d}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* MISION */}
      <section className="relative bg-gradient-to-b from-[var(--cream)] to-white py-20 px-4 overflow-hidden">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] rounded-full bg-[var(--gold)]/10 blur-3xl" />
        <div className="relative max-w-3xl mx-auto text-center">
          <Star className="w-8 h-8 text-[var(--gold)] mx-auto" />
          <p className="mt-6 font-display text-3xl md:text-4xl text-[var(--ink)] leading-snug">"{cfg.misionQuote}"</p>
          <div className="mt-7 inline-flex items-center gap-3">
            <div className="h-px w-12 bg-[var(--gold)]" />
            <span className="text-[11px] uppercase tracking-[0.3em] text-[var(--gold-dark)] font-bold">{cfg.slogan}</span>
            <div className="h-px w-12 bg-[var(--gold)]" />
          </div>
        </div>
      </section>

      {/* TECNICO */}
      <section id="servicio-tecnico" className="bg-white py-20 px-4 sm:px-6 border-t border-[var(--line)]">
        <div className="max-w-6xl mx-auto grid md:grid-cols-2 gap-10 items-center">
          <div>
            <span className="zi-chip"><Wrench className="w-3 h-3" /> Servicio técnico</span>
            <h2 className="font-display text-5xl mt-4 text-[var(--ink)]">Reparamos tu <span className="text-[var(--gold-dark)]">iPhone</span></h2>
            <p className="mt-4 text-gray-600">Equipos Apple atendidos con repuestos de calidad y garantía real.</p>
            <ul className="mt-6 grid sm:grid-cols-2 gap-2.5">
              {["Cambio de pantalla","Reparación de batería","Diagnóstico gratuito","Reparación de cámara","iCloud / software","Garantía en reparaciones"].map(t => (
                <li key={t} className="flex gap-2 text-sm text-gray-700"><span className="text-[var(--gold-dark)] font-bold">✓</span>{t}</li>
              ))}
            </ul>
            <a href={cfg.techWhatsapp} target="_blank" rel="noreferrer" className="mt-7 inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-[#25D366] text-white font-bold text-sm hover:bg-[#1FB855] transition shadow-md">
              <MessageCircle className="w-4 h-4" /> Cotizar por WhatsApp
            </a>
          </div>
          <div className="relative bg-gradient-to-br from-[var(--cream)] via-white to-[var(--cream)] rounded-3xl p-10 text-center border border-[var(--line)] shadow-soft">
            <div className="absolute -top-6 left-1/2 -translate-x-1/2 w-12 h-12 rounded-2xl bg-[var(--ink)] flex items-center justify-center shadow-lg">
              <Wrench className="w-5 h-5 text-[var(--gold)]" />
            </div>
            <h3 className="font-display text-3xl mt-6 text-[var(--ink)]">Servicio técnico</h3>
            <p className="text-sm text-gray-500 mt-2">Diagnóstico · Reparación · Garantía</p>
            <div className="mt-6 grid grid-cols-3 gap-3 text-center">
              {[["30d","Garantía"],["24h","Diagnóstico"],["100%","Original"]].map(([n,l]) => (
                <div key={l} className="bg-white border border-[var(--line)] rounded-xl py-3">
                  <div className="font-display text-2xl text-[var(--gold-dark)]">{n}</div>
                  <div className="text-[10px] uppercase tracking-wider text-gray-500 font-semibold">{l}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* UBICACION */}
      <section id="ubicacion" className="bg-[var(--mist)] py-20 px-4 sm:px-6">
        <div className="max-w-6xl mx-auto grid md:grid-cols-2 gap-8">
          <div>
            <span className="zi-chip"><MapPin className="w-3 h-3" /> Visítanos</span>
            <h2 className="font-display text-5xl mt-4 text-[var(--ink)]">{cfg.storeName}</h2>
            <div className="mt-6 space-y-3 text-sm">
              <p className="flex gap-3 text-gray-700"><MapPin className="w-4 h-4 text-[var(--gold-dark)] shrink-0 mt-0.5" /> {cfg.direccion}</p>
              <p className="flex gap-3 text-gray-700"><MessageCircle className="w-4 h-4 text-[var(--gold-dark)] shrink-0 mt-0.5" /> +{cfg.whatsapp.slice(0,2)} {cfg.whatsapp.slice(2)}</p>
              <p className="flex gap-3 text-gray-700"><Instagram className="w-4 h-4 text-[var(--gold-dark)] shrink-0 mt-0.5" /> @zona.iphonebq</p>
              <p className="flex gap-3 text-gray-700"><Facebook className="w-4 h-4 text-[var(--gold-dark)] shrink-0 mt-0.5" /> zona.iphonebq</p>
              <p className="flex gap-3 text-gray-700"><Clock className="w-4 h-4 text-[var(--gold-dark)] shrink-0 mt-0.5" /> {cfg.horario}</p>
            </div>
            <a href={cfg.mapsLink} target="_blank" rel="noreferrer" className="mt-7 zi-btn-gold inline-flex items-center gap-2 text-sm">
              <MapPin className="w-4 h-4" /> Cómo llegar
            </a>
          </div>
          <iframe src={cfg.mapsEmbed} className="w-full h-72 md:h-full rounded-2xl border border-[var(--line)] shadow-soft" loading="lazy" />
        </div>
      </section>

      {/* FOOTER */}
      <footer className="bg-white border-t border-[var(--line)] py-12 px-4 sm:px-6">
        <div className="max-w-6xl mx-auto grid md:grid-cols-3 gap-8">
          <div>
            <div className="flex items-center gap-2.5">
              <img src={cfg.logoUrl} alt="" className="w-11 h-11 rounded-lg" />
              <span className="font-display text-2xl text-[var(--ink)]">{cfg.storeName}</span>
            </div>
            <p className="text-xs text-gray-500 mt-3 leading-relaxed">Tu tienda Apple en Barranquilla. Productos originales, garantía local, atención humana.</p>
          </div>
          <div className="text-sm">
            <div className="font-bold text-[var(--ink)] mb-3 text-[11px] uppercase tracking-[0.18em]">Navegación</div>
            <div className="flex flex-col gap-2 text-gray-500 text-xs">
              <a href="#catalogo" className="hover:text-[var(--gold-dark)]">Catálogo</a>
              <a href="#servicios" className="hover:text-[var(--gold-dark)]">Servicios</a>
              <a href="#servicio-tecnico" className="hover:text-[var(--gold-dark)]">Servicio técnico</a>
              <a href="#ubicacion" className="hover:text-[var(--gold-dark)]">Ubicación</a>
            </div>
          </div>
          <div className="text-sm">
            <div className="font-bold text-[var(--ink)] mb-3 text-[11px] uppercase tracking-[0.18em]">Síguenos</div>
            <div className="flex flex-col gap-2 text-gray-500 text-xs">
              <a href={cfg.instagram} target="_blank" rel="noreferrer" className="hover:text-[var(--gold-dark)] flex items-center gap-2"><Instagram className="w-3.5 h-3.5" /> @zona.iphonebq</a>
              <a href={cfg.facebook} target="_blank" rel="noreferrer" className="hover:text-[var(--gold-dark)] flex items-center gap-2"><Facebook className="w-3.5 h-3.5" /> zona.iphonebq</a>
              <p className="flex items-center gap-2"><MapPin className="w-3.5 h-3.5" /> {cfg.direccion}</p>
            </div>
          </div>
        </div>
        <div className="border-t border-[var(--line)] mt-10 pt-5 text-center text-[11px] text-gray-400">
          © 2025 {cfg.storeName} · Todos los derechos reservados · Barranquilla, Colombia
        </div>
      </footer>

      {quote && <QuoteModal data={quote} cfg={cfg} onClose={() => setQuote(null)} />}

      {/* Floating WhatsApp button */}
      <a
        href={waLink("Hola! Quisiera más información.")}
        target="_blank"
        rel="noreferrer"
        aria-label="Escríbenos por WhatsApp"
        className="fixed bottom-5 right-5 z-50 flex items-center justify-center w-14 h-14 rounded-full bg-[#25D366] shadow-2xl hover:scale-110 transition-transform ring-4 ring-[#25D366]/30 animate-float"
      >
        <MessageCircle className="w-7 h-7 text-white" />
      </a>
    </div>
  );
}

function SocialIcon({ href, children }: { href: string; children: ReactNode }) {
  return (
    <a href={href} target="_blank" rel="noreferrer"
       className="w-9 h-9 rounded-lg border border-[var(--line)] text-gray-500 flex items-center justify-center hover:border-[var(--gold)] hover:text-[var(--gold-dark)] hover:bg-[var(--cream)] transition">
      {children}
    </a>
  );
}

const BADGE_CLR: Record<string, string> = {
  nuevo: "bg-[var(--ink)] text-white",
  usado: "bg-gray-100 text-gray-700 border border-gray-200",
  promocion: "bg-[var(--gold)] text-[var(--ink)]",
  descuento: "bg-red-600 text-white",
  personalizado: "bg-violet-600 text-white",
};

function ProductCard({ p, onQuote, promoId, promoPrice }: { p: Producto; onQuote: (c?: ColorOpt) => void; promoId: string; promoPrice: number }) {
  const [color, setColor] = useState<ColorOpt | undefined>(p.colores?.[0]);
  const isPromo = p.id === promoId;
  const displayPrice = isPromo ? promoPrice : p.precio;
  return (
    <div className="group bg-white border border-[var(--line)] rounded-2xl overflow-hidden hover:border-[var(--gold)] hover:shadow-soft hover:-translate-y-1 transition-all duration-300">
      <Link to={`/producto/${p.id}`} className="relative aspect-[4/5] bg-[var(--mist)] flex items-center justify-center p-2 sm:p-3 overflow-hidden">
        {p.imagen
          ? <img src={p.imagen} alt={p.nombre} className="h-full w-full object-contain group-hover:scale-105 transition duration-500" />
          : <Smartphone className="w-16 h-16 text-gray-300" />}
        <span className={`absolute top-3 left-3 px-2 py-0.5 rounded-md text-[9px] font-bold uppercase tracking-[0.1em] ${BADGE_CLR[p.estado]}`}>{p.estado}</span>
        {isPromo && <span className="absolute top-3 right-3 px-2 py-0.5 rounded-md bg-red-600 text-white text-[9px] font-bold animate-pulse">PROMO</span>}
      </Link>
      <div className="p-4">
        <Link to={`/producto/${p.id}`} className="block font-bold text-sm truncate text-[var(--ink)] hover:text-[var(--gold-dark)]">{p.nombre}</Link>
        <p className="text-xs text-gray-500 truncate mt-0.5">{p.descripcion || p.categoria}</p>
        {p.colores && p.colores.length > 0 && (
          <div className="flex gap-1.5 mt-2.5">
            {p.colores.map(c => (
              <button key={c.hex} onClick={() => setColor(c)} title={c.nombre}
                      className={`w-4 h-4 rounded-full border transition ${color?.hex===c.hex ? "ring-2 ring-offset-1 ring-[var(--gold)] border-white" : "border-gray-300 hover:scale-110"}`}
                      style={{ background: c.hex }} />
            ))}
          </div>
        )}
        <div className="mt-3 flex items-end justify-between">
          <div>
            {isPromo && <div className="text-xs text-gray-400 line-through">{fmtCOP(p.precio)}</div>}
            <div className="font-display text-2xl text-[var(--ink)] leading-none">{fmtCOP(displayPrice)}</div>
          </div>
        </div>
        <button onClick={() => onQuote(color)} className="mt-3 w-full py-2.5 bg-[var(--ink)] text-white rounded-xl text-[11px] font-bold uppercase tracking-[0.1em] hover:bg-[var(--gold)] hover:text-[var(--ink)] transition flex items-center justify-center gap-1.5">
          <MessageCircle className="w-3.5 h-3.5" /> Cotizar
        </button>
      </div>
    </div>
  );
}

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
    <div className="fixed inset-0 z-[90] bg-[var(--ink)]/40 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-up" onClick={onClose}>
      <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-[var(--line)]" onClick={e => e.stopPropagation()}>
        <div className="flex justify-between items-start">
          <div>
            <span className="zi-chip">Cotizar</span>
            <h3 className="font-display text-2xl mt-2 text-[var(--ink)]">{data.p.nombre}</h3>
            <div className="font-display text-3xl text-[var(--gold-dark)]">{fmtCOP(data.p.precio)}</div>
          </div>
          <button onClick={onClose} className="w-9 h-9 rounded-full hover:bg-[var(--mist)] flex items-center justify-center text-gray-500"><X className="w-5 h-5" /></button>
        </div>
        <div className="mt-5 space-y-3">
          <input value={nombre} onChange={e => setNombre(e.target.value)} placeholder="Tu nombre" className="w-full px-3 py-2.5 border border-[var(--line)] rounded-xl text-sm focus:border-[var(--gold)] focus:ring-2 focus:ring-[var(--gold)]/20 outline-none" />
          <input value={tel} onChange={e => setTel(e.target.value.replace(/\D/g,""))} placeholder="WhatsApp (solo números)" className="w-full px-3 py-2.5 border border-[var(--line)] rounded-xl text-sm focus:border-[var(--gold)] focus:ring-2 focus:ring-[var(--gold)]/20 outline-none" />
          {data.p.colores && data.p.colores.length > 0 && (
            <select value={color} onChange={e => setColor(e.target.value)} className="w-full px-3 py-2.5 border border-[var(--line)] rounded-xl text-sm bg-white">
              {data.p.colores.map(c => <option key={c.hex} value={c.nombre}>{c.nombre}</option>)}
            </select>
          )}
          <div className="grid grid-cols-3 gap-2">
            {[["contado","Contado"],["credito","Crédito"],["tradein","Mi cel"]].map(([v,l]) => (
              <button key={v} onClick={() => setPago(v)} className={`py-2.5 rounded-xl text-[11px] font-bold uppercase tracking-wider transition ${pago===v ? "bg-[var(--ink)] text-white" : "bg-[var(--mist)] text-gray-600 hover:bg-[var(--cream)]"}`}>{l}</button>
            ))}
          </div>
          <textarea value={obs} onChange={e => setObs(e.target.value)} placeholder="Mensaje / observaciones" rows={3} className="w-full px-3 py-2.5 border border-[var(--line)] rounded-xl text-sm focus:border-[var(--gold)] focus:ring-2 focus:ring-[var(--gold)]/20 outline-none" />
          <button onClick={send} className="w-full py-3.5 bg-[#25D366] text-white rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-[#1FB855] transition shadow-md">
            <MessageCircle className="w-4 h-4" /> Enviar por WhatsApp
          </button>
        </div>
      </div>
    </div>
  );
}
