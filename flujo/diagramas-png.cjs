// Renderiza los diagramas por estado y por idioma a PNG con Chromium (mmdc deja
// las etiquetas vacías aquí). Castellano en docs/app/diagramas/, el resto en
// docs/app/diagramas/<idioma>/.
// Uso: node flujo/diagramas-png.cjs [ruta-a-puppeteer] [ruta-a-mermaid.min.js]
const { execFileSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const puppeteer = require(process.argv[2] || 'puppeteer');
const MERMAID = process.argv[3] || require.resolve('mermaid/dist/mermaid.min.js');
const RAIZ = path.join(__dirname, '..');
const flujo = require(path.join(RAIZ, 'docs/app/flujo.json'));

(async () => {
  const browser = await puppeteer.launch({
    executablePath: process.env.CHROMIUM || '/usr/bin/chromium',
    headless: true,
    args: ['--no-sandbox'],
  });
  const page = await browser.newPage();
  await page.setViewport({ width: 1000, height: 800, deviceScaleFactor: 2 });
  await page.setContent('<!doctype html><meta charset="utf-8"><body style="margin:0;background:#fff"><div id="d"></div></body>');
  await page.addScriptTag({ path: MERMAID });
  await page.evaluate(() => mermaid.initialize({ startOnLoad: false, theme: 'default', securityLevel: 'loose' }));
  for (const [idioma, dir] of [['es', ''], ['en', 'en'], ['ca', 'ca']]) for (const { id } of flujo.estados) {
    const codigo = execFileSync('python3', [path.join(RAIZ, 'flujo/generar.py'), '--mermaid', id, '--idioma', idioma], { encoding: 'utf8' });
    await page.evaluate(async (c, n) => {
      const { svg } = await mermaid.render(`g_${n}`, c);
      document.getElementById('d').innerHTML = svg;
      const s = document.querySelector('#d svg');
      s.style.maxWidth = 'none';
      s.style.padding = '16px';
      s.style.background = '#fff';
    }, codigo, id);
    const el = await page.$('#d svg');
    const salida = path.join(RAIZ, 'docs/app/diagramas', dir, `${id}.png`);
    fs.mkdirSync(path.dirname(salida), { recursive: true });
    await el.screenshot({ path: salida });
    console.log(idioma, id);
  }
  await browser.close();
})().catch((e) => { console.error(e.stack || e); process.exitCode = 1; });
