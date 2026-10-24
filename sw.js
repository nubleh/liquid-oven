const CACHE = 'catalog-2ce6c4c1';
const MODULES_CACHE = 'catalog-modules';
const FILES = ['./catalog.html', './sw.js', './manifest.json', './icon.png', './sprite-worker.js'];
const CURRENT_MODULES = ["shell.13ee012c.enc","misc.563867e3.enc","store-history.5628470e.enc","catalog-00.3a0db0b2.enc","catalog-01.98e79e9b.enc","catalog-02.cde76394.enc","catalog-03.36bf64e9.enc","catalog-04.baefae2f.enc","catalog-05.9b49f586.enc","catalog-06.b064cabd.enc","catalog-07.a5988d75.enc","catalog-08.b8491485.enc","catalog-09.6962fc7e.enc","catalog-10.efb46496.enc","catalog-11.3cf78568.enc","catalog-12.a60f3dc8.enc","catalog-13.5d17e81e.enc","catalog-14.4faff2a4.enc","catalog-15.101323bd.enc","catalog-16.13281299.enc","catalog-17.9f19f0a5.enc","catalog-18.55ad9ca2.enc","catalog-19.022c5d26.enc","catalog-20.4483944d.enc","catalog-21.f69be497.enc","catalog-22.629ef79c.enc","catalog-23.8f2506de.enc","catalog-24.eff6d776.enc","catalog-25.6ca23c2e.enc","catalog-26.2af633c3.enc","catalog-27.5e15333f.enc","catalog-28.acc9ad36.enc","catalog-29.a9762f7b.enc","catalog-30.a207ed43.enc","catalog-31.06a0398a.enc","catalog-32.d284924e.enc","catalog-33.df2a0ba7.enc","catalog-34.f10206d0.enc","catalog-35.668f9408.enc","catalog-36.e7fd60a1.enc","catalog-37.028d00b1.enc","catalog-38.a3413dd6.enc","catalog-39.8e638319.enc","catalog-40.31b295c1.enc","catalog-41.22fb7a19.enc","catalog-42.7340ea85.enc","catalog-43.a135824e.enc","catalog-44.1a4002e0.enc","catalog-45.197d3594.enc","catalog-46.93805d95.enc","catalog-47.a8822ed9.enc","products-historical-00.fa93813d.enc","products-historical-01.969f4999.enc","products-historical-02.b96d40d8.enc","products-historical-03.e2e7a6c8.enc","products-historical-04.bf7f0d14.enc","products-historical-05.955647ac.enc","products-historical-06.ccf085f6.enc","products-historical-07.93e08861.enc","box-contents-00.78ed7f35.enc","box-contents-01.484d93cb.enc","box-contents-02.75e62936.enc","box-contents-03.3a3bbb34.enc","sprites/sprite-00.a50a5522.enc","sprites/sprite-01.e62152ea.enc","sprites/sprite-02.0421f5a7.enc","sprites/sprite-03.136375cf.enc","sprites/sprite-04.a98797db.enc","sprites/sprite-05.eb319597.enc","sprites/sprite-06.5e85a81e.enc","sprites/sprite-07.240bc26e.enc","sprites/sprite-08.fdd18271.enc","sprites/sprite-09.0da151e0.enc","sprites/sprite-10.66c033e7.enc","sprites/sprite-11.310c6f3d.enc","sprites/sprite-12.8dd5a065.enc","sprites/sprite-13.f14f061f.enc","sprites/sprite-14.0065e93f.enc"];
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
