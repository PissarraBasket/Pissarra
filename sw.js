/* Pissarra i entrenaments — service worker
   Guarda la "carcassa" de l'app perquè s'obri ràpid i no es quedi en blanc sense cobertura.
   Les dades (equips, entrenaments…) sempre es demanen al servidor: mai es guarden aquí. */
const V = 'pissarra-v3';
const SHELL = ['./', 'index.html', 'config.js', 'manifest.webmanifest', 'icons/icon-192.png', 'icons/icon-512.png', 'icons/apple-touch-icon.png', 'icons/favicon-32.png'];
self.addEventListener('install', e => { e.waitUntil(caches.open(V).then(c => Promise.all(SHELL.map(u => c.add(u).catch(() => {})))).then(() => self.skipWaiting())); });
self.addEventListener('activate', e => { e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== V).map(k => caches.delete(k)))).then(() => self.clients.claim())); });
self.addEventListener('fetch', e => {
  const r = e.request;
  if (r.method !== 'GET') return;                         // les crides al servidor (POST) no passen per aquí
  const u = new URL(r.url);
  if (u.origin === location.origin) {                      // fitxers de l'app: s'obren a l'instant des de la còpia guardada i s'actualitzen de fons (la versió nova es veu la propera vegada que s'obri)
    e.respondWith(caches.open(V).then(c => c.match(r, { ignoreSearch: true }).then(m => {
      const mc = m ? m.clone() : null;
      const isDoc = r.mode === 'navigate' || /(^|\/)(index\.html)?$/.test(u.pathname);
      const net = fetch(r, { cache: 'no-cache' }).then(async res => {
        if (res && res.ok) {
          let changed = false;
          if (mc && isDoc) { try { changed = (await mc.text()) !== (await res.clone().text()); } catch (x) {} }
          await c.put(r, res.clone());
          if (changed) { const cl = await self.clients.matchAll({ type: 'window' }); cl.forEach(w => w.postMessage({ type: 'nova-versio' })); }
        }
        return res;
      });
      if (m) { e.waitUntil(net.catch(() => {})); return m; }          // hi ha còpia: resposta immediata
      return net.catch(() => caches.match('index.html'));             // primera vegada: xarxa
    })));
    return;
  }
  if (/fonts\.(googleapis|gstatic)\.com$/.test(u.hostname)) { // tipografies: de la còpia i es refresquen en segon pla
    e.respondWith(caches.open(V).then(c => c.match(r).then(m => { const f = fetch(r).then(res => { c.put(r, res.clone()); return res; }).catch(() => m); return m || f; })));
  }
});
