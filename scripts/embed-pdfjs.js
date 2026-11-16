#!/usr/bin/env node
/**
 * Gera src/lib/native/pdfjsBundle.ts: o pdf.js (build "legacy", UMD) como texto, para ser
 * embutido na página da WebView e funcionar sem rede.
 *
 * Uso (só quando for trocar a versão do pdf.js):
 *   npm pack pdfjs-dist@3.11.174 && tar -xzf pdfjs-dist-3.11.174.tgz
 *   node scripts/embed-pdfjs.js package/legacy/build 3.11.174
 *
 * A 3.11.174 é a última versão com build UMD (as seguintes são só módulos ES, que não
 * dá para embutir num <script> comum).
 */
const fs = require('fs');
const path = require('path');

const [dir, version] = process.argv.slice(2);
if (!dir || !version) {
  console.error('uso: node scripts/embed-pdfjs.js <pasta legacy/build do pdfjs-dist> <versão>');
  process.exit(1);
}

// o texto vai dentro de um <script> embutido: nada de "</script" nem "<!--" no meio
const safe = (file) =>
  fs
    .readFileSync(path.join(dir, file), 'utf8')
    .replace(/<\/script/gi, '<\\/script')
    .replace(/<!--/g, '<\\!--');

const out = `// GERADO por scripts/embed-pdfjs.js — não editar à mão.
// pdf.js ${version} (pdfjs-dist, build legacy), licença Apache-2.0, © Mozilla Foundation.
export const PDFJS_VERSION = ${JSON.stringify(version)};
export const PDFJS_SOURCE: string = ${JSON.stringify(safe('pdf.min.js'))};
export const PDFJS_WORKER_SOURCE: string = ${JSON.stringify(safe('pdf.worker.min.js'))};
`;
const dest = path.join(__dirname, '..', 'src', 'lib', 'native', 'pdfjsBundle.ts');
fs.writeFileSync(dest, out);
console.log(`${dest}: ${(out.length / 1024).toFixed(0)} KB`);
