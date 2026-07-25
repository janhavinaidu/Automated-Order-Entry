import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useQuery } from '@tanstack/react-query';
import {
  Truck, Package, CheckCircle2, Clock, MapPin,
  X, User, Navigation, ArrowRight, Box
} from 'lucide-react';
import { api } from '../lib/api';
import type { ApiResponse } from '../lib/api';

// ─── Data ─────────────────────────────────────────────────────────────────────
type ShipStatus = 'picked_up' | 'in_transit' | 'out_for_delivery' | 'delivered';

interface Shipment {
  id: string;
  orderId: string;
  customer: string;
  courier: string;
  tracking: string;
  status: ShipStatus;
  step: number;
  agent: { name: string; id: string };
  from: { city: string; coords: [number, number] };
  to:   { city: string; coords: [number, number] };
  current: { city: string; coords: [number, number] };
  eta: string;
}

function getCityCoords(cityName: string): [number, number] {
  const norm = cityName.toLowerCase().trim();
  if (norm.includes('mumbai')) return [82, 278];
  if (norm.includes('pune')) return [100, 292];
  if (norm.includes('bangalore') || norm.includes('bengaluru')) return [192, 385];
  if (norm.includes('chennai')) return [278, 390];
  if (norm.includes('hyderabad')) return [218, 328];
  if (norm.includes('kolkata')) return [348, 212];
  if (norm.includes('ahmedabad')) return [98, 200];
  if (norm.includes('jaipur')) return [170, 148];
  if (norm.includes('lucknow')) return [268, 138];
  if (norm.includes('kochi') || norm.includes('cochin')) return [170, 435];
  if (norm.includes('nagpur')) return [218, 262];
  if (norm.includes('bhubaneswar')) return [318, 285];
  if (norm.includes('delhi')) return [225, 105];
  if (norm.includes('coimbatore')) return [210, 415];
  if (norm.includes('vadodara') || norm.includes('baroda')) return [90, 220];
  return [218, 262]; // Nagpur center default
}

const MOCK_AGENTS = [
  { name: 'Ravi Kumar', id: 'AGT-112' },
  { name: 'Priya Sharma', id: 'AGT-089' },
  { name: 'Arjun Patel', id: 'AGT-204' },
  { name: 'Sanjay Mehta', id: 'AGT-178' },
  { name: 'Meera Nair', id: 'AGT-321' },
  { name: 'Vikram Singh', id: 'AGT-095' },
];

function getAgent(shipmentId: string) {
  const code = shipmentId.charCodeAt(0) + shipmentId.charCodeAt(shipmentId.length - 1);
  return MOCK_AGENTS[code % MOCK_AGENTS.length];
}

function mapDbShipmentToFrontend(dbShip: any): Shipment {
  let mappedStatus: ShipStatus = 'picked_up';
  if (dbShip.status === 'IN_TRANSIT') {
    const code = dbShip.id.charCodeAt(dbShip.id.length - 1);
    mappedStatus = code % 2 === 0 ? 'out_for_delivery' : 'in_transit';
  } else if (dbShip.status === 'DELIVERED') {
    mappedStatus = 'delivered';
  } else if (dbShip.status === 'RETURNED') {
    mappedStatus = 'delivered';
  }

  const step = mappedStatus === 'picked_up' ? 0 : mappedStatus === 'in_transit' ? 1 : mappedStatus === 'out_for_delivery' ? 2 : 3;

  const toCity = dbShip.order?.customer?.city || 'Delhi';
  const toCoords = getCityCoords(toCity);
  const fromCity = toCity.toLowerCase().trim() === 'mumbai' ? 'Delhi' : 'Mumbai';
  const fromCoords = getCityCoords(fromCity);

  let currentCity = fromCity;
  let currentCoords = fromCoords;
  if (step === 3) {
    currentCity = toCity;
    currentCoords = toCoords;
  } else if (step === 1) {
    currentCity = 'In Transit';
    currentCoords = [Math.round((fromCoords[0] + toCoords[0]) / 2), Math.round((fromCoords[1] + toCoords[1]) / 2)];
  } else if (step === 2) {
    currentCity = `${toCity} Area`;
    currentCoords = [
      Math.round(fromCoords[0] + (toCoords[0] - fromCoords[0]) * 0.8),
      Math.round(fromCoords[1] + (toCoords[1] - fromCoords[1]) * 0.8)
    ];
  }

  let eta = '3 days';
  if (dbShip.status === 'DELIVERED') {
    eta = 'Delivered';
  } else if (dbShip.order?.deliveryDate) {
    eta = new Date(dbShip.order.deliveryDate).toLocaleDateString('en-IN', { month: 'short', day: 'numeric' });
  }

  return {
    id: `SHP-${dbShip.order?.orderNumber?.replace(/\D/g, '') || dbShip.id.slice(0, 4)}`,
    orderId: dbShip.order?.orderNumber || 'OP-ORDER',
    customer: dbShip.order?.customer?.company || dbShip.order?.customer?.name || 'Customer',
    courier: dbShip.carrier || 'FedEx',
    tracking: dbShip.awbNumber || 'N/A',
    status: mappedStatus,
    step,
    agent: getAgent(dbShip.id),
    from: { city: fromCity, coords: fromCoords },
    to: { city: toCity, coords: toCoords },
    current: { city: currentCity, coords: currentCoords },
    eta,
  };
}

const fallbackShipments: Shipment[] = [
  {
    id: 'SHP-7712', orderId: 'ORD-4819', customer: 'Contoso Ltd',
    courier: 'FedEx', tracking: '778291023421',
    status: 'in_transit', step: 1,
    agent: { name: 'Ravi Kumar', id: 'AGT-112' },
    from:    { city: 'Mumbai',   coords: [82, 278] },
    to:      { city: 'Delhi',    coords: [225, 105] },
    current: { city: 'Ahmedabad, Gujarat', coords: [98, 200] },
    eta: 'Jun 30, 2pm',
  },
  {
    id: 'SHP-7711', orderId: 'ORD-4817', customer: 'Litware Corp',
    courier: 'UPS', tracking: '1Z999AA10123456784',
    status: 'delivered', step: 3,
    agent: { name: 'Priya Sharma', id: 'AGT-089' },
    from:    { city: 'Bangalore', coords: [192, 385] },
    to:      { city: 'Chennai',   coords: [278, 390] },
    current: { city: 'Chennai, Tamil Nadu', coords: [278, 390] },
    eta: 'Delivered',
  },
  {
    id: 'SHP-7710', orderId: 'ORD-4816', customer: 'Fabrikam Inc',
    courier: 'BlueDart', tracking: 'BD4821036754',
    status: 'out_for_delivery', step: 2,
    agent: { name: 'Arjun Patel', id: 'AGT-204' },
    from:    { city: 'Pune',      coords: [100, 292] },
    to:      { city: 'Hyderabad', coords: [218, 328] },
    current: { city: 'Solapur, Maharashtra', coords: [155, 310] },
    eta: 'Jul 1, 10am',
  },
  {
    id: 'SHP-7709', orderId: 'ORD-4815', customer: 'Northwind Traders',
    courier: 'Delhivery', tracking: 'DLV9987234561',
    status: 'out_for_delivery', step: 2,
    agent: { name: 'Sanjay Mehta', id: 'AGT-178' },
    from:    { city: 'Delhi',   coords: [225, 105] },
    to:      { city: 'Lucknow', coords: [268, 138] },
    current: { city: 'Aligarh, Uttar Pradesh', coords: [248, 120] },
    eta: 'Jun 30, 5pm',
  },
  {
    id: 'SHP-7708', orderId: 'ORD-4814', customer: 'Tailspin Toys',
    courier: 'FedEx', tracking: '778291056789',
    status: 'picked_up', step: 0,
    agent: { name: 'Meera Nair', id: 'AGT-321' },
    from:    { city: 'Kochi',     coords: [170, 435] },
    to:      { city: 'Bangalore', coords: [192, 385] },
    current: { city: 'Kochi, Kerala', coords: [170, 435] },
    eta: 'Jul 2, 12pm',
  },
  {
    id: 'SHP-7707', orderId: 'ORD-4813', customer: 'Adventure Works',
    courier: 'BlueDart', tracking: 'BD7721045890',
    status: 'out_for_delivery', step: 2,
    agent: { name: 'Vikram Singh', id: 'AGT-095' },
    from:    { city: 'Kolkata',   coords: [348, 212] },
    to:      { city: 'Bhubaneswar', coords: [318, 285] },
    current: { city: 'Kharagpur, West Bengal', coords: [335, 248] },
    eta: 'Jun 30, 11am',
  },
];

const STEPS = ['Picked Up', 'In Transit', 'Out for Delivery', 'Delivered'];

const statusCfg: Record<ShipStatus, { label: string; cls: string; color: string }> = {
  picked_up:        { label: 'Picked Up',        cls: 'badge badge-muted',   color: '#6B7280' },
  in_transit:       { label: 'In Transit',        cls: 'badge badge-indigo',  color: '#6366F1' },
  out_for_delivery: { label: 'Out for Delivery',  cls: 'badge badge-amber',   color: '#F59E0B' },
  delivered:        { label: 'Delivered',         cls: 'badge badge-green',   color: '#10B981' },
};

const courierColor: Record<string, string> = {
  FedEx:     '#6366F1',
  UPS:       '#F59E0B',
  BlueDart:  '#EF4444',
  Delhivery: '#10B981',
};

// ─── India SVG Map ────────────────────────────────────────────────────────────
const INDIA_PATH = `
  M 128,22 L 175,10 L 228,14 L 278,20 L 318,38 L 358,52
  L 400,80 L 428,118 L 438,155 L 428,188 L 408,212
  L 395,238 L 400,268 L 390,300 L 372,338 L 348,372
  L 312,402 L 278,432 L 250,458 L 222,478 L 198,490
  L 178,478 L 152,458 L 125,430 L 100,398 L 80,360
  L 65,322 L 55,282 L 52,242 L 58,205 L 62,170
  L 52,138 L 58,108 L 75,82 L 102,60 L 128,40
  Z
`;

// Major city dots (background reference)
const cities = [
  { name: 'Delhi',      x: 225, y: 105 },
  { name: 'Mumbai',     x: 82,  y: 278 },
  { name: 'Bangalore',  x: 192, y: 385 },
  { name: 'Chennai',    x: 278, y: 390 },
  { name: 'Hyderabad',  x: 218, y: 328 },
  { name: 'Kolkata',    x: 348, y: 212 },
  { name: 'Pune',       x: 100, y: 292 },
  { name: 'Ahmedabad',  x: 98,  y: 200 },
  { name: 'Jaipur',     x: 170, y: 148 },
  { name: 'Lucknow',    x: 268, y: 138 },
  { name: 'Kochi',      x: 170, y: 435 },
  { name: 'Nagpur',     x: 218, y: 262 },
  { name: 'Bhubaneswar',x: 318, y: 285 },
];

function IndiaMap({ shipments, onPinClick, selectedPin }: {
  shipments: Shipment[];
  onPinClick: (s: Shipment | null) => void;
  selectedPin: Shipment | null;
}) {
  const activeShipments = shipments.filter(s => s.status !== 'delivered');

  return (
    <svg
      viewBox="0 0 480 520"
      style={{ width: '100%', height: '100%', overflow: 'visible' }}
      onClick={() => onPinClick(null)}
    >
      <defs>
        {/* Map gradient */}
        <linearGradient id="mapBg" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#13161f" />
          <stop offset="100%" stopColor="#0d0f16" />
        </linearGradient>
        {/* India fill */}
        <linearGradient id="indiaFill" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#1a1e2e" />
          <stop offset="100%" stopColor="#161926" />
        </linearGradient>
        {/* Glow filter */}
        <filter id="glow" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="3" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
        <filter id="glowStrong" x="-80%" y="-80%" width="260%" height="260%">
          <feGaussianBlur stdDeviation="5" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
        {/* Grid pattern */}
        <pattern id="grid" width="30" height="30" patternUnits="userSpaceOnUse">
          <path d="M 30 0 L 0 0 0 30" fill="none" stroke="rgba(255,255,255,0.025)" strokeWidth="0.5" />
        </pattern>
      </defs>

      {/* Background */}
      <rect width="480" height="520" fill="url(#mapBg)" rx="14" />
      <rect width="480" height="520" fill="url(#grid)" rx="14" />

      {/* India outline */}
      <path
        d={INDIA_PATH}
        fill="url(#indiaFill)"
        stroke="rgba(99,102,241,0.18)"
        strokeWidth="1.2"
      />

      {/* City reference dots */}
      {cities.map(city => (
        <g key={city.name}>
          <circle cx={city.x} cy={city.y} r={1.8} fill="rgba(255,255,255,0.12)" />
          <text x={city.x + 4} y={city.y + 4} fontSize="7" fill="rgba(255,255,255,0.15)" fontFamily="Inter,sans-serif">{city.name}</text>
        </g>
      ))}

      {/* Route lines for active shipments */}
      {activeShipments.map(s => (
        <g key={s.id + '-route'}>
          {/* Dashed route line from→to */}
          <line
            x1={s.from.coords[0]} y1={s.from.coords[1]}
            x2={s.to.coords[0]}   y2={s.to.coords[1]}
            stroke={statusCfg[s.status].color}
            strokeWidth="1"
            strokeDasharray="4 4"
            strokeOpacity="0.3"
          />
          {/* Traveled portion: from→current */}
          <line
            x1={s.from.coords[0]}    y1={s.from.coords[1]}
            x2={s.current.coords[0]} y2={s.current.coords[1]}
            stroke={statusCfg[s.status].color}
            strokeWidth="1.5"
            strokeOpacity="0.7"
          />
          {/* Origin dot */}
          <circle
            cx={s.from.coords[0]} cy={s.from.coords[1]}
            r={3.5}
            fill={statusCfg[s.status].color}
            opacity={0.5}
          />
          {/* Destination dot */}
          <circle
            cx={s.to.coords[0]} cy={s.to.coords[1]}
            r={3.5}
            fill={statusCfg[s.status].color}
            opacity={0.4}
            strokeDasharray="2 2"
            stroke={statusCfg[s.status].color}
            strokeWidth="1"
          />
        </g>
      ))}

      {/* Delivered shipments – faint line */}
      {shipments.filter(s => s.status === 'delivered').map(s => (
        <line
          key={s.id + '-done'}
          x1={s.from.coords[0]} y1={s.from.coords[1]}
          x2={s.to.coords[0]}   y2={s.to.coords[1]}
          stroke="rgba(16,185,129,0.15)"
          strokeWidth="1"
        />
      ))}

      {/* ── Current location pins ── */}
      {shipments.map(s => {
        const [cx, cy] = s.current.coords;
        const col = statusCfg[s.status].color;
        const isSelected = selectedPin?.id === s.id;
        const isDelivered = s.status === 'delivered';

        return (
          <g
            key={s.id + '-pin'}
            onClick={e => { e.stopPropagation(); onPinClick(isSelected ? null : s); }}
            style={{ cursor: 'pointer' }}
            filter={isSelected ? 'url(#glowStrong)' : undefined}
          >
            {/* Pulse ring (only active) */}
            {!isDelivered && (
              <>
                <circle cx={cx} cy={cy} r={isSelected ? 18 : 14} fill={col} opacity={0.06} />
                <circle cx={cx} cy={cy} r={isSelected ? 12 : 9}  fill={col} opacity={0.1} />
              </>
            )}
            {/* Pin body */}
            <circle
              cx={cx} cy={cy}
              r={isSelected ? 8 : 6}
              fill={col}
              stroke="rgba(0,0,0,0.5)"
              strokeWidth="1.5"
              opacity={isDelivered ? 0.5 : 1}
            />
            {/* Inner dot */}
            <circle cx={cx} cy={cy} r={isSelected ? 3 : 2} fill="white" opacity={0.9} />
          </g>
        );
      })}

      {/* ── Selected popup ── */}
      {selectedPin && (() => {
        const [px, py] = selectedPin.current.coords;
        const col = statusCfg[selectedPin.status].color;
        const boxW = 170; const boxH = 90;
        // Offset popup so it doesn't go off-screen
        const bx = Math.min(Math.max(px - boxW / 2, 6), 480 - boxW - 6);
        const by = py - boxH - 16 < 4 ? py + 18 : py - boxH - 16;

        return (
          <g>
            {/* Connector line */}
            <line x1={px} y1={py - 8} x2={px} y2={by + boxH} stroke={col} strokeWidth="1" strokeOpacity="0.5" />
            {/* Popup box */}
            <rect x={bx} y={by} width={boxW} height={boxH} rx="8" ry="8"
              fill="#1C1F2A" stroke={col} strokeWidth="1" strokeOpacity="0.6" />
            {/* Header bar */}
            <rect x={bx} y={by} width={boxW} height={22} rx="8" ry="8" fill={col} opacity={0.18} />
            <rect x={bx} y={by + 10} width={boxW} height={12} fill={col} opacity={0.18} />
            {/* ID */}
            <text x={bx + 10} y={by + 14} fontSize="10" fontWeight="700" fill={col} fontFamily="Inter,sans-serif">
              {selectedPin.id}
            </text>
            <text x={bx + 90} y={by + 14} fontSize="9" fill="rgba(255,255,255,0.5)" fontFamily="Inter,sans-serif">
              {selectedPin.orderId}
            </text>
            {/* Agent */}
            <text x={bx + 10} y={by + 33} fontSize="9" fontWeight="600" fill="rgba(255,255,255,0.85)" fontFamily="Inter,sans-serif">
              👤 {selectedPin.agent.name}
            </text>
            <text x={bx + 10} y={by + 47} fontSize="8.5" fill="rgba(255,255,255,0.4)" fontFamily="Inter,sans-serif">
              {selectedPin.agent.id} · {selectedPin.courier}
            </text>
            {/* Location */}
            <text x={bx + 10} y={by + 63} fontSize="9" fontWeight="600" fill="rgba(255,255,255,0.85)" fontFamily="Inter,sans-serif">
              📍 {selectedPin.current.city}
            </text>
            {/* ETA */}
            <text x={bx + 10} y={by + 78} fontSize="8.5" fill="rgba(255,255,255,0.4)" fontFamily="Inter,sans-serif">
              ETA: {selectedPin.eta}
            </text>
          </g>
        );
      })()}
    </svg>
  );
}

// ─── Tracking Progress ────────────────────────────────────────────────────────
function TrackingBar({ step }: { step: number }) {
  return (
    <div style={{ marginTop: 14 }}>
      <div style={{ position: 'relative' }}>
        {/* Track */}
        <div style={{ height: 2, background: 'var(--bg-overlay)', borderRadius: 99, margin: '0 0 0 0' }} />
        {/* Fill */}
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${Math.min(step / 3, 1) * 100}%` }}
          transition={{ duration: 1, ease: 'easeOut' }}
          style={{
            position: 'absolute', top: 0, left: 0,
            height: 2, borderRadius: 99,
            background: 'linear-gradient(90deg, #6366F1, #10B981)',
          }}
        />
        {/* Step dots */}
        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: -5 }}>
          {STEPS.map((_, i) => {
            const done = i <= step;
            const active = i === step;
            return (
              <div key={i} style={{
                width: 12, height: 12, borderRadius: '50%',
                background: done ? (active ? '#10B981' : '#6366F1') : 'var(--bg-overlay)',
                border: done ? 'none' : '1.5px solid var(--border-default)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                boxShadow: active ? '0 0 8px rgba(16,185,129,0.5)' : 'none',
                transition: 'all 0.3s',
              }}>
                {done && <div style={{ width: 4, height: 4, borderRadius: '50%', background: 'white' }} />}
              </div>
            );
          })}
        </div>
      </div>
      {/* Labels */}
      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 6 }}>
        {STEPS.map((label, i) => (
          <span key={i} style={{
            fontSize: 9.5, fontWeight: i === step ? 600 : 400,
            color: i <= step ? 'var(--text-secondary)' : 'var(--text-muted)',
            textAlign: 'center', flex: 1,
            ...(i === 0 ? { textAlign: 'left' } : i === STEPS.length - 1 ? { textAlign: 'right' } : {}),
          }}>{label}</span>
        ))}
      </div>
    </div>
  );
}

// ─── Shipment Card ────────────────────────────────────────────────────────────
function ShipmentCard({ s, selected, onClick }: { s: Shipment; selected: boolean; onClick: () => void }) {
  const { label, cls, color } = statusCfg[s.status];
  return (
    <motion.div
      onClick={onClick}
      whileHover={{ x: 2 }}
      style={{
        background: selected ? 'rgba(99,102,241,0.05)' : 'var(--bg-card)',
        border: `1px solid ${selected ? 'rgba(99,102,241,0.25)' : 'var(--border-subtle)'}`,
        borderRadius: 14,
        padding: '14px 16px',
        cursor: 'pointer',
        transition: 'all 0.2s',
      }}
    >
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 4 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--indigo-400)' }}>{s.id}</span>
          <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>— {s.orderId}</span>
          <span className={cls}>{label}</span>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>ETA</div>
          <div style={{ fontSize: 12, fontWeight: 700, color: s.status === 'delivered' ? 'var(--green-400)' : 'var(--text-primary)' }}>
            {s.eta}
          </div>
        </div>
      </div>

      {/* Customer & courier */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 2 }}>
        <div style={{
          width: 28, height: 28, borderRadius: 8,
          background: `${color}18`,
          border: `1px solid ${color}30`,
          display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
        }}>
          <Truck size={13} color={color} />
        </div>
        <div>
          <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)' }}>{s.customer}</div>
          <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{s.courier} · {s.tracking}</div>
        </div>
      </div>

      {/* Agent & location */}
      <div style={{ display: 'flex', gap: 16, margin: '8px 0', padding: '8px 10px', background: 'var(--bg-elevated)', borderRadius: 8 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
          <User size={11} color="var(--text-muted)" />
          <span style={{ fontSize: 11, color: 'var(--text-secondary)', fontWeight: 500 }}>{s.agent.name}</span>
          <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>({s.agent.id})</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginLeft: 'auto' }}>
          <MapPin size={10} color={color} />
          <span style={{ fontSize: 11, color: 'var(--text-secondary)', maxWidth: 160, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {s.current.city}
          </span>
        </div>
      </div>

      {/* Route */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 10 }}>
        <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-secondary)' }}>{s.from.city}</span>
        <ArrowRight size={11} color="var(--text-muted)" />
        <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-secondary)' }}>{s.to.city}</span>
      </div>

      <TrackingBar step={s.step} />
    </motion.div>
  );
}

// ─── Main Dispatch Page ───────────────────────────────────────────────────────
export default function Dispatch() {
  const [selectedPin, setSelectedPin] = useState<Shipment | null>(null);
  const [selectedCard, setSelectedCard] = useState<string | null>(null);

  const { data: shipmentsResponse, isLoading: isShipmentsLoading } = useQuery({
    queryKey: ['shipments'],
    queryFn: () => api.get<ApiResponse<any[]>>('/dispatch/shipments?limit=50'),
    refetchInterval: 30_000,
  });

  const { data: statsResponse } = useQuery({
    queryKey: ['shipment-stats'],
    queryFn: () => api.get<ApiResponse<{ total: number; byStatus: Record<string, number>; avgDeliveryDays: number }>>('/dispatch/shipments/stats'),
    refetchInterval: 30_000,
  });

  const dbShipments = shipmentsResponse?.data ?? [];
  const mappedShipments = dbShipments.length > 0
    ? dbShipments.map(mapDbShipmentToFrontend)
    : fallbackShipments;

  const handlePinClick = (s: Shipment | null) => {
    setSelectedPin(s);
    setSelectedCard(s?.id ?? null);
  };

  const handleCardClick = (s: Shipment) => {
    const same = selectedCard === s.id;
    setSelectedCard(same ? null : s.id);
    setSelectedPin(same ? null : s);
  };

  const stats = statsResponse?.data;
  const inTransit = stats
    ? (stats.byStatus?.PENDING ?? 0) + (stats.byStatus?.IN_TRANSIT ?? 0)
    : mappedShipments.filter(s => s.status === 'in_transit' || s.status === 'out_for_delivery' || s.status === 'picked_up').length;

  const delivered = stats
    ? (stats.byStatus?.DELIVERED ?? 0)
    : mappedShipments.filter(s => s.status === 'delivered').length;

  const outForDel = mappedShipments.filter(s => s.status === 'out_for_delivery').length;

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.3 }}>
      {/* Page Header */}
      <div className="page-header">
        <div className="breadcrumb">
          <div className="breadcrumb-dot" />
          <span className="breadcrumb-text">Workflow</span>
          <span className="breadcrumb-sep">·</span>
          <span className="breadcrumb-text">Dispatch</span>
        </div>
        <h1 className="page-title">Shipping &amp; Delivery</h1>
        <p className="page-subtitle">Real-time tracking across every courier and route.</p>
      </div>

      {/* Stat Row */}
      <motion.div
        className="stat-row"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        style={{ borderRadius: 0, border: 'none', borderBottom: '1px solid var(--border-subtle)', background: 'var(--bg-surface)' }}
      >
        <div className="stat-card" style={{ background: 'var(--bg-surface)' }}>
          <div className="stat-card-label">In Transit</div>
          <div className="stat-card-value">{inTransit}</div>
          <div className="stat-card-sub" style={{ color: 'var(--text-muted)', fontSize: 11 }}>active shipments</div>
        </div>
        <div className="stat-card" style={{ background: 'var(--bg-surface)' }}>
          <div className="stat-card-label">Delivered Today</div>
          <div className="stat-card-value" style={{ color: 'var(--green-400)' }}>{delivered}</div>
          <div className="stat-card-sub" style={{ color: 'var(--text-muted)', fontSize: 11 }}>completed</div>
        </div>
        <div className="stat-card" style={{ background: 'var(--bg-surface)' }}>
          <div className="stat-card-label">Out for Delivery</div>
          <div className="stat-card-value" style={{ color: 'var(--amber-400)' }}>{outForDel}</div>
          <div className="stat-card-sub" style={{ color: 'var(--text-muted)', fontSize: 11 }}>on last mile</div>
        </div>
        <div className="stat-card" style={{ background: 'var(--bg-surface)' }}>
          <div className="stat-card-label">On-Time Rate</div>
          <div className="stat-card-value">99.1%</div>
          <div className="stat-card-sub" style={{ color: 'var(--green-400)', fontSize: 11, fontWeight: 600 }}>▲ 0.4% this week</div>
        </div>
      </motion.div>

      {/* Body */}
      <div className="page-body">
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 400px', gap: 20 }}>

          {/* ── LEFT: Map ── */}
          <motion.div
            className="card"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            style={{ overflow: 'hidden' }}
          >
            <div className="card-header">
              <div>
                <div className="card-title">Live Shipment Map</div>
                <div className="card-subtitle">India delivery network · Click a pin to inspect</div>
              </div>
              {/* Legend */}
              <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                {([
                  { label: 'In Transit',       color: '#6366F1' },
                  { label: 'Out for Delivery', color: '#F59E0B' },
                  { label: 'Delivered',        color: '#10B981' },
                  { label: 'Picked Up',        color: '#6B7280' },
                ] as const).map(l => (
                  <div key={l.label} style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                    <div style={{ width: 7, height: 7, borderRadius: '50%', background: l.color }} />
                    <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>{l.label}</span>
                  </div>
                ))}
              </div>
            </div>

            <div style={{ padding: '12px 16px', height: 440, position: 'relative' }}>
              <IndiaMap
                shipments={mappedShipments}
                onPinClick={handlePinClick}
                selectedPin={selectedPin}
              />

              {/* Hint */}
              {!selectedPin && (
                <div style={{
                  position: 'absolute', bottom: 20, left: '50%', transform: 'translateX(-50%)',
                  background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(8px)',
                  border: '1px solid var(--border-subtle)',
                  borderRadius: 20, padding: '5px 14px',
                  fontSize: 11, color: 'var(--text-muted)',
                  pointerEvents: 'none',
                }}>
                  <MapPin size={10} style={{ marginRight: 5, verticalAlign: 'middle' }} />
                  Click any pin to inspect shipment
                </div>
              )}
            </div>
          </motion.div>

          {/* ── RIGHT: Shipment Cards ── */}
          <motion.div
            initial={{ opacity: 0, x: 16 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.25 }}
            style={{ display: 'flex', flexDirection: 'column', gap: 12, overflow: 'auto', maxHeight: 560 }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 2 }}>
              <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>
                Live Shipments
              </span>
              <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{mappedShipments.length} total</span>
            </div>

            {mappedShipments.map((s, i) => (
              <motion.div
                key={s.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.06 + 0.25 }}
              >
                <ShipmentCard
                  s={s}
                  selected={selectedCard === s.id}
                  onClick={() => handleCardClick(s)}
                />
              </motion.div>
            ))}
          </motion.div>
        </div>
      </div>
    </motion.div>
  );
}
