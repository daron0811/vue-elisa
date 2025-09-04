<template>
    <main class="wizard">
        <ODPaste />
        <PlateEditor />
    </main>
</template>


<script setup lang="ts">
import ODPaste from '@/components/ODPaste.vue';
import PlateEditor from '@/components/PlateEditor.vue';
</script>


<style scoped>
.wizard {
    padding: 1rem;
    max-width: 1200px;
    margin: 0 auto;
}
</style>