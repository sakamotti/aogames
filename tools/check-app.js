#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const gamesRoot = path.join(root, 'games');
const launcher = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const serviceWorker = fs.readFileSync(path.join(root, 'sw.js'), 'utf8');
const sharedApp = fs.readFileSync(path.join(root, 'shared', 'app.js'), 'utf8');
const errors = [];

const gameDirs = fs.readdirSync(gamesRoot, { withFileTypes: true })
  .filter((entry) => entry.isDirectory())
  .map((entry) => entry.name)
  .sort();

for (const game of gameDirs) {
  for (const file of ['index.html', 'script.js']) {
    const relative = `games/${game}/${file}`;
    if (!fs.existsSync(path.join(root, relative))) errors.push(`missing ${relative}`);
    if (!serviceWorker.includes(`'${relative}'`)) errors.push(`not precached ${relative}`);
  }
  if (!launcher.includes(`href="games/${game}/index.html"`)) {
    errors.push(`not linked from launcher games/${game}/index.html`);
  }
}

const htmlFiles = [path.join(root, 'index.html')]
  .concat(gameDirs.map((game) => path.join(gamesRoot, game, 'index.html')));
for (const htmlFile of htmlFiles) {
  const html = fs.readFileSync(htmlFile, 'utf8');
  for (const match of html.matchAll(/(?:src|href)="([^"]+)"/g)) {
    const ref = match[1];
    if (/^(?:https?:|#|data:)/.test(ref)) continue;
    const resolved = path.resolve(path.dirname(htmlFile), ref);
    if (!fs.existsSync(resolved)) {
      errors.push(`${path.relative(root, htmlFile)} references missing ${ref}`);
    }
  }
}

const continuousAnimationGames = [
  'bubble-pop',
  'color-hunt',
  'fireworks',
  'night-safari',
  'rain-ripples',
  'star-catch',
];
for (const game of continuousAnimationGames) {
  const relative = `games/${game}/script.js`;
  const source = fs.readFileSync(path.join(root, relative), 'utf8');
  if (!source.includes('KidsApp.startAnimationLoop(')) {
    errors.push(`${relative} bypasses the shared power-saving animation loop`);
  }
}

for (const required of [
  'POWER_SAVE_AFTER_MS',
  "ctx.suspend()",
  "pagehide",
  "kidsapp-power-save",
]) {
  if (!sharedApp.includes(required)) errors.push(`shared/app.js missing power-saving control ${required}`);
}

if (errors.length) {
  errors.forEach((error) => console.error(error));
  process.exit(1);
}

console.log(`OK: ${gameDirs.length} games, launcher links, assets, and offline cache entries`);
