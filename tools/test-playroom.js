#!/usr/bin/env node
'use strict';
// Run with Playwright installed. CHROMIUM_PROVIDER optionally points to a
// serverless Chromium module; no browser or npm dependency ships with the app.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const http = require('node:http');
const { chromium } = require('playwright');
const root = path.resolve(__dirname, '..');
const ids = [
  'shopping',
  'animal-path',
  'robot-code',
  'bento',
  'animal-detective',
  'balance',
];
(async () => {
  let browser, server;
  const errors = [];
  try {
    server = http.createServer((req, res) => {
      const rel = decodeURIComponent(
        new URL(req.url, 'http://localhost').pathname
      );
      const file = path.resolve(
        root,
        '.' + rel + (rel.endsWith('/') ? 'index.html' : '')
      );
      if (!file.startsWith(root + path.sep)) {
        res.writeHead(403).end();
        return;
      }
      try {
        const data = fs.readFileSync(file);
        res.setHeader(
          'Content-Type',
          {
            js: 'application/javascript',
            html: 'text/html',
            css: 'text/css',
            json: 'application/json',
            png: 'image/png',
            mp3: 'audio/mpeg',
          }[file.split('.').pop()] || 'application/octet-stream'
        );
        res.end(data);
      } catch {
        res.writeHead(404).end();
      }
    });
    await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
    const origin = 'http://127.0.0.1:' + server.address().port;
    const launch = { headless: true, args: ['--no-sandbox'] };
    if (process.env.CHROMIUM_PROVIDER) {
      const { default: provider } = await import(process.env.CHROMIUM_PROVIDER);
      launch.executablePath = await provider.executablePath();
      launch.args = provider.args;
    }
    browser = await chromium.launch(launch);
    const context = await browser.newContext({
      viewport: { width: 390, height: 844 },
      isMobile: true,
      hasTouch: true,
    });
    if (process.env.PLAYROOM_TEST_FONTS) {
      const css = fs.readFileSync(process.env.PLAYROOM_TEST_FONTS, 'utf8');
      await context.addInitScript(
        (css) =>
          document.addEventListener('DOMContentLoaded', () => {
            const style = document.createElement('style');
            style.textContent = css;
            document.head.append(style);
          }),
        css
      );
    }
    const page = await context.newPage();
    page.on('pageerror', (e) => errors.push(e.message));
    await page.goto(origin + '/index.html');
    await page.waitForFunction(
      () =>
        window.PlayCatalog &&
        document.querySelectorAll('.game-card').length === 23
    );
    await page.evaluate(() => localStorage.setItem('kidsapp_muted', '1'));
    assert.equal(await page.locator('.game-card').count(), 23);
    await page.locator('[data-age="little"]').click();
    assert.equal(await page.locator('.game-card').count(), 16);
    await page.locator('[data-category="free"]').click();
    assert.equal(await page.locator('.game-card').count(), 9);
    await page.locator('[data-age="older"]').click();
    assert.equal(await page.locator('.game-card').count(), 0);
    await page.locator('[data-category="all"]').click();
    assert.equal(await page.locator('.game-card').count(), 14);
    await page.locator('[data-age="all"]').click();
    await page.locator('.favorite').first().click();
    await page.locator('[data-category="favorites"]').click();
    assert.equal(await page.locator('.game-card').count(), 1);
    await page.reload();
    await page.locator('[data-category="favorites"]').click();
    assert.equal(await page.locator('.game-card').count(), 1);
    await page.locator('.favorite').click();
    assert.equal(await page.locator('.game-card').count(), 0);
    await page.locator('[data-category="all"]').click();
    await page.evaluate(() => document.fonts.ready);
    await page.screenshot({ path: '/tmp/aogames-home.png', fullPage: true });
    // Capture generated tasks at their boundary, then solve using real clicks.
    for (const id of ids) {
      await page.goto(origin + '/games/' + id + '/index.html');
      await page.waitForFunction(() => window.ChallengeGames);
      await page.evaluate(() => {
        for (const name of [
          'shopping',
          'road',
          'robot',
          'bento',
          'detective',
          'balance',
        ]) {
          const original = ChallengeModels[name];
          ChallengeModels[name] = (...args) => {
            window.__task = original(...args);
            return window.__task;
          };
        }
      });
      for (const level of [1, 2, 3]) {
        await page.locator('[data-level="' + level + '"]').click();
        const task = await page.evaluate(() => window.__task);
        const check = () => page.locator('#board .primary').last().click();
        if (id === 'shopping') {
          if (level > 1)
            await page
              .getByRole('button', { name: 'おぼえた！ かいものへ' })
              .click();
          await check();
          assert.equal(await page.locator('#result').isVisible(), false);
          for (const item of task.order)
            for (let n = 0; n < item.count; n++)
              await page
                .getByRole('button', {
                  name: item.name + 'を ひとつ かごに いれる',
                  exact: true,
                })
                .click();
          const first = task.order[0];
          await page
            .getByRole('button', {
              name: first.name + 'を ひとつ かごに いれる',
              exact: true,
            })
            .click();
          await page
            .getByRole('button', {
              name: first.icon + 'を ひとつ もどす',
              exact: true,
            })
            .click();
          await check();
        } else if (id === 'animal-path') {
          for (let i = 0; i < task.masks.length; i++) {
            if (!task.masks[i].length) continue;
            const turns = await page.evaluate((i) => {
              const t = window.__task;
              for (let k = 0; k < 4; k++) {
                if (
                  JSON.stringify(ChallengeModels.rotate(t.masks[i], k)) ===
                  JSON.stringify(t.solution[i].slice().sort())
                )
                  return k;
              }
              throw Error('rotation');
            }, i);
            for (let k = 0; k < turns; k++)
              await page.locator('#board .cell').nth(i).click();
          }
          await check();
        } else if (id === 'robot-code') {
          const labels = {
            F: '↑ まえへ',
            L: '↶ ひだりを むく',
            R: '↷ みぎを むく',
          };
          if (level === 1) {
            await page
              .getByRole('button', { name: labels.L, exact: true })
              .click();
            await page
              .getByRole('button', { name: labels.F, exact: true })
              .click();
            await page
              .getByRole('button', { name: '▶ スタート', exact: true })
              .click();
            await page.waitForFunction(() =>
              document
                .getElementById('prompt')
                .textContent.includes('とおれない')
            );
            assert.equal(await page.locator('#result').isVisible(), false);
            await page
              .getByRole('button', { name: 'ぜんぶ けす', exact: true })
              .click();
          }
          for (const command of task.solution)
            await page
              .getByRole('button', { name: labels[command], exact: true })
              .click();
          await page
            .getByRole('button', { name: '▶ スタート', exact: true })
            .click();
          await page.waitForFunction(
            () => !document.getElementById('result').hidden,
            {},
            { timeout: 25000 }
          );
        } else if (id === 'bento') {
          await check();
          assert.equal(await page.locator('#result').isVisible(), false);
          for (let i = 0; i < task.slots.length; i++) {
            await page.locator('#board > .lunch .slot').nth(i).click();
            const name = task.menu.find((x) => x[0] === task.slots[i])[1];
            await page
              .getByRole('button', { name: name + 'を いれる', exact: true })
              .click();
          }
          await check();
        } else if (id === 'animal-detective') {
          const wrong = task.options.find((a) => a.name !== task.answer.name);
          await page
            .getByRole('button', { name: wrong.name, exact: true })
            .click();
          assert.equal(await page.locator('#result').isVisible(), false);
          await page
            .getByRole('button', { name: task.answer.name, exact: true })
            .click();
        } else if (id === 'balance') {
          await check();
          assert.equal(await page.locator('#result').isVisible(), false);
          for (let n = 0; n < task.target; n++)
            await page
              .getByRole('button', { name: '🍎を ひとつ のせる', exact: true })
              .click();
          await check();
        }
        assert(
          await page.locator('#result').isVisible(),
          id + ' level ' + level + ' solved'
        );
        assert.equal(
          await page.evaluate(
            ({ id, level }) => PlayCatalog.read().stars[id + ':' + level],
            { id, level }
          ),
          1
        );
        assert.equal(
          await page.evaluate(
            () => document.documentElement.scrollWidth > innerWidth
          ),
          false,
          id + ' overflow'
        );
        await page.locator('#next').click();
        assert.equal(await page.locator('#result').isVisible(), false);
        await page.evaluate(() => document.fonts.ready);
        if (level === 3)
          await page.screenshot({
            path: '/tmp/aogames-' + id + '.png',
            fullPage: true,
          });
      }
      await page.reload();
      assert.equal(
        await page.locator('[data-level="3"]').getAttribute('aria-pressed'),
        'true'
      );
      console.log(
        'OK: ' +
          id +
          ' all three difficulties, retry, success, new round, persistence'
      );
    }
    // Exercise all 17 existing game entry points after the shared redesign.
    await page.goto(origin + '/index.html');
    const old = await page.evaluate(() =>
      PlayCatalog.games.filter((g) => !g.isNew).map((g) => g.id)
    );
    for (const id of old) {
      await page.goto(origin + '/games/' + id + '/index.html');
      assert.equal(await page.locator('.mute-button').count(), 1);
    }
    // Cache v41 must support a fresh navigation to every new game offline.
    await page.goto(origin + '/index.html');
    await page.evaluate(async () => {
      await navigator.serviceWorker.ready;
    });
    await page.waitForFunction(() => navigator.serviceWorker.controller);
    await page.waitForFunction(async () => {
      const c = await caches.open('asobibako-v41');
      return !!(await c.match(location.origin + '/games/balance/script.js'));
    });
    await context.setOffline(true);
    for (const id of ids) {
      const response = await page.goto(origin + '/games/' + id + '/index.html');
      assert.equal(response.status(), 200);
      assert.equal(await page.locator('#board').count(), 1);
    }
    await page.goto(origin + '/index.html');
    assert((await page.locator('.game-card').count()) >= 23);
    await context.setOffline(false);
    // Small portrait, landscape, tablet, desktop: no sideways overflow.
    for (const size of [
      { width: 320, height: 568 },
      { width: 844, height: 390 },
      { width: 768, height: 1024 },
      { width: 1280, height: 800 },
    ]) {
      await page.setViewportSize(size);
      await page.goto(origin + '/index.html');
      assert.equal(
        await page.evaluate(
          () => document.documentElement.scrollWidth > innerWidth
        ),
        false
      );
      for (const id of ids) {
        await page.goto(origin + '/games/' + id + '/index.html');
        await page.locator('[data-level="3"]').click();
        assert.equal(
          await page.evaluate(
            () => document.documentElement.scrollWidth > innerWidth
          ),
          false,
          id + ' at ' + size.width
        );
      }
    }
    assert.deepEqual(errors, []);
    console.log(
      'OK: catalog filters, favorites, all 23 entry points, v41 offline, mobile/landscape/tablet/desktop, no browser errors'
    );
  } finally {
    if (browser) await browser.close();
    if (server) await new Promise((resolve) => server.close(resolve));
  }
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
