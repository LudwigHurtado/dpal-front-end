import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import type { CarbSpecializedReport } from '../types/carbReport';
import { sha256Bytes } from '../utils/hashUtils';

export interface CarbPdfResult {
  blob: Blob;
  arrayBuffer: ArrayBuffer;
  fileName: string;
  pdfHash: string;
}

function safe(value: unknown, fallback = 'Not available'): string {
  if (value == null) return fallback;
  const text = String(value).trim();
  return text || fallback;
}

function pct(value: number | null | undefined): string {
  if (value == null || !Number.isFinite(value)) return 'Not available';
  return `${value.toFixed(2)}%`;
}

export async function generateCarbReportPdf(report: CarbSpecializedReport): Promise<CarbPdfResult> {
  const doc = new jsPDF({ unit: 'mm', format: 'a4' });
  const pageWidth = doc.internal.pageSize.getWidth();

  doc.setFillColor(15, 23, 42);
  doc.rect(0, 0, pageWidth, 38, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(19);
  doc.text('DPAL CARB Specialized Emissions Report', 14, 16);
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text(`Report ID: ${report.reportId}`, 14, 24);
  doc.text(`Audit ID: ${report.auditId}`, 14, 30);

  autoTable(doc, {
    startY: 46,
    theme: 'grid',
    head: [['Facility', 'Operator', 'Facility ID']],
    body: [[
      safe(report.facilityIdentity.facilityName),
      safe(report.facilityIdentity.operatorName),
      safe(report.facilityIdentity.facilityId),
    ]],
    styles: { fontSize: 9, cellPadding: 2.2 },
    headStyles: { fillColor: [15, 23, 42] },
  });

  autoTable(doc, {
    startY: ((doc as jsPDF & { lastAutoTable?: { finalY?: number } }).lastAutoTable?.finalY ?? 66) + 5,
    theme: 'grid',
    body: [
      ['County / City / State', `${safe(report.location.county)} / ${safe(report.location.city)} / ${safe(report.location.state, 'California')}`],
      ['Coordinates', report.location.latitude != null && report.location.longitude != null ? `${report.location.latitude}, ${report.location.longitude}` : safe(report.location.coordinatesLabel)],
      ['Baseline year / Current year', `${report.reportingYears.baselineYear} / ${report.reportingYears.currentYear}`],
      ['Baseline total CO2e', safe(report.emissionsComparison.baselineCO2e)],
      ['Current total CO2e', safe(report.emissionsComparison.currentCO2e)],
      ['Calculated reduction', pct(report.emissionsComparison.calculatedReductionPct)],
      ['Company claim', safe(report.companyClaim)],
      ['Claim verification classification', safe(report.claimVerificationResult)],
      ['Claim gap', pct(report.claimGapPct)],
      ['Integrity score / Risk level', `${safe(report.integrityScore)} / ${safe(report.riskLevel)}`],
      ['Data source mode', safe(report.sourceMode)],
      ['Dataset version', safe(report.datasetVersion)],
      ['Retrieval date', safe(report.retrievalDate)],
      ['QR verification URL', safe(report.qr.verificationUrl)],
    ],
    styles: { fontSize: 9, cellPadding: 2.2 },
    columnStyles: { 0: { cellWidth: 58, fontStyle: 'bold' }, 1: { cellWidth: 122 } },
  });

  let y = ((doc as jsPDF & { lastAutoTable?: { finalY?: number } }).lastAutoTable?.finalY ?? 150) + 7;
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(15, 23, 42);
  doc.setFontSize(12);
  doc.text('Recommended next steps', 14, y);
  y += 5;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9.5);
  doc.setTextColor(51, 65, 85);
  const steps = report.recommendedNextSteps.length ? report.recommendedNextSteps : ['No additional steps recorded.'];
  steps.slice(0, 8).forEach((step) => {
    const wrapped = doc.splitTextToSize(`- ${step}`, 178);
    doc.text(wrapped, 14, y);
    y += wrapped.length * 4.6;
  });

  y += 3;
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(127, 29, 29);
  doc.text('Legal disclaimer', 14, y);
  y += 4.5;
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(71, 85, 105);
  const disclaimerLines = doc.splitTextToSize(report.disclaimer, 182);
  doc.text(disclaimerLines, 14, y);

  const arrayBuffer = doc.output('arraybuffer');
  const pdfHash = await sha256Bytes(arrayBuffer);
  return {
    blob: new Blob([arrayBuffer], { type: 'application/pdf' }),
    arrayBuffer,
    fileName: `dpal-carb-specialized-report-${report.reportId}.pdf`,
    pdfHash,
  };
}

export async function downloadCarbReportPdf(report: CarbSpecializedReport): Promise<CarbPdfResult> {
  const pdf = await generateCarbReportPdf(report);
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
