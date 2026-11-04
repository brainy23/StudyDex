import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import base from './vite.config'
export default defineConfig({
  ...base,
  plugins: [vue()],
  envDir: false,
  cacheDir: join(tmpdir(), 'studydex-onboarding-fixture-cache'),
  define: {
    'import.meta.env.VITE_SUPABASE_URL': JSON.stringify('https://studydex-fixture.invalid'),
    'import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY': JSON.stringify('synthetic-publishable-key'),
    'import.meta.env.VITE_POKE_API_URL': JSON.stringify('https://pokeapi.co/api/v2'),
  },
})
