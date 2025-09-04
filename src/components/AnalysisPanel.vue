<template>
    <section class="panel">
        <header class="panel__hdr">
            <h2>Step 4 — 擬合與繪圖</h2>
        </header>

        <div class="row">
            <label>模型</label>
            <select class="ipt" v-model="model">
                <option>4PL</option>
                <option>5PL</option>
                <option>Linear</option>
            </select>

            <label>座標</label>
            <select class="ipt" v-model="plot">
                <option value="normal">Normal</option>
                <option value="semi-log">Semi-log (X)</option>
                <option value="log-log">Log-log</option>
            </select>

            <label class="ck"><input type="checkbox" v-model="subtractBlank" /> 扣除 Blank 均值</label>

            <button class="btn" @click="onAnalyze" :disabled="busy">{{ busy ? '計算中…' : 'Analyze' }}</button>
        </div>

        <p class="err" v-if="err">{{ err }}</p>

        <div v-if="res" class="grid">
            <ParamTable :params="res.params" />
            <CurveChart :std-points="res.stdPoints" :curve="res.curve" :plot="plot" />
        </div>
    </section>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue';
import { useElisaStore } from '@/store/elisa';
import CurveChart from '@/components/CurveChart.vue';
import ParamTable from '@/components/ParamTable.vue';

const store = useElisaStore();
const model = computed({ get: () => store.options.model, set: (v: any) => store.setOptions({ model: v }) });
const plot = computed({ get: () => store.options.plot, set: (v: any) => store.setOptions({ plot: v }) });
const subtractBlank = computed({ get: () => store.options.subtractBlank, set: (v: boolean) => store.setOptions({ subtractBlank: v }) });

const busy = ref(false);
const err = ref('');
const res = computed(() => store.result);

async function onAnalyze() {
    err.value = ''; busy.value = true;
    try { await store.analyze(); }
    catch (e: any) { err.value = e?.message || '分析失敗'; }
    finally { busy.value = false; }
}
</script>

<style scoped>
.panel {
    display: grid;
    gap: 1rem;
}

.row {
    display: grid;
    grid-auto-flow: column;
    grid-auto-columns: max-content;
    align-items: center;
    gap: .75rem;
}

.ipt {
    padding: .4rem .6rem;
    border: 1px solid #bbb;
    border-radius: .4rem;
    min-width: 10rem;
}

.ck {
    display: inline-flex;
    align-items: center;
    gap: .4rem;
}

.btn {
    border: 1px solid #444;
    background: #111;
    color: #fff;
    padding: .45rem .8rem;
    border-radius: .6rem;
    cursor: pointer;
}

.err {
    color: #b00020;
}

.grid {
    display: grid;
    grid-template-columns: 1fr 1.4fr;
    gap: 1rem;
    align-items: start;
}
</style>
