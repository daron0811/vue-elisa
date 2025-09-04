<template>
    <div ref="refEl" style="width:100%;height:420px" />
</template>

<script setup lang="ts">
import { onMounted, onUnmounted, ref, watch } from 'vue';
import * as echarts from 'echarts';

const props = defineProps<{ stdPoints: { x: number; y: number }[]; curve: { xs: number[]; ys: number[] }; plot: 'normal' | 'semi-log' | 'log-log' }>();

const refEl = ref<HTMLDivElement | null>(null);
let chart: echarts.ECharts | null = null;

function render() {
    if (!chart || !props.curve) return;
    const xType = (props.plot === 'normal') ? 'value' : 'log';
    const yType = (props.plot === 'log-log') ? 'log' : 'value';
    chart.setOption({
        tooltip: { trigger: 'axis' },
        grid: { left: 48, right: 18, top: 20, bottom: 40 },
        xAxis: { type: xType, name: 'Concentration', nameLocation: 'middle', nameGap: 28, minorTick: { show: true }, minorSplitLine: { show: true } },
        yAxis: { type: yType, name: 'OD', nameLocation: 'middle', nameGap: 36, minorTick: { show: true }, minorSplitLine: { show: true } },
        series: [
            { type: 'scatter', name: 'Standards', symbolSize: 10, data: props.stdPoints.map(p => [p.x, p.y]) },
            { type: 'line', name: 'Fit', showSymbol: false, smooth: true, data: props.curve.xs.map((x, i) => [x, props.curve.ys[i]]) },
        ],
    });
}

onMounted(() => { if (refEl.value) { chart = echarts.init(refEl.value); render(); } });
onUnmounted(() => { chart?.dispose(); chart = null; });
watch(() => [props.stdPoints, props.curve, props.plot], () => render(), { deep: true });
</script>
