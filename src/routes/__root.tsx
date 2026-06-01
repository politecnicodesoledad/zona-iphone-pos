import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet, createRootRouteWithContext, HeadContent, Scripts,
} from "@tanstack/react-router";
import { useEffect, type ReactNode } from "react";
import appCss from "../styles.css?url";
import { Store } from "../lib/zi/store";

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: () => {
    const cfg = typeof window !== "undefined" ? Store.config() : null;
    return {
      meta: [
        { charSet: "utf-8" },
        { name: "viewport", content: "width=device-width, initial-scale=1" },
        { title: "Zona iPhone — Celulares & Accesorios Apple en Barranquilla" },
        { name: "description", content: "Tienda Apple en Barranquilla: iPhone, iPad, MacBook y accesorios. Crédito, recibimos tu celular como pago. San Andresito El Pupi L23." },
        { property: "og:title", content: "Zona iPhone — Barranquilla" },
        { property: "og:description", content: "Tu tienda Apple de confianza en Barranquilla." },
      ],
      links: [
        { rel: "stylesheet", href: appCss },
        { rel: "icon", href: cfg?.faviconUrl || "https://i.ibb.co/1fkNNh5s/favicon-Zona-Iphone.png" },
        { rel: "preconnect", href: "https://fonts.googleapis.com" },
        { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
        { rel: "stylesheet", href: "https://fonts.googleapis.com/css2?family=Bebas+Neue&family=Montserrat:wght@400;600;700;900&display=swap" },
      ],
    };
  },
  shellComponent: ({ children }: { children: ReactNode }) => (
    <html lang="es">
      <head><HeadContent /></head>
      <body>{children}<Scripts /></body>
    </html>
  ),
  component: RootComponent,
  notFoundComponent: () => (
    <div className="min-h-screen flex items-center justify-center bg-black text-white">
      <div className="text-center">
        <h1 className="font-display text-7xl text-[var(--gold)]">404</h1>
        <p className="mt-2 text-sm">Página no encontrada</p>
        <a href="/" className="mt-4 inline-block text-[var(--gold)] underline">Volver al inicio</a>
      </div>
    </div>
  ),
  errorComponent: ({ error }) => (
    <div className="min-h-screen flex items-center justify-center bg-black text-white p-4">
      <div className="text-center max-w-md">
        <h1 className="font-display text-3xl text-[var(--gold)]">Algo falló</h1>
        <p className="mt-2 text-sm text-gray-400">{String(error?.message || error)}</p>
        <a href="/" className="mt-4 inline-block text-[var(--gold)] underline">Reintentar</a>
      </div>
    </div>
  ),
});

function RootComponent() {
  const { queryClient } = Route.useRouteContext();
  // event theme on body
  useEffect(() => {
    const apply = () => {
      const c = Store.config();
      document.body.classList.remove(
        "event-christmas","event-halloween","event-love","event-carnival",
        "event-mothers","event-independence","event-newyear");
      if (c.eventActive && c.eventType) document.body.classList.add("event-" + c.eventType);
    };
    apply();
    window.addEventListener("storage", apply);
    return () => window.removeEventListener("storage", apply);
  }, []);
  return (
    <QueryClientProvider client={queryClient}>
      <Outlet />
    </QueryClientProvider>
  );
}
