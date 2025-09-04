/// <reference lib="webworker" />
import { r2, fLinear, f4PL, f5PL, clampPositive } from '@/utils/math';

export interface FitReq { model: 'Linear'|'4PL'|'5PL'; xs: number[]; ys: number[] }
export type FitRes = { ok: true; params: any; yhat: number[]; r2: number } | { ok: false; error: string };

function fitLinear(xs: number[], ys: number[]) {
  const n = xs.length; const sx = xs.reduce((a,b)=>a+b,0); const sy = ys.reduce((a,b)=>a+b,0);
  const sxx = xs.reduce((a,b)=>a+b*b,0); const sxy = xs.reduce((a,xi,i)=>a+xi*ys[i],0);
  const denom = n*sxx - sx*sx || 1e-12; const m = (n*sxy - sx*sy)/denom; const b = (sy - m*sx)/n;
  const yhat = xs.map(x=>fLinear(x,{m,b}));
  return { params: { m, b }, yhat };
}

function fit4or5(xs: number[], ys: number[], is5=false) {
  const a0 = Math.max(...ys), d0 = Math.min(...ys);
  const sortedX = [...xs].sort((a,b)=>a-b); const c0 = sortedX[Math.floor(sortedX.length/2)] || 1;
  let a=a0, d=d0, c=clampPositive(c0), b=1, e=1;
  let lambda = 1e-2; let bestSSE = Infinity; let best = { a, b, c, d, e };

  const maxIter = 300;
  for (let iter=0; iter<maxIter; iter++) {
    const yhat = xs.map(x => is5 ? f5PL(x, {a,b,c,d,e}) : f4PL(x,{a,b,c,d}));
    const r = ys.map((y,i)=>y - yhat[i]);
    const SSE = r.reduce((s,v)=>s+v*v,0);
    if (SSE < bestSSE) { bestSSE = SSE; best = { a,b,c,d,e }; }

    const params = is5 ? ['a','b','c','d','e'] as const : ['a','b','c','d'] as const;
    const pvals: any = { a,b,c,d,e };
    const J: number[][] = xs.map(()=> new Array(params.length).fill(0));
    const eps = 1e-6;
    params.forEach((pk, k) => {
      const pv = pvals[pk]; pvals[pk] = pv + eps;
      const yhat2 = xs.map(x => is5 ? f5PL(x, pvals) : f4PL(x, pvals));
      pvals[pk] = pv;
      for (let i=0;i<xs.length;i++) J[i][k] = (yhat2[i] - yhat[i]) / eps;
    });

    const JT = transpose(J); const JTJ = mul(JT, J);
    for (let i=0;i<JTJ.length;i++) JTJ[i][i] += lambda;
    const JT_r = mulVec(JT, r);
    const delta = solveSymmetric(JTJ, JT_r);
    if (!delta) { lambda *= 10; continue; }

    const trial: any = { a,b,c,d,e };
    params.forEach((pk, k) => { trial[pk] = sanitize(pk, (trial as any)[pk] + delta[k]); });
    const yhatTrial = xs.map(x => is5 ? f5PL(x, trial) : f4PL(x, trial));
    const rTrial = ys.map((y,i)=>y - yhatTrial[i]);
    const SSEtrial = rTrial.reduce((s,v)=>s+v*v,0);
    if (SSEtrial < SSE) { ({a,b,c,d,e} = trial); lambda = Math.max(lambda/2, 1e-7); }
    else { lambda *= 10; }

    if (Math.abs(SSE - SSEtrial) / Math.max(1,SSE) < 1e-8) break;
  }

  const yhat = xs.map(x => is5 ? f5PL(x, {a,b,c,d,e}) : f4PL(x,{a,b,c,d}));
  return { params: is5 ? { a,b,c,d,e } : { a,b,c,d }, yhat };
}

function transpose(A: number[][]) { return A[0].map((_,j)=>A.map(row=>row[j])); }
function mul(A: number[][], B: number[][]) {
  const m=A.length, n=B[0].length, k=B.length; const R=Array.from({length:m},()=>Array(n).fill(0));
  for (let i=0;i<m;i++) for (let j=0;j<n;j++) { let s=0; for (let t=0;t<k;t++) s+=A[i][t]*B[t][j]; R[i][j]=s; }
  return R;
}
function mulVec(A: number[][], v: number[]) { return A.map(row=>row.reduce((s,a,j)=>s+a*v[j],0)); }
function solveSymmetric(A: number[][], b: number[]) {
  const n=A.length; const M=A.map(r=>r.slice()); const x=b.slice();
  for (let i=0;i<n;i++) {
    let p=i; for (let r=i+1;r<n;r++) if (Math.abs(M[r][i])>Math.abs(M[p][i])) p=r;
    if (Math.abs(M[p][i])<1e-12) return null;
    if (p!==i) { [M[i],M[p]]=[M[p],M[i]]; [x[i],x[p]]=[x[p],x[i]]; }
    const piv=M[i][i];
    for (let j=i;j<n;j++) M[i][j]/=piv; x[i]/=piv;
    for (let r=0;r<n;r++) if (r!==i) {
      const f=M[r][i]; if (f===0) continue;
      for (let j=i;j<n;j++) M[r][j]-=f*M[i][j]; x[r]-=f*x[i];
    }
  }
  return x;
}
function sanitize(pk: string, v: number) {
  if (pk==='c') return clampPositive(v);
  if (pk==='e') return Math.max(0.1, v);
  return v;
}

self.onmessage = (ev: MessageEvent<FitReq>) => {
  try {
    const { model, xs, ys } = ev.data;
    if (xs.length !== ys.length || xs.length < 2) throw new Error('資料點不足');

    let params: any, yhat: number[];
    if (model==='Linear') ({ params, yhat } = fitLinear(xs, ys));
    else if (model==='4PL') ({ params, yhat } = fit4or5(xs, ys, false));
    else ({ params, yhat } = fit4or5(xs, ys, true));

    const score = r2(ys, yhat);
    const res: FitRes = { ok: true, params, yhat, r2: score };
    (self as any).postMessage(res);
  } catch (err: any) {
    const res: FitRes = { ok: false, error: err?.message || '擬合失敗' };
    (self as any).postMessage(res);
  }
};
