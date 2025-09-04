import { defineStore } from 'pinia';
import { makeZeroGrid, parseODGrid } from '@/composables/useODParser';


export type WellType = 'S' | 'U' | 'C' | 'BL' | '';
export interface WellCell { r: number; c: number; type: WellType; idx?: number }


function makePlate(rows = 8, cols = 12): WellCell[][] {
    return Array.from({ length: rows }, (_, r) =>
        Array.from({ length: cols }, (_, c) => ({ r, c, type: '' as WellType }))
    );
}

export interface ElisaState {
    // M1
    od: number[][]; // 8x12 原始 OD
    // M2
    plate: WellCell[][]; // 8x12 版型（S/U/C/BL/空 + 編號）
    // M3
    standards: StandardsState;
}

export interface StandardsState {
    unit: string; // 例如 'ng/mL'
    standards: Record<number, number>; // S1..Sn 的濃度
    defaultDilution: { U: number; C: number };
    dilutionU: Record<number, number>; // U1..Un 的客製稀釋倍數
    dilutionC: Record<number, number>; // C1..Cn 的客製稀釋倍數
}


export type FillDirection = 'row' | 'col';
export type ReplicateDir = 'h' | 'v';


// === 修改 state 初始值 ===
export const useElisaStore = defineStore('elisa', {
    state: (): ElisaState => ({
        od: makeZeroGrid(8, 12),
        plate: makePlate(8, 12),
        standards: {
            unit: 'ng/mL',
            standards: {},
            defaultDilution: { U: 1, C: 1 },
            dilutionU: {},
            dilutionC: {},
        },
    }),
    getters: {
        odRows: (s) => s.od,
        plateRows: (s) => s.plate,


        // 目前版面中存在的 S/U/C 索引（依數字由小到大）
        standardIndices: (s) => indicesOf(s.plate, 'S'),
        unknownIndices: (s) => indicesOf(s.plate, 'U'),
        controlIndices: (s) => indicesOf(s.plate, 'C'),
    },
    actions: {
        // ===== M1: OD =====
        setOD(matrix: number[][]) {
            if (matrix.length !== 8 || matrix.some((r) => r.length !== 12)) {
                throw new Error('OD 資料必須是 8×12');
            }
            this.od = matrix.map((row) => row.map((v) => (Number.isFinite(v) ? Number(v) : 0)));
        },
        clearOD() { this.od = makeZeroGrid(8, 12); },
        setODFromText(text: string): string[] {
            const { data, warnings } = parseODGrid(text, 8, 12);
            this.setOD(data);
            return warnings;
        },


        // ===== M2: Plate =====

        clearPlate() { this.plate = makePlate(8, 12); },


        setCell(r: number, c: number, type: WellType, idx?: number) {
            const cell = this.plate[r][c];
            if (type === '' || type === 'BL') {
                cell.type = type;
                delete cell.idx; // BL 或空 不需要編號
            } else {
                cell.type = type;
                if (idx !== undefined) cell.idx = idx; else delete cell.idx;
            }
        },


        /**
        * 依矩形範圍批次上色；可選擇自動編號。
        */
        fillRect(
            r1: number, c1: number, r2: number, c2: number,
            type: WellType | 'ERASE',
            opt?: { autoNumber?: boolean; startIndex?: number; fillDir?: FillDirection; replicates?: number; repDir?: ReplicateDir }
        ) {
            const R1 = Math.min(r1, r2), R2 = Math.max(r1, r2);
            const C1 = Math.min(c1, c2), C2 = Math.max(c1, c2);


            // 橡皮擦：清空
            if (type === 'ERASE') {
                for (let r = R1; r <= R2; r++) for (let c = C1; c <= C2; c++) this.setCell(r, c, '');
                return;
            }


            const auto = !!opt?.autoNumber && (type === 'S' || type === 'U' || type === 'C');
            const start = Math.max(1, opt?.startIndex ?? 1);
            const fillDir: FillDirection = opt?.fillDir ?? 'row';
            const reps = Math.max(1, Math.min(12, opt?.replicates ?? 1));
            const repDir: ReplicateDir = opt?.repDir ?? 'h';


            // 產生座標清單（依填充方向排序）
            const cells: { r: number; c: number }[] = [];
            if (fillDir === 'row') {
                for (let r = R1; r <= R2; r++) for (let c = C1; c <= C2; c++) cells.push({ r, c });
            } else {
                for (let c = C1; c <= C2; c++) for (let r = R1; r <= R2; r++) cells.push({ r, c });
            }


            if (!auto) {
                // 僅上色，不編號（BL 也走這裡）
                for (const { r, c } of cells) this.setCell(r, c, type);
                return;
            }


            // ===== 自動編號 =====
            const assigned = new Set<string>();
            let curIdx = start;
            const key = (r: number, c: number) => `${r}-${c}`;

            const inRect = (r: number, c: number) => r >= R1 && r <= R2 && c >= C1 && c <= C2;


            // 取得某 cell 在指定方向上的下一個鄰居
            const step = repDir === 'h' ? (rc: { r: number; c: number }) => ({ r: rc.r, c: rc.c + 1 })
                : (rc: { r: number; c: number }) => ({ r: rc.r + 1, c: rc.c });


            const unassignedCells = () => cells.filter(({ r, c }) => !assigned.has(key(r, c)));


            for (const rc of cells) {
                if (assigned.has(key(rc.r, rc.c))) continue;
                // 第 1 個複本
                this.setCell(rc.r, rc.c, type, curIdx);
                assigned.add(key(rc.r, rc.c));


                // 嘗試沿著 repDir 尋找其餘複本，使之相鄰；若不夠就拿下一個未指派 cell 補齊
                let need = reps - 1;
                let cursor = { ...rc };
                while (need > 0) {
                    const nxt = step(cursor);
                    if (inRect(nxt.r, nxt.c) && !assigned.has(key(nxt.r, nxt.c))) {
                        this.setCell(nxt.r, nxt.c, type, curIdx);
                        assigned.add(key(nxt.r, nxt.c));
                        cursor = nxt;
                        need--;
                    } else {
                        // 找不到相鄰，改用下一個未分配的 cell
                        const fallback = unassignedCells()[0];
                        if (!fallback) break;
                        this.setCell(fallback.r, fallback.c, type, curIdx);
                        assigned.add(key(fallback.r, fallback.c));
                        // 不中斷相鄰搜尋，讓下一圈仍嘗試接在 fallback 之後
                        cursor = { ...fallback };
                        need--;
                    }
                }
                curIdx++;
            }
        },

        // ====== M3 Standards ======
        setStandard(idx: number, val: number) {
            this.standards.standards[idx] = Number(val) || 0;
        },
        setUnit(u: string) { this.standards.unit = u; },


        autofillStandardsByGradient(start: number, fold: number) {
            const list = this.standardIndices; // 依 plate 現況
            if (!list.length) return;
            const N = list.length;
            const values = serialDilution(start, fold, N);
            list.forEach((idx, i) => { this.standards.standards[idx] = values[i]; });
        },


        // ====== M3 Dilution ======
        setDefaultDilutionU(v: number) { this.standards.defaultDilution.U = clampDil(v); },
        setDefaultDilutionC(v: number) { this.standards.defaultDilution.C = clampDil(v); },


        setDilution(type: 'U' | 'C', idx: number, v: number) {
            if (type === 'U') this.standards.dilutionU[idx] = clampDil(v);
            else this.standards.dilutionC[idx] = clampDil(v);
        },


        applyDilutionRange(type: 'U' | 'C', start: number, end: number, v: number) {
            const set = type === 'U' ? this.unknownIndices : this.controlIndices;
            const lo = Math.min(start, end), hi = Math.max(start, end);
            for (const idx of set) if (idx >= lo && idx <= hi) this.setDilution(type, idx, v);
        },
        // 清理：若 plate 已不含某編號，移除對應資料
        syncWithPlate() {
            const S = new Set(this.standardIndices);
            const U = new Set(this.unknownIndices);
            const C = new Set(this.controlIndices);
            // 標準品濃度
            for (const k of Object.keys(this.standards.standards)) {
                const idx = Number(k);
                if (!S.has(idx)) delete this.standards.standards[idx];
            }
            // 稀釋倍數
            for (const k of Object.keys(this.standards.dilutionU)) {
                const idx = Number(k);
                if (!U.has(idx)) delete this.standards.dilutionU[idx];
            }
            for (const k of Object.keys(this.standards.dilutionC)) {
                const idx = Number(k);
                if (!C.has(idx)) delete this.standards.dilutionC[idx];
            }
        },
    },
});

// ====== 輔助：由 plate 萃取現存索引 ======
function indicesOf(plate: WellCell[][], type: WellType): number[] {
    const set = new Set<number>();
    for (const row of plate) for (const cell of row) if (cell.type === type && typeof cell.idx === 'number') set.add(cell.idx);
    return Array.from(set).sort((a, b) => a - b);
}


// 序列稀釋：start, start/fold, start/fold^2, ... N 筆
function serialDilution(start: number, fold: number, N: number): number[] {
    const s = Number(start) || 0;
    const f = Number(fold) || 1;
    const arr: number[] = [];
    for (let i = 0; i < N; i++) arr.push(round3(s / Math.pow(Math.max(f, 1e-9), i)));
    return arr;
}


function round3(x: number) { return Math.round(x * 1000) / 1000; }
function clampDil(v: number) { const n = Number(v) || 1; return n < 1 ? 1 : n; }