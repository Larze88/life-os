// Fails early with a clear message on unsupported Node.js versions.
// Deliberately old-style JavaScript so it runs even on very old Node versions.
var required = [22, 12];
var parts = process.versions.node.split('.').map(Number);
var ok = parts[0] > required[0] || (parts[0] === required[0] && parts[1] >= required[1]);
if (!ok) {
  console.error('');
  console.error('  Life OS braucht Node.js 24 (mindestens ' + required.join('.') + ').');
  console.error('  Gefunden: Node.js ' + process.versions.node + ' (' + process.execPath + ')');
  console.error('');
  console.error('  Bitte Node.js 24 LTS von https://nodejs.org installieren,');
  console.error('  das Terminal neu öffnen und mit "node -v" prüfen.');
  console.error('');
  process.exit(1);
}
