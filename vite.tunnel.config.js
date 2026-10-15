// TEMPORARY (second-laptop test through a Cloudflare tunnel) — delete after the test.
import { mergeConfig } from 'vite'
import base from './vite.config.js'

export default mergeConfig(base, {
  server: {
    host: '127.0.0.1',
    port: 5181,
    strictPort: true,
    allowedHosts: ['.trycloudflare.com'],
    hmr: false,
    proxy: { '/api': 'http://127.0.0.1:8103' },
  },
})
