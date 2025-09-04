import { ref, computed } from 'vue';


export function usePlatePainter(rows = 8, cols = 12) {
    const isDragging = ref(false);
    const start = ref<{ r: number; c: number } | null>(null);
    const end = ref<{ r: number; c: number } | null>(null);


    const rect = computed(() => {
        if (!start.value || !end.value) return null as null | { r1: number; c1: number; r2: number; c2: number };
        const r1 = Math.min(start.value.r, end.value.r);
        const r2 = Math.max(start.value.r, end.value.r);
        const c1 = Math.min(start.value.c, end.value.c);
        const c2 = Math.max(start.value.c, end.value.c);
        return { r1, c1, r2, c2 };
    });


    const within = (r: number, c: number) => {
        if (!rect.value) return false;
        const { r1, c1, r2, c2 } = rect.value;
        return r >= r1 && r <= r2 && c >= c1 && c <= c2;
    };


    const onCellDown = (r: number, c: number) => {
        isDragging.value = true;
        start.value = { r, c };
        end.value = { r, c };
    };

    const onCellEnter = (r: number, c: number) => {
        if (!isDragging.value) return;
        end.value = { r, c };
    };


    const onMouseUp = () => {
        isDragging.value = false;
    };


    const clearRect = () => { start.value = null; end.value = null; };


    return { isDragging, start, end, rect, within, onCellDown, onCellEnter, onMouseUp, clearRect };
}