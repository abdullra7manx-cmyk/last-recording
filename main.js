const { app, BrowserWindow, Menu } = require('electron');
const path = require('path');
const fs = require('fs');

// Auto-update: the newest game files live in the GitHub repo (docs/play). On launch the app
// compares versions, downloads anything new into its own folder, and plays that copy.
// Offline or on any error it plays the last downloaded copy, or the one bundled with the installer.
const RAW = 'https://raw.githubusercontent.com/abdullra7manx-cmyk/last-recording/main/docs/';
const DEMO = !!require('./package.json').demo;

app.commandLine.appendSwitch('ignore-gpu-blocklist');
app.commandLine.appendSwitch('force_high_performance_gpu');

async function get(url, ms = 20000) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), ms);
  try {
    const r = await fetch(url + (url.includes('?') ? '&' : '?') + 't=' + Date.now(), { signal: ctrl.signal, cache: 'no-store' });
    if (!r.ok) throw new Error('HTTP ' + r.status);
    return Buffer.from(await r.arrayBuffer());
  } finally { clearTimeout(t); }
}

async function updateGame() {
  const cacheDir = path.join(app.getPath('userData'), 'game');
  const verFile = path.join(cacheDir, '.version');
  const have = fs.existsSync(verFile) ? fs.readFileSync(verFile, 'utf8').trim() : '';
  try {
    const manifest = JSON.parse((await get(RAW + 'play/manifest.json', 6000)).toString('utf8'));
    if (!manifest || !manifest.version || !Array.isArray(manifest.files)) throw new Error('bad manifest');
    if (manifest.version === have && fs.existsSync(path.join(cacheDir, 'index.html'))) return cacheDir;
    const tmp = cacheDir + '.new';
    fs.rmSync(tmp, { recursive: true, force: true });
    for (const f of manifest.files) {
      if (typeof f !== 'string' || f.includes('..') || path.isAbsolute(f)) throw new Error('bad path');
      const dest = path.join(tmp, f);
      fs.mkdirSync(path.dirname(dest), { recursive: true });
      fs.writeFileSync(dest, await get(RAW + 'play/' + f.split('/').map(encodeURIComponent).join('/'), 60000));
    }
    fs.writeFileSync(path.join(tmp, '.version'), manifest.version);
    fs.rmSync(cacheDir, { recursive: true, force: true });
    fs.renameSync(tmp, cacheDir);
    return cacheDir;
  } catch (e) {
    return fs.existsSync(path.join(cacheDir, 'index.html')) ? cacheDir : null;
  }
}

async function createWindow() {
  const win = new BrowserWindow({
    width: 1600, height: 900, minWidth: 960, minHeight: 540,
    backgroundColor: '#030308', title: DEMO ? 'التسجيل الأخير — ديمو' : 'التسجيل الأخير', show: false, autoHideMenuBar: true,
    webPreferences: { contextIsolation: true, sandbox: true, backgroundThrottling: false }
  });
  Menu.setApplicationMenu(null);
  win.webContents.on('before-input-event', (e, input) => {
    if (input.type === 'keyDown' && input.key === 'F11') { win.setFullScreen(!win.isFullScreen()); e.preventDefault(); }
  });
  win.once('ready-to-show', () => { win.maximize(); win.show(); });
  win.loadURL('data:text/html;charset=utf-8,' + encodeURIComponent('<body style="margin:0;background:#030308;color:#e9f3ff;font:28px monospace;display:flex;align-items:center;justify-content:center;height:100vh">CHECKING FOR UPDATES…</body>'));
  const dir = (await updateGame()) || path.join(__dirname, 'game');
  win.loadFile(path.join(dir, 'index.html'), DEMO ? { query: { demo: '1' } } : {});
}
app.whenReady().then(createWindow);
app.on('window-all-closed', () => app.quit());
