<template>
  <table class="tbl" v-if="params">
    <thead><tr><th colspan="2">擬合參數</th></tr></thead>
    <tbody>
      <template v-if="has('m')">
        <tr><td>m</td><td>{{ fmt(params.m) }}</td></tr>
        <tr><td>b</td><td>{{ fmt(params.b_lin) }}</td></tr>
      </template>
      <template v-else>
        <tr><td>a (Top)</td><td>{{ fmt(params.a) }}</td></tr>
        <tr><td>b (HillSlope)</td><td>{{ fmt(params.b) }}</td></tr>
        <tr><td>c (EC50)</td><td>{{ fmt(params.c) }}</td></tr>
        <tr><td>d (Bottom)</td><td>{{ fmt(params.d) }}</td></tr>
        <tr v-if="has('e')"><td>e (Asymmetry)</td><td>{{ fmt(params.e) }}</td></tr>
      </template>
      <tr><td>R²</td><td>{{ fmt(params.r2) }}</td></tr>
    </tbody>
  </table>
</template>

<script setup lang="ts">
const props = defineProps<{ params: Record<string, number> }>();
const has = (k: string) => Object.prototype.hasOwnProperty.call(props.params || {}, k);
const fmt = (v?: number) => (v===undefined || Number.isNaN(v)) ? '-' : Number(v).toFixed(4);
</script>

<style scoped>
.tbl { width: 100%; border-collapse: collapse; }
.tbl th, .tbl td { border: 1px solid #e1e1e1; padding: .5rem .6rem; text-align: left; }
.tbl thead th { background: #f6f8fa; }
</style>
