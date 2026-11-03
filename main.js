const { app, BrowserWindow, Menu } = require('electron');
const path = require('path');

// The game itself lives online (GitHub Pages). Every launch loads the newest version;
// without internet it falls back to the copy bundled with the installer.
const REMOTE = 'https://abdullra7manx-cmyk.github.io/last-recording/';
const DEMO = !!require('./package.json').demo;

app.commandLine.appendSwitch('ignore-gpu-blocklist');
app.commandLine.appendSwitch('force_high_performance_gpu');

async function remoteAvailable() {
  try {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), 4000);
    const r = await fetch(REMOTE + 'version.json?t=' + Date.now(), { signal: ctrl.signal, cache: 'no-store' });
    clearTimeout(t);
    if (!r.ok) return false;
    const v = await r.json();
    return !!(v && v.version);
  } catch (e) { return false; }
}

async function createWindow() {
  const win = new BrowserWindow({
    width: 1600, height: 900, minWidth: 960, minHeight: 540,
    backgroundColor: '#030308', title: DEMO ? 'التسجيل الأخير — ديمو' : 'التسجيل الأخير', show: false, autoHideMenuBar: true,
    webPreferences: { contextIsolation: true, sandbox: true, backgroundThrottling: false }
  });
  Menu.setApplicationMenu(null);
  win.once('ready-to-show', () => { win.maximize(); win.show(); });
  win.webContents.on('before-input-event', (e, input) => {
    if (input.type === 'keyDown' && input.key === 'F11') { win.setFullScreen(!win.isFullScreen()); e.preventDefault(); }
  });
  const local = () => win.loadFile(path.join(__dirname, 'game', 'index.html'), DEMO ? { query: { demo: '1' } } : {});
  if (await remoteAvailable()) {
    await win.webContents.session.clearCache();
    let fellBack = false;
    win.webContents.once('did-fail-load', () => { if (!fellBack) { fellBack = true; local(); } });
    win.loadURL(REMOTE + 'play/index.html' + (DEMO ? '?demo=1' : ''), { extraHeaders: 'pragma: no-cache\n' });
  } else {
    local();
  }
}
app.whenReady().then(createWindow);
app.on('window-all-closed', () => app.quit());
