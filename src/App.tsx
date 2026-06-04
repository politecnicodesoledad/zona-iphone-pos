import { useEffect } from "react";
import { Helmet } from "react-helmet-async";
import { Route, Routes } from "react-router-dom";
import { Store, useCloudBoot } from "@/lib/zi/store";
import { PublicIndex } from "@/routes/index";
import { AdminPage } from "@/routes/admin";
import { ProductoPage } from "@/routes/producto.$id";

function EventTheme() {
  useEffect(() => {
    const apply = () => {
      const c = Store.config();
      document.body.classList.remove(
        "event-christmas", "event-halloween", "event-love", "event-carnival",
        "event-mothers", "event-independence", "event-newyear",
      );
      if (c.eventActive && c.eventType) document.body.classList.add("event-" + c.eventType);
    };
    apply();
    window.addEventListener("storage", apply);
    return () => window.removeEventListener("storage", apply);
  }, []);
  return null;
}

function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-[var(--ink)] text-white p-4">
      <div className="text-center">
        <h1 className="font-display text-7xl text-[var(--gold)]">404</h1>
        <p className="mt-2 text-sm text-gray-300">Página no encontrada</p>
        <a href="/" className="mt-4 inline-block text-[var(--gold)] underline">Volver al inicio</a>
      </div>
    </div>
  );
}

export default function App() {
  useCloudBoot();
  const cfg = Store.config();
  return (
    <>
      <Helmet>
        <html lang="es" />
        <title>Zona iPhone — Celulares & Accesorios Apple en Barranquilla</title>
        <meta name="description" content="Tienda Apple en Barranquilla: iPhone, iPad, MacBook y accesorios. Crédito, recibimos tu celular como pago. San Andresito El Pupi L23." />
        <meta property="og:title" content="Zona iPhone — Celulares & Accesorios Apple en Barranquilla" />
        <meta property="og:description" content="Tienda Apple en Barranquilla: iPhone, iPad, MacBook y accesorios. Crédito, recibimos tu celular como pago." />
        <meta property="og:type" content="website" />
        <meta name="twitter:card" content="summary_large_image" />
        <link rel="icon" href={cfg.faviconUrl || "https://i.ibb.co/1fkNNh5s/favicon-Zona-Iphone.png"} />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Bebas+Neue&family=Montserrat:wght@400;600;700;900&display=swap" />
      </Helmet>
      <EventTheme />
      <Routes>
        <Route path="/" element={<PublicIndex />} />
        <Route path="/pos" element={<AdminPage />} />
        <Route path="/producto/:id" element={<ProductoPage />} />
        <Route path="*" element={<NotFound />} />
      </Routes>
    </>
  );
}