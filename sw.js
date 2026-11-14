const CACHE = 'catalog-895bd9c8';
const MODULES_CACHE = 'catalog-modules';
const FILES = ['./catalog.html', './sw.js', './manifest.json', './icon.png', './sprite-worker.js'];
const CURRENT_MODULES = ["shell.13ee012c.enc","misc.563867e3.enc","store-history.0ed0630a.enc","catalog-00.01364f34.enc","catalog-01.ee4ef2bf.enc","catalog-02.43e2abac.enc","catalog-03.eb2d372e.enc","catalog-04.b19caf2d.enc","catalog-05.efb0213f.enc","catalog-06.cf1a8cb4.enc","catalog-07.7a938047.enc","catalog-08.6838eeff.enc","catalog-09.090b9b26.enc","catalog-10.65838a4a.enc","catalog-11.4c235028.enc","catalog-12.9b50aa4b.enc","catalog-13.322321af.enc","catalog-14.5537c81a.enc","catalog-15.2d141182.enc","catalog-16.faf247e1.enc","catalog-17.1fd1a85c.enc","catalog-18.72443299.enc","catalog-19.5225ab03.enc","catalog-20.618cc38e.enc","catalog-21.81c91c0c.enc","catalog-22.b07c0590.enc","catalog-23.0de0d710.enc","catalog-24.3d353a93.enc","catalog-25.c1aaf140.enc","catalog-26.e0e8fec7.enc","catalog-27.b8647ca9.enc","catalog-28.7cad826a.enc","catalog-29.0fce6aeb.enc","catalog-30.88d18d3b.enc","catalog-31.0e7e7182.enc","catalog-32.ffc79d4c.enc","catalog-33.ccb3d000.enc","catalog-34.ab5cb2b2.enc","catalog-35.7812f0dc.enc","catalog-36.b3370595.enc","catalog-37.0a9b95e1.enc","catalog-38.ae5a3b69.enc","catalog-39.f87bc672.enc","catalog-40.58bd4eef.enc","catalog-41.5b9778d1.enc","catalog-42.9f6b577b.enc","catalog-43.f9e5fec0.enc","catalog-44.ace31fe4.enc","catalog-45.f90e3879.enc","catalog-46.808718b1.enc","catalog-47.93eb6850.enc","products-historical-00.fa93813d.enc","products-historical-01.969f4999.enc","products-historical-02.b96d40d8.enc","products-historical-03.e2e7a6c8.enc","products-historical-04.bf7f0d14.enc","products-historical-05.955647ac.enc","products-historical-06.ccf085f6.enc","products-historical-07.93e08861.enc","box-contents-00.78ed7f35.enc","box-contents-01.484d93cb.enc","box-contents-02.75e62936.enc","box-contents-03.3a3bbb34.enc","sprites/sprite-00.55b29997.enc","sprites/sprite-01.04c38c4d.enc","sprites/sprite-02.2d73a6e1.enc","sprites/sprite-03.cf47f0a2.enc","sprites/sprite-04.9e6a3bd7.enc","sprites/sprite-05.b463cd25.enc","sprites/sprite-06.63eba3bd.enc","sprites/sprite-07.90b9b1b5.enc","sprites/sprite-08.92dfeacd.enc","sprites/sprite-09.c37d7457.enc","sprites/sprite-10.858442bf.enc","sprites/sprite-11.ab025cca.enc","sprites/sprite-12.a7c84c61.enc","sprites/sprite-13.55bbdf7c.enc","sprites/sprite-14.ae1d46e0.enc"];
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
