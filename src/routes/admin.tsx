import { useSession } from "@/lib/zi/store";
import { AdminLogin } from "@/components/admin/AdminLogin";
import { AdminShell } from "@/components/admin/AdminShell";

export function AdminPage() {
  const { authed, loading } = useSession();
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center text-sm text-gray-400">
        Cargando…
      </div>
    );
  }
  return (
    <div className="admin-theme min-h-screen">
      {authed ? <AdminShell /> : <AdminLogin />}
    </div>
  );
}
