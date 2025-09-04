<template>
  <section class="odpaste">
    <header class="odpaste__header">
      <h2>Step 1 — 貼上 96 孔 OD 原始資料（8×12）</h2>
      <div class="odpaste__actions">
        <button class="btn" @click="onParse">貼上/更新</button>
        <button class="btn btn--ghost" @click="onClear">清除</button>
      </div>
    </header>

    <div class="odpaste__body">
      <div class="odpaste__input">
        <textarea
          v-model="text"
          :placeholder="placeholder"
          spellcheck="false"
          rows="12"
        />
        <p class="hint">支援 Tab、逗號、分號或空白分隔。多餘列/欄會擋下；不足處自動補 0。</p>
        <p v-if="error" class="error">{{ error }}</p>
        <ul v-if="warnings.length" class="warn">
          <li v-for="(w,i) in warnings" :key="i">{{ w }}</li>
        </ul>
      </div>

      <div class="odpaste__preview">
        <table class="grid">
          <thead>
            <tr>
              <th></th>
              <th v-for="c in 12" :key="c">{{ c }}</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="(row, rIdx) in od" :key="rIdx">
              <th class="rowhdr">{{ rowLabel(rIdx) }}</th>
              <td v-for="(v, cIdx) in row" :key="cIdx" class="cell">{{ fmt(v) }}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { storeToRefs } from 'pinia';
import { useElisaStore } from '@/store/elisa';

const store = useElisaStore();
const { odRows: od } = storeToRefs(store);

const text = ref('');
const error = ref('');
const warnings = ref<string[]>([]);

const placeholder = `範例（可直接貼上 Excel 8×12）：
0.123	0.234	0.345	0.456	0.567	0.678	0.789	0.890	0.901	0.812	0.723	0.634
（共 8 列，不足會自動補 0）`;

function fmt(n: number) {
  return Number.isFinite(n) ? n.toFixed(3) : '0.000';
}
function rowLabel(idx: number) {
  return String.fromCharCode('A'.charCodeAt(0) + idx);
}

function onParse() {
  error.value = '';
  try {
    warnings.value = store.setODFromText(text.value);
  } catch (e: unknown) {
    error.value = (e as Error).message || '解析失敗，請檢查格式。';
  }
}

function onClear() {
  text.value = '';
  warnings.value = [];
  error.value = '';
  store.clearOD();
}
</script>

<style scoped>
.odpaste { display: grid; gap: 1rem; }
.odpaste__header { display: flex; align-items: center; justify-content: space-between; }
.odpaste__actions { display: flex; gap: .5rem; }
.btn { border: 1px solid #444; background: #111; color: #fff; padding: .5rem .9rem; border-radius: .5rem; cursor: pointer; }
.btn--ghost { background: #fff; color: #111; }

.odpaste__body { display: grid; grid-template-columns: 1fr 1.2fr; gap: 1rem; }
.odpaste__input textarea { width: 100%; font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace; }
.hint { font-size: .9rem; color: #555; margin-top: .25rem; }
.error { color: #b00020; margin-top: .25rem; }
.warn { margin-top: .25rem; color: #9a6700; }

.grid { border-collapse: collapse; width: 100%; table-layout: fixed; }
.grid th, .grid td { border: 1px solid #ddd; padding: .35rem .4rem; text-align: right; }
.grid thead th { background: #f6f8fa; text-align: center; }
.rowhdr { background: #f6f8fa; text-align: center; }
.cell { font-variant-numeric: tabular-nums; }
</style>
