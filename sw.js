const CACHE = 'catalog-7adc01ca';
const MODULES_CACHE = 'catalog-modules';
const FILES = ['./catalog.html', './sw.js', './manifest.json', './icon.png', './sprite-worker.js'];
const CURRENT_MODULES = ["shell.f76c2ce2.enc","misc.563867e3.enc","store-history.616562c4.enc","catalog-00.837a64f6.enc","catalog-01.62fb3259.enc","catalog-02.3daf34b2.enc","catalog-03.e9d28868.enc","catalog-04.f6296506.enc","catalog-05.e8833a06.enc","catalog-06.f6507661.enc","catalog-07.127044ca.enc","catalog-08.b3464e5d.enc","catalog-09.86312326.enc","catalog-10.657a0b7c.enc","catalog-11.35fb1cb1.enc","catalog-12.cb21f439.enc","catalog-13.9cc960a2.enc","catalog-14.1348cc23.enc","catalog-15.335fb82b.enc","catalog-16.e3091f8e.enc","catalog-17.14e8d558.enc","catalog-18.e7343b94.enc","catalog-19.2e8a0dfa.enc","catalog-20.df5657f2.enc","catalog-21.8abd40d7.enc","catalog-22.63c82f2d.enc","catalog-23.b946a862.enc","catalog-24.ac9c4488.enc","catalog-25.d9b044f9.enc","catalog-26.a874242b.enc","catalog-27.4458daf2.enc","catalog-28.18d83d41.enc","catalog-29.1114ed9f.enc","catalog-30.a8dc24ec.enc","catalog-31.0ab1bb0a.enc","catalog-32.24f4b8d0.enc","catalog-33.53c0f9c2.enc","catalog-34.320051f6.enc","catalog-35.1fef1e90.enc","catalog-36.e1b554ad.enc","catalog-37.a46b163c.enc","catalog-38.dd5157f0.enc","catalog-39.aeeb0c27.enc","catalog-40.456c400a.enc","catalog-41.43b470f5.enc","catalog-42.47e78c3a.enc","catalog-43.202860ca.enc","catalog-44.863f425c.enc","catalog-45.719ec749.enc","catalog-46.322bc676.enc","catalog-47.3f8cfe8f.enc","products-historical-00.c4455469.enc","products-historical-01.24f769e4.enc","products-historical-02.6f58615a.enc","products-historical-03.8d591a71.enc","products-historical-04.f6b1038f.enc","products-historical-05.162e64e9.enc","products-historical-06.80352ff6.enc","products-historical-07.962b1852.enc","box-contents-00.4377f82d.enc","box-contents-01.eab4edbb.enc","box-contents-02.b91b9de9.enc","box-contents-03.ec2e3986.enc","sprites/sprite-00.57c70133.enc","sprites/sprite-01.26cd68ea.enc","sprites/sprite-02.e7f3badc.enc","sprites/sprite-03.863c2035.enc","sprites/sprite-04.0e202dec.enc","sprites/sprite-05.2b40a5c6.enc","sprites/sprite-06.42a97919.enc","sprites/sprite-07.3ab90752.enc","sprites/sprite-08.871b7757.enc","sprites/sprite-09.8a96a9c3.enc","sprites/sprite-10.5c336367.enc","sprites/sprite-11.c445ed6c.enc","sprites/sprite-12.38367923.enc","sprites/sprite-13.92e7c5b1.enc"];
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
