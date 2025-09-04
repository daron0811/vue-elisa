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
}


export type FillDirection = 'row' | 'col';
export type ReplicateDir = 'h' | 'v';


export const useElisaStore = defineStore('elisa', {
    state: (): ElisaState => ({
        od: makeZeroGrid(8, 12),
        plate: makePlate(8, 12),
    }),
    getters: {
        odRows: (s) => s.od,
        plateRows: (s) => s.plate,
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
    },
});