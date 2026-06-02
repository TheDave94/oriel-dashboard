import { defineConfig } from 'vitest/config';
import babel, { defineRolldownBabelPreset } from '@rolldown/plugin-babel';

// Vite 8 swapped esbuild → OXC as its default transformer, and OXC does
// not yet lower TC39 Stage-3 native decorators or the `accessor` keyword
// (see oxc-project/oxc#9170 and the Vite 8 migration guide). Our Lit
// cards use that syntax in 16 source files, so vitest 4 ends up handing
// raw `@property accessor x` to Node's `vm.Script`, which V8 rejects
// with `SyntaxError: Invalid or unexpected token`.
//
// Recommended workaround (Vite discussion #21891): keep OXC as the
// primary transformer and bolt Babel onto the pipeline solely for
// files that actually contain decorators. The `rolldown.filter.code`
// hook narrows Babel's input to files containing `@` so the fast OXC
// path still handles everything else.
//
// Drop this plugin (and the @rolldown/plugin-babel + Babel devDeps)
// once oxc#9170 lands and OXC lowers Stage-3 decorators natively.
const decoratorsPreset = defineRolldownBabelPreset({
  preset: () => ({
    plugins: [['@babel/plugin-proposal-decorators', { version: '2023-11' }]],
  }),
  rolldown: {
    filter: { code: /@/ },
  },
});

export default defineConfig({
  plugins: [
    babel({
      presets: [decoratorsPreset],
    }),
  ],
  test: {
    include: ['tests/**/*.test.ts'],
    // happy-dom gives us document / window / customElements / Shadow DOM
    // so we can mount and assert against the four custom cards. ~5x
    // faster than jsdom for this workload and has the APIs LitElement
    // needs (CSSStyleSheet, MutationObserver, MediaQueryList).
    environment: 'happy-dom',
    globals: false,
    // Single shared setup wires LitElement + helper stubs (HA's <ha-card>,
    // <ha-icon>, <action-handler> are not real customElements outside HA,
    // so we register lightweight shims).
    setupFiles: ['./tests/setup.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html', 'lcov'],
      include: ['src/**/*.ts'],
      exclude: ['src/**/*.d.ts', 'src/editor/**', 'src/types/**'],
    },
  },
});
