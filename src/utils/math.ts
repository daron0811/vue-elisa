export type Model = 'Linear' | '4PL' | '5PL';

export function mean(arr: number[]): number { return arr.length ? arr.reduce((a,b)=>a+b,0)/arr.length : 0; }
export function sd(arr: number[]): number {
  if (arr.length <= 1) return 0;
  const m = mean(arr); const v = mean(arr.map(x => (x - m) ** 2));
  return Math.sqrt(v);
}
export function r2(ys: number[], yh: number[]): number {
  const m = mean(ys);
  const ssTot = ys.reduce((s,y)=>s+(y-m)**2,0);
  const ssRes = ys.reduce((s,y,i)=>s+(y-yh[i])**2,0);
  return ssTot === 0 ? 1 : 1 - ssRes/ssTot;
}

// ===== 模型函數 =====
export function fLinear(x: number, p: { m: number, b: number }) { return p.m * x + p.b; }
export function f4PL(x: number, p: { a: number, b: number, c: number, d: number }) {
  if (x <= 0) x = 1e-12;
  return p.d + (p.a - p.d) / (1 + Math.pow(x / p.c, p.b));
}
export function f5PL(x: number, p: { a: number, b: number, c: number, d: number, e: number }) {
  if (x <= 0) x = 1e-12;
  return p.d + (p.a - p.d) / Math.pow(1 + Math.pow(x / p.c, p.b), p.e);
}

export function inv4PL(y: number, p: { a: number, b: number, c: number, d: number }) {
  const { a, b, c, d } = p; const num = (a - d) / Math.max(y - d, 1e-12) - 1;
  if (num <= 0) return NaN;
  return c * Math.pow(num, 1 / b);
}
export function inv5PL(y: number, p: { a: number, b: number, c: number, d: number, e: number }) {
  const { a, b, c, d, e } = p; const num = Math.pow((a - d) / Math.max(y - d, 1e-12), 1 / e) - 1;
  if (num <= 0) return NaN;
  return c * Math.pow(num, 1 / b);
}

export function clampPositive(x: number, eps = 1e-12) { return x > eps ? x : eps; }

// 反算：由 y(OD) 求 x(濃度) 的統一入口
export function invertY(model: Model, params: any, y: number): number {
  if (!Number.isFinite(y)) return NaN;
  if (model === 'Linear') {
    const m = params.m ?? 0, b = (params.b !== undefined ? params.b : params.b_lin ?? 0);
    if (Math.abs(m) < 1e-12) return NaN;
    return (y - b) / m;
  } else if (model === '4PL') {
    return inv4PL(y, params);
  } else {
    return inv5PL(y, params);
  }
}

export function linspace(min: number, max: number, n: number) {
  if (n <= 1) return [min];
  return Array.from({ length: n }, (_, i) => min + (max - min) * (i/(n-1)));
}
export function logspace(min: number, max: number, n: number, base = 10) {
  const logb = (v: number) => Math.log(v) / Math.log(base);
  const powb = (v: number) => Math.pow(base, v);
  const lo = logb(Math.max(min, 1e-12)), hi = logb(Math.max(max, 1e-12));
  return linspace(lo, hi, n).map(powb);
}
