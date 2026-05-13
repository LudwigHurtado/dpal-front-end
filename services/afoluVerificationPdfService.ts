import jsPDF from 'jspdf';
import { sha256Bytes } from '../utils/hashUtils';
import { generateQrCodeDataUrl } from '../utils/qrUtils';

export interface AfoluVerificationPdfInput {
  projectId: string;
  projectName: string;
  country: string;
  region: string;
  hectares: number;
  creditsGenerated: number;
  verificationScore: number;
  observedClaims: string[];
}

export interface AfoluVerificationPdfResult {
  blob: Blob;
  arrayBuffer: ArrayBuffer;
  fileName: string;
  pdfHash: string;
  verificationUrl: string;
  qrDataUrl: string;
  issuedAtIso: string;
}

export function buildAfoluVerificationUrl(projectId: string, issuedAtIso: string): string {
  const q = new URLSearchParams({
    afoluVerify: '1',
    projectId,
    issued: issuedAtIso,
  });
  const path = `/afolu?${q.toString()}`;
  if (typeof window === 'undefined') return path;
  return new URL(path, window.location.origin).href;
}

/**
 * Local-only AFOLU verification preview PDF (browser). Embeds a QR that opens
 * the SPA with read-only query context — not a registry or blockchain record.
 */
export async function generateAfoluVerificationPdf(input: AfoluVerificationPdfInput): Promise<AfoluVerificationPdfResult> {
  const issuedAtIso = new Date().toISOString();
  const verificationUrl = buildAfoluVerificationUrl(input.projectId, issuedAtIso);
  const qrDataUrl = await generateQrCodeDataUrl(verificationUrl);

  const doc = new jsPDF({ unit: 'mm', format: 'a4' });
  const pageW = doc.internal.pageSize.getWidth();

  doc.setFillColor(15, 23, 42);
  doc.rect(0, 0, pageW, 36, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(17);
  doc.text('DPAL AFOLU — Verification preview (local)', 14, 14);
  doc.setFontSize(9.5);
  doc.setFont('helvetica', 'normal');
  doc.text(`Project: ${input.projectName}`, 14, 22);
  doc.text(`Project ID: ${input.projectId} · Issued (local clock): ${issuedAtIso}`, 14, 28);

  let y = 44;
  doc.setTextColor(15, 23, 42);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.text('Summary', 14, y);
  y += 6;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9.5);
  const lines = [
    `Jurisdiction: ${input.country} / ${input.region}`,
    `Area (ha): ${input.hectares}`,
    `Credits generated (workspace record): ${input.creditsGenerated}`,
    `Verification confidence (workspace %): ${input.verificationScore}`,
    '',
    'This PDF is generated in your browser for operator review. It is not a registry submission,',
    'not a credit issuance, and not an on-chain anchor.',
  ];
  lines.forEach((line) => {
    const wrapped = doc.splitTextToSize(line, pageW - 28);
    doc.text(wrapped, 14, y);
    y += wrapped.length * 4.5;
  });

  y += 4;
  doc.setFont('helvetica', 'bold');
  doc.text('Observed claims (from current workspace)', 14, y);
  y += 5;
  doc.setFont('helvetica', 'normal');
  (input.observedClaims.length ? input.observedClaims : ['No claims list supplied.']).forEach((c) => {
    const w = doc.splitTextToSize(`- ${c}`, pageW - 28);
    doc.text(w, 14, y);
    y += w.length * 4.5;
  });

  y += 6;
  doc.setFont('helvetica', 'bold');
  doc.text('Scan — opens DPAL read-only verification context', 14, y);
  y += 2;
  try {
    doc.addImage(qrDataUrl, 'PNG', 14, y, 42, 42);
  } catch {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    doc.text('QR image could not be embedded; URL is still printed below.', 14, y + 6);
  }
  y += 48;
  doc.setFontSize(8);
  doc.setTextColor(71, 85, 105);
  const urlLines = doc.splitTextToSize(verificationUrl, pageW - 28);
  doc.text(urlLines, 14, y);

  const arrayBuffer = doc.output('arraybuffer');
  const pdfHash = await sha256Bytes(arrayBuffer);
  const blob = new Blob([arrayBuffer], { type: 'application/pdf' });

  return {
    blob,
    arrayBuffer,
    fileName: `dpal-afolu-verification-preview-${input.projectId}.pdf`,
    pdfHash,
    verificationUrl,
    qrDataUrl,
    issuedAtIso,
  };
}

export async function downloadAfoluVerificationPdf(input: AfoluVerificationPdfInput): Promise<AfoluVerificationPdfResult> {
  const pdf = await generateAfoluVerificationPdf(input);
  const url = URL.createObjectURL(pdf.blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = pdf.fileName;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
  return pdf;
}
