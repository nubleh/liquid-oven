const CACHE = 'catalog-e8953fc3';
const MODULES_CACHE = 'catalog-modules';
const FILES = ['./catalog.html', './sw.js', './manifest.json', './icon.png', './sprite-worker.js'];
const CURRENT_MODULES = ["shell.13ee012c.enc","misc.563867e3.enc","store-history.ed0e8a73.enc","catalog-00.0d9e0492.enc","catalog-01.fccebaee.enc","catalog-02.5355ca47.enc","catalog-03.8d57092a.enc","catalog-04.c816ef70.enc","catalog-05.6bf84ccf.enc","catalog-06.87122ee2.enc","catalog-07.4bf4ce97.enc","catalog-08.23242f96.enc","catalog-09.70709864.enc","catalog-10.8e194f20.enc","catalog-11.280506a7.enc","catalog-12.82cb5f3f.enc","catalog-13.a83b4e8b.enc","catalog-14.a404b881.enc","catalog-15.0fe0c9c8.enc","catalog-16.233e6bbb.enc","catalog-17.cee8742a.enc","catalog-18.7f67e85a.enc","catalog-19.520d75e3.enc","catalog-20.61bf916c.enc","catalog-21.233601f4.enc","catalog-22.a6f0bbfa.enc","catalog-23.3bc5fb2c.enc","catalog-24.a02fcd47.enc","catalog-25.0f87ee50.enc","catalog-26.e574210b.enc","catalog-27.ac502c8c.enc","catalog-28.d59850f9.enc","catalog-29.e6fe8afb.enc","catalog-30.fc81b2b3.enc","catalog-31.0f4b9380.enc","catalog-32.9793b05b.enc","catalog-33.5275753a.enc","catalog-34.7efd55f9.enc","catalog-35.3267ceac.enc","catalog-36.b938fe84.enc","catalog-37.9c8a87a7.enc","catalog-38.c8afba9f.enc","catalog-39.83f57f9f.enc","catalog-40.77a5b9ce.enc","catalog-41.8f12c05e.enc","catalog-42.f6fd7b0f.enc","catalog-43.b1dfbb99.enc","catalog-44.13ec2108.enc","catalog-45.9d78d82a.enc","catalog-46.755943be.enc","catalog-47.64f572cc.enc","products-historical-00.fa93813d.enc","products-historical-01.969f4999.enc","products-historical-02.b96d40d8.enc","products-historical-03.e2e7a6c8.enc","products-historical-04.bf7f0d14.enc","products-historical-05.955647ac.enc","products-historical-06.ccf085f6.enc","products-historical-07.93e08861.enc","box-contents-00.78ed7f35.enc","box-contents-01.484d93cb.enc","box-contents-02.75e62936.enc","box-contents-03.3a3bbb34.enc","sprites/sprite-00.a50a5522.enc","sprites/sprite-01.e62152ea.enc","sprites/sprite-02.0421f5a7.enc","sprites/sprite-03.136375cf.enc","sprites/sprite-04.a98797db.enc","sprites/sprite-05.eb319597.enc","sprites/sprite-06.d69c35f4.enc","sprites/sprite-07.cf9afae6.enc","sprites/sprite-08.fd90feea.enc","sprites/sprite-09.35a56791.enc","sprites/sprite-10.fa41f654.enc","sprites/sprite-11.72e01bc8.enc","sprites/sprite-12.88842992.enc","sprites/sprite-13.c82f9b4b.enc","sprites/sprite-14.a0cd7f02.enc"];
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
