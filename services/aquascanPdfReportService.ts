import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import type { AquaScanEvidenceReport } from '../types/aquascanReport';
import { sha256Bytes } from '../utils/hashUtils';

export interface AquaScanPdfResult {
  blob: Blob;
  arrayBuffer: ArrayBuffer;
  fileName: string;
  pdfHash: string;
}

function safe(value: unknown, fallback = 'Not available'): string {
  if (value == null) return fallback;
  if (typeof value === 'number' && Number.isFinite(value)) return String(value);
  const text = String(value).trim();
  return text ? text : fallback;
}

function signed(value?: number): string {
  if (value == null || !Number.isFinite(value)) return 'Not available';
  return `${value > 0 ? '+' : ''}${value}`;
}

function riskTone(report: AquaScanEvidenceReport): string {
  const risk = report.aiIntelligence.riskLevel?.toLowerCase() ?? '';
  if (risk.includes('high')) return '#7f1d1d';
  if (risk.includes('moderate') || risk.includes('watch')) return '#78350f';
  return '#0f172a';
}

async function loadImageData(url?: string): Promise<string | null> {
  if (!url) return null;
  if (url.startsWith('data:')) return url;
  try {
    const res = await fetch(url);
    const blob = await res.blob();
    return await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result || ''));
      reader.onerror = () => reject(new Error('image_load_failed'));
      reader.readAsDataURL(blob);
    });
  } catch {
    return null;
  }
}

function addSectionTitle(doc: jsPDF, title: string, y: number): number {
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.setTextColor(15, 23, 42);
  doc.text(title, 14, y);
  return y + 6;
}

function addParagraph(doc: jsPDF, text: string, y: number, maxWidth = 180): number {
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.setTextColor(51, 65, 85);
  const lines = doc.splitTextToSize(text, maxWidth);
  doc.text(lines, 14, y);
  return y + lines.length * 5 + 2;
}

export async function generateAquaScanEvidencePdf(report: AquaScanEvidenceReport): Promise<AquaScanPdfResult> {
  const doc = new jsPDF({ unit: 'mm', format: 'a4' });
  const qrImage = await loadImageData(report.qr.qrCodeDataUrl);
  const mapImage = await loadImageData(report.satelliteMetadata.mapSnapshotUrl);
  const pageWidth = doc.internal.pageSize.getWidth();

  doc.setFillColor(15, 23, 42);
  doc.rect(0, 0, pageWidth, 42, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(22);
  doc.text('DPAL AquaScan Evidence Report', 14, 18);
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text('Environmental intelligence and evidence organization record', 14, 26);
  doc.text(`Report ID: ${report.reportId}`, 14, 32);
  doc.text(`Verification: ${safe(report.ledger.verificationStatus)}`, 14, 37);
  if (qrImage) {
    doc.addImage(qrImage, 'PNG', 160, 8, 34, 34);
  }

  let y = 52;
  autoTable(doc, {
    startY: y,
    theme: 'grid',
    head: [['Project', 'AOI / Location', 'Created', 'Ledger status']],
    body: [[
      safe(report.projectName, safe(report.projectId)),
      safe(report.aquaScanResult.aoiName),
      safe(report.createdAt),
      safe(report.ledger.verificationStatus),
    ]],
    styles: { fontSize: 9, cellPadding: 2.4 },
    headStyles: { fillColor: [15, 23, 42] },
  });

  y = (doc as jsPDF & { lastAutoTable?: { finalY?: number } }).lastAutoTable?.finalY ?? 76;
  y = addSectionTitle(doc, 'Executive Summary', y + 8);
  y = addParagraph(doc, report.aiIntelligence.summary, y);
  autoTable(doc, {
    startY: y,
    theme: 'grid',
    head: [['Risk level', 'Confidence', 'Recommended next action']],
    body: [[
      safe(report.aiIntelligence.riskLevel),
      safe(report.aquaScanResult.confidence != null ? `${Math.round(report.aquaScanResult.confidence * 100)}%` : null),
      safe(report.aiIntelligence.recommendedActions[0]),
    ]],
    styles: { fontSize: 9, cellPadding: 2.2 },
    headStyles: { fillColor: [127, 29, 29] },
    bodyStyles: { fillColor: [248, 250, 252] },
  });

  y = (doc as jsPDF & { lastAutoTable?: { finalY?: number } }).lastAutoTable?.finalY ?? y + 12;
  y = addSectionTitle(doc, 'AquaScan Reading', y + 8);
  autoTable(doc, {
    startY: y,
    theme: 'grid',
    head: [['Index', 'Before', 'After', 'Change', 'Percent change']],
    body: [
      ['NDWI', safe(report.aquaScanResult.indices.ndwi?.before), safe(report.aquaScanResult.indices.ndwi?.after), signed(report.aquaScanResult.indices.ndwi?.change), signed(report.aquaScanResult.indices.ndwi?.percentChange)],
      ['NDVI', safe(report.aquaScanResult.indices.ndvi?.before), safe(report.aquaScanResult.indices.ndvi?.after), signed(report.aquaScanResult.indices.ndvi?.change), signed(report.aquaScanResult.indices.ndvi?.percentChange)],
      ['NDMI', safe(report.aquaScanResult.indices.ndmi?.before), safe(report.aquaScanResult.indices.ndmi?.after), signed(report.aquaScanResult.indices.ndmi?.change), signed(report.aquaScanResult.indices.ndmi?.percentChange)],
      ['NBR', safe(report.aquaScanResult.indices.nbr?.before), safe(report.aquaScanResult.indices.nbr?.after), signed(report.aquaScanResult.indices.nbr?.change), signed(report.aquaScanResult.indices.nbr?.percentChange)],
    ],
    styles: { fontSize: 9, cellPadding: 2.2 },
    headStyles: { fillColor: [30, 64, 175] },
  });

  y = (doc as jsPDF & { lastAutoTable?: { finalY?: number } }).lastAutoTable?.finalY ?? y + 12;
  autoTable(doc, {
    startY: y + 4,
    theme: 'grid',
    head: [['Before window', 'After window', 'Status', 'AOI area (sq km)']],
    body: [[
      safe(report.aquaScanResult.beforeDate),
      safe(report.aquaScanResult.afterDate),
      safe(report.aquaScanResult.status),
      safe(report.aquaScanResult.areaSqKm),
    ]],
    styles: { fontSize: 9, cellPadding: 2.2 },
    headStyles: { fillColor: [15, 23, 42] },
  });

  y = (doc as jsPDF & { lastAutoTable?: { finalY?: number } }).lastAutoTable?.finalY ?? y + 16;
  if (y > 210) {
    doc.addPage();
    y = 18;
  }
  y = addSectionTitle(doc, 'Satellite & Map Metadata', y + 4);
  autoTable(doc, {
    startY: y,
    theme: 'grid',
    body: [
      ['Source', safe(report.satelliteMetadata.source)],
      ['Provider', safe(report.satelliteMetadata.provider)],
      ['Product', safe(report.satelliteMetadata.product)],
      ['Layer', safe(report.satelliteMetadata.layerName)],
      ['Acquisition date', safe(report.satelliteMetadata.acquisitionDate)],
      ['Comparison window', safe(report.satelliteMetadata.comparisonWindow)],
      ['Resolution', safe(report.satelliteMetadata.resolution)],
      ['Cloud cover', safe(report.satelliteMetadata.cloudCover)],
      ['Coordinates', report.satelliteMetadata.inspectedCoordinates ? `${report.satelliteMetadata.inspectedCoordinates.lat}, ${report.satelliteMetadata.inspectedCoordinates.lng}` : 'Not available'],
      ['AOI polygon points', safe(report.aquaScanResult.aoiCoordinates?.length)],
      ['Tile URL', safe(report.satelliteMetadata.tileUrl)],
    ],
    styles: { fontSize: 9, cellPadding: 2.2 },
    columnStyles: { 0: { cellWidth: 46, fontStyle: 'bold' }, 1: { cellWidth: 134 } },
  });
  y = (doc as jsPDF & { lastAutoTable?: { finalY?: number } }).lastAutoTable?.finalY ?? y + 18;
  if (mapImage) {
    doc.addImage(mapImage, 'PNG', 14, y + 3, 90, 60);
    y += 68;
  } else {
    y = addParagraph(doc, 'Map snapshot: Not available', y + 4);
  }

  if (y > 190) {
    doc.addPage();
    y = 18;
  }
  y = addSectionTitle(doc, 'AI Intelligence Reader', y + 4);
  y = addParagraph(doc, `Confidence interpretation: ${report.aiIntelligence.confidenceInterpretation}`, y);
  autoTable(doc, {
    startY: y,
    theme: 'plain',
    body: [
      [{ content: 'Key findings', styles: { fontStyle: 'bold', fillColor: [241, 245, 249] } }],
      ...report.aiIntelligence.keyFindings.map((item) => [{ content: `• ${item}` }]),
      [{ content: 'Missing evidence', styles: { fontStyle: 'bold', fillColor: [241, 245, 249] } }],
      ...report.aiIntelligence.missingEvidence.map((item) => [{ content: `• ${item}` }]),
      [{ content: 'Suggested questions', styles: { fontStyle: 'bold', fillColor: [241, 245, 249] } }],
      ...report.aiIntelligence.suggestedQuestions.map((item) => [{ content: `• ${item}` }]),
      [{ content: 'Recommended actions', styles: { fontStyle: 'bold', fillColor: [241, 245, 249] } }],
      ...report.aiIntelligence.recommendedActions.map((item) => [{ content: `• ${item}` }]),
    ],
    styles: { fontSize: 9, cellPadding: 2.1, textColor: [51, 65, 85] },
  });

  y = (doc as jsPDF & { lastAutoTable?: { finalY?: number } }).lastAutoTable?.finalY ?? y + 18;
  if (y > 180) {
    doc.addPage();
    y = 18;
  }
  y = addSectionTitle(doc, 'Evidence Packet', y + 4);
  autoTable(doc, {
    startY: y,
    theme: 'grid',
    head: [['Artifact', 'Type', 'Hash / URL']],
    body: [
      ...(report.evidencePacket.includedFiles?.map((file) => [file.name, file.type, safe(file.hash || file.url)]) ?? [['No attached files', 'Not available', 'Pending connection']]),
      ...(report.evidencePacket.screenshots?.map((shot) => [shot.name, 'Screenshot', safe(shot.hash || shot.url)]) ?? []),
    ],
    styles: { fontSize: 9, cellPadding: 2.2 },
    headStyles: { fillColor: [6, 95, 70] },
  });
  y = (doc as jsPDF & { lastAutoTable?: { finalY?: number } }).lastAutoTable?.finalY ?? y + 8;
  y = addParagraph(doc, `Evidence hash: ${safe(report.hashes.evidenceHash, 'Pending generation')}`, y);

  if (y > 190) {
    doc.addPage();
    y = 18;
  }
  y = addSectionTitle(doc, 'Blockchain / DPAL Evidence Ledger', y + 4);
  autoTable(doc, {
    startY: y,
    theme: 'grid',
    body: [
      ['Chain name', report.ledger.chainName],
      ['Chain type', report.ledger.chainType],
      ['Block ID', safe(report.ledger.blockId)],
      ['Report hash', safe(report.hashes.reportPayloadHash)],
      ['PDF hash', safe(report.hashes.pdfHash, 'Pending after PDF generation')],
      ['Evidence hash', safe(report.hashes.evidenceHash)],
      ['Previous block hash', safe(report.hashes.previousBlockHash)],
      ['Current block hash', safe(report.hashes.blockHash)],
      ['Timestamp', safe(report.ledger.blockTimestamp)],
      ['Transaction ID', safe(report.ledger.transactionId, 'Not available')],
      ['Verification URL', safe(report.qr.verificationUrl)],
    ],
    styles: { fontSize: 9, cellPadding: 2.1 },
    columnStyles: { 0: { cellWidth: 46, fontStyle: 'bold' }, 1: { cellWidth: 134 } },
  });
  y = (doc as jsPDF & { lastAutoTable?: { finalY?: number } }).lastAutoTable?.finalY ?? y + 8;
  if (qrImage) {
    doc.addImage(qrImage, 'PNG', 14, y, 34, 34);
    y += 40;
  }

  if (y > 220) {
    doc.addPage();
    y = 18;
  }
  y = addSectionTitle(doc, 'Legal / Scientific Disclaimer', y + 4);
  const disclaimer = [
    'This report is an environmental intelligence and evidence organization record.',
    'It is not a final legal, regulatory, engineering, or certified carbon-credit determination.',
    'Satellite readings must be verified with ground truth, lab testing, agency records, or qualified expert review before enforcement or credit issuance claims.',
    'Blockchain/hash logging proves record integrity and timestamping, not automatic factual truth.',
    ...report.aiIntelligence.disclaimers,
  ].join(' ');
  doc.setFillColor(riskTone(report));
  doc.roundedRect(12, y - 2, 186, 34, 4, 4, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(9.5);
  doc.text(doc.splitTextToSize(disclaimer, 176), 16, y + 4);

  const arrayBuffer = doc.output('arraybuffer');
  const pdfHash = await sha256Bytes(arrayBuffer);
  const blob = new Blob([arrayBuffer], { type: 'application/pdf' });
  return {
    blob,
    arrayBuffer,
    fileName: `dpal-aquascan-evidence-report-${report.reportId}.pdf`,
    pdfHash,
  };
}

export async function downloadAquaScanEvidencePdf(report: AquaScanEvidenceReport): Promise<AquaScanPdfResult> {
  const result = await generateAquaScanEvidencePdf(report);
  const url = URL.createObjectURL(result.blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = result.fileName;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
  return result;
}
