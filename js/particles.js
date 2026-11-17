/* ==========================================================
   The 3D dot animation.

   Thousands of dots are drawn on the <canvas id="stage">.
   Each section of the page has a "scene" (a shape the dots
   form). As the visitor scrolls from one section to the next,
   the dots fly from one shape to the other.

   To change where a shape sits or how big it is, edit SCENES
   below. x and y are positions (-1 = left/bottom edge,
   1 = right/top edge), s is size, a is brightness.
   "d" is for desktop screens, "m" is for phones.
   ========================================================== */

(function () {
  'use strict';

  var SCENES = {
    portrait:  { shape: 'portrait',  d: { x: 0.14,  y: -0.14, s: 1.5,  a: 1.0 },  m: { x: 0,    y: 0.17,  s: 1.1,  a: 1.0 },  tilt: 0,    rot: 0,   spin: 0,    wave: 0 },
    field:     { shape: 'field',     d: { x: 0,     y: 0,     s: 1.0,  a: 0.5 },  m: { x: 0,    y: 0,     s: 1.0,  a: 0.4 },  tilt: 0,    rot: 0,   spin: 0.03, wave: 0 },
    record:    { shape: 'record',    d: { x: 0.56,  y: -0.02, s: 1.32, a: 0.9 },  m: { x: 0.35, y: 0.05,  s: 0.8,  a: 0.3 },  tilt: 1.0,  rot: 0,   spin: 0.22, wave: 0 },
    bars:      { shape: 'bars',      d: { x: -0.56, y: 0.02,  s: 0.92, a: 0.72 },  m: { x: 0,    y: -0.1,  s: 0.56, a: 0.17 }, tilt: 0.1,  rot: 0.5, spin: 0,    wave: 0 },
    guitarist: { shape: 'guitarist', d: { x: 0.5,   y: -0.02, s: 1.32, a: 1.0 },  m: { x: 0.12, y: 0,     s: 1.0,  a: 0.28 }, tilt: 0,    rot: 0,   spin: 0,    wave: 0 },
    wave:      { shape: 'sheet',     d: { x: 0,     y: -0.62, s: 1.2,  a: 0.75 }, m: { x: 0,    y: -0.6,  s: 0.62, a: 0.6 },  tilt: 0.5,  rot: 0,   spin: 0,    wave: 1 }
  };

  var COLOR_BG = [14 / 255, 13 / 255, 12 / 255];
  var COLOR_DOT = [0.925, 0.905, 0.875];
  var COLOR_ACCENT = [0.85, 0.66, 0.31];

  var CAMERA = 5.0;          // camera distance
  var HALF_HEIGHT = 1.5;     // how much of the 3D world fits from center to top of screen

  // ---------------------------------------------------------
  // Shaders (small programs that run on the graphics chip)
  // ---------------------------------------------------------

  var VERT = [
    'precision highp float;',
    'attribute vec4 aFrom;',
    'attribute vec4 aTo;',
    'attribute vec3 aRand;',
    'uniform float uProgress, uTime, uAspect, uFocal, uCam, uSize, uDpr, uMotion, uMouseOn;',
    'uniform vec2 uRotFrom, uRotTo;',
    'uniform vec3 uOffFrom, uOffTo;',
    'uniform float uWaveFrom, uWaveTo, uAlphaFrom, uAlphaTo;',
    'uniform vec2 uView, uMouse;',
    'uniform vec3 uColor, uAccent;',
    'varying float vAlpha;',
    'varying vec3 vColor;',
    'vec3 rotX(vec3 p, float a){ float c = cos(a), s = sin(a); return vec3(p.x, c*p.y - s*p.z, s*p.y + c*p.z); }',
    'vec3 rotY(vec3 p, float a){ float c = cos(a), s = sin(a); return vec3(c*p.x + s*p.z, p.y, -s*p.x + c*p.z); }',
    'vec3 place(vec3 p, vec2 rot, vec3 off, float wave){',
    '  float env = 0.35 + 0.65 * cos(p.x * 0.55) * cos(p.x * 0.55);',
    '  p.y += wave * env * (sin(p.x * 2.4 + uTime * 1.2 + p.z * 3.5) * 0.17 + sin(p.x * 5.3 - uTime * 0.9 + p.z * 2.0) * 0.05);',
    '  p = rotY(p, rot.y);',
    '  p = rotX(p, rot.x);',
    '  p = rotY(p, uView.y);',
    '  p = rotX(p, uView.x);',
    '  p *= off.z;',
    '  p.xy += off.xy;',
    '  return p;',
    '}',
    'void main(){',
    '  float t = clamp(uProgress * 1.5 - aRand.x * 0.5, 0.0, 1.0);',
    '  t = t * t * (3.0 - 2.0 * t);',
    '  vec3 a = place(aFrom.xyz, uRotFrom, uOffFrom, uWaveFrom);',
    '  vec3 b = place(aTo.xyz, uRotTo, uOffTo, uWaveTo);',
    '  vec3 p = mix(a, b, t);',
    '  float burst = sin(3.14159265 * t);',
    '  p += (aRand - 0.5) * vec3(1.5, 1.1, 1.5) * burst * 0.5;',
    '  p += uMotion * 0.011 * vec3(sin(uTime * 0.7 + aRand.y * 50.0), cos(uTime * 0.6 + aRand.z * 50.0), sin(uTime * 0.5 + aRand.x * 50.0));',
    '  float z = uCam - p.z;',
    '  vec2 ndc = vec2(p.x * uFocal / uAspect, p.y * uFocal) / z;',
    '  vec2 d = (ndc - uMouse) * vec2(uAspect, 1.0);',
    '  float dist = length(d);',
    '  float push = uMouseOn * smoothstep(0.26, 0.0, dist) * 0.05;',
    '  ndc += (d / (dist + 0.0001)) * push / vec2(uAspect, 1.0);',
    '  gl_Position = vec4(ndc, 0.0, 1.0);',
    '  float alpha = mix(aFrom.w * uAlphaFrom, aTo.w * uAlphaTo, t);',
    '  vAlpha = alpha * (0.5 + 0.5 * aRand.y);',
    '  vColor = mix(uColor, uAccent, step(0.955, aRand.z));',
    '  gl_PointSize = max(1.0, uSize * uDpr * (uCam / z) * (0.55 + 0.9 * aRand.z));',
    '}'
  ].join('\n');

  var FRAG = [
    'precision mediump float;',
    'varying float vAlpha;',
    'varying vec3 vColor;',
    'void main(){',
    '  float d = length(gl_PointCoord - 0.5);',
    '  float a = smoothstep(0.5, 0.12, d) * vAlpha;',
    '  gl_FragColor = vec4(vColor * a, a);',
    '}'
  ].join('\n');

  // ---------------------------------------------------------
  // Shapes. Each returns a list of N dots: x, y, z, brightness.
  // ---------------------------------------------------------

  function makeField(N) {
    var out = new Float32Array(N * 4);
    for (var i = 0; i < N; i++) {
      out[i * 4] = (Math.random() - 0.5) * 6.6;
      out[i * 4 + 1] = (Math.random() - 0.5) * 3.8;
      out[i * 4 + 2] = (Math.random() - 0.5) * 3.2;
      out[i * 4 + 3] = 0.12 + Math.pow(Math.random(), 3) * 0.75;
    }
    return out;
  }

  // A vinyl record lying flat (the scene tilts it toward the viewer).
  function makeRecord(N) {
    var out = new Float32Array(N * 4);
    function inGap(r) {
      return (r > 0.515 && r < 0.535) || (r > 0.695 && r < 0.712) || (r > 0.86 && r < 0.874);
    }
    for (var i = 0; i < N; i++) {
      var u = Math.random();
      var th = Math.random() * Math.PI * 2;
      var r, alpha;
      if (u < 0.09) {
        // center label
        r = 0.065 + 0.235 * Math.sqrt(Math.random());
        alpha = 0.55;
        if (Math.random() < 0.45) {
          // two short arcs, like text printed on the label
          var inner = Math.random() < 0.5;
          r = (inner ? 0.15 : 0.215) + (Math.random() - 0.5) * 0.008;
          th = (inner ? 3.3 : 0.4) + Math.random() * 1.7;
          alpha = 1.0;
        }
      } else if (u < 0.125) {
        // outer edge
        r = 1.0 + (Math.random() - 0.5) * 0.008;
        alpha = 0.95;
      } else if (u < 0.15) {
        // edge of the label
        r = 0.31 + (Math.random() - 0.5) * 0.006;
        alpha = 0.8;
      } else {
        // grooves
        do {
          r = Math.sqrt(0.34 * 0.34 + Math.random() * (0.975 * 0.975 - 0.34 * 0.34));
        } while (inGap(r));
        r = Math.round(r / 0.0175) * 0.0175 + (Math.random() - 0.5) * 0.0035;
        // two bright wedges, like light catching the grooves
        alpha = 0.22 + 0.6 * Math.pow(Math.abs(Math.cos(th + r * 0.9)), 7);
      }
      out[i * 4] = r * Math.cos(th);
      out[i * 4 + 1] = (Math.random() - 0.5) * 0.012;
      out[i * 4 + 2] = r * Math.sin(th);
      out[i * 4 + 3] = alpha;
    }
    return out;
  }

  // Rows of level-meter bars: part equalizer, part bar chart.
  function makeBars(N) {
    var out = new Float32Array(N * 4);
    var bars = 20, width = 2.3, step = width / bars, bw = step * 0.56, seg = 0.058, floor = -0.78;
    var heights = [], total = 0;
    for (var b = 0; b < bars; b++) {
      var arch = Math.pow(Math.sin(Math.PI * (b + 0.5) / bars), 0.55);
      var wob = 0.56 + 0.44 * Math.sin(b * 1.71 + 0.6) * Math.cos(b * 0.63 + 0.2);
      var hgt = Math.max(0.16, 1.5 * arch * wob);
      hgt = Math.max(seg * 2, Math.round(hgt / seg) * seg);
      heights.push(hgt);
      total += hgt;
    }
    for (var i = 0; i < N; i++) {
      // pick a bar, taller bars get more dots
      var t = Math.random() * total, bi = 0;
      while (bi < bars - 1 && t > heights[bi]) { t -= heights[bi]; bi++; }
      var h = heights[bi];
      var cx = -width / 2 + (bi + 0.5) * step;
      var y, alpha;
      if (Math.random() < 0.07) {
        // bright cap on top of each bar
        y = h + seg * 0.9 + (Math.random() - 0.5) * 0.006;
        alpha = 1.0;
      } else {
        var k = Math.floor(Math.random() * Math.round(h / seg));
        y = (k + Math.random() * 0.66) * seg;
        alpha = 0.3 + 0.5 * (y / 1.5);
      }
      // dots sit on the faces of a thin box so the bars read as solid
      var fx = (Math.random() - 0.5) * bw, fz = (Math.random() - 0.5) * bw;
      if (Math.random() < 0.5) { fx = (Math.random() < 0.5 ? -0.5 : 0.5) * bw; } else { fz = (Math.random() < 0.5 ? -0.5 : 0.5) * bw; }
      out[i * 4] = cx + fx;
      out[i * 4 + 1] = floor + y;
      out[i * 4 + 2] = fz;
      out[i * 4 + 3] = alpha;
    }
    return out;
  }

  // A flat sheet of dots; the shader makes it ripple like a sound wave.
  function makeSheet(N) {
    var out = new Float32Array(N * 4);
    var rows = 46;
    for (var i = 0; i < N; i++) {
      var row = Math.floor(Math.random() * rows);
      out[i * 4] = (Math.random() - 0.5) * 6.4;
      out[i * 4 + 1] = (Math.random() - 0.5) * 0.006;
      out[i * 4 + 2] = (row / (rows - 1) - 0.5) * 1.9 + (Math.random() - 0.5) * 0.004;
      out[i * 4 + 3] = 0.35 + Math.random() * 0.4;
    }
    return out;
  }

  // Places dots where the subject of a cut-out photo is,
  // more and brighter dots where the photo is lighter.
  function sampleImage(img, N, o) {
    var w = img.naturalWidth, h = img.naturalHeight;
    var c = document.createElement('canvas');
    c.width = w; c.height = h;
    var ctx = c.getContext('2d', { willReadFrequently: true });
    ctx.drawImage(img, 0, 0);
    var d = ctx.getImageData(0, 0, w, h).data;
    var total = w * h, cdf = new Float64Array(total), fade = new Float32Array(total), acc = 0, r = 2;
    for (var y = 0; y < h; y++) {
      for (var x = 0; x < w; x++) {
        var i = y * w + x, wgt = 0, f = 1;
        if (d[i * 4 + 3] > 127) {
          var lum = d[i * 4] / 255;
          wgt = o.base + Math.pow(lum, o.gamma);
          if (x >= r && y >= r && x < w - r && y < h - r &&
              (d[(i - r) * 4 + 3] < 128 || d[(i + r) * 4 + 3] < 128 || d[(i - r * w) * 4 + 3] < 128 || d[(i + r * w) * 4 + 3] < 128)) {
            wgt += o.edge;
          }
          var v = y / h, uu = x / w;
          if (v > o.fadeFrom) f *= Math.max(0, 1 - (v - o.fadeFrom) / (1 - o.fadeFrom));
          f *= Math.min(1, uu / 0.05) * Math.min(1, (1 - uu) / 0.05);
          wgt *= f;
        }
        acc += wgt;
        cdf[i] = acc;
        fade[i] = f;
      }
    }
    var out = new Float32Array(N * 4);
    for (var n = 0; n < N; n++) {
      var t = Math.random() * acc, lo = 0, hi = total - 1;
      while (lo < hi) {
        var mid = (lo + hi) >> 1;
        if (cdf[mid] < t) lo = mid + 1; else hi = mid;
      }
      var px = lo % w, py = (lo / w) | 0, l = d[lo * 4] / 255;
      out[n * 4] = (px + Math.random() - w / 2) / h * 2;
      out[n * 4 + 1] = 1 - (py + Math.random()) / h * 2;
      out[n * 4 + 2] = (l - 0.4) * o.depth + (Math.random() - 0.5) * 0.04;
      out[n * 4 + 3] = (o.alphaBase + l * o.alphaGain) * (0.35 + 0.65 * fade[lo]);
    }
    return out;
  }

  function loadImage(src) {
    return new Promise(function (resolve, reject) {
      var im = new Image();
      im.onload = function () { resolve(im); };
      im.onerror = function () { reject(new Error('could not load ' + src)); };
      im.src = src;
    });
  }

  // ---------------------------------------------------------
  // Setup and drawing
  // ---------------------------------------------------------

  function compile(gl, type, src) {
    var sh = gl.createShader(type);
    gl.shaderSource(sh, src);
    gl.compileShader(sh);
    if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(sh));
    return sh;
  }

  function init(canvas, options) {
    options = options || {};
    var reduced = !!options.reduced;

    var gl = canvas.getContext('webgl', { alpha: false, antialias: false, depth: false, stencil: false });
    if (!gl) return Promise.reject(new Error('WebGL is not available'));

    // fewer dots on phones so it stays smooth
    var coarse = window.matchMedia && window.matchMedia('(pointer: coarse)').matches;
    var small = window.innerWidth < 760 || (coarse && window.innerWidth < 1100);
    var N = small ? 34000 : 82000;

    var prog = gl.createProgram();
    gl.attachShader(prog, compile(gl, gl.VERTEX_SHADER, VERT));
    gl.attachShader(prog, compile(gl, gl.FRAGMENT_SHADER, FRAG));
    gl.linkProgram(prog);
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) return Promise.reject(new Error(gl.getProgramInfoLog(prog)));
    gl.useProgram(prog);

    var loc = {};
    ['aFrom', 'aTo', 'aRand'].forEach(function (n) { loc[n] = gl.getAttribLocation(prog, n); });
    ['uProgress', 'uTime', 'uAspect', 'uFocal', 'uCam', 'uSize', 'uDpr', 'uMotion', 'uMouseOn', 'uRotFrom', 'uRotTo',
      'uOffFrom', 'uOffTo', 'uWaveFrom', 'uWaveTo', 'uAlphaFrom', 'uAlphaTo', 'uView', 'uMouse', 'uColor', 'uAccent'
    ].forEach(function (n) { loc[n] = gl.getUniformLocation(prog, n); });

    function buffer(data) {
      var b = gl.createBuffer();
      gl.bindBuffer(gl.ARRAY_BUFFER, b);
      gl.bufferData(gl.ARRAY_BUFFER, data, gl.STATIC_DRAW);
      return b;
    }

    var rand = new Float32Array(N * 3);
    for (var i = 0; i < rand.length; i++) rand[i] = Math.random();
    var randBuf = buffer(rand);

    var shapes = {
      field: buffer(makeField(N)),
      record: buffer(makeRecord(N)),
      bars: buffer(makeBars(N)),
      sheet: buffer(makeSheet(N))
    };

    gl.disable(gl.DEPTH_TEST);
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.ONE, gl.ONE);
    gl.clearColor(COLOR_BG[0], COLOR_BG[1], COLOR_BG[2], 1);
    gl.uniform3fv(loc.uColor, COLOR_DOT);
    gl.uniform3fv(loc.uAccent, COLOR_ACCENT);
    gl.uniform1f(loc.uCam, CAMERA);
    gl.uniform1f(loc.uFocal, CAMERA / HALF_HEIGHT);
    gl.uniform1f(loc.uMotion, reduced ? 0 : 1);

    // --- page sections that have a scene
    var els = Array.prototype.slice.call(document.querySelectorAll('[data-scene]'));
    var scenes = els.map(function (el) { return SCENES[el.getAttribute('data-scene')] || SCENES.field; });
    var marks = [];
    var aspect = 1, dpr = 1, mobile = false, vh = 1;

    function measure() {
      vh = window.innerHeight;
      var m = vh * 0.35, y = window.scrollY || window.pageYOffset;
      marks = els.map(function (el) {
        var r = el.getBoundingClientRect();
        var top = r.top + y, bottom = top + r.height, c = (top + bottom) / 2;
        return { a: Math.min(top + m, c), b: Math.max(bottom - m, c) };
      });
    }

    function resize() {
      var w = canvas.clientWidth, h = canvas.clientHeight;
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      var pw = Math.round(w * dpr), ph = Math.round(h * dpr);
      if (canvas.width !== pw || canvas.height !== ph) {
        canvas.width = pw; canvas.height = ph;
        gl.viewport(0, 0, pw, ph);
      }
      aspect = w / h;
      mobile = w < 900;
      measure();
    }

    // which two scenes are we between, and how far along (0 to 1)
    function locate(s) {
      var last = marks.length - 1;
      for (var k = 0; k < last; k++) {
        if (s <= marks[k].b) return { i: k, p: 0 };
        if (s < marks[k + 1].a) {
          var span = marks[k + 1].a - marks[k].b;
          return { i: k, p: span > 1 ? (s - marks[k].b) / span : 1 };
        }
      }
      return { i: last, p: 0 };
    }

    function bind(attr, buf, size) {
      gl.bindBuffer(gl.ARRAY_BUFFER, buf);
      gl.enableVertexAttribArray(attr);
      gl.vertexAttribPointer(attr, size, gl.FLOAT, false, 0, 0);
    }

    // Where a scene sits on this screen. On narrower desktop windows the
    // side shapes get smaller and move toward the edge, away from the text.
    function view(scene) {
      if (mobile) return scene.m;
      var d = scene.d;
      if (d.x === 0) return d;
      var f = Math.min(1, Math.max(0, (aspect - 1.0) / 0.75));
      return { x: d.x + (d.x > 0 ? 1 : -1) * 0.18 * (1 - f), y: d.y, s: d.s * (0.72 + 0.28 * f), a: d.a };
    }

    // --- pointer
    var mouse = { x: 0, y: 0, tx: 0, ty: 0, on: 0, ton: 0 };
    var finePointer = window.matchMedia && window.matchMedia('(pointer: fine)').matches;
    if (finePointer && !reduced) {
      window.addEventListener('pointermove', function (e) {
        mouse.tx = (e.clientX / window.innerWidth) * 2 - 1;
        mouse.ty = 1 - (e.clientY / window.innerHeight) * 2;
        mouse.ton = 1;
      }, { passive: true });
      document.documentElement.addEventListener('mouseleave', function () { mouse.ton = 0; });
    }

    var state = { s: 0, time: 0, last: 0, intro: reduced ? 1 : 0, running: false, debug: null };

    function frame(now) {
      if (!state.running) return;
      requestAnimationFrame(frame);
      var dt = Math.min(0.05, (now - state.last) / 1000 || 0.016);
      state.last = now;
      tick(dt);
    }

    // advance the animation by dt seconds and draw one picture
    function tick(dt) {
      if (!reduced) state.time += dt;

      var target = (window.scrollY || window.pageYOffset) + vh / 2;
      state.s += (target - state.s) * (reduced ? 1 : 1 - Math.exp(-dt * 6.5));
      var at = locate(state.s);
      if (state.debug) at = state.debug;

      var A = scenes[at.i], B = scenes[Math.min(at.i + 1, scenes.length - 1)], p = at.p;
      var va = view(A), vb = view(B);
      var fromBuf = shapes[A.shape] || shapes.field, toBuf = shapes[B.shape] || shapes.field;
      var alphaFrom = va.a, alphaTo = vb.a, fromScale = va.s;

      // opening: the dots gather from a loose cloud into the first shape
      if (state.intro < 1 && !state.debug) {
        state.intro = Math.min(1, state.intro + dt / 2.8);
        if (at.i === 0 && at.p === 0) {
          var e = 1 - Math.pow(1 - state.intro, 3);
          B = A; vb = va; toBuf = fromBuf; alphaTo = va.a;
          fromBuf = shapes.field; alphaFrom = 0; fromScale = 1.5;
          A = SCENES.field;
          p = e;
        }
      }

      var halfW = HALF_HEIGHT * aspect;
      mouse.x += (mouse.tx - mouse.x) * 0.06;
      mouse.y += (mouse.ty - mouse.y) * 0.06;
      mouse.on += (mouse.ton - mouse.on) * 0.08;

      gl.clear(gl.COLOR_BUFFER_BIT);
      bind(loc.aFrom, fromBuf, 4);
      bind(loc.aTo, toBuf, 4);
      bind(loc.aRand, randBuf, 3);

      gl.uniform1f(loc.uProgress, p);
      gl.uniform1f(loc.uTime, state.time);
      gl.uniform1f(loc.uAspect, aspect);
      gl.uniform1f(loc.uDpr, dpr);
      gl.uniform1f(loc.uSize, mobile ? 1.5 : 1.75);
      gl.uniform2f(loc.uRotFrom, A.tilt, A.rot + A.spin * state.time);
      gl.uniform2f(loc.uRotTo, B.tilt, B.rot + B.spin * state.time);
      gl.uniform3f(loc.uOffFrom, va.x * halfW, va.y * HALF_HEIGHT, fromScale);
      gl.uniform3f(loc.uOffTo, vb.x * halfW, vb.y * HALF_HEIGHT, vb.s);
      gl.uniform1f(loc.uWaveFrom, A.wave);
      gl.uniform1f(loc.uWaveTo, B.wave);
      gl.uniform1f(loc.uAlphaFrom, alphaFrom);
      gl.uniform1f(loc.uAlphaTo, alphaTo);
      gl.uniform2f(loc.uView, -mouse.y * 0.1, mouse.x * 0.2 + Math.sin(state.time * 0.3) * 0.05);
      gl.uniform2f(loc.uMouse, mouse.x, mouse.y);
      gl.uniform1f(loc.uMouseOn, mouse.on);

      gl.drawArrays(gl.POINTS, 0, N);
    }

    function start() {
      if (state.running) return;
      state.running = true;
      state.last = performance.now();
      state.s = (window.scrollY || window.pageYOffset) + vh / 2;
      requestAnimationFrame(frame);
    }

    window.addEventListener('resize', resize);
    window.addEventListener('load', measure);
    if (window.ResizeObserver) new ResizeObserver(measure).observe(document.body);
    document.addEventListener('visibilitychange', function () {
      if (document.hidden) { state.running = false; } else { start(); }
    });
    canvas.addEventListener('webglcontextlost', function (e) { e.preventDefault(); state.running = false; });

    resize();

    // The two photo-based shapes need their images first.
    return Promise.all([
      loadImage('assets/shapes/portrait.png'),
      loadImage('assets/shapes/guitarist.png')
    ]).then(function (imgs) {
      shapes.portrait = buffer(sampleImage(imgs[0], N, { base: 0.07, gamma: 1.5, edge: 0.55, depth: 0.26, alphaBase: 0.2, alphaGain: 0.85, fadeFrom: 0.66 }));
      shapes.guitarist = buffer(sampleImage(imgs[1], N, { base: 0.08, gamma: 1.4, edge: 0.5, depth: 0.22, alphaBase: 0.2, alphaGain: 0.8, fadeFrom: 0.86 }));
      start();
      return {
        // for testing: hold a given scene, e.g. Stage.api.hold(2, 0)
        hold: function (i, p) { state.debug = (i == null) ? null : { i: i, p: p || 0 }; },
        // for testing: jump straight to the settled picture for the current scroll position
        settle: function (seconds) {
          state.intro = 1;
          measure();
          state.s = (window.scrollY || window.pageYOffset) + vh / 2;
          tick(seconds || 0.016);
        },
        count: N
      };
    });
  }

  window.Stage = {
    api: null,
    init: function (canvas, options) {
      return init(canvas, options).then(function (api) { window.Stage.api = api; return api; });
    }
  };
})();
