import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import type { BackcalcItem } from '@/store/elisa';

function n(x: number) { return Number.isFinite(x) ? Number(x).toFixed(3) : '-'; }

export function exportExcel(opts: {
  items: BackcalcItem[];
  model: 'Linear'|'4PL'|'5PL';
  params: Record<string, number>;
  unit: string;
  stdPoints: { x: number; y: number }[];
  filename?: string;
}) {
  const wb = XLSX.utils.book_new();

  const header = ['Sample','n','OD mean','OD SD','Raw conc','Dilution','Final conc ('+opts.unit+')','Final SD','CV%','Flags'];
  const rows = opts.items.map(r => [
    `${r.kind}${r.idx}`, r.n,
    n(r.odMean), n(r.odSD),
    n(r.concRawMean),
    `x${r.dilution}`,
    n(r.concFinalMean), n(r.concFinalSD),
    n(r.cvPct),
    r.flags.join('; ')
  ]);
  const ws1 = XLSX.utils.aoa_to_sheet([header, ...rows]);
  XLSX.utils.book_append_sheet(wb, ws1, 'Summary');

  const stdHeader = ['Concentration', 'OD'];
  const stdRows = opts.stdPoints.map(p => [p.x, p.y]);
  const ws2 = XLSX.utils.aoa_to_sheet([stdHeader, ...stdRows]);
  XLSX.utils.book_append_sheet(wb, ws2, 'Standards');

  const fname = opts.filename || 'ELISA_Result.xlsx';
  XLSX.writeFile(wb, fname);
}

export function exportPDF(opts: {
  items: BackcalcItem[];
  model: 'Linear'|'4PL'|'5PL';
  params: Record<string, number>;
  unit: string;
  filename?: string;
}) {
  const doc = new jsPDF({ unit: 'pt', format: 'a4' });
  const margin = 40;
  let y = margin;

  doc.setFontSize(16);
  doc.text('ELISA Report', margin, y); y += 20;
  doc.setFontSize(11);
  doc.text(`Model: ${opts.model}`, margin, y); y += 16;
  doc.text(`Params: ${Object.entries(opts.params).map(([k,v])=>`${k}=${n(v as any)}`).join(', ')}`, margin, y); y += 24;

  autoTable(doc, {
    startY: y,
    head: [[ 'Sample','n','OD mean','OD SD','Raw conc','Dilution','Final conc ('+opts.unit+')','Final SD','CV%','Flags' ]],
    body: opts.items.map(r => [
      `${r.kind}${r.idx}`, r.n,
      n(r.odMean), n(r.odSD),
      n(r.concRawMean),
      `x${r.dilution}`,
      n(r.concFinalMean), n(r.concFinalSD),
      n(r.cvPct),
      r.flags.join('; ')
    ]),
    styles: { fontSize: 9 },
    headStyles: { fillColor: [240,240,240] },
    margin: { left: margin, right: margin },
  });

  const fname = opts.filename || 'ELISA_Report.pdf';
  doc.save(fname);
}
