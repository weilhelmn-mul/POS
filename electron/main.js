/**
 * POS Pro - Proceso principal de Electron
 * --------------------------------------------------
 * Lanza el servidor Next.js standalone en segundo plano y abre
 * una ventana nativa que carga la app desde http://localhost:{PORT}.
 *
 * La base de datos SQLite se ubica en userData para que sea portable
 * entre instalaciones (no se pierde al actualizar).
 * En la primera ejecución se copia template.db (con schema + datos demo)
 * al userData, evitando necesitar el CLI de Prisma en runtime.
 */
const { app, BrowserWindow, shell, Menu, dialog, ipcMain } = require('electron')
const { fork } = require('child_process')
const path = require('path')
const fs = require('fs')
const http = require('http')

const PORT = parseInt(process.env.PORT || '43110', 10)
const isDev = !!process.env.ELECTRON_DEV
const isWindows = process.platform === 'win32'

let mainWindow = null
let serverProcess = null
let serverReady = false

/** Ruta al servidor Next.js standalone empaquetado */
function getServerDir() {
  if (isDev) return null
  return path.join(process.resourcesPath, 'server')
}

/** Ruta de la base de datos SQLite en userData (portable) */
function getDatabasePath() {
  const userData = app.getPath('userData')
  const dbDir = path.join(userData, 'data')
  if (!fs.existsSync(dbDir)) fs.mkdirSync(dbDir, { recursive: true })
  return path.join(dbDir, 'pos-pro.db')
}

/**
 * Primera ejecución: si la BD no existe, copia template.db
 * (que ya trae el schema aplicado + datos demo) al userData.
 * Esto evita necesitar `prisma db push` / `prisma generate` en runtime.
 */
function ensureDatabase() {
  const dbPath = getDatabasePath()
  if (fs.existsSync(dbPath)) return false

  const serverDir = getServerDir()
  const templatePath = path.join(serverDir, 'template.db')

  if (fs.existsSync(templatePath)) {
    fs.copyFileSync(templatePath, dbPath)
    console.log('[db] BD inicializada desde template.db')
  } else {
    console.warn('[db] template.db no encontrado en', templatePath)
  }
  return true
}

/** Inicia el servidor Next.js standalone como proceso hijo */
function startServer() {
  return new Promise((resolve, reject) => {
    if (isDev) {
      serverReady = true
      return resolve('http://localhost:3000')
    }

    const serverDir = getServerDir()
    const serverFile = path.join(serverDir, 'server.js')
    if (!fs.existsSync(serverFile)) {
      return reject(new Error(`No se encontró el servidor en:\n${serverFile}\n\nLa instalación puede estar incompleta.`))
    }

    const dbPath = getDatabasePath()
    const env = {
      ...process.env,
      NODE_ENV: 'production',
      PORT: String(PORT),
      DATABASE_URL: `file:${dbPath}`,
      ELECTRON_RUN: '1',
      SESSION_SECRET: process.env.SESSION_SECRET || 'pos-pro-electron-secret-change-me',
      PRISMA_LOG: 'error',
    }

    // IMPORTANTE: usar stdio: 'inherit' (no ['ignore', 'pipe', 'pipe'])
    // fork() exige un canal IPC; 'inherit' lo asigna automáticamente.
    serverProcess = fork(serverFile, [], {
      cwd: serverDir,
      env,
      stdio: 'inherit',
    })

    serverProcess.on('exit', (code, signal) => {
      console.log('[server] exited with code', code, 'signal', signal)
      serverProcess = null
      if (!serverReady) {
        reject(new Error(`El servidor Next.js se cerró inesperadamente (código ${code}).\n\nCausas comunes:\n` +
          `• Puerto ${PORT} ya en uso por otra aplicación\n` +
          `• Antivirus bloqueando la ejecución\n` +
          `• Falta Visual C++ Redistributable 2015-2022 (descarga: https://aka.ms/vs/17/release/vc_redist.x64.exe)\n` +
          `• Base de datos corrupta - elimina %APPDATA%\\POS Pro\\data\\ y vuelve a abrir`))
      }
    })
    serverProcess.on('error', (err) => {
      console.error('[server] spawn error:', err)
      serverProcess = null
      reject(new Error(`No se pudo iniciar el servidor:\n${err.message}`))
    })

    const url = `http://localhost:${PORT}`
    let attempts = 0
    const maxAttempts = 90
    const tryConnect = () => {
      attempts++
      http.get(`${url}/api/auth`, (res) => {
        res.resume()
        if (res.statusCode === 200 || res.statusCode === 401) {
          serverReady = true
          resolve(url)
        } else {
          if (attempts > maxAttempts) reject(new Error('El servidor no respondió después de 45 segundos.'))
          else setTimeout(tryConnect, 500)
        }
      }).on('error', () => {
        if (attempts > maxAttempts) reject(new Error('No se pudo conectar al servidor.\nEs posible que un antivirus esté bloqueando la app.'))
        else setTimeout(tryConnect, 500)
      })
    }
    setTimeout(tryConnect, 1000)
  })
}

function createWindow(url) {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 1024,
    minHeight: 640,
    show: false,
    backgroundColor: '#0f172a',
    title: 'POS Pro',
    icon: path.join(__dirname, 'icons', isWindows ? 'app-icon.ico' : 'app-icon-512.png'),
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
    },
  })

  mainWindow.loadURL(url)

  mainWindow.once('ready-to-show', () => {
    mainWindow.show()
    if (isDev) mainWindow.webContents.openDevTools()
  })

  mainWindow.webContents.setWindowOpenHandler(({ url: u }) => {
    if (u.startsWith('http://localhost') || u.startsWith('file://')) return { action: 'deny' }
    shell.openExternal(u)
    return { action: 'deny' }
  })

  mainWindow.on('closed', () => { mainWindow = null })
}

function killServer() {
  if (serverProcess) {
    try {
      if (isWindows) {
        const { execSync } = require('child_process')
        execSync(`taskkill /pid ${serverProcess.pid} /T /F`, { stdio: 'ignore' })
      } else {
        serverProcess.kill('SIGTERM')
      }
    } catch (e) {
      console.error('Error matando servidor:', e)
    }
    serverProcess = null
  }
}

const gotLock = app.requestSingleInstanceLock()
if (!gotLock) {
  app.quit()
} else {
  app.on('second-instance', () => {
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore()
      mainWindow.focus()
    }
  })

  app.whenReady().then(async () => {
    const template = [
      {
        label: 'Archivo',
        submenu: [
          { role: 'reload', label: 'Recargar' },
          { role: 'toggleDevTools', label: 'Herramientas desarrollador' },
          { type: 'separator' },
          { role: 'print', label: 'Imprimir' },
          { type: 'separator' },
          { role: 'quit', label: 'Salir' },
        ],
      },
      {
        label: 'Edición',
        submenu: [
          { role: 'undo', label: 'Deshacer' },
          { role: 'redo', label: 'Rehacer' },
          { type: 'separator' },
          { role: 'cut', label: 'Cortar' },
          { role: 'copy', label: 'Copiar' },
          { role: 'paste', label: 'Pegar' },
        ],
      },
      {
        label: 'Ayuda',
        submenu: [
          {
            label: 'Acerca de POS Pro',
            click: () => {
              dialog.showMessageBox(mainWindow, {
                type: 'info',
                title: 'POS Pro',
                message: 'POS Pro · Ventas e Inventario',
                detail: 'Versión 1.0.0\n\nSistema profesional de punto de venta, inventario y gestión comercial.\n\nCredenciales:\n  Admin: admin / admin123\n  Vendedor: vendedor / vendedor123\n\nLa base de datos se encuentra en:\n' + getDatabasePath(),
                buttons: ['OK'],
              })
            },
          },
          {
            label: 'Abrir carpeta de datos',
            click: () => {
              const dbPath = getDatabasePath()
              shell.showItemInFolder(path.dirname(dbPath))
            },
          },
        ],
      },
    ]
    Menu.setApplicationMenu(Menu.buildFromTemplate(template))

    try {
      ensureDatabase()
      const url = await startServer()
      createWindow(url)
    } catch (e) {
      const msg = e.message || String(e)
      dialog.showErrorBox(
        'Error al iniciar POS Pro',
        msg + '\n\n---\nSi el problema persiste:\n1. Verifica que ningún antivirus bloquee la app\n2. Cierra instancias previas de POS Pro\n3. Contacta soporte'
      )
      app.quit()
    }
  })

  app.on('window-all-closed', () => {
    killServer()
    app.quit()
  })
  app.on('before-quit', () => {
    killServer()
  })
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0 && serverReady) {
      createWindow(`http://localhost:${PORT}`)
    }
  })
}

ipcMain.on('open-external', (_e, url) => {
  if (typeof url === 'string' && /^https?:\/\//.test(url)) shell.openExternal(url)
})

process.on('uncaughtException', (err) => {
  console.error('Uncaught:', err)
  if (mainWindow) {
    dialog.showErrorBox('Error inesperado', String(err.message || err))
  }
})
