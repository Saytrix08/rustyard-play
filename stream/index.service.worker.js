// Ersetzt den Service Worker von Godot (tools/publish_web.sh kopiert ihn ueber index.service.worker.js).
// Godots Worker liefert das Spiel aus seinem eigenen Speicher und holt eine neue Version erst nach zwei
// Neustarts der App. Dieser hier (P3, seit Block E):
// - Die Seite selbst (index.html) kommt immer aus dem Netz. Darin steht die Build-Kennung
//   (window.rustyardBuild, setzt publish_web.sh ein). Der Worker liest sie bei jedem Aufruf der Seite.
// - Die grossen Dateien (Engine, Spiel- und Musik-Paket, Ladebildschirm) behaelt er in einem Speicher, der
//   nach dieser Kennung heisst. Gleicher Build: Das Spiel startet ohne eine einzige Anfrage nach diesen
//   Dateien. Neuer Build: neuer Speicher, die alten werden geloescht, alles kommt einmal frisch.
// - Alles andere (Live-Datei, Anmeldeseite, online.json) kommt immer aus dem Netz.
// Der Worker selbst muss sich fuer einen neuen Build nicht aendern (Browser pruefen das nur ab und zu).
var PREFIX = 'rustyard-';
// Dateien, die zu genau einem Build gehoeren (Name am Ende der Adresse, ohne ?...)
var KEEP = /\/(index\.(js|wasm|pck|audio\.worklet\.js|audio\.position\.worklet\.js)|music\.pck|loader\.js|loader_logo\.svg|loader_font\.ttf)$/;
// Hier merkt sich der Worker die Kennung der zuletzt geladenen Seite, falls der Browser ihn zwischendurch
// beendet (dann ist die Variable leer).
var MARK = PREFIX + 'aktuell';
var current = '';

self.addEventListener('install', function () {
	self.skipWaiting();
});

self.addEventListener('activate', function (event) {
	event.waitUntil(self.clients.claim());
});

// Kennung aus der Seite lesen
function pageBuild(text) {
	var m = /rustyardBuild\s*=\s*'([^']*)'/.exec(text);
	return m && m[1] !== '__BUILD__' ? m[1] : '';
}

// Neue Seite geladen: Speicher dieses Builds merken, alle anderen loeschen
function remember(build) {
	current = build ? PREFIX + 'build-' + build : '';
	return caches.open(MARK).then(function (cache) {
		return cache.put('/kennung', new Response(current));
	}).then(function () {
		return caches.keys();
	}).then(function (keys) {
		return Promise.all(keys.filter(function (k) {
			return k !== MARK && k !== current;
		}).map(function (k) { return caches.delete(k); }));
	}).catch(function () {});
}

// Speicher fuer den laufenden Build (nach einem Neustart des Workers aus MARK)
function currentCache() {
	if (current) {
		return Promise.resolve(current);
	}
	return caches.open(MARK).then(function (cache) {
		return cache.match('/kennung');
	}).then(function (hit) {
		return hit ? hit.text() : '';
	}).then(function (name) {
		current = name;
		return name;
	}).catch(function () { return ''; });
}

self.addEventListener('fetch', function (event) {
	var request = event.request;
	if (request.method !== 'GET') {
		return;
	}
	var path = new URL(request.url).pathname;
	if (request.mode === 'navigate') {
		if (!/\/(index\.html)?$/.test(path)) {
			return;
		}
		// Seite frisch holen, ganz lesen, Kennung merken, dann ausliefern. So steht der Speicher fest,
		// bevor die Seite ihre Pakete anfragt.
		event.respondWith(fetch(request).then(function (response) {
			if (response.status !== 200) {
				return response;
			}
			return response.text().then(function (text) {
				return remember(pageBuild(text)).then(function () {
					return new Response(text, { status: 200, statusText: response.statusText, headers: response.headers });
				});
			});
		}));
		return;
	}
	if (!KEEP.test(path)) {
		return;  // normal aus dem Netz
	}
	event.respondWith(currentCache().then(function (name) {
		if (!name) {
			return fetch(request);
		}
		return caches.open(name).then(function (cache) {
			return cache.match(request, { ignoreSearch: true }).then(function (hit) {
				if (hit) {
					return hit;
				}
				return fetch(request).then(function (response) {
					// Nur vollstaendige Antworten behalten (keine Teilstuecke, keine Fehler)
					if (response.status === 200) {
						cache.put(request, response.clone()).catch(function () {});
					}
					return response;
				});
			});
		});
	}));
});
