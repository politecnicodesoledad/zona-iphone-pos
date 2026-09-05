// Reconocimiento de clientes recurrentes.
//
// No existe una tabla aparte de "clientes" con un ID propio — cada venta ya
// trae los datos del cliente (nombre, cédula, teléfono, dirección) dentro de
// sí misma. Un mismo cliente se reconoce por su cédula o su teléfono (lo que
// haya), y si no hay ninguno de los dos, por el nombre exacto. Esta es la
// MISMA regla que usa la pantalla "Clientes" para armar el historial — por
// eso, en cuanto guardas una venta con la misma cédula/teléfono de alguien
// que ya compró, esa venta cae automáticamente bajo su mismo historial sin
// necesidad de nada más.
import type { Venta } from "./types";

export type ClienteAgregado = {
  key: string;
  nombre: string;
  cedula?: string;
  telefono?: string;
  direccion?: string;
  compras: Venta[];
  total: number;
  empresasCredito: string[];
  ultimaCompra: number;
};

function norm(s?: string) { return (s || "").trim().toLowerCase(); }

export function claveCliente(c?: { nombre?: string; cedula?: string; telefono?: string } | null): string | null {
  if (!c) return null;
  return norm(c.cedula) || norm(c.telefono) || norm(c.nombre) || null;
}

export function agregarClientes(ventas: Venta[]): ClienteAgregado[] {
  const map = new Map<string, ClienteAgregado>();
  [...ventas].filter(v => !v.cancelada).sort((a, b) => a.fecha - b.fecha).forEach(v => {
    const key = claveCliente(v.cliente);
    if (!key || !v.cliente) return;
    const cur = map.get(key) || {
      key, nombre: v.cliente.nombre, cedula: v.cliente.cedula, telefono: v.cliente.telefono,
      direccion: v.cliente.direccion, compras: [], total: 0, empresasCredito: [], ultimaCompra: 0,
    };
    cur.nombre = v.cliente.nombre || cur.nombre;
    cur.cedula = v.cliente.cedula || cur.cedula;
    cur.telefono = v.cliente.telefono || cur.telefono;
    cur.direccion = v.cliente.direccion || cur.direccion;
    cur.compras.push(v);
    cur.total += v.total;
    cur.ultimaCompra = Math.max(cur.ultimaCompra, v.fecha);
    if (v.tipo === "credito" && v.empresaCredito && !cur.empresasCredito.includes(v.empresaCredito)) {
      cur.empresasCredito.push(v.empresaCredito);
    }
    map.set(key, cur);
  });
  return [...map.values()].sort((a, b) => b.ultimaCompra - a.ultimaCompra);
}

// Busca un cliente ya existente mientras se está armando una venta nueva.
// Prioriza cédula (el dato más confiable), luego teléfono, y de último el
// nombre exacto (el menos confiable — dos personas pueden llamarse igual).
export function buscarClienteExistente(
  ventas: Venta[],
  datos: { cedula?: string; telefono?: string; nombre?: string }
): ClienteAgregado | null {
  const cedula = norm(datos.cedula), telefono = norm(datos.telefono), nombre = norm(datos.nombre);
  if (!cedula && !telefono && !nombre) return null;
  const clientes = agregarClientes(ventas);
  if (cedula) { const m = clientes.find(c => norm(c.cedula) === cedula); if (m) return m; }
  if (telefono) { const m = clientes.find(c => norm(c.telefono) === telefono); if (m) return m; }
  if (nombre && !cedula && !telefono) { const m = clientes.find(c => norm(c.nombre) === nombre); if (m) return m; }
  return null;
}
