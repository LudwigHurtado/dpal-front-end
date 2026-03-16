import React, { useEffect } from 'react';

declare global {
  interface Window {
    adsbygoogle?: any[];
  }
}

interface GoogleAdSlotProps {
  slot: string;
  format?: 'auto' | 'rectangle' | 'horizontal' | 'vertical';
  className?: string;
  style?: React.CSSProperties;
}

const SCRIPT_ID = 'dpal-adsense-script';

const ensureAdSenseScript = (client: string) => {
  if (typeof document === 'undefined') return;
  if (document.getElementById(SCRIPT_ID)) return;

  const script = document.createElement('script');
  script.id = SCRIPT_ID;
  script.async = true;
  script.src = `https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${client}`;
  script.crossOrigin = 'anonymous';
  document.head.appendChild(script);
};

const GoogleAdSlot: React.FC<GoogleAdSlotProps> = ({
  slot,
  format = 'auto',
  className,
  style,
}) => {
  const client = import.meta.env.VITE_ADSENSE_CLIENT;

  useEffect(() => {
    if (!client || !slot) return;
    ensureAdSenseScript(client);
    try {
      (window.adsbygoogle = window.adsbygoogle || []).push({});
    } catch (error) {
      // Ignore duplicate push/no-fill runtime errors.
      console.warn('AdSense push skipped:', error);
    }
  }, [client, slot]);

  if (!client || !slot) {
    return null;
  }

  return (
    <ins
      className={`adsbygoogle ${className || ''}`.trim()}
      style={{ display: 'block', ...style }}
      data-ad-client={client}
      data-ad-slot={slot}
      data-ad-format={format}
      data-full-width-responsive="true"
    />
  );
};

export default GoogleAdSlot;
