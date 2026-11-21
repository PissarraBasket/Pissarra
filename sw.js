/* Pissarra i entrenaments — service worker
   Guarda la "carcassa" de l'app perquè s'obri ràpid i no es quedi en blanc sense cobertura.
   Les dades (equips, entrenaments…) sempre es demanen al servidor: mai es guarden aquí. */
const V = 'pissarra-v1';
const SHELL = ['./', 'index.html', 'config.js', 'manifest.webmanifest', 'icons/icon-192.png', 'icons/icon-512.png', 'icons/apple-touch-icon.png', 'icons/favicon-32.png'];
self.addEventListener('install', e => { e.waitUntil(caches.open(V).then(c => c.addAll(SHELL)).then(() => self.skipWaiting())); });
self.addEventListener('activate', e => { e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== V).map(k => caches.delete(k)))).then(() => self.clients.claim())); });
self.addEventListener('fetch', e => {
  const r = e.request;
  if (r.method !== 'GET') return;                         // les crides al servidor (POST) no passen per aquí
  const u = new URL(r.url);
  if (u.origin === location.origin) {                      // fitxers de l'app: primer la xarxa (per rebre les actualitzacions), si no, la còpia guardada
    e.respondWith(fetch(r).then(res => { const cp = res.clone(); caches.open(V).then(c => c.put(r, cp)); return res; }).catch(() => caches.match(r).then(m => m || caches.match('index.html'))));
    return;
  }
  if (/fonts\.(googleapis|gstatic)\.com$/.test(u.hostname)) { // tipografies: de la còpia i es refresquen en segon pla
    e.respondWith(caches.open(V).then(c => c.match(r).then(m => { const f = fetch(r).then(res => { c.put(r, res.clone()); return res; }).catch(() => m); return m || f; })));
  }
});
