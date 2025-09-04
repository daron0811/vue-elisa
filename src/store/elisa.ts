import { defineStore } from 'pinia';
import { makeZeroGrid, parseODGrid } from '@/composables/useODParser';


export type WellType = 'S' | 'U' | 'C' | 'BL' | '';


export interface ElisaState {
    od: number[][]; // 8x12 原始 OD
    // 後續 M2+ 會加上：plate 版型、standards、dilution、options、result ...
}


export const useElisaStore = defineStore('elisa', {
    state: (): ElisaState => ({
        od: makeZeroGrid(8, 12),
    }),
    getters: {
        odRows: (s) => s.od,
    },
    actions: {
        setOD(matrix: number[][]) {
            // 輕量驗證尺寸
            if (matrix.length !== 8 || matrix.some((r) => r.length !== 12)) {
                throw new Error('OD 資料必須是 8×12');
            }
            this.od = matrix.map((row) => row.map((v) => (Number.isFinite(v) ? Number(v) : 0)));
        },
        clearOD() {
            this.od = makeZeroGrid(8, 12);
        },
        /**
        * 由貼上文字解析並設定 OD；回傳 warnings 供 UI 顯示
        */
        setODFromText(text: string): string[] {
            const { data, warnings } = parseODGrid(text, 8, 12);
            this.setOD(data);
            return warnings;
        },
    },
});