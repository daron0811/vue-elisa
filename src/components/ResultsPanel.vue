<template>
    <section class="panel">
        <ResultsTable :items="backcalc" :unit="unit" />
        <ReportExport />
    </section>
</template>

<script setup lang="ts">
import { storeToRefs } from 'pinia';
import { useElisaStore } from '@/store/elisa';
import ResultsTable from '@/components/ResultsTable.vue';
import ReportExport from '@/components/ReportExport.vue';

const store = useElisaStore();
const { backcalc } = storeToRefs(store);
const unit = store.standards.unit || 'ng/mL';
</script>
