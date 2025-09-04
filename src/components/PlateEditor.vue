<template>
  <section class="plate">
    <header class="plate__header">
      <h2>Step 2 — 96 孔版型指派（S/U/C/BL）</h2>
      <div class="plate__tools">
        <div class="tool-row">
          <label class="tool">類型：</label>
          <button v-for="t in toolTypes" :key="t.key"
                  :class="['btn','pill', t.key === tool ? 'is-active' : '', `t-${t.key.toLowerCase()}`]"
                  @click="tool = t.key">
            {{ t.label }}
          </button>
        </div>
        <div class="tool-row" v-if="showNumbering">
          <label class="tool">自動編號：</label>
          <label class="switch"><input type="checkbox" v-model="autoNumber"/> <span>啟用</span></label>
          <label class="tool">起始：</label>
          <input class="input num" type="number" min="1" v-model.number="startIndex"/>
          <label class="tool">填充方向：</label>
          <label class="radio"><input type="radio" value="row" v-model="fillDir"/> 橫向</label>
          <label class="radio"><input type="radio" value="col" v-model="fillDir"/> 直向</label>
          <label class="tool">重複：</label>
          <input class="input num" type="number" min="1" max="12" v-model.number="replicates"/>
          <label class="radio"><input type="radio" value="h" v-model="repDir"/> 水平</label>
          <label class="radio"><input type="radio" value="v" v-model="repDir"/> 垂直</label>
        </div>
        <div class="tool-row">
          <button class="btn" @click="onClear">清除版型</button>
        </div>
      </div>
    </header>

    <div class="plate__grid" @mouseleave="painter.onMouseUp" @mouseup="onMouseUp">
      <table class="grid" @mouseup="onMouseUp">
        <thead>
          <tr>
            <th></th>
            <th v-for="c in 12" :key="c">{{ c }}</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="(row, r) in plate" :key="r">
            <th class="rowhdr">{{ rowLabel(r) }}</th>
            <td v-for="(cell, c) in row" :key="c"
                :class="cellClass(cell, r, c)"
                @mousedown.prevent="onDown(r,c)"
                @mouseenter="onEnter(r,c)">
              <span class="tag" v-if="cell.type && cell.type !== 'BL'">{{ cell.type }}{{ cell.idx }}</span>
              <span class="tag tag--bl" v-else-if="cell.type === 'BL'">BL</span>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue';
import { storeToRefs } from 'pinia';
import { useElisaStore, type WellType, type FillDirection, type ReplicateDir } from '@/store/elisa';
import { usePlatePainter } from '@/composables/usePlatePainter';

const store = useElisaStore();
const { plateRows: plate } = storeToRefs(store);

const toolTypes = [
  { key: 'S', label: 'Standard' },
  { key: 'U', label: 'Unknown' },
  { key: 'C', label: 'Control' },
  { key: 'BL', label: 'Blank' },
  { key: 'ERASE', label: 'Erase' },
] as const;

const tool = ref<'S'|'U'|'C'|'BL'|'ERASE'>('S');
const autoNumber = ref(true);
const startIndex = ref(1);
const fillDir = ref<FillDirection>('row');
const replicates = ref(2);
const repDir = ref<ReplicateDir>('h');

const painter = usePlatePainter(8, 12);

const showNumbering = computed(() => tool.value === 'S' || tool.value === 'U' || tool.value === 'C');

function rowLabel(idx: number) { return String.fromCharCode('A'.charCodeAt(0) + idx); }

function onDown(r: number, c: number) { painter.onCellDown(r, c); }
function onEnter(r: number, c: number) { painter.onCellEnter(r, c); }

function onMouseUp() {
  if (!painter.rect.value) return;
  const { r1, c1, r2, c2 } = painter.rect.value;
  store.fillRect(r1, c1, r2, c2, tool.value as WellType | 'ERASE', {
    autoNumber: autoNumber.value,
    startIndex: startIndex.value,
    fillDir: fillDir.value,
    replicates: replicates.value,
    repDir: repDir.value,
  });
  painter.onMouseUp();
  painter.clearRect();
}

function onClear() { store.clearPlate(); }

function cellClass(cell: { type: WellType; idx?: number }, r: number, c: number) {
  return [
    'cell',
    cell.type ? `t-${cell.type.toLowerCase()}` : '',
    painter.within(r, c) ? 'is-selecting' : '',
  ];
}
</script>

<style scoped>
.plate { display: grid; gap: 1rem; }
.plate__header { display: grid; gap: .75rem; }
.plate__tools { display: grid; gap: .5rem; }
.tool-row { display: flex; flex-wrap: wrap; gap: .5rem .75rem; align-items: center; }
.tool { color: #555; }

.btn { border: 1px solid #444; background: #111; color: #fff; padding: .45rem .8rem; border-radius: .7rem; cursor: pointer; }
.btn.pill { border-radius: 999px; }
.btn.is-active { outline: 2px solid #111; box-shadow: 0 0 0 2px #8b8b8b inset; }
.input.num { width: 5rem; padding: .35rem .5rem; border: 1px solid #bbb; border-radius: .4rem; }
.radio, .switch { display: inline-flex; align-items: center; gap: .35rem; }

.plate__grid { overflow: auto; }
.grid { border-collapse: collapse; table-layout: fixed; width: 100%; user-select: none; }
.grid th, .grid td { border: 1px solid #ddd; padding: .35rem .4rem; text-align: center; }
.grid thead th, .rowhdr { background: #f6f8fa; }
.cell { position: relative; height: 38px; }
.cell.is-selecting { outline: 2px dashed #999; }

/* 類型底色 */
.cell.t-s { background: #E6F0FF; }
.cell.t-u { background: #E6FFED; }
.cell.t-c { background: #FFF6E6; }
.cell.t-bl { background: #F2F2F2; color: #666; }

.tag { position: absolute; inset: 2px; display: grid; place-items: center; font-size: .85rem; font-weight: 600; color: #0d1a2b; }
.tag--bl { color: #555; font-weight: 600; }
</style>
