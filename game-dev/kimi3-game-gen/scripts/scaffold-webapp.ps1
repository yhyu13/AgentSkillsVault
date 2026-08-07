#requires -Version 5.1
<#
.SYNOPSIS
    Scaffold a Vite + React 19 + TypeScript (strict) + Tailwind v3 project
    for the kimi3-game-gen workflow.

.DESCRIPTION
    Mirrors what KIMI3's init-webapp.sh does. Run from an empty directory.
    After it finishes, run `npm run typecheck` to confirm the scaffold is clean.

.PARAMETER Name
    Project folder name. Defaults to "kimi3-game".

.EXAMPLE
    .\scaffold-webapp.ps1 -Name my-survivors-game
    cd my-survivors-game
    npm run typecheck
#>
param(
    [string]$Name = "kimi3-game"
)

$ErrorActionPreference = 'Stop'

if (Test-Path -LiteralPath $Name) {
    throw "Directory '$Name' already exists. Refusing to overwrite."
}

Write-Host "==> Creating $Name ..." -ForegroundColor Cyan

# 1) Vite + React + TS template
npm create vite@latest $Name -- --template react-ts | Out-Host
if ($LASTEXITCODE -ne 0) { throw "npm create vite failed" }

Push-Location -LiteralPath $Name
try {
    # 2) Install base deps
    Write-Host "==> Installing base deps ..." -ForegroundColor Cyan
    npm install | Out-Host
    if ($LASTEXITCODE -ne 0) { throw "npm install failed" }

    # 3) Add runtime deps used by the kimi3 stack
    Write-Host "==> Adding zustand ..." -ForegroundColor Cyan
    npm install zustand | Out-Host

    # 4) Add Tailwind v3 (PostCSS plugin) + autoprefixer
    Write-Host "==> Adding Tailwind v3 ..." -ForegroundColor Cyan
    npm install -D tailwindcss@^3.4.0 postcss autoprefixer | Out-Host
    if ($LASTEXITCODE -ne 0) { throw "tailwind install failed" }

    # 5) Init tailwind config (non-interactive)
    npx tailwindcss init -p | Out-Host

    # 6) Wire tailwind.config.js content paths
    $tailwindCfg = @"
/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        bg: "#0b0b12",
        fg: "#e6e6f0",
        accent: "#ff4d6d",
        muted: "#5a5a72",
      },
      fontFamily: {
        mono: ["ui-monospace", "SFMono-Regular", "Menlo", "monospace"],
      },
    },
  },
  plugins: [],
};
"@
    Set-Content -LiteralPath "tailwind.config.js" -Value $tailwindCfg -Encoding utf8

    # 7) Replace src/index.css with Tailwind directives + theme tokens
    $indexCss = @"
@tailwind base;
@tailwind components;
@tailwind utilities;

:root {
  color-scheme: dark;
}

html, body, #root {
  height: 100%;
  margin: 0;
  background: theme('colors.bg');
  color: theme('colors.fg');
  font-family: theme('fontFamily.mono');
}
"@
    Set-Content -LiteralPath "src/index.css" -Value $indexCss -Encoding utf8

    # 8) Strict tsconfig — extend Vite's default
    $tsconfigApp = @"
{
  "compilerOptions": {
    "target": "ES2022",
    "useDefineForClassFields": true,
    "lib": ["ES2022", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "skipLibCheck": true,
    "moduleResolution": "bundler",
    "allowImportingTsExtensions": true,
    "resolveJsonModule": true,
    "isolatedModules": true,
    "moduleDetection": "force",
    "noEmit": true,
    "jsx": "react-jsx",
    "strict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noFallthroughCasesInSwitch": true,
    "noUncheckedSideEffectImports": true
  },
  "include": ["src"]
}
"@
    Set-Content -LiteralPath "tsconfig.app.json" -Value $tsconfigApp -Encoding utf8

    # 9) Add npm scripts: typecheck / build:check
    $pkg = Get-Content -LiteralPath "package.json" -Raw | ConvertFrom-Json
    $pkg.scripts | Add-Member -Force -NotePropertyName "typecheck" -NotePropertyValue "tsc -b --noEmit"
    $pkg.scripts | Add-Member -Force -NotePropertyName "build:check" -NotePropertyValue "npm run typecheck && npm run build"
    $pkg | ConvertTo-Json -Depth 10 | Set-Content -LiteralPath "package.json" -Encoding utf8

    # 10) Skeleton directories the scaffold agent will populate
    New-Item -ItemType Directory -Force -Path "src/systems" | Out-Null
    New-Item -ItemType Directory -Force -Path "src/data"    | Out-Null
    New-Item -ItemType Directory -Force -Path "src/pages"   | Out-Null
    New-Item -ItemType Directory -Force -Path "src/components" | Out-Null
    New-Item -ItemType Directory -Force -Path "docs/design" | Out-Null

    Write-Host "==> Scaffold complete." -ForegroundColor Green
    Write-Host ""
    Write-Host "Next steps:" -ForegroundColor Yellow
    Write-Host "  1. cd $Name"
    Write-Host "  2. npm run typecheck    # must be clean"
    Write-Host "  3. Author src/types.ts, src/store.ts, src/engine.ts (FROZEN)"
    Write-Host "  4. Add stub files in src/systems/ with frozen signatures"
    Write-Host "  5. Commit, then fan out coder agents per docs/design/*.md"
}
finally {
    Pop-Location
}