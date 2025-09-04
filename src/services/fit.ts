import type { FitReq, FitRes } from '@/services/fit.worker';

let worker: Worker | null = null;
function getWorker() {
  if (!worker) worker = new Worker(new URL('@/services/fit.worker.ts', import.meta.url), { type: 'module' });
  return worker;
}

export function runFit(payload: FitReq): Promise<FitRes> {
  return new Promise((resolve) => {
    const w = getWorker();
    const onMsg = (e: MessageEvent<FitRes>) => { w.removeEventListener('message', onMsg as any); resolve(e.data); };
    w.addEventListener('message', onMsg as any, { once: true });
    w.postMessage(payload);
  });
}
