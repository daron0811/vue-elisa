<template>
    <main class="wizard">
        <ODPaste />
        <PlateEditor />
        <StandardsForm />
        <DilutionForm />
        <AnalysisPanel />
        <ResultsPanel /> <!-- ⬅️ NEW -->
    </main>
</template>

<script setup lang="ts">
import ODPaste from '@/components/ODPaste.vue';
import PlateEditor from '@/components/PlateEditor.vue';
import StandardsForm from '@/components/StandardsForm.vue';
import DilutionForm from '@/components/DilutionForm.vue';
import AnalysisPanel from '@/components/AnalysisPanel.vue';
import ResultsPanel from '@/components/ResultsPanel.vue';
</script>


<style scoped>
.wizard {
    padding: 1rem;
    max-width: 1200px;
    margin: 0 auto;
}
</style>