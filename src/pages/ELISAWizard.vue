<template>
    <main class="wizard">
        <ODPaste />
        <!-- 後續步驟會依序加上：PlateEditor、StandardsForm、DilutionForm、AnalysisPanel... -->
    </main>
</template>


<script setup lang="ts">
import ODPaste from '@/components/ODPaste.vue';
</script>


<style scoped>
.wizard {
    padding: 1rem;
    max-width: 1200px;
    margin: 0 auto;
}
</style>