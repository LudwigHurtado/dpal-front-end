import React, { useState } from 'react';
import { useDriverStore } from '../driverStore';
import { VEHICLE_COLOR_PALETTE, makeVehicleMarkerUrl } from '../../../services/vehicleMapMarker';
import type { VehicleMapType } from '../driverTypes';

const VEHICLE_TYPES: { id: VehicleMapType; label: string; emoji: string; sub: string }[] = [
  { id: 'car',   label: 'Car',        emoji: '🚗', sub: 'Sedan / Compact' },
  { id: 'truck', label: 'SUV / Truck', emoji: '🚙', sub: 'SUV, Pickup, 4x4' },
  { id: 'van',   label: 'Van',        emoji: '🚐', sub: 'Minivan / Van' },
  { id: 'moto',  label: 'Motorcycle', emoji: '🏍', sub: 'Bike / Scooter' },
];

const DriverVehicleSummary: React.FC = () => {
  const vehicle         = useDriverStore((s) => s.vehicle);
  const profile         = useDriverStore((s) => s.driverProfile);
  const updateVehicle   = useDriverStore((s) => s.updateVehicleInfo);

  const [editMode, setEditMode] = useState(false);

  if (!vehicle) {
    return (
      <div className="gw-card p-5">
        <div className="gw-muted">Loading vehicle info…</div>
      </div>
    );
  }

  const previewUrl = makeVehicleMarkerUrl(vehicle.vehicleType ?? 'car', vehicle.color ?? '#FFFFFF', 90);

  return (
    <div className="gw-card p-5 space-y-5">
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
        <div className="gw-card-title">Your Vehicle</div>
        <button
          type="button"
          onClick={() => setEditMode((e) => !e)}
          style={{ fontSize: 12, fontWeight: 700, color: '#0077C8', background: '#EFF6FF', border: 'none', borderRadius: 8, padding: '5px 12px', cursor: 'pointer' }}
        >
          {editMode ? 'Done' : 'Edit'}
        </button>
      </div>

      {/* ── Live map marker preview ── */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 20, padding: '12px 0', borderBottom: '1px solid #F3F4F6' }}>
        <div style={{ position: 'relative', width: 90, height: 90, flexShrink: 0 }}>
          <img
            src={previewUrl}
            alt="Map marker preview"
            style={{ width: 90, height: 90 }}
          />
        </div>
        <div>
          <p style={{ fontSize: 11, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.15em', color: '#9CA3AF', margin: '0 0 4px' }}>Map Marker Preview</p>
          <p style={{ fontSize: 15, fontWeight: 800, color: '#111827', margin: 0 }}>{vehicle.makeModel}</p>
          <p style={{ fontSize: 13, color: '#6B7280', margin: '2px 0 0' }}>
            {vehicle.colorName} · {VEHICLE_TYPES.find((t) => t.id === vehicle.vehicleType)?.label ?? 'Car'}
          </p>
          <p style={{ fontSize: 11, color: '#9CA3AF', margin: '2px 0 0' }}>
            This is exactly what passengers see on the map when you are assigned to their ride.
          </p>
        </div>
      </div>

      {/* ── Vehicle info ── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px 16px' }}>
        {[
          ['Driver',      profile?.fullName ?? '—'],
          ['Make / Model', vehicle.makeModel],
          ['Plate',       vehicle.plateMasked],
          ['Seats',       String(vehicle.seats)],
          ['Accessibility', vehicle.accessibilityReady ? 'Ready ♿' : 'Standard'],
          ['Verification', vehicle.verification],
        ].map(([label, value]) => (
          <div key={label} style={{ padding: '4px 0', borderBottom: '1px solid #F9FAFB' }}>
            <p style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: '#9CA3AF', margin: 0 }}>{label}</p>
            <p style={{ fontSize: 13, fontWeight: 700, color: '#111827', margin: '2px 0 0' }}>{value}</p>
          </div>
        ))}
      </div>

      {/* ── Edit: vehicle type ── */}
      {editMode && (
        <>
          <div style={{ borderTop: '1px solid #F3F4F6', paddingTop: 14 }}>
            <p style={{ fontSize: 11, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.15em', color: '#6B7280', margin: '0 0 10px' }}>Vehicle Type</p>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 8 }}>
              {VEHICLE_TYPES.map((vt) => {
                const sel = vehicle.vehicleType === vt.id;
                return (
                  <button
                    key={vt.id}
                    type="button"
                    onClick={() => updateVehicle({ vehicleType: vt.id })}
                    style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', border: `2px solid ${sel ? '#0077C8' : '#E5E7EB'}`, borderRadius: 12, background: sel ? '#EFF6FF' : 'white', cursor: 'pointer', textAlign: 'left' }}
                  >
                    <span style={{ fontSize: 24 }}>{vt.emoji}</span>
                    <div>
                      <p style={{ fontSize: 13, fontWeight: 700, color: sel ? '#0077C8' : '#111827', margin: 0 }}>{vt.label}</p>
                      <p style={{ fontSize: 10, color: '#9CA3AF', margin: '1px 0 0' }}>{vt.sub}</p>
                    </div>
                    {sel && <span style={{ marginLeft: 'auto', color: '#0077C8', fontSize: 16 }}>✓</span>}
                  </button>
                );
              })}
            </div>
          </div>

          {/* ── Edit: vehicle color ── */}
          <div>
            <p style={{ fontSize: 11, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.15em', color: '#6B7280', margin: '0 0 10px' }}>Vehicle Color</p>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {VEHICLE_COLOR_PALETTE.map((c) => {
                const sel = vehicle.color === c.hex;
                return (
                  <button
                    key={c.hex}
                    type="button"
                    title={c.name}
                    onClick={() => updateVehicle({ color: c.hex, colorName: c.name })}
                    style={{
                      width: 36, height: 36, borderRadius: '50%', background: c.hex,
                      border: sel ? '3px solid #0077C8' : '2px solid #E5E7EB',
                      cursor: 'pointer', outline: sel ? '2px solid #BFDBFE' : 'none', outlineOffset: 1,
                      boxShadow: c.hex === '#FFFFFF' ? 'inset 0 0 0 1px #E5E7EB' : 'none',
                    }}
                  />
                );
              })}
            </div>
            <p style={{ fontSize: 11, color: '#6B7280', margin: '8px 0 0' }}>
              Selected: <strong>{vehicle.colorName}</strong>
            </p>
          </div>
        </>
      )}
    </div>
  );
};

export default DriverVehicleSummary;
