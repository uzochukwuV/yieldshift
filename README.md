# React + TypeScript + Vite

This template provides a minimal setup to get React working in Vite with HMR and some ESLint rules.

Currently, two official plugins are available:


## Expanding the ESLint configuration

If you are developing a production application, we recommend updating the configuration to enable type-aware lint rules:

```js
export default tseslint.config([
  globalIgnores(['dist']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      // Other configs...

      // Remove tseslint.configs.recommended and replace with this
      ...tseslint.configs.recommendedTypeChecked,
      // Alternatively, use this for stricter rules
      ...tseslint.configs.strictTypeChecked,
      // Optionally, add this for stylistic rules
      ...tseslint.configs.stylisticTypeChecked,

      // Other configs...
    ],
    languageOptions: {
      parserOptions: {
        project: ['./tsconfig.node.json', './tsconfig.app.json'],
        tsconfigRootDir: import.meta.dirname,
      },
      // other options...
    },
  },
])
```

You can also install [eslint-plugin-react-x](https://github.com/Rel1cx/eslint-react/tree/main/packages/plugins/eslint-plugin-react-x) and [eslint-plugin-react-dom](https://github.com/Rel1cx/eslint-react/tree/main/packages/plugins/eslint-plugin-react-dom) for React-specific lint rules:

```js
// eslint.config.js
import reactX from 'eslint-plugin-react-x'
import reactDom from 'eslint-plugin-react-dom'

export default tseslint.config([
  globalIgnores(['dist']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      // Other configs...
      // Enable lint rules for React
      reactX.configs['recommended-typescript'],
      // Enable lint rules for React DOM
      reactDom.configs.recommended,
    ],
    languageOptions: {
      parserOptions: {
        project: ['./tsconfig.node.json', './tsconfig.app.json'],
        tsconfigRootDir: import.meta.dirname,
      },
      // other options...
    },
  },
])
```

## Build & development

This repository is a React + TypeScript app built with Vite. The project uses pnpm as the package manager (see `pnpm-lock.yaml`). The important scripts are defined in `package.json` and described below.

### Prerequisites

- Node.js (recommended LTS, e.g. 18+)
- pnpm (the project declares `packageManager` as `pnpm`). Install globally if needed:

PowerShell

```powershell
npm install -g pnpm
```

### Environment

The app reads Vite environment variables prefixed with `VITE_`. Create a `.env` file at the project root with any secrets or IDs you need. Example (already used by the repo):

```
VITE_SIDESHIFT_AFFILIATE_ID=your_affiliate_id
VITE_SIDESHIFT_API_KEY=your_api_key
```

Do not commit secrets to source control. Use a separate `.env.local` for local overrides if needed.

### Install dependencies

PowerShell

```powershell
pnpm install
```

### Run development server

Start a dev server with HMR (Vite):

PowerShell

```powershell
pnpm dev
```

This will start Vite and open the app at the URL shown in the terminal (usually http://localhost:5173).

### Build (production)

Build a production bundle:

PowerShell

```powershell
pnpm build
```

Preview the production build locally:

```powershell
pnpm preview
```

Note: There's a `prebuild` script in `package.json` that attempts to copy `contracts/interfaces/metadata.json` to `src/metadata.json` before building. That script uses a Unix-style `cp` command which may not work on native Windows PowerShell. If you run into issues on Windows, either run the build in WSL/Git Bash or manually copy the file:

PowerShell (manual copy)

```powershell
Copy-Item -Path contracts\\interfaces\\metadata.json -Destination src\\metadata.json -Force
pnpm build
```

Or run pnpm from Git Bash / WSL where `cp -f` is available.

### Lint & type checking

Run ESLint across the project:

```powershell
pnpm lint
```

Run TypeScript type check (no emit):

```powershell
pnpm exec tsc --noEmit
```

There are a couple of dev scripts that use Unix-specific redirection (for example `postcss:check` uses `/dev/null`). If you run into problems on Windows PowerShell, prefer Git Bash/WSL or adapt the commands (`> $null` in PowerShell).

### Troubleshooting

- If Vite fails to start, make sure Node and pnpm are installed and `pnpm install` completed without errors.
- If environment variables don't appear in the browser, remember that Vite exposes only variables starting with `VITE_` to client code.
- If `prebuild` fails on Windows, follow the manual copy step above or run the build in a Unix-compatible shell.

### Useful files

- `index.html` — app entry HTML
- `src/main.tsx` — React entry
- `vite.config.ts` — Vite configuration
- `tsconfig.*.json` — TypeScript configuration files
- `package.json` — scripts and dependencies

---

If you'd like, I can also add a short `Makefile` or cross-platform npm scripts (using `shx` or `cpy-cli`) to make the Windows workflow smoother.
