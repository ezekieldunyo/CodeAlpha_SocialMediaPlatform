// Shared settings for the browser suites. Override with environment variables:
//   APP_URL          the Vite dev server            (default http://localhost:5173)
//   API_URL          the backend the frontend calls (default http://localhost:8000/api)
//   BROWSER_CHANNEL  installed browser to drive     (default msedge; e.g. chrome)
//   SCREENSHOTS      where screenshots go           (default tests/e2e/screenshots)
// API_URL must match the frontend's VITE_API_URL (or the Vite proxy target),
// because the suites seed data straight through the API.
import { mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

export const APP = (process.env.APP_URL || 'http://localhost:5173').replace(/\/$/, '');
export const API = (process.env.API_URL || 'http://localhost:8000/api').replace(/\/$/, '');
export const OUT = process.env.SCREENSHOTS || join(dirname(fileURLToPath(import.meta.url)), 'screenshots');
export const LAUNCH = { channel: process.env.BROWSER_CHANNEL || 'msedge', headless: true };

mkdirSync(OUT, { recursive: true });
