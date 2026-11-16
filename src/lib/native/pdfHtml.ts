import { PDFJS_SOURCE, PDFJS_WORKER_SOURCE } from './pdfjsBundle';

/**
 * Página que roda dentro da WebView (ou de um iframe, no build web) e desenha páginas de PDF
 * com o pdf.js embutido — nada vem da rede e nenhum Worker é criado.
 *
 * Quem hospeda chama `window.__pdf.*` e recebe textos JSON de volta:
 *   { type: 'ready' }                                   a página carregou
 *   { type: 'opened', pages }                           depois de begin() + chunk()… + open()
 *   { type: 'sizes', from, sizes: [{width, height}] }   depois de sizes(from, to) — pontos de PDF
 *   { type: 'rendered', id, page, width, height, ms, base64 }   depois de render(id, page, escala, qualidade) — JPEG
 *   { type: 'error', name, stage, id? }                 `name` é o nome do erro do pdf.js
 *
 * A escala é decidida fora (lib/pdf.ts → renderScale), a página só obedece.
 */
const PAGE_SCRIPT = `
(function () {
  function post(o) {
    var s = JSON.stringify(o);
    if (window.ReactNativeWebView) window.ReactNativeWebView.postMessage(s);
    else parent.postMessage(s, '*');
  }
  function fail(stage, e, id) {
    post({ type: 'error', stage: stage, id: id, name: (e && e.name) || 'Error', message: String((e && e.message) || e) });
  }

  // O "worker" do pdf.js foi carregado nesta mesma página (window.pdfjsWorker), então o pdf.js
  // trabalha aqui mesmo, sem criar um Worker: numa página sem origem (HTML embutido) o Worker
  // a partir de blob falha. Como a WebView é escondida, travar a página dela não trava o app.
  var lib = window.pdfjsLib || window['pdfjs-dist/build/pdf'];
  lib.GlobalWorkerOptions.workerSrc = 'embutido';

  var parts = [];
  var doc = null;
  var task = null;
  var generation = 0;
  var queue = Promise.resolve();

  function closeDoc() {
    generation++;
    parts = [];
    if (task) { try { task.destroy(); } catch (e) {} }
    task = null;
    doc = null;
  }

  window.__pdf = {
    begin: function () { closeDoc(); },
    chunk: function (b64) {
      try {
        var bin = atob(b64);
        var bytes = new Uint8Array(bin.length);
        for (var i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
        parts.push(bytes);
      } catch (e) { fail('open', { name: 'InvalidPDFException', message: 'base64' }); }
    },
    open: function () {
      var gen = generation;
      var total = 0, i;
      for (i = 0; i < parts.length; i++) total += parts[i].length;
      var data = new Uint8Array(total);
      var at = 0;
      for (i = 0; i < parts.length; i++) { data.set(parts[i], at); at += parts[i].length; }
      parts = [];
      try {
        task = lib.getDocument({ data: data, isEvalSupported: false, useSystemFonts: true });
        task.promise.then(
          function (d) { if (gen !== generation) return; doc = d; post({ type: 'opened', pages: d.numPages }); },
          function (e) { if (gen === generation) fail('open', e); }
        );
      } catch (e) { fail('open', e); }
    },
    sizes: function (from, to) {
      var gen = generation;
      if (!doc) return;
      var jobs = [];
      for (var n = from; n <= to; n++) {
        jobs.push(doc.getPage(n).then(function (p) {
          var v = p.getViewport({ scale: 1 });
          return { width: v.width, height: v.height };
        }));
      }
      Promise.all(jobs).then(
        function (sizes) { if (gen === generation) post({ type: 'sizes', from: from, sizes: sizes }); },
        function (e) { if (gen === generation) fail('sizes', e); }
      );
    },
    render: function (id, n, scale, quality) {
      var gen = generation;
      // uma página por vez: desenhar várias ao mesmo tempo só gasta memória
      queue = queue.then(function () {
        if (gen !== generation || !doc) return;
        var started = Date.now();
        var canvas = document.createElement('canvas');
        return doc.getPage(n).then(function (p) {
          var v = p.getViewport({ scale: scale });
          canvas.width = Math.max(1, Math.floor(v.width));
          canvas.height = Math.max(1, Math.floor(v.height));
          var ctx = canvas.getContext('2d');
          if (!ctx) throw { name: 'CanvasError', message: 'sem contexto 2d' };
          // intent "print": não depende de requestAnimationFrame, que para quando a WebView está escondida
          return p.render({ canvasContext: ctx, viewport: v, intent: 'print', background: '#ffffff' }).promise.then(function () {
            var url = canvas.toDataURL('image/jpeg', quality);
            var w = canvas.width, h = canvas.height;
            canvas.width = 0; canvas.height = 0;
            p.cleanup();
            if (url.indexOf('data:image/jpeg') !== 0) throw { name: 'CanvasError', message: 'canvas grande demais' };
            if (gen === generation) post({ type: 'rendered', id: id, page: n, width: w, height: h, ms: Date.now() - started, base64: url.slice(url.indexOf(',') + 1) });
          });
        }).catch(function (e) {
          canvas.width = 0; canvas.height = 0;
          if (gen === generation) fail('render', e, id);
        });
      });
    }
  };

  window.onerror = function (msg) { fail('script', { name: 'ScriptError', message: msg }); };
  post({ type: 'ready' });
})();
`;

/** Mensagens que a página manda de volta. */
export type PdfMessage =
  | { type: 'ready' }
  | { type: 'opened'; pages: number }
  | { type: 'sizes'; from: number; sizes: { width: number; height: number }[] }
  | { type: 'rendered'; id: string; page: number; width: number; height: number; ms: number; base64: string }
  | { type: 'error'; name: string; stage: string; id?: string; message?: string };

export const PDF_HTML = `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
</head>
<body>
<script>${PDFJS_SOURCE}</script>
<script>${PDFJS_WORKER_SOURCE}</script>
<script>${PAGE_SCRIPT}</script>
</body>
</html>`;
