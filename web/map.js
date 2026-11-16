// =====================================================================
// AxoGo — mini mapa (sem biblioteca): mostra o percurso e a posição atual
// sobre imagens de mapa do OpenStreetMap/CARTO. Sem internet, o percurso
// continua aparecendo sobre um fundo quadriculado.
// =====================================================================
const T = 256;
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

export function proj(lat, lon, z) {
  const n = 2 ** z, s = Math.sin(clamp(lat, -85, 85) * Math.PI / 180);
  return [(lon + 180) / 360 * n * T, (0.5 - Math.log((1 + s) / (1 - s)) / (4 * Math.PI)) * n * T];
}
export function unproj(x, y, z) {
  const n = 2 ** z, lon = x / (n * T) * 360 - 180;
  const lat = Math.atan(Math.sinh(Math.PI * (1 - 2 * y / (n * T)))) * 180 / Math.PI;
  return [lat, lon];
}
export function haversine(a, b) {
  const R = 6371e3, t = x => x * Math.PI / 180;
  const dl = t(b[0] - a[0]), dn = t(b[1] - a[1]);
  const h = Math.sin(dl / 2) ** 2 + Math.cos(t(a[0])) * Math.cos(t(b[0])) * Math.sin(dn / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}
/** Reduz o percurso para caber no armazenamento (mantém as quebras de pausa = null). */
export function simplifyPath(path, max = 400) {
  const pts = path.filter(Boolean).length;
  const step = Math.max(1, Math.ceil(pts / max));
  const out = []; let i = 0, lastReal = null;
  for (const p of path) {
    if (!p) { if (lastReal && out[out.length - 1] !== lastReal) out.push(lastReal); if (out.length && out[out.length - 1] !== null) out.push(null); i = 0; lastReal = null; continue; }
    const q = [Math.round(p[0] * 1e5) / 1e5, Math.round(p[1] * 1e5) / 1e5];
    if (i % step === 0) out.push(q);
    lastReal = q; i++;
  }
  if (lastReal && out[out.length - 1] !== lastReal) out.push(lastReal);
  while (out.length && out[out.length - 1] === null) out.pop();
  return out;
}
export const pathPoints = path => (path || []).filter(Boolean).length;

const tileUrl = (z, x, y) =>
  `https://${'abcd'[(x + y) % 4]}.basemaps.cartocdn.com/rastertiles/voyager/${z}/${x}/${y}${(window.devicePixelRatio || 1) > 1.4 ? '@2x' : ''}.png`;

export class MiniMap {
  constructor(el, { zoom = 17, controls = true, drag = true } = {}) {
    this.el = el; this.z = zoom; this.c = null; this.path = []; this.cur = null; this.imgs = new Map(); this.follow = true;
    el.classList.add('map');
    el.innerHTML = `<div class="map-tiles"></div>
      <svg class="map-svg" xmlns="http://www.w3.org/2000/svg"><path class="mp-case" fill="none"/><path class="mp-line" fill="none"/><circle class="mp-start" r="7"/><circle class="mp-end" r="7"/></svg>
      <div class="map-dot" hidden><i></i></div><div class="map-msg" hidden></div>
      ${controls ? '<div class="map-zoom"><button type="button" data-z="1" aria-label="Aproximar">+</button><button type="button" data-z="-1" aria-label="Afastar">−</button><button type="button" data-re hidden aria-label="Centralizar">◎</button></div>' : ''}
      <a class="map-attr" href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">© OpenStreetMap · CARTO</a>`;
    this.q = s => el.querySelector(s);
    el.querySelectorAll('[data-z]').forEach(b => b.addEventListener('click', e => { e.stopPropagation(); this.z = clamp(this.z + +b.dataset.z, 3, 19); this.draw(); }));
    const re = this.q('[data-re]');
    if (re) re.addEventListener('click', e => { e.stopPropagation(); this.follow = true; re.hidden = true; if (this.onRecenter) this.onRecenter(); this.draw(); });
    if (drag) {
      let last = null;
      el.addEventListener('pointerdown', e => { if (e.target.closest('button,a') || !this.c) return; last = [e.clientX, e.clientY]; try { el.setPointerCapture(e.pointerId); } catch (_) {} });
      el.addEventListener('pointermove', e => {
        if (!last || !this.c) return;
        const dx = e.clientX - last[0], dy = e.clientY - last[1]; if (Math.abs(dx) + Math.abs(dy) < 2) return;
        last = [e.clientX, e.clientY];
        const [x, y] = proj(this.c[0], this.c[1], this.z); this.c = unproj(x - dx, y - dy, this.z);
        this.follow = false; if (re) re.hidden = false; this.draw();
      });
      const end = () => { last = null; };
      el.addEventListener('pointerup', end); el.addEventListener('pointercancel', end);
    }
    try { this.ro = new ResizeObserver(() => this.draw()); this.ro.observe(el); } catch (_) {}
  }
  destroy() { try { this.ro && this.ro.disconnect(); } catch (_) {} }
  message(t) { const m = this.q('.map-msg'); m.hidden = !t; m.textContent = t || ''; }
  /** Enquadra o percurso inteiro. */
  fit(path, pad = 34) {
    this.path = path || [];
    const pts = this.path.filter(Boolean); if (!pts.length) return false;
    let a = 90, b = -90, c = 180, d = -180;
    for (const p of pts) { a = Math.min(a, p[0]); b = Math.max(b, p[0]); c = Math.min(c, p[1]); d = Math.max(d, p[1]); }
    const w = this.el.clientWidth || 320, h = this.el.clientHeight || 220;
    let z = 18;
    for (; z > 3; z--) { const p0 = proj(b, c, z), p1 = proj(a, d, z); if (p1[0] - p0[0] <= w - 2 * pad && p1[1] - p0[1] <= h - 2 * pad) break; }
    this.z = z;
    const p0 = proj(b, c, z), p1 = proj(a, d, z);
    this.c = unproj((p0[0] + p1[0]) / 2, (p0[1] + p1[1]) / 2, z);
    this.follow = false; this.draw(); return true;
  }
  /** Atualização ao vivo: percurso + posição atual (o mapa acompanha se o usuário não arrastou). */
  live(path, cur) {
    this.path = path || []; this.cur = cur || null;
    if (cur && (this.follow || !this.c)) this.c = cur;
    this.draw();
  }
  draw() {
    const el = this.el, w = el.clientWidth, h = el.clientHeight; if (!w || !h) return;
    const tilesEl = this.q('.map-tiles'), svg = this.q('.map-svg'), dot = this.q('.map-dot');
    if (!this.c) { svg.style.visibility = 'hidden'; dot.hidden = true; return; }
    svg.style.visibility = '';
    const z = this.z, n = 2 ** z, [cx, cy] = proj(this.c[0], this.c[1], z), x0 = cx - w / 2, y0 = cy - h / 2;
    const need = new Set();
    for (let ty = Math.floor(y0 / T); ty <= Math.floor((y0 + h) / T); ty++) {
      if (ty < 0 || ty >= n) continue;
      for (let tx = Math.floor(x0 / T); tx <= Math.floor((x0 + w) / T); tx++) {
        const wx = ((tx % n) + n) % n, key = `${z}/${wx}/${ty}/${tx}`; need.add(key);
        let img = this.imgs.get(key);
        if (!img) {
          img = new Image(); img.className = 'map-tile'; img.alt = ''; img.draggable = false; img.decoding = 'async';
          img.onerror = () => { img.style.visibility = 'hidden'; };
          img.src = tileUrl(z, wx, ty); tilesEl.appendChild(img); this.imgs.set(key, img);
        }
        img.style.transform = `translate(${Math.round(tx * T - x0)}px,${Math.round(ty * T - y0)}px)`;
      }
    }
    for (const [k, img] of this.imgs) if (!need.has(k)) { img.remove(); this.imgs.delete(k); }
    let d = '', pen = false, first = null, last = null;
    for (const p of this.path) {
      if (!p) { pen = false; continue; }
      const [x, y] = proj(p[0], p[1], z), px = x - x0, py = y - y0;
      d += (pen ? 'L' : 'M') + px.toFixed(1) + ' ' + py.toFixed(1); pen = true;
      if (!first) first = [px, py]; last = [px, py];
    }
    this.q('.mp-case').setAttribute('d', d); this.q('.mp-line').setAttribute('d', d);
    const ms = this.q('.mp-start'), me = this.q('.mp-end');
    ms.style.display = first ? '' : 'none'; me.style.display = last && !this.cur ? '' : 'none';
    if (first) { ms.setAttribute('cx', first[0]); ms.setAttribute('cy', first[1]); }
    if (last) { me.setAttribute('cx', last[0]); me.setAttribute('cy', last[1]); }
    if (this.cur) { const [x, y] = proj(this.cur[0], this.cur[1], z); dot.hidden = false; dot.style.transform = `translate(${(x - x0).toFixed(1)}px,${(y - y0).toFixed(1)}px)`; }
    else dot.hidden = true;
  }
}
