import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import type { BackcalcItem } from '@/store/elisa';

export function exportExcel(opts: {
    items: BackcalcItem[];
    model: 'Linear' | '4PL' | '5PL';
    params: Record<string, number>;
    unit: string;
    stdPoints: { x: number; y: number }[];
    filename?: string;
}) {
    const wb = XLSX.utils.book_new();

    // Sheet 1: Summary
    const header = ['Sample', 'n', 'OD mean', 'OD SD', 'Raw conc', 'Dilution', 'Final conc (' + opts.unit + ')', 'Final SD', 'CV%', 'Flags'];
    const rows = opts.items.map(r => ([
        `${r.kind}${r.idx}`, r.n,
        n(r.odMean), n(r.odSD),
        n(r.concRawMean),
        `x${r.dilution}`,
        n(r.concFinalMean), n(r.concFinalSD),
        n(r.cvPct),
        r.flags.join('; ')
    ]));
    const ws1 = XLSX.utils.aoa_to_sheet([header, ...rows]);
    XLSX.utils.book_append_sheet(wb, ws1, 'Summary');

    // Sheet 2: Standards & Fit
    const p = opts.params as any;
    const meta = [
        ['Model', opts.model],
        ['Params', Object.keys(p).map(k => `${k}=${fmt(p[k])}`).join(', ')],
    ];
    const stdHeader = ['Std conc (' + opts.unit + ')', 'OD'];
    const stdRows = opts.stdPoints.map(s => [n(s.x), n(s.y)]);
    const ws2 = XLSX.utils.aoa_to_sheet([...meta, [], stdHeader, ...stdRows]);
    XLSX.utils.book_append_sheet(wb, ws2, 'Standards');

    XLSX.writeFile(wb, opts.filename || 'ELISA_Report.xlsx');

    function fmt(v: number) { return Number.isFinite(v) ? Number(v).toFixed(4) : ''; }
    function n(v: number) { return Number.isFinite(v) ? v : ''; }
}

export function exportPDF(opts: {
    items: BackcalcItem[];
    model: 'Linear' | '4PL' | '5PL';
    params: Record<string, number>;
    unit: string;
    filename?: string;
}) {
    const doc = new jsPDF({ unit: 'pt', format: 'a4' });
    const margin = 40;
    let y = margin;

    // Title
    doc.setFontSize(16);
    doc.text('ELISA Analysis Report', margin, y); y += 22;

    // Model / params
    doc.setFontSize(11);
    const p = opts.params as any;
    const line1 = `Model: ${opts.model}`;
    const line2 = `Params: ${Object.keys(p).map(k => `${k}=${fmt(p[k])}`).join(', ')}`;
    doc.text(line1, margin, y); y += 16;
    doc.text(line2, margin, y); y += 20;

    // Table
    const head = [['Sample', 'n', 'OD mean', 'OD SD', 'Raw conc', 'Dilution', 'Final conc (' + opts.unit + ')', 'Final SD', 'CV%', 'Flags']];
    const body = opts.items.map(r => ([
        `${r.kind}${r.idx}`, r.n,
        fmt(r.odMean), fmt(r.odSD),
        fmt(r.concRawMean),
        `x${r.dilution}`,
        fmt(r.concFinalMean), fmt(r.concFinalSD),
        fmt(r.cvPct),
        r.flags.join('; ')
    ]));

    autoTable(doc, {
        startY: y,
        head, body,
        styles: { fontSize: 10, cellPadding: 4 },
        headStyles: { fillColor: [246, 248, 250], textColor: 0 },
        margin: { left: margin, right: margin },
    });

    doc.save(opts.filename || 'ELISA_Report.pdf');

    function fmt(v: number) { return Number.isFinite(v) ? Number(v).toFixed(3) : '-'; }
}
