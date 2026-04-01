/**
 * DevicePreviewFrame — floating "cell mode" tester
 *
 * Adds a fixed pill button (bottom-right of screen) that opens a
 * phone / tablet frame overlay. The app content is rendered inside
 * an <iframe> at the chosen device dimensions, so the real viewport
 * is phone-sized inside the frame — media queries, 100dvh, touch
 * events all work exactly as on the real device.
 *
 * Supports: iPhone 15, Galaxy S24, Pixel 8, iPad Mini, desktop reset
 */

import React, { useEffect, useState, useRef } from 'react';

/* ─────────────────────────── Device presets ─────────────────────────── */
interface Device {
  id: string;
  label: string;
  emoji: string;
  w: number;
  h: number;
  radius: number;     // bezel border-radius
  notchType: 'dynamic-island' | 'notch' | 'punch' | 'none';
  color: string;      // bezel color
}

const DEVICES: Device[] = [
  {
    id: 'iphone15pro',
    label: 'iPhone 15 Pro',
    emoji: '📱',
    w: 393, h: 852,
    radius: 55,
    notchType: 'dynamic-island',
    color: '#1C1C1E',
  },
  {
    id: 'galaxy',
    label: 'Galaxy S24',
    emoji: '📱',
    w: 360, h: 780,
    radius: 42,
    notchType: 'punch',
    color: '#161616',
  },
  {
    id: 'pixel8',
    label: 'Pixel 8',
    emoji: '📱',
    w: 412, h: 915,
    radius: 44,
    notchType: 'punch',
    color: '#202124',
  },
  {
    id: 'ipadmini',
    label: 'iPad Mini',
    emoji: '📟',
    w: 768, h: 1024,
    radius: 20,
    notchType: 'none',
    color: '#2C2C2E',
  },
];

const LS_KEY = 'dpal_device_preview';

/* ─────────────────────────── Notch rendering ────────────────────────── */
function Notch({ type, w }: { type: Device['notchType']; w: number }) {
  if (type === 'dynamic-island') {
    return (
      <div style={{
        position: 'absolute', top: 14, left: '50%',
        transform: 'translateX(-50%)',
        width: 126, height: 37,
        background: '#000',
        borderRadius: 20,
        zIndex: 10,
      }} />
    );
  }
  if (type === 'notch') {
    return (
      <div style={{
        position: 'absolute', top: 0, left: '50%',
        transform: 'translateX(-50%)',
        width: 160, height: 30,
        background: '#000',
        borderRadius: '0 0 18px 18px',
        zIndex: 10,
      }} />
    );
  }
  if (type === 'punch') {
    return (
      <div style={{
        position: 'absolute', top: 16, left: '50%',
        transform: 'translateX(-50%)',
        width: 14, height: 14,
        background: '#000',
        borderRadius: '50%',
        zIndex: 10,
      }} />
    );
  }
  return null;
}

/* ─────────────────────────── Main component ─────────────────────────── */
const DevicePreviewFrame: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [open, setOpen]           = useState(() => {
    try { return localStorage.getItem(LS_KEY) === '1'; } catch { return false; }
  });
  const [deviceId, setDeviceId]   = useState<string>(() => {
    try { return localStorage.getItem(`${LS_KEY}_device`) ?? 'iphone15pro'; } catch { return 'iphone15pro'; }
  });
  const [panelOpen, setPanelOpen] = useState(false);
  const device = DEVICES.find(d => d.id === deviceId) ?? DEVICES[0];

  /* Persist setting */
  useEffect(() => {
    try {
      localStorage.setItem(LS_KEY, open ? '1' : '0');
      localStorage.setItem(`${LS_KEY}_device`, deviceId);
    } catch { /* ignore */ }
  }, [open, deviceId]);

  /* Scale the phone frame so it always fits visible screen */
  const [scale, setScale] = useState(1);
  useEffect(() => {
    if (!open) return;
    const calc = () => {
      const vw = window.innerWidth;
      const vh = window.innerHeight;
      const BEZEL = 24;
      const TOOLBAR = 120; // space for device selector bar
      const maxW = vw - 48;
      const maxH = vh - TOOLBAR - 32;
      const frameW = device.w + BEZEL * 2;
      const frameH = device.h + BEZEL * 2;
      setScale(Math.min(maxW / frameW, maxH / frameH, 1));
    };
    calc();
    window.addEventListener('resize', calc);
    return () => window.removeEventListener('resize', calc);
  }, [open, device]);

  /* Current page URL for iframe */
  const iframeUrl = window.location.href;

  /* ── Floating toggle pill ── */
  const FloatingBtn = (
    <button
      onClick={() => { setOpen(o => !o); setPanelOpen(false); }}
      style={{
        position: 'fixed',
        bottom: 20,
        right: 20,
        zIndex: 99999,
        display: 'flex',
        alignItems: 'center',
        gap: 7,
        padding: '9px 16px',
        background: open ? '#0077C8' : '#111827',
        color: 'white',
        border: 'none',
        borderRadius: 32,
        fontSize: 12,
        fontWeight: 800,
        letterSpacing: '0.04em',
        cursor: 'pointer',
        boxShadow: '0 4px 20px rgba(0,0,0,0.35)',
        userSelect: 'none',
        fontFamily: 'system-ui, sans-serif',
        transition: 'background 0.2s',
      }}
    >
      <span style={{ fontSize: 16 }}>📱</span>
      {open ? 'Exit Cell Mode' : 'Cell Mode'}
    </button>
  );

  /* Normal (non-preview) rendering */
  if (!open) {
    return (
      <>
        {children}
        {FloatingBtn}
      </>
    );
  }

  /* ── Preview mode ── */
  const BEZEL = 20;
  const sideBtn: React.CSSProperties = {
    position: 'absolute',
    right: -(BEZEL + 3),
    width: 4,
    background: device.color,
    borderRadius: '0 3px 3px 0',
  };

  return (
    <>
      {/* Normal app still rendered (hidden behind overlay) so state is preserved */}
      <div style={{ visibility: 'hidden', position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 0 }}>
        {children}
      </div>

      {/* Dark desktop background */}
      <div style={{
        position: 'fixed', inset: 0, zIndex: 9990,
        background: 'radial-gradient(ellipse at center, #1a1f2e 0%, #0d1117 100%)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'flex-start',
        overflow: 'hidden',
      }}>

        {/* ── Device selector toolbar ── */}
        <div style={{
          flexShrink: 0,
          padding: '16px 24px 12px',
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          flexWrap: 'wrap',
          justifyContent: 'center',
          width: '100%',
        }}>
          <span style={{ fontSize: 11, fontWeight: 800, color: '#4B5563', textTransform: 'uppercase', letterSpacing: '0.2em', marginRight: 4 }}>Device</span>
          {DEVICES.map(d => (
            <button
              key={d.id}
              onClick={() => setDeviceId(d.id)}
              style={{
                padding: '6px 14px',
                borderRadius: 20,
                border: 'none',
                background: deviceId === d.id ? '#0077C8' : 'rgba(255,255,255,0.07)',
                color: deviceId === d.id ? 'white' : '#9CA3AF',
                fontSize: 11,
                fontWeight: 700,
                cursor: 'pointer',
                transition: 'all 0.15s',
                fontFamily: 'system-ui, sans-serif',
              }}
            >
              {d.emoji} {d.label}
            </button>
          ))}

          {/* Dimension readout */}
          <span style={{ fontSize: 10, color: '#4B5563', fontFamily: 'monospace', marginLeft: 8 }}>
            {device.w} × {device.h}px · {Math.round(scale * 100)}%
          </span>
        </div>

        {/* ── Phone frame ── */}
        <div style={{
          flex: 1,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          paddingBottom: 72, // leave room for floating button
        }}>
          <div style={{
            transform: `scale(${scale})`,
            transformOrigin: 'top center',
          }}>
            {/* Outer bezel */}
            <div style={{
              position: 'relative',
              width: device.w + BEZEL * 2,
              height: device.h + BEZEL * 2,
              background: device.color,
              borderRadius: device.radius + 8,
              boxShadow: `
                0 0 0 1px rgba(255,255,255,0.08),
                0 40px 100px rgba(0,0,0,0.7),
                inset 0 0 0 1px rgba(255,255,255,0.04)
              `,
            }}>
              {/* Side buttons */}
              <div style={{ ...sideBtn, top: 80, height: 32, right: -(BEZEL - 2) }} />
              <div style={{ ...sideBtn, top: 130, height: 50, right: -(BEZEL - 2) }} />
              <div style={{
                position: 'absolute',
                left: -(BEZEL - 2), top: 110,
                width: 4, height: 36,
                background: device.color,
                borderRadius: '3px 0 0 3px',
              }} />
              <div style={{
                position: 'absolute',
                left: -(BEZEL - 2), top: 160,
                width: 4, height: 36,
                background: device.color,
                borderRadius: '3px 0 0 3px',
              }} />

              {/* Inner screen area */}
              <div style={{
                position: 'absolute',
                top: BEZEL, left: BEZEL,
                width: device.w,
                height: device.h,
                borderRadius: device.radius - 4,
                overflow: 'hidden',
                background: '#000',
                isolation: 'isolate',
              }}>
                {/* Notch / island */}
                <Notch type={device.notchType} w={device.w} />

                {/* The app in an iframe — gets a real {device.w}×{device.h} viewport */}
                <iframe
                  src={iframeUrl}
                  title="DPAL Cell Preview"
                  style={{
                    width: device.w,
                    height: device.h,
                    border: 'none',
                    display: 'block',
                    background: 'white',
                  }}
                  allow="geolocation; camera; microphone"
                />
              </div>

              {/* Home indicator bar */}
              {device.notchType !== 'none' && (
                <div style={{
                  position: 'absolute',
                  bottom: BEZEL + 8,
                  left: '50%',
                  transform: 'translateX(-50%)',
                  width: 120,
                  height: 5,
                  background: 'rgba(255,255,255,0.3)',
                  borderRadius: 3,
                }} />
              )}
            </div>
          </div>
        </div>

        {/* ── Grid pattern overlay for desktop feel ── */}
        <div style={{
          position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: -1,
          backgroundImage: 'radial-gradient(circle, rgba(255,255,255,0.04) 1px, transparent 1px)',
          backgroundSize: '40px 40px',
        }} />
      </div>

      {FloatingBtn}
    </>
  );
};

export default DevicePreviewFrame;
