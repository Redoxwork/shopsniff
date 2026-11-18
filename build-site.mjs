// Builds the public site: landing page + demo shop + Kane reports -> ./public
import fs from 'node:fs';
const out = 'public';
fs.rmSync(out, { recursive: true, force: true });
fs.mkdirSync(out, { recursive: true });
fs.cpSync('site', out, { recursive: true });
fs.cpSync('demo-shop', `${out}/shop`, { recursive: true });
if (fs.existsSync('reports')) fs.cpSync('reports', `${out}/reports`, { recursive: true, filter: s => !s.endsWith('.stderr.log') });
console.log('Built ./public');
