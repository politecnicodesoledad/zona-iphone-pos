import { useEffect, useState, useCallback } from "react";
import { UserPlus, KeyRound, Power, X, Loader2, Pencil } from "lucide-react";
import { ziSupabase } from "@/integrations/supabase/zi-client";
import type { Perfil } from "@/lib/zi/store";

const FN_URL = "https://nompupohkjwhzhphuonk.supabase.co/functions/v1/admin-users";

async function callAdminUsers(body: Record<string, unknown>) {
  const { data } = await ziSupabase.auth.getSession();
  const token = data.session?.access_token;
  const res = await fetch(FN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify(body),
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json.error || "Error desconocido");
  return json;
}

export function Usuarios() {
  const [perfiles, setPerfiles] = useState<Perfil[]>([]);
  const [loading, setLoading] = useState(true);
  const [showNew, setShowNew] = useState(false);
  const [pwTarget, setPwTarget] = useState<Perfil | null>(null);
  const [editTarget, setEditTarget] = useState<Perfil | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const { data } = await ziSupabase.from("zi_perfiles").select("*").order("creado_en", { ascending: false });
    setPerfiles((data as Perfil[]) ?? []);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const toggleActivo = async (p: Perfil) => {
    if (!confirm(`¿${p.activo ? "Desactivar" : "Activar"} a ${p.nombre}?`)) return;
    try {
      await callAdminUsers({ action: "toggle_active", userId: p.id, activo: !p.activo });
      load();
    } catch (e) {
      alert((e as Error).message);
    }
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-display text-xl text-[var(--ink)]">Usuarios y asesores</h2>
          <p className="text-sm text-gray-500">Cada asesor tiene su propia cuenta. Solo tú (ADMIN) puedes crearlas.</p>
        </div>
        <button onClick={() => setShowNew(true)} className="zi-btn-gold text-sm flex items-center gap-2">
          <UserPlus className="w-4 h-4" /> Nuevo asesor
        </button>
      </div>

      <div className="bg-white rounded-2xl border border-[var(--line)] overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-gray-400 text-sm flex items-center justify-center gap-2">
            <Loader2 className="w-4 h-4 animate-spin" /> Cargando usuarios…
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-[var(--mist)] text-gray-500 text-xs uppercase tracking-wide">
              <tr>
                <th className="text-left px-4 py-3">Nombre</th>
                <th className="text-left px-4 py-3 hidden sm:table-cell">Correo</th>
                <th className="text-left px-4 py-3">Rol</th>
                <th className="text-left px-4 py-3">Estado</th>
                <th className="text-right px-4 py-3">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {perfiles.map((p) => (
                <tr key={p.id} className="border-t border-[var(--line)]">
                  <td className="px-4 py-3 font-medium text-[var(--ink)]">{p.nombre} {p.apellido}</td>
                  <td className="px-4 py-3 text-gray-500 hidden sm:table-cell">{p.email}</td>
                  <td className="px-4 py-3">
                    <span className={`text-[11px] px-2 py-0.5 rounded-full font-bold ${p.rol === "admin" ? "bg-[var(--gold)]/20 text-[var(--gold-dark)]" : "bg-gray-100 text-gray-600"}`}>
                      {p.rol === "admin" ? "ADMIN" : "ASESOR"}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`text-[11px] px-2 py-0.5 rounded-full font-bold ${p.activo ? "bg-emerald-100 text-emerald-700" : "bg-red-100 text-red-600"}`}>
                      {p.activo ? "Activo" : "Inactivo"}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-2">
                      <button onClick={() => setEditTarget(p)} title="Editar nombre (el que sale en la factura)"
                              className="w-8 h-8 rounded-lg border border-[var(--line)] flex items-center justify-center hover:bg-[var(--mist)]">
                        <Pencil className="w-4 h-4 text-gray-500" />
                      </button>
                      {p.rol !== "admin" && (
                        <>
                          <button onClick={() => setPwTarget(p)} title="Cambiar PIN/contraseña"
                                  className="w-8 h-8 rounded-lg border border-[var(--line)] flex items-center justify-center hover:bg-[var(--mist)]">
                            <KeyRound className="w-4 h-4 text-gray-500" />
                          </button>
                          <button onClick={() => toggleActivo(p)} title={p.activo ? "Desactivar" : "Activar"}
                                  className={`w-8 h-8 rounded-lg border flex items-center justify-center ${p.activo ? "border-red-200 hover:bg-red-50 text-red-500" : "border-emerald-200 hover:bg-emerald-50 text-emerald-600"}`}>
                            <Power className="w-4 h-4" />
                          </button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
              {perfiles.length === 0 && (
                <tr><td colSpan={5} className="px-4 py-8 text-center text-gray-400">Aún no hay asesores creados.</td></tr>
              )}
            </tbody>
          </table>
        )}
      </div>

      {showNew && <NuevoAsesorModal onClose={() => setShowNew(false)} onCreated={() => { setShowNew(false); load(); }} />}
      {pwTarget && <CambiarPinModal perfil={pwTarget} onClose={() => setPwTarget(null)} onDone={() => setPwTarget(null)} />}
      {editTarget && <EditarNombreModal perfil={editTarget} onClose={() => setEditTarget(null)} onDone={() => { setEditTarget(null); load(); }} />}
    </div>
  );
}

function NuevoAsesorModal({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
  const [nombre, setNombre] = useState("");
  const [apellido, setApellido] = useState("");
  const [email, setEmail] = useState("");
  const [pin, setPin] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setErr("");
    try {
      await callAdminUsers({ action: "create", nombre, apellido, email: email.trim(), pin });
      onCreated();
    } catch (e2) {
      setErr((e2 as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40">
      <div className="bg-white rounded-2xl p-6 w-full max-w-sm shadow-xl relative">
        <button onClick={onClose} className="absolute right-4 top-4 text-gray-400 hover:text-gray-600"><X className="w-4 h-4" /></button>
        <h3 className="font-display text-lg text-[var(--ink)]">Nuevo asesor</h3>
        <form onSubmit={submit} className="mt-4 space-y-3">
          <div className="grid grid-cols-2 gap-2">
            <input required placeholder="Nombre" value={nombre} onChange={(e) => setNombre(e.target.value)}
                   className="px-3 py-2.5 border border-[var(--line)] rounded-xl text-sm outline-none focus:border-[var(--gold)]" />
            <input placeholder="Apellido" value={apellido} onChange={(e) => setApellido(e.target.value)}
                   className="px-3 py-2.5 border border-[var(--line)] rounded-xl text-sm outline-none focus:border-[var(--gold)]" />
          </div>
          <input required type="email" placeholder="correo@ejemplo.com" value={email} onChange={(e) => setEmail(e.target.value)}
                 className="w-full px-3 py-2.5 border border-[var(--line)] rounded-xl text-sm outline-none focus:border-[var(--gold)]" />
          <input required type="text" placeholder="PIN / contraseña (mín. 6 caracteres)" minLength={6} value={pin} onChange={(e) => setPin(e.target.value)}
                 className="w-full px-3 py-2.5 border border-[var(--line)] rounded-xl text-sm outline-none focus:border-[var(--gold)]" />
          {err && <div className="text-red-600 text-xs bg-red-50 border border-red-200 rounded-lg px-3 py-2">{err}</div>}
          <button disabled={busy} className="zi-btn-gold w-full text-sm disabled:opacity-60">
            {busy ? "Creando..." : "Crear asesor"}
          </button>
        </form>
      </div>
    </div>
  );
}

function EditarNombreModal({ perfil, onClose, onDone }: { perfil: Perfil; onClose: () => void; onDone: () => void }) {
  const [nombre, setNombre] = useState(perfil.nombre);
  const [apellido, setApellido] = useState(perfil.apellido || "");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setErr("");
    try {
      await callAdminUsers({ action: "update", userId: perfil.id, nombre, apellido });
      onDone();
    } catch (e2) {
      setErr((e2 as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40">
      <div className="bg-white rounded-2xl p-6 w-full max-w-sm shadow-xl relative">
        <button onClick={onClose} className="absolute right-4 top-4 text-gray-400 hover:text-gray-600"><X className="w-4 h-4" /></button>
        <h3 className="font-display text-lg text-[var(--ink)]">Editar nombre</h3>
        <p className="text-xs text-gray-500 mt-1">Este es el nombre que aparece en la factura como "Atendido por".</p>
        <form onSubmit={submit} className="mt-4 space-y-3">
          <div className="grid grid-cols-2 gap-2">
            <input required placeholder="Nombre" value={nombre} onChange={(e) => setNombre(e.target.value)}
                   className="px-3 py-2.5 border border-[var(--line)] rounded-xl text-sm outline-none focus:border-[var(--gold)]" />
            <input placeholder="Apellido" value={apellido} onChange={(e) => setApellido(e.target.value)}
                   className="px-3 py-2.5 border border-[var(--line)] rounded-xl text-sm outline-none focus:border-[var(--gold)]" />
          </div>
          {err && <div className="text-red-600 text-xs bg-red-50 border border-red-200 rounded-lg px-3 py-2">{err}</div>}
          <button disabled={busy} className="zi-btn-gold w-full text-sm disabled:opacity-60">
            {busy ? "Guardando..." : "Guardar nombre"}
          </button>
        </form>
      </div>
    </div>
  );
}

function CambiarPinModal({ perfil, onClose, onDone }: { perfil: Perfil; onClose: () => void; onDone: () => void }) {
  const [pin, setPin] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setErr("");
    try {
      await callAdminUsers({ action: "reset_password", userId: perfil.id, pin });
      onDone();
    } catch (e2) {
      setErr((e2 as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40">
      <div className="bg-white rounded-2xl p-6 w-full max-w-sm shadow-xl relative">
        <button onClick={onClose} className="absolute right-4 top-4 text-gray-400 hover:text-gray-600"><X className="w-4 h-4" /></button>
        <h3 className="font-display text-lg text-[var(--ink)]">Cambiar PIN de {perfil.nombre}</h3>
        <form onSubmit={submit} className="mt-4 space-y-3">
          <input required type="text" minLength={6} placeholder="Nuevo PIN / contraseña" value={pin} onChange={(e) => setPin(e.target.value)}
                 className="w-full px-3 py-2.5 border border-[var(--line)] rounded-xl text-sm outline-none focus:border-[var(--gold)]" />
          {err && <div className="text-red-600 text-xs bg-red-50 border border-red-200 rounded-lg px-3 py-2">{err}</div>}
          <button disabled={busy} className="zi-btn-gold w-full text-sm disabled:opacity-60">
            {busy ? "Guardando..." : "Guardar nuevo PIN"}
          </button>
        </form>
      </div>
    </div>
  );
}
