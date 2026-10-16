"use client";

import { useState } from "react";
import { ArrowUpRight, MapPin, Package, Sprout } from "lucide-react";
import "./investor-map.css";

// Synthetic commercial examples, deliberately unrelated to on-chain lot IDs.
const places = [
  { id: "demo-obera", town: "Oberá", province: "Misiones", name: "Cooperativa Monte Verde · ficticia", kg: 12000, bags: 240, aging: "12 meses", x: 67, y: 47 },
  { id: "demo-eldorado", town: "Eldorado", province: "Misiones", name: "Secadero Tierra Roja · ficticio", kg: 18000, bags: 360, aging: "9 meses", x: 73, y: 24 },
  { id: "demo-santo-tome", town: "Santo Tomé", province: "Corrientes", name: "Depósito Las Palmeras · ficticio", kg: 8000, bags: 160, aging: "6 meses", x: 51, y: 69 },
] as const;
const number = (value: number) => new Intl.NumberFormat("es-AR").format(value);

export function InvestorMap({ onFinancing }: { onFinancing: () => void }) {
  const [province, setProvince] = useState("Todas");
  const [selectedId, setSelectedId] = useState<string>(places[0].id);
  const visible = places.filter(place => province === "Todas" || place.province === province);
  const selected = visible.find(place => place.id === selectedId) ?? visible[0];

  if (!selected) return <p role="status">No hay ubicaciones para esta provincia.</p>;

  return <section className="investor-explore" aria-labelledby="investor-title">
    <div className="investor-hero"><div><p className="yc-eyebrow">Explorá el origen · NEA argentino</p><h2 id="investor-title">El próximo vínculo<br />empieza en el territorio.</h2><p>Conocé zonas de yerba canchada en estacionamiento y explorá cómo conectar oferta y capital.</p></div><span className="investor-seal"><Sprout size={28} aria-hidden="true" />Yerba mate<br /><strong>Misiones + Corrientes</strong></span></div>
    <div className="investor-heading"><div><h3>Mapa de oferta · demostración</h3><p>Ubicaciones orientativas por localidad. No se muestran depósitos reales ni coordenadas privadas.</p></div><div><label htmlFor="investor-province">Provincia</label><select id="investor-province" value={province} onChange={event => setProvince(event.target.value)}><option>Todas</option><option>Misiones</option><option>Corrientes</option></select></div></div>
    <p className="investor-demo" id="investor-demo-note"><strong>Ejemplos ficticios, sin ofertas de venta reales.</strong> Los kilos y el estacionamiento de este mapa son ilustrativos; no provienen de los contratos. La venta no está habilitada en el MVP.</p>
    <div className="investor-grid"><div className="investor-map" role="group" aria-label="Mapa esquemático interactivo del NEA" aria-describedby="investor-demo-note">
      <svg viewBox="0 0 600 500" preserveAspectRatio="none" aria-hidden="true"><defs><pattern id="map-grid" width="35" height="35" patternUnits="userSpaceOnUse"><path d="M 35 0 L 0 0 0 35" fill="none" stroke="currentColor" strokeWidth=".5" /></pattern></defs><rect width="600" height="500" fill="url(#map-grid)" /><path className="map-region" d="M210 475 L120 360 155 265 235 255 290 190 350 175 360 120 415 80 435 25 490 40 480 115 448 155 445 220 405 265 350 315 320 390 265 465 Z" /><path className="map-divider" d="M235 255 Q310 260 405 265" /><path className="map-river" d="M105 470 Q90 340 140 270 T330 160 Q350 80 410 15" /><path className="map-road" d="M265 445 Q315 345 365 250 T442 80" /><text x="270" y="370">CORRIENTES</text><text x="390" y="160" transform="rotate(-48 390 160)">MISIONES</text><text x="80" y="140" className="map-neighbor">PARAGUAY</text><text x="480" y="340" className="map-neighbor">BRASIL</text></svg>
      <span className="map-compass" aria-hidden="true">N ↑</span>
      {visible.map(place => <button key={place.id} className={`map-marker ${selected.id === place.id ? "selected" : ""}`} style={{ left: `${place.x}%`, top: `${place.y}%` }} aria-pressed={selected.id === place.id} aria-label={`Explorar ${place.town}, ejemplo ficticio`} onClick={() => setSelectedId(place.id)}><MapPin size={23} aria-hidden="true" /><span>{place.town}</span></button>)}
      <span className="map-caption">Mapa esquemático · sin escala · {visible.length} ejemplos</span>
    </div>
    <aside className="investor-detail" aria-label="Detalle de la ubicación seleccionada" aria-live="polite"><span className="yc-pill amber">Oferta ilustrativa · no operable</span><p className="investor-location"><MapPin size={16} aria-hidden="true" />{selected.town}, {selected.province}</p><h3>{selected.name}</h3><p>Yerba canchada · estacionamiento natural</p><div className="investor-volume"><Package size={24} aria-hidden="true" /><strong>{number(selected.kg)} <small>kg de ejemplo</small></strong></div><dl><div><dt>Bolsas de 50 kg · ejemplo</dt><dd>{selected.bags}</dd></div><div><dt>Estacionamiento ilustrativo</dt><dd>{selected.aging}</dd></div><div><dt>Precio y disponibilidad real</dt><dd>Sin confirmar</dd></div></dl><p className="yc-sub">Este ejemplo no está vinculado a un certificado ni a un préstamo. El mapa no acredita existencia, calidad ni disponibilidad de mercadería.</p><button className="yc-btn primary" onClick={onFinancing}>Ver solicitudes de Testnet<ArrowUpRight size={17} aria-hidden="true" /></button><p className="yc-sub">El financiamiento se consulta por separado con datos del contrato. No es una compra de yerba.</p></aside></div>
    <div className="investor-list" aria-label="Localidades del mapa">{visible.map(place => <button key={place.id} aria-pressed={selected.id === place.id} className={`investor-place ${selected.id === place.id ? "selected" : ""}`} onClick={() => setSelectedId(place.id)}><span><MapPin size={18} aria-hidden="true" /><strong>{place.town}</strong></span><span>{place.province} · {number(place.kg)} kg ficticios</span></button>)}</div>
  </section>;
}
