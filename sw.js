const CACHE = 'catalog-46a97ebc';
const MODULES_CACHE = 'catalog-modules';
const FILES = ['./catalog.html', './sw.js', './manifest.json', './icon.png', './sprite-worker.js'];
const CURRENT_MODULES = ["shell.2eb7ca0f.enc","misc.563867e3.enc","store-history.4b188345.enc","catalog-00.1de1256c.enc","catalog-01.566345b1.enc","catalog-02.29b03f4e.enc","catalog-03.82fa0849.enc","catalog-04.3bed51c1.enc","catalog-05.7785d7ef.enc","catalog-06.4053c2f7.enc","catalog-07.935873ac.enc","catalog-08.3d759aa5.enc","catalog-09.8008a472.enc","catalog-10.c5db93bb.enc","catalog-11.2d0c9206.enc","catalog-12.cd35889c.enc","catalog-13.e99b48af.enc","catalog-14.9b80f1b2.enc","catalog-15.4121d6de.enc","catalog-16.b30e9474.enc","catalog-17.e9f1fb1d.enc","catalog-18.c50cd713.enc","catalog-19.a15092d4.enc","catalog-20.df765c23.enc","catalog-21.ee258632.enc","catalog-22.de776cd9.enc","catalog-23.4c3c7a8d.enc","catalog-24.8caeda5f.enc","catalog-25.c77a32d3.enc","catalog-26.00ad170a.enc","catalog-27.e9b3e981.enc","catalog-28.71339bc7.enc","catalog-29.bb3610ea.enc","catalog-30.73df999b.enc","catalog-31.0346a4cf.enc","catalog-32.1cd0406c.enc","catalog-33.b1d9db79.enc","catalog-34.1108bce9.enc","catalog-35.bb928c8e.enc","catalog-36.13d53d14.enc","catalog-37.495a464e.enc","catalog-38.b3f625e0.enc","catalog-39.f458341b.enc","catalog-40.9c6f90df.enc","catalog-41.780bcecc.enc","catalog-42.f940663e.enc","catalog-43.667b0076.enc","catalog-44.b00b04ed.enc","catalog-45.4d37168c.enc","catalog-46.9d9f78d1.enc","catalog-47.0127fff0.enc","products-historical-00.fa93813d.enc","products-historical-01.969f4999.enc","products-historical-02.b96d40d8.enc","products-historical-03.e2e7a6c8.enc","products-historical-04.bf7f0d14.enc","products-historical-05.955647ac.enc","products-historical-06.ccf085f6.enc","products-historical-07.93e08861.enc","box-contents-00.78ed7f35.enc","box-contents-01.484d93cb.enc","box-contents-02.75e62936.enc","box-contents-03.3a3bbb34.enc","sprites/sprite-00.55b29997.enc","sprites/sprite-01.df8eea94.enc","sprites/sprite-02.efd54d7a.enc","sprites/sprite-03.745803b3.enc","sprites/sprite-04.a0d1d05a.enc","sprites/sprite-05.df1cd753.enc","sprites/sprite-06.e6882b4f.enc","sprites/sprite-07.5dcfe209.enc","sprites/sprite-08.fc4c366d.enc","sprites/sprite-09.692b986a.enc","sprites/sprite-10.3a00d4e8.enc","sprites/sprite-11.fbce43dd.enc","sprites/sprite-12.8a143b02.enc","sprites/sprite-13.185f6f0a.enc","sprites/sprite-14.5bf9216b.enc"];
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
