import React from 'react';
import {
  Activity,
  Camera,
  Cloud,
  FileCode,
  Fingerprint,
  Globe,
  Hash,
  Map,
  MapPin,
  Monitor,
  Search,
  Shield,
  Zap,
} from '../../../../components/icons';
import type { IconProps } from '../../../../components/icons';

type IconComponent = React.FC<IconProps>;

function pickIcon(label: string): IconComponent {
  const lower = label.toLowerCase();
  if (lower.includes('satellite') || lower.includes('imagery') || lower.includes('landsat') || lower.includes('nasa')) {
    return Globe;
  }
  if (lower.includes('sensor') || lower.includes('iot') || lower.includes('gauge') || lower.includes('feed')) {
    return Activity;
  }
  if (lower.includes('map') || lower.includes('aoi') || lower.includes('parcel') || lower.includes('boundary')) {
    return Map;
  }
  if (lower.includes('photo') || lower.includes('drone') || lower.includes('camera')) {
    return Camera;
  }
  if (lower.includes('blockchain') || lower.includes('hash') || lower.includes('qr')) {
    return Hash;
  }
  if (lower.includes('validator') || lower.includes('review') || lower.includes('audit')) {
    return Shield;
  }
  if (lower.includes('report') || lower.includes('record') || lower.includes('document') || lower.includes('manifest')) {
    return FileCode;
  }
  if (lower.includes('weather') || lower.includes('air') || lower.includes('methane') || lower.includes('plume')) {
    return Cloud;
  }
  if (lower.includes('search') || lower.includes('check')) {
    return Search;
  }
  if (lower.includes('location') || lower.includes('site') || lower.includes('field')) {
    return MapPin;
  }
  if (lower.includes('dashboard') || lower.includes('monitor')) {
    return Monitor;
  }
  if (lower.includes('ai') || lower.includes('model') || lower.includes('risk')) {
    return Zap;
  }
  if (lower.includes('fingerprint') || lower.includes('proof')) {
    return Fingerprint;
  }
  return FileCode;
}

export function DmrvInputIcon({ label, className }: { label: string; className?: string }): React.ReactElement {
  const Icon = pickIcon(label);
  return <Icon className={className ?? 'h-5 w-5'} aria-hidden />;
}
