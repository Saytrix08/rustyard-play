// Ersetzt den Service Worker von Godot (tools/publish_web.sh kopiert ihn ueber index.service.worker.js).
// Godots Worker liefert das Spiel aus seinem eigenen Speicher und holt eine neue Version erst nach zwei
// Neustarts der App. Dieser hier speichert nichts: Er loescht alte Speicher, uebernimmt sofort und laedt
// ein Fenster, das noch die alte Version zeigt, einmal neu. So kommt das Spiel immer frisch aus dem Netz.
self.addEventListener('install', function () {
	self.skipWaiting();
});

self.addEventListener('activate', function (event) {
	event.waitUntil(caches.keys().then(function (keys) {
		return Promise.all(keys.map(function (key) { return caches.delete(key); })).then(function () {
			return self.clients.claim();
		}).then(function () {
			// Nur nach einem alten Speicher neu laden, nicht beim allerersten Besuch
			if (keys.length === 0) {
				return null;
			}
			return self.clients.matchAll({ type: 'window' }).then(function (windows) {
				windows.forEach(function (w) { w.navigate(w.url).catch(function () {}); });
			});
		});
	}));
});
