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
          <td><span v-if="isNum(row.concRawMean)">{{ fmt(row.concRawMean) }}</span><span v-else>—</span></td>
          <td>×{{ row.dilution }}</td>
          <td><span v-if="isNum(row.concFinalMean)">{{ fmt(row.concFinalMean) }}</span><span v-else>—</span></td>
          <td><span v-if="isNum(row.cvPct)">{{ fmt(row.cvPct) }}</span><span v-else>—</span></td>
          <td>
            <span v-for="(f,i) in row.flags" :key="i" class="flag">{{ f }}</span>
          </td>
        </tr>
      </tbody>
    </table>
    <p v-else class="hint">請在 Step 4 Analyze 後自動反算；若無資料，請確認 Step 2~3 設定與 BL 扣除選項。</p>
  </section>
</template>

<script setup lang="ts">
import type { BackcalcItem } from '@/store/elisa';
defineProps<{ items: BackcalcItem[]; unit: string }>();

const isNum = (v: number) => Number.isFinite(v);
const fmt = (v: number) => isNum(v) ? Number(v).toFixed(3) : '-';
</script>

<style scoped>
.panel { display: grid; gap: 1rem; }
.tbl { width: 100%; border-collapse: collapse; }
.tbl th, .tbl td { border: 1px solid #e1e1e1; padding: .5rem .6rem; text-align: left; }
.tbl thead th { background: #f6f8fa; }
.flag { display: inline-block; margin-right: .35rem; padding: .1rem .4rem; background: #f1f1f1; border: 1px solid #e1e1e1; border-radius: 999px; font-size: .85rem; }
.hint { color: #666; }
</style>
