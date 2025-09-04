<template>
  <section class="panel">
    <header class="panel__hdr">
      <h2>Step 3 — 稀釋倍數設定（U / C）</h2>
    </header>

    <div class="panel__row two">
      <div class="card">
        <h3>Unknown 預設倍數</h3>
        <div class="row">
          <label>倍數</label>
          <input class="ipt" type="number" min="1" step="1" v-model.number="defU" />
        </div>
      </div>
      <div class="card">
        <h3>Control 預設倍數</h3>
        <div class="row">
          <label>倍數</label>
          <input class="ipt" type="number" min="1" step="1" v-model.number="defC" />
        </div>
      </div>
    </div>

    <div class="panel__row">
      <h3>範圍套用（自訂倍數）</h3>
      <div class="range-grid">
        <label>類型</label>
        <select v-model="rangeType" class="ipt">
          <option value="U">Unknown</option>
          <option value="C">Control</option>
        </select>
        <label>起</label>
        <input class="ipt" type="number" min="1" step="1" v-model.number="rangeStart"/>
        <label>迄</label>
        <input class="ipt" type="number" min="1" step="1" v-model.number="rangeEnd"/>
        <label>倍數</label>
        <input class="ipt" type="number" min="1" step="1" v-model.number="rangeVal"/>
        <button class="btn" @click="onApplyRange" :disabled="!canApplyRange">套用</button>
      </div>
      <p class="hint">只會套用到目前版面存在的 {{ rangeType }} 編號（不存在的會略過）。</p>
    </div>

    <div class="panel__row three">
      <div class="mini">
        <h4>U 索引</h4>
        <div class="chips">
          <span v-for="i in uIdx" :key="i" class="chip">U{{ i }}</span>
        </div>
      </div>
      <div class="mini">
        <h4>C 索引</h4>
        <div class="chips">
          <span v-for="i in cIdx" :key="i" class="chip">C{{ i }}</span>
        </div>
      </div>
      <div class="mini">
        <h4>自訂清單</h4>
        <table class="tbl">
          <thead><tr><th>樣品</th><th>倍數</th></tr></thead>
          <tbody>
            <tr v-for="i in uIdx" :key="'U'+i"><td>U{{ i }}</td><td><input class="ipt" type="number" min="1" step="1" :value="uVal(i)" @input="(e)=>onDilInput('U', i, e)"/></td></tr>
            <tr v-for="i in cIdx" :key="'C'+i"><td>C{{ i }}</td><td><input class="ipt" type="number" min="1" step="1" :value="cVal(i)" @input="(e)=>onDilInput('C', i, e)"/></td></tr>
          </tbody>
        </table>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { storeToRefs } from 'pinia';
import { useElisaStore } from '@/store/elisa';

const store = useElisaStore();
const { unknownIndices: uIdx, controlIndices: cIdx } = storeToRefs(store);

const defU = computed({ get: () => store.standards.defaultDilution.U, set: (v: number)=> store.setDefaultDilutionU(v) });
const defC = computed({ get: () => store.standards.defaultDilution.C, set: (v: number)=> store.setDefaultDilutionC(v) });

const rangeType = ref<'U'|'C'>('U');
const rangeStart = ref<number | null>(null);
const rangeEnd   = ref<number | null>(null);
const rangeVal   = ref<number | null>(null);
const canApplyRange = computed(() => !!rangeStart.value && !!rangeEnd.value && !!rangeVal.value);

function onApplyRange() {
  if (!canApplyRange.value) return;
  store.applyDilutionRange(rangeType.value, Number(rangeStart.value), Number(rangeEnd.value), Number(rangeVal.value));
}

function uVal(i: number) { return store.standards.dilutionU[i] ?? defU.value; }
function cVal(i: number) { return store.standards.dilutionC[i] ?? defC.value; }
function onDilInput(t: 'U'|'C', i: number, e: Event) {
  store.setDilution(t, i, Number((e.target as HTMLInputElement).value));
}

watch([uIdx, cIdx], () => store.syncWithPlate());
</script>

<style scoped>
.panel { display: grid; gap: 1rem; }
.panel__hdr h2 { margin: 0; }
.panel__row { display: grid; gap: .75rem; }
.two { grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 1rem; }
.three { grid-template-columns: 1fr 1fr 1.2fr; gap: 1rem; align-items: start; }
.card { border: 1px solid #e1e1e1; border-radius: .6rem; padding: .8rem; background: #fff; }
.row { display: grid; grid-template-columns: auto 12rem; gap: .5rem .75rem; align-items: center; }
.range-grid { display: grid; grid-template-columns: auto 10rem auto 8rem auto 8rem auto 10rem auto; gap: .5rem .75rem; align-items: center; }
.ipt { padding: .45rem .6rem; border: 1px solid #bbb; border-radius: .4rem; min-width: 6rem; }
.btn { border: 1px solid #444; background: #111; color: #fff; padding: .45rem .8rem; border-radius: .6rem; cursor: pointer; }
.hint { font-size: .9rem; color: #666; }
.chips { display: flex; flex-wrap: wrap; gap: .4rem; }
.chip { background: #f1f1f1; border: 1px solid #e1e1e1; border-radius: 999px; padding: .15rem .55rem; font-size: .85rem; }
.tbl { width: 100%; border-collapse: collapse; }
.tbl th, .tbl td { border: 1px solid #e1e1e1; padding: .5rem .6rem; text-align: left; }
.tbl thead th { background: #f6f8fa; }
</style>
