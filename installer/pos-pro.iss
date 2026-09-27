; ============================================================
; POS Pro - Instalador Windows (Inno Setup)
; ============================================================
; Compilar con:  iscc installer\pos-pro.iss
; Requiere haber ejecutado antes:  bun run package:win
; (que genera dist\win-unpacked\ con Electron + servidor Next)
; ============================================================

#define MyAppName        "POS Pro"
#define MyAppFullName    "POS Pro - Ventas e Inventario"
#define MyAppVersion     "1.0.0"
#define MyAppPublisher   "POS Pro"
#define MyAppURL         "https://pospro.local"
#define MyAppExeName     "POS Pro.exe"

; Raíz de la build empaquetada (Electron + servidor Next standalone)
#define BuildRoot        "dist\win-unpacked"

[Setup]
AppId={{B7F2A1C9-3D4E-4F5A-9B6C-7D8E9F0A1B2C}
AppName={#MyAppFullName}
AppVersion={#MyAppVersion}
AppVerName={#MyAppFullName} {#MyAppVersion}
AppPublisher={#MyAppPublisher}
AppPublisherURL={#MyAppURL}
AppSupportURL={#MyAppURL}
AppUpdatesURL={#MyAppURL}
DefaultDirName={autopf}\{#MyAppName}
DefaultGroupName={#MyAppName}
DisableProgramGroupPage=yes
OutputDir=installer\Output
OutputBaseFilename=POSPro-Setup-{#MyAppVersion}
SetupIconFile=build-resources\icons\app-icon.ico
Compression=lzma2/ultra64
SolidCompression=yes
WizardStyle=modern
ArchitecturesAllowed=x64
ArchitecturesInstallIn64BitMode=x64
PrivilegesRequired=admin
UninstallDisplayIcon={app}\{#MyAppExeName}
UninstallDisplayName={#MyAppFullName}
LicenseFile=
; No sobrescribe la BD del usuario al actualizar
CloseApplications=force
RestartApplications=no

[Languages]
Name: "spanish"; MessagesFile: "compiler:Languages\Spanish.isl"
Name: "english"; MessagesFile: "compiler:Default.isl"

[Tasks]
Name: "desktopicon"; Description: "{cm:CreateDesktopIcon}"; GroupDescription: "{cm:AdditionalIcons}"; Flags: checkedonce
Name: "quicklaunchicon"; Description: "{cm:CreateQuickLaunchIcon}"; GroupDescription: "{cm:AdditionalIcons}"; Flags: checkedonce; OnlyBelowVersion: 6.01

[Files]
; Toda la app empaquetada (Electron + recursos + servidor Next standalone)
Source: "{#BuildRoot}\*"; DestDir: "{app}"; Flags: recursesubdirs createallsubdirs ignoreversion
; Licencia README (opcional)
Source: "README.md"; DestDir: "{app}"; Flags: ignoreversion; Check: FileExists(ExpandConstantConstant('{#SourcePath}\README.md'))

[Icons]
Name: "{group}\{#MyAppName}"; Filename: "{app}\{#MyAppExeName}"; IconFilename: "{app}\{#MyAppExeName}"
Name: "{group}\Desinstalar {#MyAppName}"; Filename: "{uninstallexe}"
Name: "{commondesktop}\{#MyAppName}"; Filename: "{app}\{#MyAppExeName}"; IconFilename: "{app}\{#MyAppExeName}"; Tasks: desktopicon
Name: "{userappdata}\Microsoft\Internet Explorer\Quick Launch\User Pinned\TaskBar\{#MyAppName}"; Filename: "{app}\{#MyAppExeName}"; Tasks: quicklaunchicon

[Run]
; Lanza la app al terminar
Filename: "{app}\{#MyAppExeName}"; Description: "{cm:LaunchProgram,{#MyAppName}}"; Flags: nowait postinstall skipifsields runascurrentuser

[UninstallDelete]
; Conserva la BD del usuario (en %APPDATA%), solo borra archivos del programa
Type: filesandordirs; Name: "{app}\resources\server\.next"
Type: filesandordirs; Name: "{app}\resources\server\node_modules"
Type: dirifempty; Name: "{app}"

[Code]
// No borrar la carpeta userData (BD) al desinstalar
function InitializeUninstall(): Boolean;
begin
  Result := True;
end;

// Verifica que la build exista antes de compilar el instalador
function PrepareToInstall(var NeedsRestart: Boolean): String;
begin
  Result := '';
end;
