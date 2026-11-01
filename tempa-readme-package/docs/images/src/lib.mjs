// Tiny SVG helper library used by build-*.mjs (run with: node build.mjs)
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const here = path.dirname(fileURLToPath(import.meta.url));
export const LOGO_DIR = path.join(here, '..', 'logos');
export const OUT_DIR = path.join(here, '..');

export const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const logoCache = {};
export const logo = (n) =>
  (logoCache[n] ??= 'data:image/svg+xml;base64,' + fs.readFileSync(path.join(LOGO_DIR, n + '.svg')).toString('base64'));

export const C = {
  ink: '#1f2937', mute: '#6b7280', line: '#cbd5e1', bg: '#f8fafc',
  k8s: '#326CE5', aws: '#FF9900', vpc: '#7AA116', priv: '#147EBA', alb: '#8C4FFF',
  prom: '#E6522C', argo: '#EF7B4D', gl: '#FC6D26', mongo: '#47A248', gray: '#64748b',
  flow: '#2563eb', ctl: '#7c3aed', warn: '#d97706',
};

export class Svg {
  constructor(w, h) { this.w = w; this.h = h; this.p = []; this.markers = new Set(); }
  add(s) { this.p.push(s); return this; }
  rect(x, y, w, h, o = {}) {
    const { fill = '#fff', stroke = C.line, sw = 1.5, r = 10, dash, op } = o;
    return this.add(`<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${r}" fill="${fill}" stroke="${stroke}" stroke-width="${sw}"${dash ? ` stroke-dasharray="${dash}"` : ''}${op ? ` opacity="${op}"` : ''}/>`);
  }
  text(x, y, s, o = {}) {
    const { size = 12, weight = 400, fill = C.ink, anchor = 'start', mono = false, italic = false } = o;
    return this.add(`<text x="${x}" y="${y}" font-size="${size}" font-weight="${weight}" fill="${fill}" text-anchor="${anchor}"${mono ? ' font-family="JetBrains Mono, DejaVu Sans Mono, monospace"' : ''}${italic ? ' font-style="italic"' : ''}>${esc(s)}</text>`);
  }
  lines(x, y, arr, o = {}) { const lh = o.lh ?? 15; arr.forEach((s, i) => this.text(x, y + i * lh, s, o)); return this; }
  img(name, x, y, s = 28) { return this.add(`<image href="${logo(name)}" x="${x}" y="${y}" width="${s}" height="${s}"/>`); }
  // generic card: logo + title + sub lines
  card(x, y, w, h, o = {}) {
    const { logo: lg, title, sub = [], accent = C.k8s, fill = '#fff', tsize = 13, ssize = 11, dash, subFill = C.mute, lg_s = 28 } = o;
    this.rect(x, y, w, h, { fill, stroke: accent, sw: 1.6, r: 9, dash });
    let tx = x + 12;
    if (lg) { this.img(lg, x + 10, y + 9, lg_s); tx = x + 10 + lg_s + 8; }
    if (title) this.text(tx, y + 27, title, { size: tsize, weight: 700 });
    sub.forEach((s, i) => {
      const o2 = typeof s === 'string' ? { t: s } : s;
      this.text(x + 12, y + 50 + i * (ssize + 4), o2.t, { size: ssize, fill: o2.fill ?? subFill, mono: o2.mono, weight: o2.weight });
    });
    return this;
  }
  chip(x, y, w, h, s, o = {}) {
    const { fill = '#eef2ff', stroke = '#818cf8', color = C.ink, size = 10.5, mono = false, weight = 600 } = o;
    this.rect(x, y, w, h, { fill, stroke, sw: 1, r: h / 2 });
    return this.text(x + w / 2, y + h / 2 + size * 0.35, s, { size, fill: color, anchor: 'middle', mono, weight });
  }
  badge(n, x, y, fill = C.ink) {
    this.add(`<circle cx="${x}" cy="${y}" r="11" fill="${fill}" stroke="#fff" stroke-width="2"/>`);
    return this.text(x, y + 4, String(n), { size: 11, weight: 700, fill: '#fff', anchor: 'middle' });
  }
  arrow(pts, o = {}) {
    const { color = C.flow, dash, w = 2, head = true, tail = false } = o;
    const id = 'm' + color.replace('#', '');
    this.markers.add(color);
    const d = pts.map((p, i) => (i ? 'L' : 'M') + p[0] + ' ' + p[1]).join(' ');
    return this.add(`<path d="${d}" fill="none" stroke="${color}" stroke-width="${w}"${dash ? ` stroke-dasharray="${dash}"` : ''}${head ? ` marker-end="url(#${id})"` : ''}${tail ? ` marker-start="url(#${id}s)"` : ''} stroke-linejoin="round"/>`);
  }
  render() {
    const defs = [...this.markers].map((c) => {
      const id = 'm' + c.replace('#', '');
      return `<marker id="${id}" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0 0L10 5L0 10z" fill="${c}"/></marker>` +
        `<marker id="${id}s" viewBox="0 0 10 10" refX="1" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M10 0L0 5L10 10z" fill="${c}"/></marker>`;
    }).join('');
    return `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="${this.w}" height="${this.h}" viewBox="0 0 ${this.w} ${this.h}" font-family="Inter, 'Segoe UI', 'DejaVu Sans', Arial, sans-serif"><defs>${defs}</defs><rect width="${this.w}" height="${this.h}" fill="${C.bg}"/>${this.p.join('\n')}</svg>`;
  }
}

export async function toPng(svgString, svgPath, pngPath, scale = 1.5) {
  fs.writeFileSync(svgPath, svgString);
  // playwright may be local or global; fall back to the global npm root
  let pw;
  try { pw = await import('playwright'); } catch {
    const { execSync } = await import('child_process');
    const { createRequire } = await import('module');
    pw = createRequire(path.join(execSync('npm root -g').toString().trim(), '/'))('playwright');
  }
  const { chromium } = pw;
  const b = await chromium.launch();
  const m = svgString.match(/width="(\d+)" height="(\d+)"/);
  const pg = await b.newPage({ viewport: { width: +m[1], height: +m[2] }, deviceScaleFactor: scale });
  await pg.setContent(`<html><body style="margin:0">${svgString}</body></html>`);
  await pg.waitForTimeout(300);
  await pg.screenshot({ path: pngPath, clip: { x: 0, y: 0, width: +m[1], height: +m[2] } });
  await b.close();
}
