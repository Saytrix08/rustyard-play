// Scharfe Pixel im Browser (Peter 18.11.2026, Entscheidung 3 A: „gleiche Größe, aber schöner“).
// Das Spiel rechnet in 360 x 640 und vergrößert das Bild für den Bildschirm. Bei krummen Vergrößerungen
// (Peters PC etwa 1,56-fach) wird dabei jedes Pixel mal 1, mal 2 Bildpunkte breit: Schrift und Bilder wirken
// ungleichmäßig und „eingeengt“. Darum bekommt die Zeichenfläche als Pixelgröße ein ganzzahliges Vielfaches
// der Spielgröße (die begrenzende Seite genau k-fach, k = aufgerundete Vergrößerung), als CSS-Größe das Fenster.
// Godot vergrößert dann um genau k (alle Pixel gleich dick), der Browser verkleinert das Ganze weich auf das
// Fenster. Dafür steht im Web-Preset html/canvas_resize_policy=0: Godot übernimmt die Größe der Zeichenfläche
// (canvas.width/height), Tippen rechnet es über canvas.width / sichtbare Breite um.
// tools/publish_web.sh legt diese Datei neben index.html.
(function () {
	var BASE_W = 360, BASE_H = 640;

	function fit() {
		var canvas = document.getElementById('canvas');
		if (!canvas) { return; }
		var dpr = window.devicePixelRatio || 1;
		var cssW = window.innerWidth, cssH = window.innerHeight;
		if (cssW <= 0 || cssH <= 0) { return; }
		var physW = cssW * dpr, physH = cssH * dpr;
		var byWidth = physW / BASE_W <= physH / BASE_H;  // begrenzt die Breite (hochkant) oder die Höhe?
		var scale = byWidth ? physW / BASE_W : physH / BASE_H;
		var k = Math.max(1, Math.ceil(scale - 0.01));  // 2,001-fach zählt als 2
		var w, h;
		if (byWidth) {
			w = BASE_W * k;
			h = Math.round(physH * w / physW);
		} else {
			h = BASE_H * k;
			w = Math.round(physW * h / physH);
		}
		if (canvas.width !== w) { canvas.width = w; }
		if (canvas.height !== h) { canvas.height = h; }
		canvas.style.width = cssW + 'px';
		canvas.style.height = cssH + 'px';
		window.rustyardSharp = { k: k, scale: scale, canvas: [w, h], css: [cssW, cssH], dpr: dpr };
	}

	window.addEventListener('resize', fit);
	window.addEventListener('orientationchange', fit);
	if (window.visualViewport) { window.visualViewport.addEventListener('resize', fit); }
	if (document.readyState === 'loading') {
		document.addEventListener('DOMContentLoaded', fit);
	} else {
		fit();
	}
	// Wechselt der Bildschirm (anderes devicePixelRatio, z. B. Fenster auf zweiten Monitor), ändert sich nichts
	// an der Fenstergröße: dann auch neu rechnen.
	function watchRatio() {
		if (!window.matchMedia) { return; }
		var query = window.matchMedia('(resolution: ' + (window.devicePixelRatio || 1) + 'dppx)');
		var once = function () { fit(); watchRatio(); };
		if (query.addEventListener) { query.addEventListener('change', once, { once: true }); }
	}
	watchRatio();
})();
