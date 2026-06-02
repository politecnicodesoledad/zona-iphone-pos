import { useState } from "react";
import { useConfig, useProductos } from "@/lib/zi/store";
import { generarFacturaPDF } from "@/lib/zi/pdf";
import { pushAllToCloud, pullAllFromCloud, type SyncReport } from "@/lib/zi/cloud-sync";
import { Card, Btn, Input, Select, Textarea, Tabs, Field } from "./ui";
import type { Venta, EventType } from "@/lib/zi/types";
import { Cloud, CloudUpload, CloudDownload, MapPin } from "lucide-react";

export function Configuracion() {
  const [tab, setTab] = useState("ajustes");
  return (
    <div>
      <Tabs tabs={[
        { id: "ajustes", label: "⚙️ Ajustes" },
        { id: "locales", label: "📍 Locales" },
        { id: "nube", label: "☁️ Nube" },
        { id: "eventos", label: "🎉 Eventos" },
        { id: "video", label: "🎬 Video" },
      ]} active={tab} onChange={setTab} />
      {tab === "ajustes" && <Ajustes />}
      {tab === "locales" && <Locales />}
      {tab === "nube" && <Nube />}
      {tab === "eventos" && <Eventos />}
      {tab === "video" && <Video />}
    </div>
  );
}

function Ajustes() {
  const [cfg, setCfg] = useConfig();
  const [draft, setDraft] = useState(cfg);
  const [saved, setSaved] = useState(false);
  const upd = <K extends keyof typeof draft>(k: K, v: typeof draft[K]) => setDraft({ ...draft, [k]: v });
  function save() { setCfg(draft); setSaved(true); setTimeout(() => setSaved(false), 2000); }

  function pruebaFactura() {
    const v: Venta = {
      id: "test", factura: "#PRUEBA", fecha: Date.now(), tipo: "contado", local: 1, asesor: "Demo",
      productos: [{ productoId: "1", nombre: "iPhone 15 Pro 128GB", cantidad: 1, precioUnitario: 4500000, costo: 3800000, subtotal: 4500000 }],
      total: 4500000, metodoPago: "efectivo", observaciones: "Factura de prueba con la configuración actual.",
      cliente: { nombre: "Cliente Demo", cedula: "1234567890", telefono: "3001234567" },
    };
    generarFacturaPDF(v, draft);
  }

  return (
    <div className="grid lg:grid-cols-2 gap-4">
      <Card>
        <h3 className="font-display text-xl text-[var(--gold-dark)] mb-3">Datos del negocio</h3>
        <div className="space-y-3">
          <Field label="Nombre del negocio"><Input value={draft.storeName} onChange={e => upd("storeName", e.target.value)} /></Field>
          <Field label="Subtítulo"><Input value={draft.storeSubtitle} onChange={e => upd("storeSubtitle", e.target.value)} /></Field>
          <Field label="WhatsApp (sin +)"><Input value={draft.whatsapp} onChange={e => upd("whatsapp", e.target.value.replace(/\D/g,""))} /></Field>
          <Field label="Etiqueta del hero (antes era Apple Premium Reseller)"><Input value={draft.heroTagline} onChange={e => upd("heroTagline", e.target.value)} /></Field>
          <Field label="Imagen del hero (URL — vacío usa el logo flotante)"><Input value={draft.heroImageUrl} onChange={e => upd("heroImageUrl", e.target.value)} placeholder="https://..." /></Field>
          {draft.heroImageUrl && <img src={draft.heroImageUrl} alt="" className="max-h-32 mx-auto rounded-lg border border-[var(--line)] bg-[var(--mist)] p-2" />}
          <Field label="Instagram URL"><Input value={draft.instagram} onChange={e => upd("instagram", e.target.value)} /></Field>
          <Field label="Facebook URL"><Input value={draft.facebook} onChange={e => upd("facebook", e.target.value)} /></Field>
          <Field label="Maps Link"><Input value={draft.mapsLink} onChange={e => upd("mapsLink", e.target.value)} /></Field>
          <Field label="Horario"><Input value={draft.horario} onChange={e => upd("horario", e.target.value)} /></Field>
          <Field label="Dirección"><Input value={draft.direccion} onChange={e => upd("direccion", e.target.value)} /></Field>
          <Field label="Logo URL"><Input value={draft.logoUrl} onChange={e => upd("logoUrl", e.target.value)} /></Field>
          <Field label="Favicon URL"><Input value={draft.faviconUrl} onChange={e => upd("faviconUrl", e.target.value)} /></Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="PIN cancelación (4 díg.)"><Input maxLength={4} value={draft.cancelPin} onChange={e => upd("cancelPin", e.target.value)} /></Field>
            <Field label="Contraseña admin"><Input type="password" value={draft.adminPassword} onChange={e => upd("adminPassword", e.target.value)} /></Field>
          </div>
        </div>
      </Card>

      <Card>
        <h3 className="font-display text-xl text-[var(--gold-dark)] mb-3">Textos de factura</h3>
        <div className="space-y-3">
          <Field label="Subtítulo en factura"><Input value={draft.facturaSubtitulo} onChange={e => upd("facturaSubtitulo", e.target.value)} /></Field>
          <Field label="Texto de garantía"><Textarea rows={3} value={draft.facturaGarantia} onChange={e => upd("facturaGarantia", e.target.value)} /></Field>
          <Field label="Mensaje de gracias"><Textarea rows={2} value={draft.facturaGracias} onChange={e => upd("facturaGracias", e.target.value)} /></Field>
          <Field label="Slogan"><Input value={draft.slogan} onChange={e => upd("slogan", e.target.value)} /></Field>
          <Field label="Cita de misión"><Textarea rows={2} value={draft.misionQuote} onChange={e => upd("misionQuote", e.target.value)} /></Field>
        </div>

        <div className="mt-5 border-t border-[var(--line)] pt-4">
          <div className="text-xs uppercase tracking-widest text-gray-500 mb-2">🧪 Probar factura</div>
          <Btn variant="ghost" onClick={pruebaFactura}>Generar factura de prueba</Btn>
        </div>

        <Btn onClick={save} className="w-full mt-5 py-3">💾 Guardar configuración</Btn>
        {saved && <div className="text-emerald-600 text-center mt-2 text-sm">✓ Guardado</div>}
      </Card>
    </div>
  );
}

function Locales() {
  const [cfg, setCfg] = useConfig();
  const [draft, setDraft] = useState(cfg);
  function save() { setCfg(draft); alert("✓ Locales actualizados"); }
  return (
    <Card>
      <h3 className="font-display text-xl text-[var(--gold-dark)] mb-3 flex items-center gap-2"><MapPin className="w-5 h-5" /> Gestión de locales</h3>
      <p className="text-xs text-gray-500 mb-4">Activa o desactiva un local. Los locales desactivados no aparecen en formularios de venta ni en el inventario nuevo.</p>
      {[1, 2].map(n => {
        const nombreKey = n === 1 ? "local1nombre" : "local2nombre";
        const activoKey = n === 1 ? "local1activo" : "local2activo";
        return (
          <div key={n} className="border border-[var(--line)] rounded-xl p-4 mb-3 flex items-center gap-4">
            <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-xl font-bold ${draft[activoKey] ? "bg-emerald-100 text-emerald-700" : "bg-gray-100 text-gray-400"}`}>L{n}</div>
            <div className="flex-1">
              <Field label={`Nombre del Local ${n}`}>
                <Input value={draft[nombreKey] as string} onChange={e => setDraft({ ...draft, [nombreKey]: e.target.value })} />
              </Field>
            </div>
            <label className="flex items-center gap-2 cursor-pointer select-none shrink-0">
              <input type="checkbox" checked={draft[activoKey] as boolean} onChange={e => setDraft({ ...draft, [activoKey]: e.target.checked })} className="w-5 h-5 accent-[var(--gold)]" />
              <span className={`text-xs font-bold uppercase tracking-wider ${draft[activoKey] ? "text-emerald-600" : "text-gray-400"}`}>{draft[activoKey] ? "Activo" : "Inactivo"}</span>
            </label>
          </div>
        );
      })}
      <Btn onClick={save} className="w-full mt-3">💾 Guardar locales</Btn>
    </Card>
  );
}

function Nube() {
  const [busy, setBusy] = useState(false);
  const [report, setReport] = useState<SyncReport | null>(null);
  async function run(fn: () => Promise<SyncReport>) {
    setBusy(true); setReport(null);
    setReport(await fn());
    setBusy(false);
  }
  return (
    <div className="space-y-4">
      <Card className="bg-blue-50 border-blue-200">
        <h3 className="font-display text-2xl text-blue-900 flex items-center gap-2"><Cloud className="w-6 h-6" /> Sincronización con la nube</h3>
        <p className="text-sm text-blue-900 mt-2">
          Tu base de datos está conectada a Supabase. Antes de sincronizar la primera vez:
        </p>
        <ol className="list-decimal pl-5 text-sm text-blue-900 mt-2 space-y-1">
          <li>Abre <b>supabase.com/dashboard</b> → tu proyecto → <b>SQL Editor</b></li>
          <li>Pega el contenido del archivo <code className="bg-white px-1.5 py-0.5 rounded border border-blue-200">SUPABASE_SETUP.sql</code> (está en la raíz del proyecto)</li>
          <li>Presiona <b>Run</b> (botón verde)</li>
          <li>Vuelve aquí y haz click en <b>"Subir datos locales"</b></li>
        </ol>
      </Card>

      <div className="grid md:grid-cols-2 gap-4">
        <Card>
          <h4 className="font-display text-xl flex items-center gap-2 text-emerald-700"><CloudUpload className="w-5 h-5" /> Subir a la nube</h4>
          <p className="text-xs text-gray-500 mt-1">Sube todo lo que está en este dispositivo (productos, ventas, clientes, config) a Supabase.</p>
          <Btn variant="ok" onClick={() => run(pushAllToCloud)} disabled={busy} className="w-full mt-4">
            {busy ? "Subiendo..." : "⬆️ Subir datos locales"}
          </Btn>
        </Card>
        <Card>
          <h4 className="font-display text-xl flex items-center gap-2 text-blue-700"><CloudDownload className="w-5 h-5" /> Bajar de la nube</h4>
          <p className="text-xs text-gray-500 mt-1">Reemplaza los datos locales con los que están en Supabase (útil para sincronizar entre dispositivos).</p>
          <Btn variant="ink" onClick={() => run(pullAllFromCloud)} disabled={busy} className="w-full mt-4">
            {busy ? "Bajando..." : "⬇️ Bajar de la nube"}
          </Btn>
        </Card>
      </div>

      {report && (
        <Card className={report.ok ? "bg-emerald-50 border-emerald-200" : "bg-red-50 border-red-200"}>
          <div className={`font-bold ${report.ok ? "text-emerald-800" : "text-red-800"}`}>{report.ok ? "✓" : "✗"} {report.message}</div>
          {report.details && (
            <ul className="text-xs text-gray-700 mt-2 space-y-0.5 font-mono">
              {report.details.map((d, i) => <li key={i}>{d}</li>)}
            </ul>
          )}
        </Card>
      )}
    </div>
  );
}

function Eventos() {
  const [cfg, setCfg] = useConfig();
  const [productos] = useProductos();
  const [draft, setDraft] = useState(cfg);
  const upd = <K extends keyof typeof draft>(k: K, v: typeof draft[K]) => setDraft({ ...draft, [k]: v });
  function save() { setCfg(draft); }
  const tipos: { id: EventType; label: string }[] = [
    { id: "christmas", label: "🎄 Navidad" }, { id: "halloween", label: "🎃 Halloween" },
    { id: "love", label: "💕 San Valentín" }, { id: "carnival", label: "🎭 Carnaval" },
    { id: "mothers", label: "💐 Día de la Madre" }, { id: "independence", label: "🇨🇴 Independencia" },
    { id: "newyear", label: "🎆 Año Nuevo" },
  ];
  return (
    <Card>
      <h3 className="font-display text-xl text-[var(--gold-dark)] mb-3">Configuración de evento temático</h3>
      <div className="grid md:grid-cols-2 gap-3">
        <Field label="Estado">
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={draft.eventActive} onChange={e => upd("eventActive", e.target.checked)} className="accent-[var(--gold)]" />
            <span>Activar evento</span>
          </label>
        </Field>
        <Field label="Tipo / tema">
          <Select value={draft.eventType} onChange={e => upd("eventType", e.target.value as EventType)}>
            {tipos.map(t => <option key={t.id} value={t.id}>{t.label}</option>)}
          </Select>
        </Field>
        <Field label="Nombre del evento"><Input value={draft.eventTitle} onChange={e => upd("eventTitle", e.target.value)} /></Field>
        <Field label="Subtítulo"><Input value={draft.eventSubtitle} onChange={e => upd("eventSubtitle", e.target.value)} /></Field>
        <Field label="Fecha de fin"><Input type="datetime-local" value={draft.eventEndDate} onChange={e => upd("eventEndDate", e.target.value)} /></Field>
        <Field label="Producto en promo"><Select value={draft.eventPromoProductId} onChange={e => upd("eventPromoProductId", e.target.value)}>
          <option value="">— Ninguno —</option>
          {productos.map(p => <option key={p.id} value={p.id}>{p.nombre}</option>)}
        </Select></Field>
        <Field label="Precio especial"><Input type="number" value={draft.eventPromoPrice} onChange={e => upd("eventPromoPrice", +e.target.value || 0)} /></Field>
      </div>
      <Btn onClick={save} className="mt-5 w-full">💾 Guardar evento</Btn>
    </Card>
  );
}

function Video() {
  const [cfg, setCfg] = useConfig();
  const [url, setUrl] = useState(cfg.videoUrl);
  function upload(f: File) {
    if (f.size > 10 * 1024 * 1024) {
      alert("⚠️ El archivo es muy grande (>10MB). Recomendamos usar un link de Cloudinary o YouTube.");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => setUrl(reader.result as string);
    reader.readAsDataURL(f);
  }
  function save() { setCfg({ ...cfg, videoUrl: url }); alert("✓ Guardado"); }
  return (
    <Card>
      <h3 className="font-display text-xl text-[var(--gold-dark)] mb-3">Video del index</h3>
      <Field label="URL del video (Cloudinary, MP4 directo, etc.)">
        <Input value={url} onChange={e => setUrl(e.target.value)} placeholder="https://..." />
      </Field>
      <div className="mt-2">
        <label className="inline-flex items-center gap-2 px-4 py-2 bg-[var(--mist)] border border-[var(--line)] rounded-lg text-xs cursor-pointer hover:border-[var(--gold)]">
          📁 Subir desde galería
          <input type="file" accept="video/*" className="hidden" onChange={e => e.target.files?.[0] && upload(e.target.files[0])} />
        </label>
      </div>
      {url && (
        <div className="mt-4">
          <div className="text-xs uppercase text-gray-500 mb-2">Preview</div>
          <video src={url} controls className="w-full max-w-md rounded-lg border border-[var(--line)]" />
        </div>
      )}
      <Btn onClick={save} className="mt-4">💾 Guardar video</Btn>
      {url && <Btn variant="danger" onClick={() => { setUrl(""); setCfg({ ...cfg, videoUrl: "" }); }} className="mt-4 ml-2">🗑 Quitar video</Btn>}
    </Card>
  );
}
