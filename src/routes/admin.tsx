import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { useSession } from "@/lib/zi/store";
import { AdminLogin } from "@/components/admin/AdminLogin";
import { AdminShell } from "@/components/admin/AdminShell";

export const Route = createFileRoute("/admin")({
  head: () => ({ meta: [{ title: "Admin · Zona iPhone" }, { name: "robots", content: "noindex" }] }),
  component: AdminPage,
});

function AdminPage() {
  const { authed } = useSession();
  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);
  if (!mounted) return null;
  return (
    <div className="admin-theme min-h-screen">
      {authed ? <AdminShell /> : <AdminLogin />}
    </div>
  );
}
