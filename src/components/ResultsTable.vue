<template>
    <section class="panel">
        <header class="panel__hdr">
            <h2>Step 5 — 未知樣本反算濃度</h2>
        </header>

        <table class="tbl" v-if="items?.length">
            <thead>
                <tr>
                    <th>樣品</th>
                    <th>n</th>
                    <th>OD (mean±SD)</th>
                    <th>反算濃度 (未乘稀釋)</th>
                    <th>稀釋倍數</th>
                    <th>最終濃度 ({{ unit }})</th>
                    <th>CV%</th>
                    <th>Flags</th>
                </tr>
            </thead>
            <tbody>
                <tr v-for="row in items" :key="row.kind + row.idx">
                    <td><b>{{ row.kind }}{{ row.idx }}</b></td>
                    <td>{{ row.n }}</td>
                    <td>{{ fmt(row.odMean) }} ± {{ fmt(row.odSD) }}</td>
                    <td>
                        <span v-if="isNum(row.concRawMean)">{{ fmt(row.concRawMean) }}</span>
                        <span v-else>—</span>
                    </td>
                    <td>×{{ row.dilution }}</td>
                    <td>
                        <span v-if="isNum(row.concFinalMean)">{{ fmt(row.concFinalMean) }}</span>
                        <span v-else>—</span>
                        <small v-if="isNum(row.concFinalSD)"> ± {{ fmt(row.concFinalSD) }}</small>
                    </td>
                    <td><span v-if="isNum(row.cvPct)">{{ fmt(row.cvPct) }}</span><span v-else>—</span></td>
                    <td>
                        <span v-if="row.flags.length" class="flags">
                            <span class="flag" v-for="(f, i) in row.flags" :key="i">{{ f }}</span>
                        </span>
                        <span v-else>—</span>
                    </td>
                </tr>
            </tbody>
        </table>

        <p v-else class="hint">尚無結果。請先在 Step 4 執行 Analyze。</p>
    </section>
</template>

<script setup lang="ts">
import type { BackcalcItem } from '@/store/elisa';

defineProps<{ items: BackcalcItem[] | undefined; unit: string }>();

const isNum = (v: number) => Number.isFinite(v);
const fmt = (v: number) => (Number.isFinite(v) ? Number(v).toFixed(3) : '—');
</script>

<style scoped>
.panel {
    display: grid;
    gap: 1rem;
}

.tbl {
    width: 100%;
    border-collapse: collapse;
}

.tbl th,
.tbl td {
    border: 1px solid #e1e1e1;
    padding: .5rem .6rem;
    text-align: left;
    vertical-align: middle;
}

.tbl thead th {
    background: #f6f8fa;
}

.flags {
    display: inline-flex;
    gap: .3rem;
    flex-wrap: wrap;
}

.flag {
    background: #fff3cd;
    border: 1px solid #ffe69c;
    color: #7a5b00;
    padding: 0 .4rem;
    border-radius: 999px;
    font-size: .8rem;
}

.hint {
    color: #666;
}
</style>
