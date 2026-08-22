const CACHE = 'catalog-98d71d1f';
const MODULES_CACHE = 'catalog-modules';
const FILES = ['./catalog.html', './sw.js', './manifest.json', './icon.png', './sprite-worker.js'];
const CURRENT_MODULES = ["shell.874a04d3.enc","misc.468fcfe9.enc","store-history.2090fc65.enc","catalog-00.f6096ffe.enc","catalog-01.68891854.enc","catalog-02.b9212d96.enc","catalog-03.6dfb0276.enc","catalog-04.115a8a03.enc","catalog-05.4e36425d.enc","catalog-06.641bf040.enc","catalog-07.9beb3fc7.enc","catalog-08.99fd92fb.enc","catalog-09.e8c58625.enc","catalog-10.b5189a53.enc","catalog-11.36d21568.enc","catalog-12.2397aaf9.enc","catalog-13.576c79c6.enc","catalog-14.18844875.enc","catalog-15.de012e8e.enc","catalog-16.f54f8e35.enc","catalog-17.3cd65a6b.enc","catalog-18.facdeced.enc","catalog-19.ebbbdd16.enc","catalog-20.66fe2887.enc","catalog-21.e77558f6.enc","catalog-22.c3ac83b7.enc","catalog-23.c0558f00.enc","catalog-24.aa3b62e5.enc","catalog-25.aac32e5d.enc","catalog-26.600248dc.enc","catalog-27.2202ae25.enc","catalog-28.a3c64f1e.enc","catalog-29.dd7e8f48.enc","catalog-30.2cb1817f.enc","catalog-31.322c4f19.enc","catalog-32.16f6fc93.enc","catalog-33.31f4a811.enc","catalog-34.2ccf6abb.enc","catalog-35.ed872f7d.enc","catalog-36.54c37c48.enc","catalog-37.60d2ffb3.enc","catalog-38.d4abf4b2.enc","catalog-39.e7adb4be.enc","catalog-40.192ad833.enc","catalog-41.4e9d5126.enc","catalog-42.75ef5225.enc","catalog-43.aa0806c8.enc","catalog-44.e34e08ea.enc","catalog-45.27644467.enc","catalog-46.00cc8591.enc","catalog-47.4a345053.enc","sprites/sprite-00.8df0bceb.enc","sprites/sprite-01.f09a3382.enc","sprites/sprite-02.b65d0e0c.enc","sprites/sprite-03.34f353a2.enc","sprites/sprite-04.9da3d356.enc","sprites/sprite-05.a7e49c46.enc","sprites/sprite-06.f0d543bc.enc","sprites/sprite-07.973847cd.enc","sprites/sprite-08.be1ada86.enc","sprites/sprite-09.57efe46b.enc","sprites/sprite-10.751ca26d.enc","sprites/sprite-11.48adea10.enc","sprites/sprite-12.4012b0ea.enc","sprites/sprite-13.203fce19.enc"];
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
