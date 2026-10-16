const CACHE = 'catalog-a2ad389c';
const MODULES_CACHE = 'catalog-modules';
const FILES = ['./catalog.html', './sw.js', './manifest.json', './icon.png', './sprite-worker.js'];
const CURRENT_MODULES = ["shell.2eb7ca0f.enc","misc.563867e3.enc","store-history.eb90bc06.enc","catalog-00.8e586c2f.enc","catalog-01.7cee2378.enc","catalog-02.fbb95af7.enc","catalog-03.f8ceee32.enc","catalog-04.34bd16aa.enc","catalog-05.c410d25a.enc","catalog-06.3c82f930.enc","catalog-07.23bafc1b.enc","catalog-08.84888942.enc","catalog-09.2bc1a514.enc","catalog-10.a2c8721d.enc","catalog-11.c64411f3.enc","catalog-12.729a3145.enc","catalog-13.7f9aa0aa.enc","catalog-14.17b64ac9.enc","catalog-15.9f08db27.enc","catalog-16.80a8de8e.enc","catalog-17.bde7b678.enc","catalog-18.b19ed86f.enc","catalog-19.3520966a.enc","catalog-20.6939099c.enc","catalog-21.4d1683e3.enc","catalog-22.211b03bd.enc","catalog-23.56e315fa.enc","catalog-24.6214c962.enc","catalog-25.16edbd38.enc","catalog-26.d207e24f.enc","catalog-27.7ce251d2.enc","catalog-28.d8637bc6.enc","catalog-29.71572474.enc","catalog-30.a8a1f945.enc","catalog-31.d1d15dd9.enc","catalog-32.ee7e419f.enc","catalog-33.ab5218e8.enc","catalog-34.3440ba9e.enc","catalog-35.8bc8f1b6.enc","catalog-36.e74849cb.enc","catalog-37.56dc4412.enc","catalog-38.206e8c0d.enc","catalog-39.070848d2.enc","catalog-40.41ff6df6.enc","catalog-41.49c65de0.enc","catalog-42.f60a35a6.enc","catalog-43.f508a4b2.enc","catalog-44.69ce2b0f.enc","catalog-45.b075e2fd.enc","catalog-46.300f259e.enc","catalog-47.811fd355.enc","products-historical-00.fa93813d.enc","products-historical-01.969f4999.enc","products-historical-02.b96d40d8.enc","products-historical-03.e2e7a6c8.enc","products-historical-04.bf7f0d14.enc","products-historical-05.955647ac.enc","products-historical-06.ccf085f6.enc","products-historical-07.93e08861.enc","box-contents-00.78ed7f35.enc","box-contents-01.484d93cb.enc","box-contents-02.75e62936.enc","box-contents-03.3a3bbb34.enc","sprites/sprite-00.a50a5522.enc","sprites/sprite-01.e62152ea.enc","sprites/sprite-02.0421f5a7.enc","sprites/sprite-03.136375cf.enc","sprites/sprite-04.a98797db.enc","sprites/sprite-05.eb319597.enc","sprites/sprite-06.8a582c68.enc","sprites/sprite-07.de00a8f8.enc","sprites/sprite-08.66ba7f9a.enc","sprites/sprite-09.e9e44f5e.enc","sprites/sprite-10.3026970e.enc","sprites/sprite-11.05217a7f.enc","sprites/sprite-12.424c6884.enc","sprites/sprite-13.e3c940f3.enc","sprites/sprite-14.5341998a.enc"];
function isModuleUrl(url) {
  // Sprite sheets and catalog fragments are hash-named too (sprite-NN.
  // <hash>.enc, catalog-NN.<hash>.enc), same as shell/misc/store-history,
  // so they're all safe for the same cache-first-no-revalidation
  // treatment — content that changes gets a new hash and therefore a new
  // filename, which naturally misses this cache and falls through to a
  // real fetch, while an unchanged file's cached entry is still valid
  // forever under its unchanged name.
  return /\/(shell|misc|store-history)\.[a-f0-9]+\.enc$/.test(url)
    || /\/catalog-\d+\.[a-f0-9]+\.enc$/.test(url)
    || /\/products-historical-\d+\.[a-f0-9]+\.enc$/.test(url)
    || /\/box-contents-\d+\.[a-f0-9]+\.enc$/.test(url)
    || /\/sprites\/sprite-\d+\.[a-f0-9]+\.enc$/.test(url);
}
self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(FILES)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', e => {
  e.waitUntil(Promise.all([
    caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE && k !== MODULES_CACHE).map(k => caches.delete(k)))),
    caches.open(MODULES_CACHE).then(cache => cache.keys().then(reqs => Promise.all(
      reqs.filter(r => !CURRENT_MODULES.some(m => r.url.endsWith(m))).map(r => cache.delete(r))
    ))),
  ]).then(() => self.clients.claim()));
});
self.addEventListener('fetch', e => {
  // Only cache same-origin requests. Without this check, every hotlinked
  // warhammer.com image the page ever loads — full-res 920x950 product
  // photos, every individual 360-viewer frame — also gets captured into
  // Cache Storage with no eviction, ever. That's an unbounded, permanent
  // cache of third-party content the app never intended to keep offline,
  // and is exactly what balloons an installed PWA's storage to multiple
  // GB over a browsing session or two. Cross-origin requests just pass
  // straight through to the network, falling back to the browser's own
  // normal HTTP cache behavior — same as any page not controlled by a
  // service worker at all.
  if (new URL(e.request.url).origin !== self.location.origin) {
    e.respondWith(fetch(e.request));
    return;
  }
  if (isModuleUrl(e.request.url)) {
    // Content-hashed filename ⇒ immutable — cache-first, no revalidation
    // ever needed for a given exact URL. This is what actually skips the
    // network entirely for a module whose content (and therefore hash,
    // therefore filename) hasn't changed since last time.
    e.respondWith(caches.open(MODULES_CACHE).then(function(cache) {
      return cache.match(e.request).then(function(cached) {
        if (cached) return cached;
        return fetch(e.request).then(function(r) { cache.put(e.request, r.clone()); return r; });
      });
    }));
    return;
  }
  if (/\/build-manifest\.json$/.test(e.request.url)) {
    // Network-FIRST, not stale-while-revalidate — this is the one file
    // the unlock checklist depends on to know whether anything changed at
    // all, and the page's own fetch('build-manifest.json',{cache:'no-
    // store'}) call only bypasses the BROWSER's HTTP cache; it does
    // nothing to stop THIS service worker from intercepting the request
    // first. Treating it like the other pointer files below (stale-while-
    // revalidate: return a cached hit instantly, update in the background
    // for next time) would silently defeat cache:'no-store' entirely —
    // every launch would see the PREVIOUS launch's manifest, one
    // generation behind, taking multiple app restarts to "catch up" after
    // a deploy. Falling back to cache only on a genuine network failure
    // (offline) preserves some graceful degradation without ever serving
    // a stale manifest while online.
    e.respondWith(caches.open(CACHE).then(function(cache) {
      return fetch(e.request).then(function(r) { cache.put(e.request, r.clone()); return r; })
        .catch(function() { return cache.match(e.request); });
    }));
    return;
  }
  // Small "pointer" files (catalog.html, sw.js, manifest.json, icon.png,
  // sprite-worker.js) — always revalidate against the network, same
  // stale-while-revalidate behavior as before. These must stay current to
  // know whether anything changed at all, though a single stale hit here
  // (unlike build-manifest.json above) just means the CODE that runs is
  // one version behind, not that the wrong FILENAMES get requested — the
  // manifest is what actually drives the checklist's own correctness.
  e.respondWith(caches.open(CACHE).then(function(cache) {
    return cache.match(e.request).then(function(cached) {
      var network = fetch(e.request).then(function(r) { cache.put(e.request, r.clone()); return r; }).catch(function() { return cached; });
      return cached || network;
    });
  }));
});
