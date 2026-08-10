const CACHE = 'echoloom-demo-v54';
const ASSETS = [
  './',
  './index.html',
  './app/styles.css?v=45',
  './app/data.js?v=22',
  './app/storage.js?v=13',
  './app/story-engine.js?v=6',
  './app/reply-timing.js?v=2',
  './app/api-engine.js?v=2',
  './app/app.js?v=35',
  './assets/brand/echoloom-lockup.png',
  './assets/brand/echoloom-mark.png',
  './assets/brand/echoloom-app-icon.png',
  './assets/character/qian-memory-restorer.png',
  './assets/character/qian-memory-restorer-card.png',
  './assets/character/qian-memory-restorer-avatar.png',
  './assets/character/shenyao-observer.png',
  './assets/character/shenyao-observer-card.png',
  './assets/character/shenyao-observer-avatar.png',
  './assets/character/lichuan-traveller.png',
  './assets/character/lichuan-traveller-card.png',
  './assets/character/lichuan-traveller-avatar.png',
  './assets/character/zhoutang-architect.png',
  './assets/character/zhoutang-architect-card.png',
  './assets/character/zhoutang-architect-avatar.png',
  './assets/character/wensheng-weaver.png',
  './assets/character/wensheng-weaver-card.png',
  './assets/character/wensheng-weaver-avatar.png',
  './assets/backgrounds/archive.svg',
  './assets/backgrounds/station.svg',
  './assets/backgrounds/greenhouse.svg',
  './assets/backgrounds/seaside.svg',
  './assets/backgrounds/cafe.svg',
  './assets/backgrounds/observatory.svg',
  './assets/backgrounds/title-observatory-courtyard.png',
  './assets/backgrounds/bg01-fate-observatory.png',
  './assets/backgrounds/bg02-private-archive.png',
  './assets/backgrounds/bg03-rainy-old-station.png',
  './assets/backgrounds/bg04-memory-repair-lab.png',
  './assets/backgrounds/bg05-echolink-space.png',
  './assets/backgrounds/bg06-sealed-echoloom.png',
  './assets/backgrounds/bg07-activated-echoloom.png',
  './assets/backgrounds/bg08-tide-city-terminal.png',
  './assets/backgrounds/bg09-main-mirror-tribunal.png',
  './assets/backgrounds/library.svg',
  './assets/backgrounds/garden.svg',
  './assets/backgrounds/echolink-lab.svg',
  './assets/backgrounds/unfinished-world.svg'
];
self.addEventListener('install', (event) => event.waitUntil(caches.open(CACHE).then((cache) => cache.addAll(ASSETS)).then(() => self.skipWaiting())));
self.addEventListener('activate', (event) => event.waitUntil(caches.keys().then((keys) => Promise.all(keys.filter((key) => key !== CACHE).map((key) => caches.delete(key)))).then(() => self.clients.claim())));
self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;
  event.respondWith(fetch(event.request).then((response) => {
    if (response.ok) {
      const copy = response.clone();
      caches.open(CACHE).then((cache) => cache.put(event.request, copy));
    }
    return response;
  }).catch(() => caches.match(event.request)));
});
