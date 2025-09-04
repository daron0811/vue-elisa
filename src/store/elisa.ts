import { defineStore } from 'pinia';
import { makeZeroGrid, parseODGrid } from '@/composables/useODParser';
import { mean, Model, invertY } from '@/utils/math';
import { runFit } from '@/services/fit';

export type WellType = 'S' | 'U' | 'C' | 'BL' | '';
export interface WellCell { r: number; c: number; type: WellType; idx?: number }
function makePlate(rows = 8, cols = 12): WellCell[][] {
  return Array.from({ length: rows }, (_, r) =>
    Array.from({ length: cols }, (_, c) => ({ r, c, type: '' as WellType }))
  );
}

export interface StandardsState {
  unit: string;
  standards: Record<number, number>;
  defaultDilution: { U: number; C: number };
  dilutionU: Record<number, number>;
  dilutionC: Record<number, number>;
}

export interface BackcalcItem {
  kind: 'U' | 'C';
  idx: number;
  n: number;
  odMean: number;
  odSD: number;
  dilution: number;
  concRawMean: number;
  concRawSD: number;
  concFinalMean: number;
  concFinalSD: number;
  cvPct: number;
  flags: string[];
}

export type FillDirection = 'row' | 'col';
export type ReplicateDir = 'h' | 'v';
export type PlotScale = 'normal' | 'semi-log' | 'log-log';

export interface AnalysisOptions { model: Model; plot: PlotScale; subtractBlank: boolean }
export interface FitParams { a?: number; b?: number; c?: number; d?: number; e?: number; m?: number; b_lin?: number; r2: number }
export interface AnalysisResult { params: FitParams; stdPoints: { x: number; y: number }[]; curve: { xs: number[]; ys: number[] } }

export interface ElisaState {
  od: number[][];
  plate: WellCell[][];
  standards: StandardsState;
  options: AnalysisOptions;
  result: AnalysisResult | null;
  backcalc: BackcalcItem[];
}

export const useElisaStore = defineStore('elisa', {
  state: (): ElisaState => ({
    od: makeZeroGrid(8, 12),
    plate: makePlate(8, 12),
    standards: { unit: 'ng/mL', standards: {}, defaultDilution: { U: 1, C: 1 }, dilutionU: {}, dilutionC: {} },
    options: { model: '4PL', plot: 'semi-log', subtractBlank: false },
    result: null,
    backcalc: [],
  }),
  getters: {
    odRows: (s) => s.od,
    plateRows: (s) => s.plate,
    standardIndices: (s) => indicesOf(s.plate, 'S'),
    unknownIndices:  (s) => indicesOf(s.plate, 'U'),
    controlIndices:  (s) => indicesOf(s.plate, 'C'),
  },
  actions: {
    // ===== M1 =====
    setOD(matrix: number[][]) {
      if (matrix.length !== 8 || matrix.some((r) => r.length !== 12)) throw new Error('OD 資料必須是 8×12');
      this.od = matrix.map((row) => row.map((v) => (Number.isFinite(v) ? Number(v) : 0)));
    },
    clearOD() { this.od = makeZeroGrid(8, 12); },
    setODFromText(text: string): string[] {
      const { data, warnings } = parseODGrid(text, 8, 12); this.setOD(data); return warnings;
    },

    // ===== M2 =====
    clearPlate() { this.plate = makePlate(8, 12); },
    setCell(r: number, c: number, type: WellType, idx?: number) {
      const cell = this.plate[r][c];
      if (type === '' || type === 'BL') { cell.type = type; delete cell.idx; }
      else { cell.type = type; if (idx !== undefined) cell.idx = idx; else delete cell.idx; }
    },
    fillRect(r1: number, c1: number, r2: number, c2: number, type: WellType | 'ERASE', opt?: { autoNumber?: boolean; startIndex?: number; fillDir?: FillDirection; replicates?: number; repDir?: ReplicateDir }) {
      const R1 = Math.min(r1, r2), R2 = Math.max(r1, r2); const C1 = Math.min(c1, c2), C2 = Math.max(c1, c2);
      if (type === 'ERASE') { for (let r = R1; r <= R2; r++) for (let c = C1; c <= C2; c++) this.setCell(r, c, ''); return; }
      const auto = !!opt?.autoNumber && (type === 'S' || type === 'U' || type === 'C');
      const start = Math.max(1, opt?.startIndex ?? 1);
      const fillDir: FillDirection = opt?.fillDir ?? 'row';
      const reps = Math.max(1, Math.min(12, opt?.replicates ?? 1));
      const repDir: ReplicateDir = opt?.repDir ?? 'h';
      const cells: { r: number; c: number }[] = [];
      if (fillDir === 'row') { for (let r = R1; r <= R2; r++) for (let c = C1; c <= C2; c++) cells.push({ r, c }); }
      else { for (let c = C1; c <= C2; c++) for (let r = R1; r <= R2; r++) cells.push({ r, c }); }
      if (!auto) { for (const { r, c } of cells) this.setCell(r, c, type); return; }
      const assigned = new Set<string>(); let curIdx = start; const key = (r: number, c: number) => `${r}-${c}`;
      const inRect = (r: number, c: number) => r >= R1 && r <= R2 && c >= C1 && c <= C2;
      const step = repDir === 'h' ? (rc: { r: number; c: number }) => ({ r: rc.r, c: rc.c + 1 }) : (rc: { r: number; c: number }) => ({ r: rc.r + 1, c: rc.c });
      const unassignedCells = () => cells.filter(({ r, c }) => !assigned.has(key(r, c)));
      for (const rc of cells) {
        if (assigned.has(key(rc.r, rc.c))) continue; this.setCell(rc.r, rc.c, type, curIdx); assigned.add(key(rc.r, rc.c));
        let need = reps - 1; let cursor = { ...rc };
        while (need > 0) {
          const nxt = step(cursor);
          if (inRect(nxt.r, nxt.c) && !assigned.has(key(nxt.r, nxt.c))) { this.setCell(nxt.r, nxt.c, type, curIdx); assigned.add(key(nxt.r, nxt.c)); cursor = nxt; need--; }
          else { const fallback = unassignedCells()[0]; if (!fallback) break; this.setCell(fallback.r, fallback.c, type, curIdx); assigned.add(key(fallback.r, fallback.c)); cursor = { ...fallback }; need--; }
        }
        curIdx++;
      }
    },

    // ===== M3 =====
    setStandard(idx: number, val: number) { this.standards.standards[idx] = Number(val) || 0; },
    setUnit(u: string) { this.standards.unit = u; },
    autofillStandardsByGradient(start: number, fold: number) {
      const list = this.standardIndices; if (!list.length) return; const N = list.length; const values: number[] = [];
      for (let i = 0; i < N; i++) values.push(Number((start / Math.pow(Math.max(fold, 1e-9), i)).toFixed(3)));
      list.forEach((idx, i) => { this.standards.standards[idx] = values[i]; });
    },
    setDefaultDilutionU(v: number) { this.standards.defaultDilution.U = clampDil(v); },
    setDefaultDilutionC(v: number) { this.standards.defaultDilution.C = clampDil(v); },
    setDilution(type: 'U'|'C', idx: number, v: number) { if (type==='U') this.standards.dilutionU[idx] = clampDil(v); else this.standards.dilutionC[idx] = clampDil(v); },
    applyDilutionRange(type: 'U'|'C', start: number, end: number, v: number) {
      const set = type==='U'? this.unknownIndices : this.controlIndices; const lo = Math.min(start, end), hi = Math.max(start, end);
      for (const idx of set) if (idx>=lo && idx<=hi) this.setDilution(type, idx, v);
    },
    syncWithPlate() {
      const S = new Set(this.standardIndices), U = new Set(this.unknownIndices), C = new Set(this.controlIndices);
      for (const k of Object.keys(this.standards.standards)) if (!S.has(Number(k))) delete this.standards.standards[Number(k)];
      for (const k of Object.keys(this.standards.dilutionU)) if (!U.has(Number(k))) delete this.standards.dilutionU[Number(k)];
      for (const k of Object.keys(this.standards.dilutionC)) if (!C.has(Number(k))) delete this.standards.dilutionC[Number(k)];
    },

    // ===== M4 =====
    setOptions(partial: Partial<AnalysisOptions>) { this.options = { ...this.options, ...partial }; },

    aggregate() {
      type Acc = Record<string, number[]>; const acc: Acc = {}; let blanks: number[] = [];
      for (let r=0;r<8;r++) for (let c=0;c<12;c++) {
        const cell = this.plate[r][c]; const v = this.od[r][c]; if (!cell.type) continue;
        if (cell.type==='BL') { blanks.push(v); continue; }
        if (typeof cell.idx !== 'number') continue; const key = `${cell.type}${cell.idx}`; (acc[key] ??= []).push(v);
      }
      const blAvg = blanks.length ? mean(blanks) : 0;
      return { acc, blAvg };
    },

    standardPoints() {
      const { acc, blAvg } = this.aggregate(); const pts: { x:number; y:number }[] = []; const minus = this.options.subtractBlank ? blAvg : 0;
      const idxList = this.standardIndices;
      for (const idx of idxList) {
        const conc = this.standards.standards[idx]; if (!Number.isFinite(conc) || conc<=0) continue;
        const ys = acc[`S${idx}`] ?? []; if (!ys.length) continue; const y = mean(ys) - minus; if (!Number.isFinite(y)) continue;
        pts.push({ x: conc, y: y });
      }
      return pts.filter(p => Number.isFinite(p.x) && Number.isFinite(p.y) && p.x>0 && p.y>0);
    },

    async analyze() {
      const pts = this.standardPoints();
      if ((this.options.model==='Linear' && pts.length<2) || (this.options.model!=='Linear' && pts.length<3)) throw new Error('標準點數不足，Linear 需≥2，4PL/5PL 需≥3');
      const xs = pts.map(p=>p.x), ys = pts.map(p=>p.y);
      const res = await runFit({ model: this.options.model, xs, ys });
      if (!res.ok) throw new Error(res.error);

      const minX = Math.min(...xs), maxX = Math.max(...xs);
      const grid = makeGrid(minX, maxX, this.options.plot);
      let ysCurve: number[];
      if (this.options.model==='Linear') { const { m, b } = res.params as any; ysCurve = grid.map(x => m*x + b); }
      else if (this.options.model==='4PL') { const { a,b,c,d } = res.params as any; ysCurve = grid.map(x => (d + (a-d)/(1+Math.pow(x/c,b)))); }
      else { const { a,b,c,d,e } = res.params as any; ysCurve = grid.map(x => (d + (a-d)/Math.pow(1+Math.pow(x/c,b), e))); }

      this.result = { params: normalizeParams(res, this.options.model), stdPoints: pts, curve: { xs: grid, ys: ysCurve } };
    },

    // ===== M5：反算 Unknown/Control =====
    computeBackcalc() {
      if (!this.result) { this.backcalc = []; return; }
      const { acc, blAvg } = this.aggregate();
      const minus = this.options.subtractBlank ? blAvg : 0;

      const model = this.options.model;
      const params = this.result.params;

      const xsStd = this.result.stdPoints.map(p => p.x);
      const ysStd = this.result.stdPoints.map(p => p.y);
      const xMin = Math.min(...xsStd), xMax = Math.max(...xsStd);
      const yMin = Math.min(...ysStd), yMax = Math.max(...ysStd);

      const list: BackcalcItem[] = [];

      const emitFor = (kind: 'U'|'C', indices: number[], defaultDil: number, perIdxDil: Record<number, number>) => {
        for (const idx of indices) {
          const raw = (acc[`${kind}${idx}`] ?? []).map(v => v - minus);
          const dilution = perIdxDil[idx] ?? defaultDil ?? 1;
          const concRawVals = raw.map(y => invertY(model, params as any, y)).filter(v => Number.isFinite(v));
          const flags = new Set<string>();

          raw.forEach((y, i) => {
            const x = concRawVals[i];
            if (!Number.isFinite(x)) { flags.add('無法反算'); return; }
            if (x < xMin || x > xMax || y < yMin || y > yMax) flags.add('OOR');
            if (y <= 0) flags.add('非正 OD');
          });

          const odMean = mean(raw);
          const odSD = sdOf(raw);
          const concRawMean = mean(concRawVals);
          const concRawSD = sdOf(concRawVals);
          const concFinalMean = Number.isFinite(concRawMean) ? concRawMean * dilution : NaN;
          const concFinalSD = Number.isFinite(concRawSD) ? concRawSD * dilution : NaN;
          const cvPct = (Number.isFinite(concFinalMean) && concFinalMean !== 0) ? (concFinalSD / Math.abs(concFinalMean)) * 100 : NaN;

          if (!concRawVals.length) flags.add('無有效複本');

          list.push({
            kind, idx, n: raw.length,
            odMean, odSD,
            dilution,
            concRawMean, concRawSD,
            concFinalMean, concFinalSD,
            cvPct,
            flags: Array.from(flags),
          });
        }
      };

      emitFor('U', this.unknownIndices, this.standards.defaultDilution.U, this.standards.dilutionU);
      emitFor('C', this.controlIndices, this.standards.defaultDilution.C, this.standards.dilutionC);

      list.sort((a,b) => (a.kind===b.kind) ? (a.idx-b.idx) : (a.kind==='U' ? -1 : 1));
      this.backcalc = list;
    },
  },
});

function indicesOf(plate: WellCell[][], type: WellType): number[] {
  const set = new Set<number>(); for (const row of plate) for (const cell of row) if (cell.type === type && typeof cell.idx === 'number') set.add(cell.idx);
  return Array.from(set).sort((a, b) => a - b);
}
function clampDil(v: number) { const n = Number(v) || 1; return n < 1 ? 1 : Math.round(n); }
function makeGrid(minX: number, maxX: number, plot: PlotScale) {
  const lo = Math.min(minX, maxX), hi = Math.max(minX, maxX);
  if (plot==='normal') { const pad = (hi-lo)*0.1 || hi*0.1; const a = Math.max(1e-12, lo - pad), b = hi + pad; return Array.from({length:200}, (_,i)=> a + (b-a)*(i/199)); }
  else { const a = Math.max(1e-6, lo / 10), b = hi * 10; const xs: number[] = []; const N=200; const loga = Math.log10(a), logb = Math.log10(b); for (let i=0;i<N;i++) xs.push(Math.pow(10, loga + (logb-loga)*i/(N-1))); return xs; }
}
function normalizeParams(res: any, model: Model): any {
  if (model==='Linear') return { m: res.params.m, b_lin: res.params.b, r2: res.r2 };
  if (model==='4PL') return { a: res.params.a, b: res.params.b, c: res.params.c, d: res.params.d, r2: res.r2 };
  return { a: res.params.a, b: res.params.b, c: res.params.c, d: res.params.d, e: res.params.e, r2: res.r2 };
}

function sdOf(arr: number[]) {
  if (!arr.length) return 0;
  const m = mean(arr);
  const v = arr.reduce((s, x) => s + (x - m) * (x - m), 0) / arr.length;
  return Math.sqrt(v);
}
