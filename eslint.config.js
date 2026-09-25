import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import tseslint from 'typescript-eslint'
import { defineConfig, globalIgnores } from 'eslint/config'

export default defineConfig([
  globalIgnores(['dist', 'node_modules']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      js.configs.recommended,
      tseslint.configs.recommended,
      reactHooks.configs.flat.recommended,
      reactRefresh.configs.vite,
    ],
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.browser,
    },
  },
  {
    files: ['scripts/**/*.ts'],
    languageOptions: {
      globals: globals.node,
    },
  },
  {
    // Three.js/R3F scene code intentionally mutates engine-owned objects and
    // seeds visual-only particle data. Scope the compiler-style hook rules to
    // those files instead of disabling them project-wide.
    files: [
      'src/components/home/HeroCanvas.tsx',
      'src/components/ui/sidebar.tsx',
      'src/game/Entities.tsx',
      'src/game/Player.tsx',
      'src/game/fxImpl.tsx',
      'src/game/hud/HUD.tsx',
      'src/game/scene/SkyAndWeather.tsx',
    ],
    rules: {
      'react-hooks/purity': 'off',
      'react-hooks/immutability': 'off',
    },
  },
  {
    // These effects synchronize UI state with media queries, resource loading,
    // timers, or game-state transitions. Keep the exception file-scoped.
    files: [
      'src/game/hud/HUD.tsx',
      'src/pages/Home.tsx',
      'src/pages/WorldArchive.tsx',
    ],
    rules: {
      'react-hooks/set-state-in-effect': 'off',
    },
  },
  {
    // Several component modules intentionally co-export variants/helpers used
    // by the design system and game UI. Fast Refresh still works for their
    // component exports; only this stylistic restriction is relaxed.
    files: [
      'src/components/square/FilterBar.tsx',
      'src/components/ui/badge.tsx',
      'src/components/ui/button-group.tsx',
      'src/components/ui/button.tsx',
      'src/components/ui/form.tsx',
      'src/components/ui/navigation-menu.tsx',
      'src/components/ui/sidebar.tsx',
      'src/components/ui/toggle.tsx',
      'src/components/world/Toast.tsx',
      'src/game/Player.tsx',
      'src/game/fxImpl.tsx',
    ],
    rules: {
      'react-refresh/only-export-components': 'off',
    },
  },
])