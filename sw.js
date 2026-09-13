const CACHE = 'catalog-230d96de';
const MODULES_CACHE = 'catalog-modules';
const FILES = ['./catalog.html', './sw.js', './manifest.json', './icon.png', './sprite-worker.js'];
const CURRENT_MODULES = ["shell.f76c2ce2.enc","misc.563867e3.enc","store-history.bf5fc3c0.enc","catalog-00.293537b3.enc","catalog-01.659524ba.enc","catalog-02.04d08475.enc","catalog-03.73480aed.enc","catalog-04.43258e5d.enc","catalog-05.0e0a9b86.enc","catalog-06.b7f32833.enc","catalog-07.5908f31d.enc","catalog-08.c973fbbf.enc","catalog-09.d69b086e.enc","catalog-10.5415e3e1.enc","catalog-11.3f3eb193.enc","catalog-12.5febcf1c.enc","catalog-13.754f6196.enc","catalog-14.2528aaf8.enc","catalog-15.0a7e8081.enc","catalog-16.262463a3.enc","catalog-17.94fe09f1.enc","catalog-18.66cf9ab7.enc","catalog-19.0416d612.enc","catalog-20.c660f147.enc","catalog-21.c5f65145.enc","catalog-22.1dad633a.enc","catalog-23.63916f52.enc","catalog-24.7b3ce318.enc","catalog-25.fe317c4a.enc","catalog-26.630c7cc5.enc","catalog-27.8343e87e.enc","catalog-28.445353b8.enc","catalog-29.95fbf76c.enc","catalog-30.cf224db2.enc","catalog-31.d8285f28.enc","catalog-32.c9765900.enc","catalog-33.dff78fdd.enc","catalog-34.0f84c084.enc","catalog-35.4cc8772f.enc","catalog-36.c0b1bd01.enc","catalog-37.9b9bb8d6.enc","catalog-38.9ed476d2.enc","catalog-39.40345444.enc","catalog-40.8148a79d.enc","catalog-41.a9edb3a2.enc","catalog-42.c9016ca3.enc","catalog-43.21b07f54.enc","catalog-44.4c027d2e.enc","catalog-45.2cb606cb.enc","catalog-46.9e35aa3b.enc","catalog-47.aeb15a4e.enc","products-historical-00.f92c6006.enc","products-historical-01.bb7e3a99.enc","products-historical-02.43c1f380.enc","products-historical-03.61e6636d.enc","products-historical-04.0d831655.enc","products-historical-05.793f68ca.enc","products-historical-06.4c89f63d.enc","products-historical-07.eedd95c2.enc","box-contents-00.cf5d2997.enc","box-contents-01.592f2aa0.enc","box-contents-02.5b118eda.enc","box-contents-03.8d9430cf.enc","sprites/sprite-00.57c70133.enc","sprites/sprite-01.26cd68ea.enc","sprites/sprite-02.e7f3badc.enc","sprites/sprite-03.863c2035.enc","sprites/sprite-04.0e202dec.enc","sprites/sprite-05.2b40a5c6.enc","sprites/sprite-06.42a97919.enc","sprites/sprite-07.3ab90752.enc","sprites/sprite-08.871b7757.enc","sprites/sprite-09.8a96a9c3.enc","sprites/sprite-10.5c336367.enc","sprites/sprite-11.c445ed6c.enc","sprites/sprite-12.38367923.enc","sprites/sprite-13.92e7c5b1.enc"];
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
