export interface NormalizedDetail {
  status: string | null; statusSource: string | null;
  conn: string | null; connSource: string | null;
  brand: string | null; brandSource: string | null;
  model: string | null; modelSource: string | null;
  sdkInt: number | null; sdkSource: string | null;
  androidVersion: string | null;
  resolution: { width: number; height: number } | null; resolutionSource: string | null;
  ip: string | null; ipSource: string | null;
}

type AnyObj = Record<string, any>;

const pickFirst = (obj: AnyObj, keys: string[]): { value: any; source: string | null } => {
  for (const key of keys) {
    // support nested access like "display.width"
    const parts = key.split('.');
    let cur: any = obj;
    let ok = true;
    for (const p of parts) {
      if (cur && Object.prototype.hasOwnProperty.call(cur, p)) {
        cur = cur[p];
      } else {
        ok = false; break;
      }
    }
    if (ok && cur != null && cur !== '') return { value: cur, source: key };
  }
  return { value: null, source: null };
};

const sdkToAndroid = (sdk?: number | string | null): string | null => {
  if (sdk == null) return null;
  const n = typeof sdk === 'string' ? parseInt(sdk, 10) : sdk;
  if (!Number.isFinite(n)) return null;
  const map: Record<number, string> = {
    34: 'Android 14', 33: 'Android 13', 32: 'Android 12L', 31: 'Android 12', 30: 'Android 11',
    29: 'Android 10', 28: 'Android 9', 27: 'Android 8.1', 26: 'Android 8.0', 25: 'Android 7.1',
    24: 'Android 7.0', 23: 'Android 6.0', 22: 'Android 5.1', 21: 'Android 5.0', 20: 'Android 4.4W',
    19: 'Android 4.4', 18: 'Android 4.3', 17: 'Android 4.2', 16: 'Android 4.1', 15: 'Android 4.0.3',
  };
  return map[n] ?? `Android (API ${n})`;
};

const parseResolution = (obj: AnyObj): { value: { width: number; height: number } | null; source: string | null } => {
  // common patterns: "1080x1920" string; object with width/height; screen_width/screen_height
  const candidates: Array<{ key: string; getter: (v: any) => { w: number; h: number } | null }> = [
    { key: 'resolution', getter: (v) => strRes(v) },
    { key: 'display', getter: (v) => strOrObjRes(v) },
    { key: 'screen', getter: (v) => strOrObjRes(v) },
    { key: 'display.width', getter: (_) => null }, // handled with pair below
  ];
  for (const c of candidates) {
    const { value } = pickFirst(obj, [c.key]);
    if (value != null) {
      const r = c.getter(value);
      if (r) return { value: { width: r.w, height: r.h }, source: c.key };
    }
  }
  // try width/height pairs
  const widthKeys = ['display.width', 'screen.width', 'screen_width', 'width'];
  const heightKeys = ['display.height', 'screen.height', 'screen_height', 'height'];
  const wk = pickFirst(obj, widthKeys);
  const hk = pickFirst(obj, heightKeys);
  const w = toInt(wk.value);
  const h = toInt(hk.value);
  if (w && h) return { value: { width: w, height: h }, source: wk.source && hk.source ? `${wk.source} & ${hk.source}` : wk.source ?? hk.source };
  return { value: null, source: null };
};

const toInt = (v: any): number | null => {
  if (typeof v === 'number' && Number.isFinite(v)) return v;
  if (typeof v === 'string') {
    const n = parseInt(v, 10);
    return Number.isFinite(n) ? n : null;
  }
  return null;
};

const strRes = (v: any): { w: number; h: number } | null => {
  if (typeof v === 'string') return partsToWH(v);
  return null;
};

const strOrObjRes = (v: any): { w: number; h: number } | null => {
  if (typeof v === 'string') return partsToWH(v);
  if (v && typeof v === 'object') {
    const w = toInt((v as any).width);
    const h = toInt((v as any).height);
    if (w && h) return { w, h };
  }
  return null;
};

const partsToWH = (s: string): { w: number; h: number } | null => {
  const m = s.match(/(\d+)\s*[xX\*]\s*(\d+)/);
  if (!m) return null;
  const w = parseInt(m[1], 10);
  const h = parseInt(m[2], 10);
  return Number.isFinite(w) && Number.isFinite(h) ? { w, h } : null;
};

export const normalizeDeviceDetail = (info: AnyObj): NormalizedDetail => {
  const s = pickFirst(info, ['status', 'state', 'deviceState']);
  const c = pickFirst(info, ['connection_type', 'connection', 'transport_type', 'transport']);
  const b = pickFirst(info, ['brand', 'ro_product_brand', 'manufacturer']);
  const m = pickFirst(info, ['model', 'ro_product_model', 'device', 'product']);
  const sdk = pickFirst(info, ['sdk', 'ro_build_version_sdk', 'sdk_int', 'version_sdk', 'sdkInt']);
  const res = parseResolution(info);
  const ip = pickFirst(info, ['ip', 'wlan0', 'ip_address', 'wifi_ip']);

  const sdkInt = toInt(sdk.value);
  const androidVersion = sdkToAndroid(sdkInt);

  return {
    status: s.value != null ? String(s.value) : null, statusSource: s.source,
    conn: c.value != null ? String(c.value) : null, connSource: c.source,
    brand: b.value != null ? String(b.value) : null, brandSource: b.source,
    model: m.value != null ? String(m.value) : null, modelSource: m.source,
    sdkInt: sdkInt ?? null, sdkSource: sdk.source,
    androidVersion,
    resolution: res.value, resolutionSource: res.source,
    ip: ip.value != null ? String(ip.value) : null, ipSource: ip.source,
  };
};
