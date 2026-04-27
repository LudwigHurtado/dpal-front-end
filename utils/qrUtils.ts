import QRCode from 'qrcode';
import {
  aquaScanReportPath,
  aquaScanSituationRoomPath,
  carbReportPath,
  carbSituationRoomPath,
} from './appRoutes';

const QR_OPTIONS = {
  width: 280,
  margin: 2,
  errorCorrectionLevel: 'M' as const,
  color: { dark: '#0f172a', light: '#ffffff' },
};

export function buildAbsoluteAppUrl(path: string): string {
  if (typeof window === 'undefined') return path;
  return new URL(path, window.location.origin).toString();
}

export function buildAquaScanReportUrl(reportId: string): string {
  return buildAbsoluteAppUrl(aquaScanReportPath(reportId));
}

export function buildAquaScanSituationRoomUrl(roomId: string): string {
  return buildAbsoluteAppUrl(aquaScanSituationRoomPath(roomId));
}

export function buildCarbReportUrl(reportId: string): string {
  return buildAbsoluteAppUrl(carbReportPath(reportId));
}

export function buildCarbSituationRoomUrl(roomId: string): string {
  return buildAbsoluteAppUrl(carbSituationRoomPath(roomId));
}

export async function generateQrCodeDataUrl(value: string): Promise<string> {
  return QRCode.toDataURL(value, QR_OPTIONS);
}
