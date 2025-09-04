<template>
    <section class="panel">
        <header class="panel__hdr">
            <h2>Step 3 — 標準品濃度設定（S1…Sn）</h2>
        </header>


        <div class="panel__row">
            <label class="lbl">單位</label>
            <input class="ipt" type="text" v-model="unit" placeholder="ng/mL" />
        </div>


        <div class="panel__row gradient">
            <div class="grp">
                <label class="lbl">一鍵填入（序列稀釋）</label>
                <div class="grid">
                    <label>起始濃度</label>
                    <input class="ipt" type="number" min="0" step="0.001" v-model.number="gStart" />
                    <label>倍數 (fold)</label>
                    <input class="ipt" type="number" min="1" step="0.1" v-model.number="gFold" />
                    <button class="btn" @click="onAutofill" :disabled="!canAutofill">套用到 S1…S{{ indices.length
                    }}</button>
                </div>
                <p class="hint">將依順序產生：start, start/fold, start/fold² …（總數＝目前 S 個數）。</p>
            </div>
        </div>
        <div class="panel__row list" v-if="indices.length">
            <table class="tbl">
                <thead>
                    <tr>
                        <th>標準品</th>
                        <th>濃度（{{ unit || 'ng/mL' }}）</th>
                    </tr>
                </thead>
                <tbody>
                    <tr v-for="idx in indices" :key="idx">
                        <td>S{{ idx }}</td>
                        <td><input class="ipt" type="number" step="0.001" min="0" :value="stdVal(idx)"
                                @input="onStdInput(idx, $event)" /></td>
                    </tr>
                </tbody>
            </table>
        </div>
        <p v-else class="warn">目前沒有任何 S 編號，請先在 Step 2 以「Standard」標記孔位。</p>
    </section>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { storeToRefs } from 'pinia';
import { useElisaStore } from '@/store/elisa';


const store = useElisaStore();
const { standardIndices: indices } = storeToRefs(store);


const unit = computed({ get: () => store.standards.unit, set: (v: string) => store.setUnit(v) });


const gStart = ref<number | null>(null);
const gFold = ref<number | null>(2);
const canAutofill = computed(() => (gStart.value ?? 0) > 0 && (gFold.value ?? 0) >= 1 && indices.value.length > 0);


function onAutofill() {
    if (!canAutofill.value) return;
    store.autofillStandardsByGradient(Number(gStart.value), Number(gFold.value));
}

function stdVal(idx: number) {
    return store.standards.standards[idx] ?? 0;
}
function onStdInput(idx: number, e: Event) {
    const v = Number((e.target as HTMLInputElement).value);
    store.setStandard(idx, v);
}


// 當 Plate 改變索引時，自動清除多餘項目
watch(indices, () => store.syncWithPlate());
</script>

<style scoped>
.panel {
    display: grid;
    gap: 1rem;
}

.panel__hdr h2 {
    margin: 0;
}

.panel__row {
    display: grid;
    gap: .5rem;
}

.lbl {
    color: #555;
}

.ipt {
    padding: .45rem .6rem;
    border: 1px solid #bbb;
    border-radius: .4rem;
    min-width: 10rem;
}

.btn {
    border: 1px solid #444;
    background: #111;
    color: #fff;
    padding: .45rem .8rem;
    border-radius: .6rem;
    cursor: pointer;
}

.hint {
    font-size: .9rem;
    color: #666;
}

.warn {
    color: #9a6700;
}


.gradient .grid {
    display: grid;
    grid-template-columns: auto 12rem auto 12rem auto;
    gap: .5rem .75rem;
    align-items: center;
}

.list .tbl {
    width: 100%;
    border-collapse: collapse;
}

.tbl th,
.tbl td {
    border: 1px solid #e1e1e1;
    padding: .5rem .6rem;
    text-align: left;
}

.tbl thead th {
    background: #f6f8fa;
}
</style>