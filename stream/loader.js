// Ladebildschirm der Web-Version (Peters Wunsch: statt Godots Ladebalken ein eigener mit unserem Logo).
// Der Ring des Amboss-Siegels fuellt sich mit dem Laden, die Sonne geht dabei hinter den Bergen auf und
// vom Ringende spruehen Funken. Ist der Ring voll, leuchtet er auf, und das Siegel gleitet genau dorthin,
// wo es im Startbild des Spiels steht. Nach "Zum Starten tippen" (das gibt auch den Ton frei, Browser
// erlauben Ton erst nach einer Beruehrung) blendet der Ladebildschirm aus, und das Startbild macht
// nahtlos weiter: Der Amboss schlaegt ein, dann kommt der Schriftzug.
// Absprache mit scenes/boot/splash.gd: window.rustyardMark (Mitte und Ringradius als Anteil des Spielbilds,
// setzt das Startbild), window.rustyardLoaderDone (setzt dieser Bildschirm nach dem Antippen auf true).
// Godots Ladebalken bleibt versteckt, seine Fehlermeldungen (und die des Speicher-Waechters) bleiben sichtbar.
// tools/publish_web.sh legt diese Datei, loader_logo.svg (tools/logo/make_logo.py) und die Schrift daneben.
(function () {
	var de = (navigator.language || 'de').toLowerCase().indexOf('de') === 0;
	var TEXT = de
		? { load: 'Lade den Schrottplatz …', almost: 'Gleich geht’s los …', tap: 'Zum Starten tippen' }
		: { load: 'Loading the scrapyard …', almost: 'Almost there …', tap: 'Tap to start' };
	var BG = '#1a1520';
	var SPARKS = ['#fff1a8', '#f2c14e', '#d9822b'];
	var RING_R = 44.5;
	var RING_LEN = 2 * Math.PI * RING_R;
	var GLIDE = 0.7;  // Sekunden, die das Siegel zu seinem Platz im Startbild gleitet

	var style = document.createElement('style');
	style.textContent = [
		'@font-face { font-family: "Jersey 10"; src: url(loader_font.ttf); }',
		'html, body { background-color: ' + BG + ' !important; }',
		'#status { background: transparent !important; pointer-events: none; z-index: 3; }',
		'#status-progress, #status-splash { display: none !important; }',
		'#status-notice { pointer-events: auto; position: fixed; left: 0; right: 0; bottom: 9vh; max-width: 520px; margin: 0 auto;',
		'  width: calc(100% - 4rem); box-sizing: border-box; }',
		'#rl.failed .info, #rl.failed .head { opacity: 0 !important; }',
		'#rl { position: fixed; inset: 0; z-index: 2; background: ' + BG + '; display: flex; flex-direction: column;',
		'  align-items: center; justify-content: center; gap: 3.2vh; transition: opacity .3s ease; touch-action: manipulation;',
		'  -webkit-user-select: none; user-select: none; -webkit-tap-highlight-color: transparent; cursor: default; }',
		'#rl.out { opacity: 0; }',
		'#rl .mark { position: relative; width: min(58vw, 38vh, 280px); aspect-ratio: 1; transform-origin: 50% 50%;',
		'  transition: transform ' + GLIDE + 's cubic-bezier(.65, 0, .35, 1); }',
		'#rl .mark svg, #rl .mark canvas { position: absolute; inset: 0; width: 100%; height: 100%; overflow: visible; }',
		'#rl .word { width: min(70vw, 42vh, 330px); opacity: 0; transform: translateY(8px); transition: opacity .6s ease .15s, transform .6s ease .15s; }',
		'#rl.shown .word { opacity: 1; transform: none; }',
		'#rl.glide .word { opacity: 0; transform: translateY(14px); transition: opacity .35s ease, transform .35s ease; }',
		'#rl .info { font-family: "Jersey 10", monospace; color: #8a9099; font-size: min(6vw, 3.4vh, 26px); letter-spacing: .04em;',
		'  height: 1.4em; text-align: center; transition: opacity .3s ease; }',
		'#rl .info b { color: #f2c14e; font-weight: normal; margin-left: .35em; }',
		'#rl.glide .info { opacity: 0; }',
		'#rl .tap { position: fixed; left: 0; right: 0; top: 0; font-family: "Jersey 10", monospace; color: #d8dde3; text-align: center;',
		'  font-size: min(6vw, 3.4vh, 26px); letter-spacing: .04em; opacity: 0; pointer-events: none; }',
		'#rl.ready .tap { animation: rlin .4s ease forwards, rlpulse 1.4s ease-in-out .4s infinite; }',
		'@keyframes rlin { from { opacity: 0; } to { opacity: 1; } }',
		'@keyframes rlpulse { 0%, 100% { opacity: 1; } 50% { opacity: .4; } }',
	].join('\n');
	document.head.appendChild(style);

	// Amboss-Siegel wie im Logo (tools/logo/make_logo.py, mark_anvil), der Ring ist die Ladeanzeige.
	// Der Amboss ist nur als Schatten da: Er schlaegt erst im Startbild ein (mit Ton).
	var SVG = '<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">'
		+ '<defs><linearGradient id="rlsun" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#f2c14e"/><stop offset="1" stop-color="#d9822b"/></linearGradient>'
		+ '<radialGradient id="rlglow"><stop offset=".72" stop-color="#ffd27a" stop-opacity="0"/><stop offset=".88" stop-color="#ffd27a" stop-opacity=".5"/>'
		+ '<stop offset="1" stop-color="#ffd27a" stop-opacity="0"/></radialGradient>'
		+ '<clipPath id="rlc"><circle cx="50" cy="50" r="40"/></clipPath>'
		+ '<filter id="rlblur" x="-1" y="-1" width="3" height="3"><feGaussianBlur stdDeviation="1.6"/></filter></defs>'
		+ '<circle class="glow" cx="50" cy="50" r="52" fill="url(#rlglow)" opacity="0"/>'
		+ '<circle cx="50" cy="50" r="' + RING_R + '" fill="none" stroke="#d8dde3" stroke-opacity=".12" stroke-width="3"/>'
		+ '<circle class="ring" cx="50" cy="50" r="' + RING_R + '" fill="none" stroke="#d8dde3" stroke-width="3" stroke-linecap="round"'
		+ ' transform="rotate(-90 50 50)" stroke-dasharray="' + RING_LEN + '" stroke-dashoffset="' + RING_LEN + '"/>'
		+ '<g class="head"><circle r="3.4" fill="#ffd27a" filter="url(#rlblur)"/><circle r="1.7" fill="#fff1a8"/></g>'
		+ '<g clip-path="url(#rlc)">'
		+ '<circle class="sun" cx="50" cy="54" r="15" fill="url(#rlsun)"/>'
		+ '<polygon points="2,58 28,30 52,62 52,100 2,100" fill="#5a5f66"/>'
		+ '<polygon points="28,30 52,62 40,62" fill="#8a9099"/>'
		+ '<polygon points="98,56 72,26 48,62 48,100 98,100" fill="#3e3a48"/>'
		+ '<polygon points="72,26 48,62 60,62" fill="#707680"/>'
		+ '<polygon points="28,30 33,37 28,34 23,39 20,36" fill="#d8dde3"/>'
		+ '<polygon points="72,26 77,33 72,30 67,35 64,32" fill="#d8dde3"/>'
		+ '<rect x="0" y="62" width="100" height="40" fill="' + BG + '"/>'
		+ '</g>'
		+ '<path class="anvil" d="M72,57 L72,65 L63,65 Q58,67 58,72 L65,78 L65,82 L35,82 L35,78 L42,72 Q42,67 37,65 L31,65 Q20,65 11,58 Z"'
		+ ' fill="none" stroke="#d8dde3" stroke-opacity=".16" stroke-width=".8" stroke-dasharray="2 1.6"/>'
		+ '</svg>';

	var root, mark, ring, head, sun, glow, anvil, info, tap, canvas, ctx;
	var shown = 0;          // angezeigter Fortschritt 0..1 (laeuft dem echten weich hinterher)
	var ready = false;      // Godot ist gestartet
	var doneAt = 0;         // Ring voll (Zeitpunkt)
	var glided = false;
	var leaving = false;
	var sparks = [];
	var last = 0;
	var full = 0;
	var failed = false;     // Godot (oder der Speicher-Waechter) zeigt eine Fehlermeldung

	function build() {
		root = document.createElement('div');
		root.id = 'rl';
		root.innerHTML = '<div class="mark">' + SVG + '<canvas></canvas></div>'
			+ '<img class="word" src="loader_logo.svg" alt="Ironvale Studios">'
			+ '<div class="info"></div><div class="tap"></div>';
		document.body.appendChild(root);
		mark = root.querySelector('.mark');
		ring = root.querySelector('.ring');
		head = root.querySelector('.head');
		sun = root.querySelector('.sun');
		glow = root.querySelector('.glow');
		anvil = root.querySelector('.anvil');
		info = root.querySelector('.info');
		tap = root.querySelector('.tap');
		tap.textContent = TEXT.tap;
		canvas = root.querySelector('canvas');
		ctx = canvas.getContext('2d');
		info.textContent = TEXT.load;
		requestAnimationFrame(function () { root.classList.add('shown'); });
		root.addEventListener('pointerup', start);
		root.addEventListener('touchend', start);
		window.addEventListener('resize', function () { if (glided) { place(); } });
		requestAnimationFrame(frame);
	}

	// Echter Fortschritt aus Godots (versteckter) Ladeanzeige; fertig geladen ist bei 92 %, der Rest ist der Start.
	function target() {
		if (ready) { return 1; }
		var bar = document.getElementById('status-progress');
		var p = bar && bar.max > 0 ? bar.value / bar.max : 0;
		if (p < 1) { return p * 0.92; }
		if (!full) { full = performance.now(); }
		return 0.92 + 0.06 * Math.min(1, (performance.now() - full) / 6000);
	}

	function frame(now) {
		var dt = Math.min(0.05, last ? (now - last) / 1000 : 0.016);
		last = now;
		// Godot entfernt seine Ladeanzeige (#status), sobald das Spiel laeuft
		if (!ready && !document.getElementById('status')) { ready = true; }
		var note = document.getElementById('status-notice');
		if (!failed && !ready && note && note.textContent && getComputedStyle(note).display !== 'none') {
			failed = true;
			root.classList.add('failed');
		}
		shown += (target() - shown) * Math.min(1, dt * (ready ? 7 : 3.5));
		if (ready && !doneAt && shown > 0.995) { shown = 1; complete(now); }
		draw(now, dt);
		if (!leaving || sparks.length) { requestAnimationFrame(frame); }
	}

	function draw(now, dt) {
		ring.setAttribute('stroke-dashoffset', String(RING_LEN * (1 - shown)));
		var a = -Math.PI / 2 + shown * Math.PI * 2;
		var hx = 50 + Math.cos(a) * RING_R, hy = 50 + Math.sin(a) * RING_R;
		head.setAttribute('transform', 'translate(' + hx.toFixed(2) + ' ' + hy.toFixed(2) + ')');
		head.style.opacity = shown > 0.001 && !doneAt ? 1 : 0;
		// Sonne steigt mit dem Laden hinter den Bergen auf
		sun.setAttribute('transform', 'translate(0 ' + (16 * (1 - ease(shown))).toFixed(2) + ')');
		// Ring leuchtet auf, wenn er voll ist
		var since = doneAt ? (now - doneAt) / 1000 : -1;
		glow.setAttribute('opacity', since >= 0 ? Math.max(0, 1 - since * 1.6).toFixed(3) : '0');
		glow.setAttribute('r', since >= 0 ? (50 + since * 14).toFixed(2) : '50');
		// Amboss-Schatten verschwindet beim Gleiten (das Startbild zeigt an der Stelle noch nichts)
		anvil.style.opacity = glided ? 0 : 1;
		anvil.style.transition = 'opacity .4s ease';
		if (!doneAt && shown > 0.002) {
			info.innerHTML = (shown >= 0.92 ? TEXT.almost : TEXT.load) + '<b>' + Math.floor(shown * 100) + ' %</b>';
		}
		// Funken vom Ringende waehrend des Ladens
		if (!doneAt && !failed && shown > 0.01 && Math.random() < 0.6) {
			var out = 0.6 + Math.random() * 0.8;
			spawn(hx, hy, Math.cos(a) * out - Math.sin(a) * 0.6, Math.sin(a) * out + Math.cos(a) * 0.6 - 0.4, 0.5);
		}
		paintSparks(dt);
	}

	function ease(x) { return 1 - Math.pow(1 - x, 3); }

	function spawn(x, y, vx, vy, life) {
		sparks.push({ x: x, y: y, vx: vx * 28, vy: vy * 28, life: life * (0.6 + Math.random() * 0.6),
			c: SPARKS[Math.floor(Math.random() * SPARKS.length)], s: Math.random() < 0.7 ? 1.6 : 2.4 });
	}

	function paintSparks(dt) {
		var size = canvas.clientWidth;
		var dpr = window.devicePixelRatio || 1;
		if (canvas.width !== Math.round(size * dpr)) { canvas.width = canvas.height = Math.round(size * dpr); }
		var u = canvas.width / 100;
		ctx.clearRect(0, 0, canvas.width, canvas.height);
		sparks = sparks.filter(function (p) {
			p.vy += 70 * dt;
			p.x += p.vx * dt;
			p.y += p.vy * dt;
			p.life -= dt;
			if (p.life <= 0) { return false; }
			ctx.globalAlpha = Math.min(1, p.life * 3);
			ctx.fillStyle = p.c;
			ctx.fillRect((p.x - p.s / 2) * u, (p.y - p.s / 2) * u, p.s * u, p.s * u);
			return true;
		});
		ctx.globalAlpha = 1;
	}

	// Ring ist voll: Funkenkranz rundherum, dann gleitet das Siegel an seinen Platz im Startbild.
	function complete(now) {
		doneAt = now;
		for (var i = 0; i < 40; i++) {
			var ang = Math.random() * Math.PI * 2;
			var sp = 0.8 + Math.random() * 1.6;
			spawn(50 + Math.cos(ang) * RING_R, 50 + Math.sin(ang) * RING_R, Math.cos(ang) * sp, Math.sin(ang) * sp - 0.3, 0.8);
		}
		setTimeout(glide, 450);
	}

	function glide() {
		glided = true;
		root.classList.add('glide');
		place();
		setTimeout(function () {
			root.classList.add('ready');
			placeInfo();
			// Ton schon frei (z. B. am Rechner): gleich weiter, ohne Antippen
			if ((window.rustyardAudio || []).some(function (c) { return c.state === 'running'; })) { start(); }
		}, GLIDE * 1000 + 50);
	}

	// Ziel des Siegels im Bildschirm (CSS-Pixel); ohne Angabe vom Startbild bleibt es, wo es ist.
	function goal() {
		var m = window.rustyardMark;
		var c = document.getElementById('canvas');
		if (!m || !c) { return null; }
		var r = c.getBoundingClientRect();
		return { x: r.left + m.x * r.width, y: r.top + m.y * r.height, r: m.r * r.width };
	}

	function place() {
		var g = goal();
		if (!g) { return; }
		// Lage ohne Verschiebung (offset* beachten keine CSS-Transformation); #rl liegt ueber dem ganzen Fenster
		var w = mark.offsetWidth;
		var k = g.r / (w * RING_R / 100);
		mark.style.transform = 'translate(' + (g.x - (mark.offsetLeft + w / 2)).toFixed(1) + 'px,'
			+ (g.y - (mark.offsetTop + mark.offsetHeight / 2)).toFixed(1) + 'px) scale(' + k.toFixed(4) + ')';
		placeInfo();
	}

	function placeInfo() {
		var g = goal();
		if (g) { tap.style.top = (g.y + g.r * 1.3).toFixed(1) + 'px'; }
	}

	function start() {
		if (leaving || !root.classList.contains('ready')) { return; }
		leaving = true;
		window.rustyardLoaderDone = true;
		root.classList.add('out');
		setTimeout(function () { root.remove(); }, 400);
	}

	window.rustyardLoaderDone = false;
	if (document.body) { build(); } else { document.addEventListener('DOMContentLoaded', build); }
})();
