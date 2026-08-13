## 2026-08-13 Todo 1.1
- Windows excluded TCP port ranges (netsh): 4738-4937, 5041-5240, 8032, 9032, 12484-12583, 41216-41415, 48512-48611, 50000-50059, 59407-59506. Ports in these ranges fail with EACCES even for plain Node. Vite default 5173 is safe. For dev-server smoke tests use --port 5173 or another port outside these ranges.
- Start-Process with npm shim on Windows doesn't reliably spawn the server; use 'node node_modules\vite\bin\vite.js' directly or Start-Job with Set-Location first.
- shadcn CLI v4.17 dropped components into a literal '@\components\ui' dir at project root instead of src/components/ui (alias misresolution) — relocate manually.
- TS 6.0: baseUrl deprecated; paths work standalone in tsconfig (relative to config file).
- Vite 8 warns on __dirname in vite.config.ts; use import.meta.dirname.

