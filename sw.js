const CACHE = 'catalog-355a323f';
const MODULES_CACHE = 'catalog-modules';
const FILES = ['./catalog.html', './sw.js', './manifest.json', './icon.png', './sprite-worker.js'];
const CURRENT_MODULES = ["shell.f76c2ce2.enc","misc.563867e3.enc","store-history.68690622.enc","catalog-00.c0ac9659.enc","catalog-01.bca168c6.enc","catalog-02.bffd136f.enc","catalog-03.26554cab.enc","catalog-04.eef26e00.enc","catalog-05.3bbc680a.enc","catalog-06.4c3d2bec.enc","catalog-07.f74fb53d.enc","catalog-08.0cf1ecc8.enc","catalog-09.63f45e48.enc","catalog-10.0ddb1b1d.enc","catalog-11.dbf76e0a.enc","catalog-12.a3503252.enc","catalog-13.60160982.enc","catalog-14.e875c9d6.enc","catalog-15.71ae30d4.enc","catalog-16.5405428e.enc","catalog-17.88eca478.enc","catalog-18.f7fe8620.enc","catalog-19.ce18bd2c.enc","catalog-20.66ec2436.enc","catalog-21.e035f574.enc","catalog-22.a3069e5b.enc","catalog-23.c1f52e6e.enc","catalog-24.2cc43595.enc","catalog-25.b6f0a0c3.enc","catalog-26.5158970d.enc","catalog-27.ae897c7f.enc","catalog-28.4bbdcc09.enc","catalog-29.c2513058.enc","catalog-30.bfbdb07b.enc","catalog-31.b4437f0c.enc","catalog-32.6ad9559a.enc","catalog-33.846d166a.enc","catalog-34.28b18fc1.enc","catalog-35.e21fedc2.enc","catalog-36.150db1f9.enc","catalog-37.99819092.enc","catalog-38.0cead8e7.enc","catalog-39.a34ce62b.enc","catalog-40.2ec477d5.enc","catalog-41.ee84a678.enc","catalog-42.786cdadb.enc","catalog-43.7e640a7e.enc","catalog-44.2919ad7c.enc","catalog-45.d7e372dd.enc","catalog-46.771ff59f.enc","catalog-47.4081a64e.enc","products-historical-00.c4455469.enc","products-historical-01.cd79eec0.enc","products-historical-02.56bd8a23.enc","products-historical-03.90c0d741.enc","products-historical-04.c245277a.enc","products-historical-05.340a173c.enc","products-historical-06.43d80222.enc","products-historical-07.aa650988.enc","box-contents-00.527b58c2.enc","box-contents-01.244fd23b.enc","box-contents-02.c479efbb.enc","box-contents-03.95336815.enc","sprites/sprite-00.57c70133.enc","sprites/sprite-01.26cd68ea.enc","sprites/sprite-02.e7f3badc.enc","sprites/sprite-03.863c2035.enc","sprites/sprite-04.0e202dec.enc","sprites/sprite-05.2b40a5c6.enc","sprites/sprite-06.42a97919.enc","sprites/sprite-07.3ab90752.enc","sprites/sprite-08.871b7757.enc","sprites/sprite-09.8a96a9c3.enc","sprites/sprite-10.5c336367.enc","sprites/sprite-11.c445ed6c.enc","sprites/sprite-12.38367923.enc","sprites/sprite-13.92e7c5b1.enc"];
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
