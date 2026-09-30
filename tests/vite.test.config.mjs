// Vite config for the test frontend started by tests/run-all.sh. It is the
// app's own config with two differences, so a test run can sit alongside your
// normal `npm run dev` without interfering:
//   - its own dependency cache (sharing node_modules/.vite with another dev
//     server makes both serve "504 Outdated Optimize Dep")
//   - its own fixed port (TEST_APP_PORT, default 5199)
// The API address comes from VITE_API_URL, set by run-all.sh.
import base from '../frontend/vite.config.js';

export default {
  ...base,
  cacheDir: 'node_modules/.vite-test',
  server: {
    ...base.server,
    port: Number(process.env.TEST_APP_PORT) || 5199,
    strictPort: true,
  },
};
