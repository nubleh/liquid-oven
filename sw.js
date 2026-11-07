const CACHE = 'catalog-bbe38156';
const MODULES_CACHE = 'catalog-modules';
const FILES = ['./catalog.html', './sw.js', './manifest.json', './icon.png', './sprite-worker.js'];
const CURRENT_MODULES = ["shell.13ee012c.enc","misc.563867e3.enc","store-history.3a96f849.enc","catalog-00.e47ddf5f.enc","catalog-01.8e8a82da.enc","catalog-02.96488603.enc","catalog-03.c6f202f4.enc","catalog-04.7d273eee.enc","catalog-05.88a3ebf6.enc","catalog-06.cd899572.enc","catalog-07.df1b9db5.enc","catalog-08.005d7c22.enc","catalog-09.3de83793.enc","catalog-10.51a1506a.enc","catalog-11.d3014c80.enc","catalog-12.30ca5ff2.enc","catalog-13.4d002df6.enc","catalog-14.7fd4b686.enc","catalog-15.cbb84b73.enc","catalog-16.9afe76ae.enc","catalog-17.54b81019.enc","catalog-18.81ed2f2a.enc","catalog-19.06cd6429.enc","catalog-20.b79f99fd.enc","catalog-21.5ca0afc9.enc","catalog-22.d6620a58.enc","catalog-23.574c6589.enc","catalog-24.171170d5.enc","catalog-25.3b294ab3.enc","catalog-26.dfbec177.enc","catalog-27.e92a3a58.enc","catalog-28.5b5942a2.enc","catalog-29.3f2a9fd8.enc","catalog-30.b825e777.enc","catalog-31.9418ec2d.enc","catalog-32.c8853dc0.enc","catalog-33.23ba0821.enc","catalog-34.afa4e267.enc","catalog-35.e02c7a71.enc","catalog-36.dc568401.enc","catalog-37.f6143f72.enc","catalog-38.bb1ac814.enc","catalog-39.d62da76b.enc","catalog-40.e9ddc8aa.enc","catalog-41.7fc8bdc1.enc","catalog-42.e478d382.enc","catalog-43.5afcfc13.enc","catalog-44.5a2f3753.enc","catalog-45.f20b7bdd.enc","catalog-46.48e13d35.enc","catalog-47.3f6fb96a.enc","products-historical-00.fa93813d.enc","products-historical-01.969f4999.enc","products-historical-02.b96d40d8.enc","products-historical-03.e2e7a6c8.enc","products-historical-04.bf7f0d14.enc","products-historical-05.955647ac.enc","products-historical-06.ccf085f6.enc","products-historical-07.93e08861.enc","box-contents-00.78ed7f35.enc","box-contents-01.484d93cb.enc","box-contents-02.75e62936.enc","box-contents-03.3a3bbb34.enc","sprites/sprite-00.a50a5522.enc","sprites/sprite-01.0ae3e8b7.enc","sprites/sprite-02.6b04c010.enc","sprites/sprite-03.6fb8664f.enc","sprites/sprite-04.7c62f2f8.enc","sprites/sprite-05.721d1b49.enc","sprites/sprite-06.ddeab5f2.enc","sprites/sprite-07.f2e9f9ba.enc","sprites/sprite-08.0d0e2504.enc","sprites/sprite-09.3dfb8074.enc","sprites/sprite-10.b28414d9.enc","sprites/sprite-11.fa9e12cf.enc","sprites/sprite-12.b65185f5.enc","sprites/sprite-13.a1939cd7.enc","sprites/sprite-14.aebc5255.enc"];
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
