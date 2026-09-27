# ============================================================
# POS Pro - Compila el instalador Windows (.exe) con Inno Setup
# ============================================================
# Requisitos:
#   - Inno Setup 6+ instalado (https://jrsoftware.org/isdl.php)
#   - ISCC.exe en PATH (típicamente C:\Program Files (x86)\Inno Setup 6)
#
# Uso (PowerShell):
#   .\scripts\build-installer.ps1
# ============================================================

$ErrorActionPreference = "Stop"
$root = Resolve-Path "$PSScriptRoot/.."
Set-Location $root

Write-Host "==> Empaquetando app de escritorio (Electron + Next standalone)..." -ForegroundColor Cyan
bun run package:win
if ($LASTEXITCODE -ne 0) { throw "Fallo el empaquetado de Electron" }

Write-Host "==> Buscando Inno Setup (ISCC)..." -ForegroundColor Cyan
$iscc = $null
$candidates = @(
  "C:\Program Files (x86)\Inno Setup 6\ISCC.exe",
  "C:\Program Files\Inno Setup 6\ISCC.exe",
  "iscc.exe"
)
foreach ($c in $candidates) {
  if (Test-Path $c) { $iscc = $c; break }
  $cmd = Get-Command $c -ErrorAction SilentlyContinue
  if ($cmd) { $iscc = $cmd.Source; break }
}
if (-not $iscc) {
  Write-Host "Inno Setup no encontrado. Instala desde https://jrsoftware.org/isdl.php" -ForegroundColor Red
  Write-Host "Luego ejecuta manualmente:  iscc installer\pos-pro.iss" -ForegroundColor Yellow
  exit 1
}

Write-Host "==> Compilando instalador con: $iscc" -ForegroundColor Cyan
& $iscc "$root\installer\pos-pro.iss"
if ($LASTEXITCODE -ne 0) { throw "Inno Setup fallo (codigo $LASTEXITCODE)" }

$out = "$root\installer\Output"
Write-Host ""
Write-Host "==> Instalador generado en: $out" -ForegroundColor Green
Get-ChildItem $out -Filter *.exe | ForEach-Object { Write-Host "  - $($_.Name) ($([math]::Round($_.Length/1MB,1)) MB)" -ForegroundColor Green }
