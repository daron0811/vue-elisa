<template>
    <section class="panel">
        <header class="panel__hdr">
            <h3>報表匯出</h3>
        </header>
        <div class="row">
            <button class="btn" :disabled="!can" @click="onExcel">匯出 Excel</button>
            <button class="btn btn--ghost" :disabled="!can" @click="onPDF">匯出 PDF</button>
            <span class="hint" v-if="!can">請先在 Step 4 完成擬合與反算</span>
        </div>
    </section>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { storeToRefs } from 'pinia';
import { useElisaStore } from '@/store/elisa';
import { exportExcel, exportPDF } from '@/services/export';

const store = useElisaStore();
const { result, backcalc } = storeToRefs(store);
const unit = computed(() => store.standards.unit || 'ng/mL');
const can = computed(() => !!result.value && (backcalc.value?.length ?? 0) > 0);

function onExcel() {
    if (!result.value) return;
    exportExcel({
        items: backcalc.value || [],
        model: store.options.model,
        params: result.value.params as any,
        unit: unit.value,
        stdPoints: result.value.stdPoints,
        filename: 'ELISA_Result.xlsx'
    });
}

function onPDF() {
    if (!result.value) return;
    exportPDF({
        items: backcalc.value || [],
        model: store.options.model,
        params: result.value.params as any,
        unit: unit.value,
        filename: 'ELISA_Report.pdf'
    });
}
</script>

<style scoped>
.panel {
    display: grid;
    gap: 0.75rem;
}

.row {
    display: inline-flex;
    gap: .5rem;
    align-items: center;
}

.btn {
    border: 1px solid #444;
    background: #111;
    color: #fff;
    padding: .45rem .8rem;
    border-radius: .6rem;
    cursor: pointer;
}

.btn--ghost {
    background: #fff;
    color: #111;
}

.hint {
    color: #666;
}
</style>
