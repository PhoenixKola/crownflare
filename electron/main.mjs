import { app, BrowserWindow, Menu, protocol, session } from 'electron';
import { readFile } from 'node:fs/promises';
import path from 'node:path';

const DEVELOPMENT = !app.isPackaged && process.argv.includes('--dev');
const APP_SCHEME = 'crownflare';
const APP_HOST = 'app';
const CSP = [
  "default-src 'self'",
  "script-src 'self'",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob:",
  "media-src 'self' blob:",
  "font-src 'self' data:",
  "connect-src 'self'",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
].join('; ');

protocol.registerSchemesAsPrivileged([{
  scheme: APP_SCHEME,
  privileges: { standard: true, secure: true, supportFetchAPI: true, stream: true },
}]);

const MIME_TYPES = new Map([
  ['.css', 'text/css; charset=utf-8'],
  ['.html', 'text/html; charset=utf-8'],
  ['.ico', 'image/x-icon'],
  ['.js', 'text/javascript; charset=utf-8'],
  ['.json', 'application/json; charset=utf-8'],
  ['.png', 'image/png'],
  ['.svg', 'image/svg+xml'],
  ['.wav', 'audio/wav'],
  ['.woff', 'font/woff'],
  ['.woff2', 'font/woff2'],
]);

function response(body, status, type = 'text/plain; charset=utf-8') {
  return new Response(body, {
    status,
    headers: {
      'Content-Type': type,
      'Content-Security-Policy': CSP,
      'Cross-Origin-Resource-Policy': 'same-origin',
      'Referrer-Policy': 'no-referrer',
      'X-Content-Type-Options': 'nosniff',
    },
  });
}
async function handleAppRequest(request) {
  let url;
  try { url = new URL(request.url); }
  catch { return response('Bad request', 400); }
  if (url.protocol !== `${APP_SCHEME}:` || url.hostname !== APP_HOST || request.method !== 'GET' && request.method !== 'HEAD') {
    return response('Not found', 404);
  }

  let requestPath;
  try { requestPath = decodeURIComponent(url.pathname); }
  catch { return response('Bad path', 400); }
  if (requestPath.includes('\0') || requestPath.includes('\\')) return response('Bad path', 400);
  const relativePath = (requestPath.replace(/^\/+/, '') || 'index.html');
  const distRoot = path.resolve(app.getAppPath(), 'dist');
  const filePath = path.resolve(distRoot, relativePath);
  const relativeCheck = path.relative(distRoot, filePath);
  if (relativeCheck === '..' || relativeCheck.startsWith(`..${path.sep}`) || path.isAbsolute(relativeCheck)) return response('Forbidden', 403);

  try {
    const body = await readFile(filePath);
    return response(request.method === 'HEAD' ? null : body, 200, MIME_TYPES.get(path.extname(filePath).toLowerCase()) ?? 'application/octet-stream');
  } catch {
    return response('Not found', 404);
  }
}

function isTrustedAppUrl(value) {
  try {
    const url = new URL(value);
    return url.protocol === `${APP_SCHEME}:` && url.hostname === APP_HOST;
  } catch { return false; }
}

function isDevelopmentUrl(value) {
  if (!DEVELOPMENT) return false;
  try { return new URL(value).origin === 'http://127.0.0.1:4173'; }
  catch { return false; }
}

let mainWindow;

function createWindow() {
  const win = new BrowserWindow({
    width: 1280,
    height: 720,
    minWidth: 960,
    minHeight: 540,
    fullscreen: true,
    show: false,
    autoHideMenuBar: true,
    backgroundColor: '#070e19',
    title: 'Crownflare — Beyond the Broken Day',
    icon: app.isPackaged ? path.join(process.resourcesPath, 'crownflare.ico') : path.join(app.getAppPath(), 'build-resources', 'crownflare.ico'),
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: true,
      webSecurity: true,
      webviewTag: false,
      allowRunningInsecureContent: false,
      devTools: DEVELOPMENT,
    },
  });
  mainWindow = win;

  win.webContents.setWindowOpenHandler(() => ({ action: 'deny' }));
  win.webContents.on('will-navigate', (event, target) => {
    if (!isTrustedAppUrl(target) && !isDevelopmentUrl(target)) event.preventDefault();
  });
  win.webContents.on('will-attach-webview', (event) => event.preventDefault());
  win.webContents.on('context-menu', (event) => event.preventDefault());
  win.webContents.on('before-input-event', (event, input) => {
    if (input.type !== 'keyDown') return;
    if (input.key === 'F11') {
      event.preventDefault();
      win.setFullScreen(!win.isFullScreen());
    } else if (input.key === 'F12' || input.control && input.shift && input.key.toLowerCase() === 'i') {
      event.preventDefault();
    }
  });
  win.once('ready-to-show', () => {
    win.show();
  });
  win.on('closed', () => { if (mainWindow === win) mainWindow = undefined; });

  const entryUrl = DEVELOPMENT ? 'http://127.0.0.1:4173/' : `${APP_SCHEME}://${APP_HOST}/`;
  void win.loadURL(entryUrl);
  return win;
}

app.setAppUserModelId('com.phoenixkola.crownflare');
app.setName('Crownflare');
app.setPath('userData', path.join(app.getPath('appData'), 'Crownflare'));
if (!app.requestSingleInstanceLock()) app.quit();
else {
  app.on('second-instance', () => { if (mainWindow) { if (mainWindow.isMinimized()) mainWindow.restore(); mainWindow.focus(); } });
  app.whenReady().then(async () => {
    protocol.handle(APP_SCHEME, handleAppRequest);
    session.defaultSession.setPermissionRequestHandler((_webContents, _permission, callback) => callback(false));
    session.defaultSession.setPermissionCheckHandler(() => false);
    Menu.setApplicationMenu(null);
    createWindow();
    app.on('activate', () => { if (BrowserWindow.getAllWindows().length === 0) createWindow(); });
  });
  app.on('window-all-closed', () => { if (process.platform !== 'darwin') app.quit(); });
}
