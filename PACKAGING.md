# 📦 Empaquetado e Instaladores — POS Pro

POS Pro puede distribuirse como:

| Plataforma | Tecnología | Resultado |
|------------|------------|-----------|
| **Windows** | Electron + Inno Setup | `POSPro-Setup-1.0.0.exe` (instalador con accesos directos, desinstalador) |
| **Linux/macOS** | Electron | carpeta portable `.AppImage` / `.dmg` |
| **Android** | PWA instalable | se agrega a la pantalla de inicio desde Chrome |

---

## 🏗️ Arquitectura del empaquetado

```
┌──────────────────────────────────────────────────────┐
│  Instalador .exe (Inno Setup)                         │
│  ├─ POS Pro.exe        (Electron shell, ~120 MB)      │
│  │   └─ main.js        lanza servidor Next            │
│  ├─ resources/server/ (Next.js standalone + Prisma)   │
│  ├─ resources/app/icons/app-icon.ico                  │
│  └─ Accesos: Escritorio, Menú Inicio, Quick Launch    │
│                                                       │
│  Datos del usuario (NO se borran al actualizar):      │
│  %APPDATA%\POS Pro\data\pos-pro.db   (SQLite)         │
└──────────────────────────────────────────────────────┘
```

El proceso principal de Electron (`electron/main.js`):
1. Define `DATABASE_URL=file:<userData>/data/pos-pro.db` (portable, sobrevive a updates).
2. Lanza el servidor Next.js standalone como proceso hijo (`fork`) en el puerto `43110`.
3. Espera a que el puerto responda, abre una `BrowserWindow` que carga `http://localhost:43110`.
4. Si la BD no existe → ejecuta `seed.js` (crea admin, vendedor y datos demo).
5. Al cerrar → mata el servidor limpiamente (`taskkill /T` en Windows).

---

## 🪟 Compilar el instalador Windows (.exe)

### Requisitos (en una máquina Windows)
- **Node.js 20+** y **Bun** (`npm i -g bun`)
- **Inno Setup 6** — descargar de <https://jrsoftware.org/isdl.php>
- **Git** (para clonar el repo)

### Pasos
```powershell
# 1. Instalar dependencias del proyecto
bun install

# 2. Generar iconos (si cambiaste el logo)
bun run icons

# 3. Empaquetar todo y compilar el instalador
.\scripts\build-installer.ps1
```

El instalador final se genera en:
```
installer\Output\POSPro-Setup-1.0.0.exe
```

Ese `.exe` es el que distribuyes a tus clientes: doble clic → asistente → instala en `C:\Program Files\POS Pro`, crea accesos directos y se puede desinstalar desde "Agregar o quitar programas".

### Si solo quieres el .exe portable (sin instalador)
```powershell
bun run package:win
# resultado: dist\win-unpacked\POS Pro.exe  (ejecutable portable)
```

---

## 🍎 macOS / 🐧 Linux

```bash
bun run package:mac     # -> dist/POS Pro-darwin-x64/POS Pro.app
bun run package:linux   # -> dist/POS Pro-linux-x64/  (binario + AppImage)
```

Para crear un `.dmg` en macOS se recomienda `electron-installer-dmg` o `appdmg`. Para Linux `.deb`/`.AppImage` usa `electron-installer-debian` o `electron-builder`.

---

## 📱 Android (PWA instalable)

POS Pro funciona como **PWA** — el usuario la instala directamente desde Chrome:

1. Publica la app en un servidor HTTPS (o accesible en LAN).
2. En Android, abre Chrome → menú **⋮** → **Agregar a pantalla de inicio**.
3. La app se instala con icono propio y abre en pantalla completa (sin barra del navegador).

Los archivos ya están listos:
- `public/manifest.json` — metadatos de la PWA
- `public/sw.js` — service worker (cache offline del app shell)
- `public/icon-192.png`, `icon-512.png`, `apple-touch-icon.png`
- Registro automático del SW en producción (`src/components/sw-register.tsx`)

### Para generar un APK nativo (opcional)
Si necesitas un `.apk` instalable, usa **Capacitor** para envolver la webapp:

```bash
bun add -d @capacitor/cli @capacitor/core @capacitor/android
bunx cap init "POS Pro" "com.pospro.app" --web-dir=dist
bunx cap add android
# Compila la web para producción y sincroniza
bun run build && bunx cap copy android
# Abre en Android Studio y genera el APK
bunx cap open android
```

> El APK generado requiere que el servidor backend (Next.js standalone) esté corriendo y accesible desde el dispositivo (LAN o cloud). Para una solución 100% offline en Android se recomienda la PWA + sync, que ya está implementada mediante la cola offline.

---

## 🔄 Actualizaciones

Para distribuir actualizaciones:
1. Sube la nueva versión del `.exe` a tu servidor.
2. En la app, la BD SQLite en `%APPDATA%\POS Pro\data\` **se conserva** durante la reinstalación (Inno Setup no la toca).
3. El usuario simplemente ejecuta el nuevo instalador encima del anterior.

Para auto-update automático, integra `electron-updater` en `electron/main.js`.

---

## 📋 Comandos disponibles

| Comando | Descripción |
|---------|-------------|
| `bun run icons` | Regenera iconos PNG + ICO desde `app-icon-1024.png` |
| `bun run package:win` | Empaqueta Electron para Windows (sin instalador) |
| `bun run package:mac` | Empaqueta Electron para macOS |
| `bun run package:linux` | Empaqueta Electron para Linux |
| `bun run installer:win` | Empaqueta + compila el `.exe` con Inno Setup (solo Windows) |
| `bun run dist` | `build` + `package:win` en un solo paso |

---

## 🗂️ Estructura de carpetas de empaquetado

```
pos-pro/
├── electron/
│   ├── main.js              ← proceso principal Electron
│   ├── preload.js           ← puente seguro web↔node
│   ├── package.json         ← deps de electron
│   └── icons/
│       ├── app-icon.ico     ← icono Windows (multi-res 16..256)
│       ├── app-icon-512.png
│       └── app-icon-256.png
├── installer/
│   └── pos-pro.iss          ← script Inno Setup
├── build-resources/
│   └── icons/
│       ├── app-icon-1024.png ← fuente
│       ├── app-icon.ico
│       ├── app-icon.icns     ← macOS
│       └── app-icon-{16..512}.png
├── scripts/
│   ├── generate-icons.mjs   ← genera iconos
│   ├── package-desktop.mjs   ← empaqueta Electron
│   ├── build-installer.ps1   ← PowerShell: empaqueta + Inno Setup
│   └── build-installer.sh   ← bash: empaqueta (Linux/macOS host)
├── public/
│   ├── manifest.json        ← PWA
│   ├── sw.js                ← service worker
│   └── icon-192.png, icon-512.png, apple-touch-icon.png
└── dist/                    ← salida del empaquetado (ignorado por git)
    └── win-unpacked/
        └── POS Pro.exe
```

---

## ✅ Verificación de credenciales tras instalar

| Usuario | Usuario | Contraseña | Permisos |
|---------|---------|------------|----------|
| Administrador | `admin` | `admin123` | Todos los módulos. Contraseña de autorización: `admin` |
| Vendedor | `vendedor` | `vendedor123` | Configurable por el admin |

> En la primera ejecución, la app ejecuta automáticamente el seed y crea estos dos usuarios + datos demo. Puedes modificarlos o eliminarlos desde el módulo **Usuarios**.
