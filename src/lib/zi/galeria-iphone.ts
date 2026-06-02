// Galería curada de fotos de iPhone. URLs públicas de CDN.
// Permite al admin elegir foto sin tener que subir/tomar una.
export interface GaleriaItem {
  modelo: string;       // "iPhone 15 Pro"
  color: string;        // "Titanio Natural"
  url: string;          // imagen
  category?: string;    // agrupación visual
}

export const GALERIA_IPHONE: GaleriaItem[] = [
  // iPhone 16
  { modelo: "iPhone 16 Pro Max", color: "Titanio Desierto", url: "https://store.storeimages.cdn-apple.com/4982/as-images.apple.com/is/iphone-16-pro-finish-select-202409-6-9inch-deserttitanium?wid=5120&hei=2880&fmt=webp&qlt=70&.v=1723871708541" },
  { modelo: "iPhone 16 Pro Max", color: "Titanio Natural",  url: "https://store.storeimages.cdn-apple.com/4982/as-images.apple.com/is/iphone-16-pro-finish-select-202409-6-9inch-naturaltitanium?wid=5120&hei=2880&fmt=webp&qlt=70&.v=1723871708541" },
  { modelo: "iPhone 16 Pro Max", color: "Titanio Blanco",   url: "https://store.storeimages.cdn-apple.com/4982/as-images.apple.com/is/iphone-16-pro-finish-select-202409-6-9inch-whitetitanium?wid=5120&hei=2880&fmt=webp&qlt=70&.v=1723871708541" },
  { modelo: "iPhone 16 Pro Max", color: "Titanio Negro",    url: "https://store.storeimages.cdn-apple.com/4982/as-images.apple.com/is/iphone-16-pro-finish-select-202409-6-9inch-blacktitanium?wid=5120&hei=2880&fmt=webp&qlt=70&.v=1723871708541" },
  { modelo: "iPhone 16 Pro",     color: "Titanio Desierto", url: "https://store.storeimages.cdn-apple.com/4982/as-images.apple.com/is/iphone-16-pro-finish-select-202409-6-3inch-deserttitanium?wid=5120&hei=2880&fmt=webp&qlt=70&.v=1723871708541" },
  { modelo: "iPhone 16",         color: "Ultramarino",      url: "https://store.storeimages.cdn-apple.com/4982/as-images.apple.com/is/iphone-16-finish-select-202409-6-1inch-ultramarine?wid=5120&hei=2880&fmt=webp&qlt=70&.v=1723871436825" },
  { modelo: "iPhone 16",         color: "Verde Azulado",    url: "https://store.storeimages.cdn-apple.com/4982/as-images.apple.com/is/iphone-16-finish-select-202409-6-1inch-teal?wid=5120&hei=2880&fmt=webp&qlt=70&.v=1723871436825" },
  { modelo: "iPhone 16",         color: "Rosa",             url: "https://store.storeimages.cdn-apple.com/4982/as-images.apple.com/is/iphone-16-finish-select-202409-6-1inch-pink?wid=5120&hei=2880&fmt=webp&qlt=70&.v=1723871436825" },
  { modelo: "iPhone 16",         color: "Blanco",           url: "https://store.storeimages.cdn-apple.com/4982/as-images.apple.com/is/iphone-16-finish-select-202409-6-1inch-white?wid=5120&hei=2880&fmt=webp&qlt=70&.v=1723871436825" },
  { modelo: "iPhone 16",         color: "Negro",            url: "https://store.storeimages.cdn-apple.com/4982/as-images.apple.com/is/iphone-16-finish-select-202409-6-1inch-black?wid=5120&hei=2880&fmt=webp&qlt=70&.v=1723871436825" },

  // iPhone 15
  { modelo: "iPhone 15 Pro Max", color: "Titanio Natural",  url: "https://store.storeimages.cdn-apple.com/4982/as-images.apple.com/is/iphone-15-pro-finish-select-202309-6-7inch-naturaltitanium?wid=5120&hei=2880&fmt=p-jpg&qlt=80&.v=1693009279096" },
  { modelo: "iPhone 15 Pro Max", color: "Titanio Azul",     url: "https://store.storeimages.cdn-apple.com/4982/as-images.apple.com/is/iphone-15-pro-finish-select-202309-6-7inch-bluetitanium?wid=5120&hei=2880&fmt=p-jpg&qlt=80&.v=1693009279096" },
  { modelo: "iPhone 15 Pro Max", color: "Titanio Blanco",   url: "https://store.storeimages.cdn-apple.com/4982/as-images.apple.com/is/iphone-15-pro-finish-select-202309-6-7inch-whitetitanium?wid=5120&hei=2880&fmt=p-jpg&qlt=80&.v=1693009279096" },
  { modelo: "iPhone 15 Pro Max", color: "Titanio Negro",    url: "https://store.storeimages.cdn-apple.com/4982/as-images.apple.com/is/iphone-15-pro-finish-select-202309-6-7inch-blacktitanium?wid=5120&hei=2880&fmt=p-jpg&qlt=80&.v=1693009279096" },
  { modelo: "iPhone 15 Pro",     color: "Titanio Natural",  url: "https://store.storeimages.cdn-apple.com/4982/as-images.apple.com/is/iphone-15-pro-finish-select-202309-6-1inch-naturaltitanium?wid=5120&hei=2880&fmt=p-jpg&qlt=80&.v=1693009279096" },
  { modelo: "iPhone 15",         color: "Rosa",             url: "https://store.storeimages.cdn-apple.com/4982/as-images.apple.com/is/iphone-15-finish-select-202309-6-1inch-pink?wid=5120&hei=2880&fmt=p-jpg&qlt=80&.v=1692845702708" },
  { modelo: "iPhone 15",         color: "Amarillo",         url: "https://store.storeimages.cdn-apple.com/4982/as-images.apple.com/is/iphone-15-finish-select-202309-6-1inch-yellow?wid=5120&hei=2880&fmt=p-jpg&qlt=80&.v=1692845702708" },
  { modelo: "iPhone 15",         color: "Verde",            url: "https://store.storeimages.cdn-apple.com/4982/as-images.apple.com/is/iphone-15-finish-select-202309-6-1inch-green?wid=5120&hei=2880&fmt=p-jpg&qlt=80&.v=1692845702708" },
  { modelo: "iPhone 15",         color: "Azul",             url: "https://store.storeimages.cdn-apple.com/4982/as-images.apple.com/is/iphone-15-finish-select-202309-6-1inch-blue?wid=5120&hei=2880&fmt=p-jpg&qlt=80&.v=1692845702708" },
  { modelo: "iPhone 15",         color: "Negro",            url: "https://store.storeimages.cdn-apple.com/4982/as-images.apple.com/is/iphone-15-finish-select-202309-6-1inch-black?wid=5120&hei=2880&fmt=p-jpg&qlt=80&.v=1692845702708" },

  // iPhone 14
  { modelo: "iPhone 14 Pro Max", color: "Morado Oscuro",    url: "https://store.storeimages.cdn-apple.com/4982/as-images.apple.com/is/iphone-14-pro-finish-select-202209-6-7inch-deeppurple?wid=5120&hei=2880&fmt=p-jpg&qlt=80&.v=1663703841896" },
  { modelo: "iPhone 14 Pro",     color: "Negro Espacial",   url: "https://store.storeimages.cdn-apple.com/4982/as-images.apple.com/is/iphone-14-pro-finish-select-202209-6-1inch-spaceblack?wid=5120&hei=2880&fmt=p-jpg&qlt=80&.v=1663703841896" },
  { modelo: "iPhone 14 Pro",     color: "Plata",            url: "https://store.storeimages.cdn-apple.com/4982/as-images.apple.com/is/iphone-14-pro-finish-select-202209-6-1inch-silver?wid=5120&hei=2880&fmt=p-jpg&qlt=80&.v=1663703841896" },
  { modelo: "iPhone 14 Pro",     color: "Dorado",           url: "https://store.storeimages.cdn-apple.com/4982/as-images.apple.com/is/iphone-14-pro-finish-select-202209-6-1inch-gold?wid=5120&hei=2880&fmt=p-jpg&qlt=80&.v=1663703841896" },
  { modelo: "iPhone 14",         color: "Azul",             url: "https://store.storeimages.cdn-apple.com/4982/as-images.apple.com/is/iphone-14-finish-select-202209-6-1inch-blue?wid=5120&hei=2880&fmt=p-jpg&qlt=80&.v=1660754185555" },
  { modelo: "iPhone 14",         color: "Morado",           url: "https://store.storeimages.cdn-apple.com/4982/as-images.apple.com/is/iphone-14-finish-select-202209-6-1inch-purple?wid=5120&hei=2880&fmt=p-jpg&qlt=80&.v=1660754185555" },
  { modelo: "iPhone 14",         color: "Medianoche",       url: "https://store.storeimages.cdn-apple.com/4982/as-images.apple.com/is/iphone-14-finish-select-202209-6-1inch-midnight?wid=5120&hei=2880&fmt=p-jpg&qlt=80&.v=1660754185555" },
  { modelo: "iPhone 14",         color: "Blanco Estrella",  url: "https://store.storeimages.cdn-apple.com/4982/as-images.apple.com/is/iphone-14-finish-select-202209-6-1inch-starlight?wid=5120&hei=2880&fmt=p-jpg&qlt=80&.v=1660754185555" },

  // iPhone 13
  { modelo: "iPhone 13 Pro Max", color: "Azul Sierra",      url: "https://store.storeimages.cdn-apple.com/4982/as-images.apple.com/is/iphone-13-pro-finish-select-202109-6-7inch-sierrablue?wid=5120&hei=2880&fmt=p-jpg&qlt=80&.v=1645572315638" },
  { modelo: "iPhone 13 Pro",     color: "Grafito",          url: "https://store.storeimages.cdn-apple.com/4982/as-images.apple.com/is/iphone-13-pro-finish-select-202109-6-1inch-graphite?wid=5120&hei=2880&fmt=p-jpg&qlt=80&.v=1645572315638" },
  { modelo: "iPhone 13",         color: "Medianoche",       url: "https://store.storeimages.cdn-apple.com/4982/as-images.apple.com/is/iphone-13-finish-select-202207-6-1inch-midnight?wid=5120&hei=2880&fmt=p-jpg&qlt=80&.v=1656368321392" },
  { modelo: "iPhone 13",         color: "Verde",            url: "https://store.storeimages.cdn-apple.com/4982/as-images.apple.com/is/iphone-13-finish-select-202207-6-1inch-green?wid=5120&hei=2880&fmt=p-jpg&qlt=80&.v=1656368321392" },
  { modelo: "iPhone 13",         color: "Rosa",             url: "https://store.storeimages.cdn-apple.com/4982/as-images.apple.com/is/iphone-13-finish-select-202207-6-1inch-pink?wid=5120&hei=2880&fmt=p-jpg&qlt=80&.v=1656368321392" },

  // iPhone 12
  { modelo: "iPhone 12 Pro Max", color: "Azul Pacífico",    url: "https://store.storeimages.cdn-apple.com/4982/as-images.apple.com/is/iphone-12-pro-finish-select-202010-6-7inch-pacificblue?wid=5120&hei=2880&fmt=p-jpg&qlt=80&.v=1604021661000" },
  { modelo: "iPhone 12",         color: "Azul",             url: "https://store.storeimages.cdn-apple.com/4982/as-images.apple.com/is/iphone-12-finish-select-202207-6-1inch-blue?wid=5120&hei=2880&fmt=p-jpg&qlt=80&.v=1656527906214" },
  { modelo: "iPhone 12",         color: "Verde",            url: "https://store.storeimages.cdn-apple.com/4982/as-images.apple.com/is/iphone-12-finish-select-202207-6-1inch-green?wid=5120&hei=2880&fmt=p-jpg&qlt=80&.v=1656527906214" },
  { modelo: "iPhone 12",         color: "Rojo (PRODUCT)",   url: "https://store.storeimages.cdn-apple.com/4982/as-images.apple.com/is/iphone-12-finish-select-202207-6-1inch-red?wid=5120&hei=2880&fmt=p-jpg&qlt=80&.v=1656527906214" },

  // iPhone 11
  { modelo: "iPhone 11 Pro Max", color: "Verde Noche",      url: "https://store.storeimages.cdn-apple.com/4982/as-images.apple.com/is/iphone-11-pro-finish-select-201909-6-5inch-midnightgreen?wid=5120&hei=2880&fmt=p-jpg&qlt=80&.v=1567022300611" },
  { modelo: "iPhone 11",         color: "Negro",            url: "https://store.storeimages.cdn-apple.com/4982/as-images.apple.com/is/iphone-11-select-2019-family?wid=5120&hei=2880&fmt=p-jpg&qlt=80&.v=1568332190788" },
];

export function listarModelos(): string[] {
  return Array.from(new Set(GALERIA_IPHONE.map(g => g.modelo)));
}
