import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { mergeConfig } from 'vite'
import base from './vite.config'

// Browser fixtures supply a fake project URL/key; never load local credentials.
export default mergeConfig(base, {
  envDir: false,
  cacheDir: join(tmpdir(), 'studydex-fixture-vite-cache'),
})
