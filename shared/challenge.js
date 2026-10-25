(function (global) {
  'use strict';
  const M = ChallengeModels;
  const $ = (id) => document.getElementById(id);
  function el(tag, cls, text) {
    const x = document.createElement(tag);
    if (cls) x.className = cls;
    if (text !== undefined) x.textContent = text;
    return x;
  }
  function button(text, action, cls = 'secondary', label) {
    const b = el('button', cls, text);
    b.type = 'button';
    if (label) b.setAttribute('aria-label', label);
    b.addEventListener('click', action);
    return b;
  }
  function start(id) {
    KidsApp.initCommon();
    PlayCatalog.visit(id);
    const game = PlayCatalog.games.find((g) => g.id === id);
    document.title = game.title + ' | あそびばこ';
    $('gameTitle').textContent = game.icon + ' ' + game.title;
    let level = Number(PlayCatalog.read().levels?.[id]) || 1;
    level = Math.max(1, Math.min(3, level));
    let cleanup = () => {},
      solved = false,
      speakText = '';
    const board = $('board');
    function say(text) {
      speakText = text;
      $('prompt').textContent = text;
      KidsApp.speak(text);
    }
    function stars() {
      const count = PlayCatalog.read().stars?.[id + ':' + level] || 0;
      $('progress').textContent =
        'この むずかしさの メダル ' + '★'.repeat(count) + '☆'.repeat(3 - count);
    }
    function win(text = 'できたね！ よく かんがえたね！') {
      if (solved) return;
      solved = true;
      cleanup();
      PlayCatalog.complete(id, level);
      stars();
      KidsApp.Sound.success();
      say(text);
      board.querySelectorAll('button').forEach((b) => (b.disabled = true));
      $('resultText').textContent = '🌟 ' + text;
      $('result').hidden = false;
      $('next').focus({ preventScroll: true });
    }
    function retry(text) {
      KidsApp.Sound.tap();
      say(text);
    }
    function newRound() {
      cleanup();
      cleanup = () => {};
      solved = false;
      $('result').hidden = true;
      board.replaceChildren();
      document
        .querySelectorAll('[data-level]')
        .forEach((b) =>
          b.setAttribute(
            'aria-pressed',
            String(Number(b.dataset.level) === level)
          )
        );
      PlayCatalog.update((d) => {
        d.levels = d.levels || {};
        d.levels[id] = level;
      });
      stars();
      cleanup =
        mounts[id]({ board, level, say, win, retry, isSolved: () => solved }) ||
        (() => {});
    }
    $('listen').addEventListener('click', () => KidsApp.speak(speakText));
    $('reset').addEventListener('click', newRound);
    $('next').addEventListener('click', newRound);
    document.querySelectorAll('[data-level]').forEach((b) =>
      b.addEventListener('click', () => {
        level = Number(b.dataset.level);
        newRound();
      })
    );
    window.addEventListener('pagehide', () => cleanup());
    newRound();
  }
  function shopping({ board, level, say, win, retry }) {
    const task = M.shopping(level),
      basket = {};
    let hidden = false;
    const order = el('div', 'order'),
      shelf = el('div', 'items'),
      bag = el('div', 'basket');
    const memo = () =>
      task.order.map((x) => x.name + ' ' + x.count + 'こ').join('、');
    function showOrder() {
      order.textContent = hidden
        ? '📝 なにを かうか おぼえているかな？'
        : task.order.map((x) => x.icon + ' × ' + x.count).join('　');
    }
    const ready = button(
      'おぼえた！ かいものへ',
      () => {
        hidden = true;
        showOrder();
        ready.hidden = true;
        say('おぼえた ものを かごに いれよう。');
      },
      'primary'
    );
    if (level === 1) ready.hidden = true;
    const peek = button('📝 メモを みる', () => {
      hidden = false;
      showOrder();
      say(memo());
    });
    function drawBag() {
      bag.replaceChildren();
      if (!Object.values(basket).some(Boolean))
        bag.append(
          el('span', 'muted', '🧺 かごは からっぽ。たべものを タップ！')
        );
      Object.entries(basket)
        .filter(([, n]) => n)
        .forEach(([icon, n]) =>
          bag.append(
            button(
              icon + ' × ' + n,
              () => {
                basket[icon]--;
                drawBag();
              },
              'item',
              icon + 'を ひとつ もどす'
            )
          )
        );
    }
    task.shelf.forEach(([icon, name]) => {
      const b = button(
        icon,
        () => {
          if ((basket[icon] || 0) < 8) basket[icon] = (basket[icon] || 0) + 1;
          drawBag();
          KidsApp.Sound.tap();
        },
        'item',
        name + 'を ひとつ かごに いれる'
      );
      b.append(el('small', '', name));
      shelf.append(b);
    });
    const check = button(
      'かごを かくにん ✓',
      () => {
        if (M.quantitiesMatch(task.order, basket))
          win('おつかい だいせいこう！');
        else {
          hidden = false;
          showOrder();
          retry('メモと くらべてみよう。かごを おすと ひとつ もどせるよ。');
        }
      },
      'primary'
    );
    board.append(
      order,
      el(
        'p',
        'muted',
        'たべものを おすと ふえるよ。かごの なかを おすと へるよ。'
      ),
      ready,
      shelf,
      bag,
      el('div', 'actions')
    );
    board.lastChild.append(peek, check);
    showOrder();
    drawBag();
    say('おねがい。' + memo() + '。かってきてね。');
  }
  function road({ board, level, say, win, retry }) {
    const task = M.road(level),
      grid = el('div', 'grid-board');
    grid.style.gridTemplateColumns = `repeat(${task.n},1fr)`;
    function draw() {
      grid.replaceChildren();
      task.masks.forEach((mask, i) => {
        const b = button(
          '',
          () => {
            task.masks[i] = M.rotate(task.masks[i], 1);
            draw();
            KidsApp.Sound.tap();
          },
          'cell',
          `${Math.floor(i / task.n) + 1}だん ${(i % task.n) + 1}ばんの みちを まわす`
        );
        if (!mask.length) {
          b.disabled = true;
          b.classList.add('rock');
          b.textContent = '🌳';
        } else {
          const ns = 'http://www.w3.org/2000/svg',
            svg = document.createElementNS(ns, 'svg');
          svg.setAttribute('viewBox', '0 0 100 100');
          for (const d of mask) {
            const line = document.createElementNS(ns, 'line');
            line.setAttribute('x1', '50');
            line.setAttribute('y1', '50');
            line.setAttribute('x2', String([50, 100, 50, 0][d]));
            line.setAttribute('y2', String([0, 50, 100, 50][d]));
            line.setAttribute('stroke', '#dca563');
            line.setAttribute('stroke-width', '24');
            svg.append(line);
          }
          b.append(svg);
        }
        if (i === 0 || i === task.n * task.n - 1)
          b.append(el('span', 'marker', i === 0 ? '🐰' : '🏡'));
        grid.append(b);
      });
    }
    const check = button(
      'おうちへ いこう！',
      () => {
        if (M.roadConnected(task.n, task.masks))
          win('みちが つながった！ おかえり！');
        else
          retry(
            'みちの はしと はしを つなげよう。きの ところは とおれないよ。'
          );
      },
      'primary'
    );
    board.append(grid, el('div', 'actions'));
    board.lastChild.append(check);
    draw();
    say('みちを タップして まわそう。うさぎから おうちまで つなげてね。');
  }
  function robot({ board, level, say, win, retry, isSolved }) {
    const task = M.robot(level),
      commands = [],
      grid = el('div', 'grid-board'),
      queue = el('div', 'commands'),
      controls = el('div', 'actions');
    grid.style.gridTemplateColumns = `repeat(${task.n},1fr)`;
    let state = { position: 0, facing: 1 },
      running = false,
      stop = () => {},
      step = 0;
    const arrows = ['↑', '→', '↓', '←'],
      labels = { F: '↑', L: '↶', R: '↷' };
    function drawGrid() {
      grid.replaceChildren();
      for (let i = 0; i < task.n * task.n; i++) {
        const c = el(
          'div',
          'cell',
          task.obstacles.includes(i) ? '🪨' : i === task.goal ? '💎' : ''
        );
        if (i === state.position) {
          c.textContent = '🤖' + arrows[state.facing];
          c.classList.add('current');
        }
        grid.append(c);
      }
    }
    function drawQueue() {
      queue.replaceChildren();
      if (!commands.length)
        queue.append(el('span', 'muted', 'ここに めいれいを ならべよう'));
      commands.forEach((c, i) => {
        const b = button(
          labels[c],
          () => {
            if (!running) {
              commands.splice(i, 1);
              drawQueue();
            }
          },
          'command',
          `${i + 1}ばんの めいれいを けす`
        );
        b.disabled = running;
        if (running && i === step) b.classList.add('active');
        queue.append(b);
      });
    }
    function setRunning(value) {
      running = value;
      controls.querySelectorAll('button').forEach((b) => (b.disabled = value));
      drawQueue();
    }
    [
      ['F', '↑ まえへ'],
      ['L', '↶ ひだりを むく'],
      ['R', '↷ みぎを むく'],
    ].forEach(([code, label]) =>
      controls.append(
        button(label, () => {
          if (commands.length < task.limit) {
            commands.push(code);
            drawQueue();
          } else say('いっぱいだね。めいれいを おすと けせるよ。');
        })
      )
    );
    const run = button(
      '▶ スタート',
      () => {
        if (running || isSolved()) return;
        if (!commands.length) {
          say('まず めいれいを ならべてね。');
          return;
        }
        state = { position: 0, facing: 1 };
        step = 0;
        drawGrid();
        setRunning(true);
        say('ロボットが うごくよ。');
        stop = KidsApp.startAnimationLoop(
          () => {
            const next = M.robotStep(task, state, commands[step]);
            state = next;
            drawGrid();
            if (next.blocked) {
              stop();
              setRunning(false);
              retry('ここは とおれないね。めいれいを なおしてみよう。');
              return;
            }
            step++;
            if (state.position === task.goal) {
              stop();
              win('たからものに とうちゃく！');
              return;
            }
            if (step >= commands.length) {
              stop();
              setRunning(false);
              retry('あと すこし！ めいれいを つけたしてみよう。');
              return;
            }
            drawQueue();
          },
          { fps: 1 }
        );
      },
      'primary'
    );
    controls.append(
      button('ぜんぶ けす', () => {
        commands.length = 0;
        state = { position: 0, facing: 1 };
        drawQueue();
        drawGrid();
      })
    );
    board.append(
      el(
        'p',
        'key',
        '↑ は いま むいている ほうへ １マス。↶ ↷ は そのばで むきを かえるよ。'
      ),
      grid,
      queue,
      controls,
      el('div', 'actions')
    );
    board.lastChild.append(run);
    drawGrid();
    drawQueue();
    say('めいれいを ならべて、ほうせきまで いこう。いしは よけてね。');
    return () => {
      stop();
    };
  }
  function bento({ board, level, say, win, retry }) {
    const task = M.bento(level),
      slots = Array(task.slots.length).fill(null);
    let selected = 0;
    const reference = el('div', 'order'),
      lunch = el('div', 'lunch' + (slots.length === 4 ? ' four' : '')),
      menu = el('div', 'items');
    if (task.positional) {
      reference.textContent = 'おなじ ばしょに いれてね';
      const sample = el('div', 'lunch');
      sample.style.maxWidth = '260px';
      task.slots.forEach((icon) => sample.append(el('span', 'slot', icon)));
      reference.append(sample);
    } else
      reference.textContent = task.menu
        .map(
          ([icon]) => icon + ' × ' + task.slots.filter((x) => x === icon).length
        )
        .join('　');
    function draw() {
      lunch.replaceChildren();
      slots.forEach((icon, i) => {
        const b = button(
          icon || '＋',
          () => {
            selected = i;
            draw();
          },
          'slot' + (selected === i ? ' selected' : ''),
          `${i + 1}ばんの ばしょ ${icon || 'からっぽ'}`
        );
        b.setAttribute('aria-pressed', String(selected === i));
        lunch.append(b);
      });
    }
    task.menu.forEach(([icon, name]) =>
      menu.append(
        button(
          icon,
          () => {
            slots[selected] = icon;
            const empty = slots.indexOf(null);
            if (empty >= 0) selected = empty;
            draw();
            KidsApp.Sound.tap();
          },
          'item',
          name + 'を いれる'
        )
      )
    );
    const clear = button('えらんだ ばしょを からに', () => {
      slots[selected] = null;
      draw();
    });
    const check = button(
      'できあがり！',
      () => {
        if (M.bentoMatch(task, slots))
          win('おいしそう！ ちゅうもんどおりだね！');
        else
          retry(
            task.positional
              ? 'おてほんと おなじ ばしょに いれてみよう。'
              : 'かずを くらべてみよう。ばしょは どこでも いいよ。'
          );
      },
      'primary'
    );
    board.append(reference, lunch, menu, el('div', 'actions'));
    board.lastChild.append(clear, check);
    draw();
    say(
      task.positional
        ? 'おてほんと おなじ ばしょに おかずを いれよう。'
        : 'ちゅうもんの かずだけ おかずを いれよう。'
    );
  }
  function detective({ board, level, say, win, retry }) {
    const task = M.detective(level),
      hints = el('ul', 'hint-list'),
      options = el('div', 'items');
    let count = level === 1 ? 2 : 1;
    const hint = button('💡 もうひとつ ヒント', () => {
      count = Math.min(3, count + 1);
      drawHints();
      say(task.hints[count - 1]);
    });
    function drawHints() {
      hints.replaceChildren();
      task.hints
        .slice(0, count)
        .forEach((h, i) => hints.append(el('li', '', i + 1 + '．' + h)));
      hint.disabled = count === 3;
    }
    task.options.forEach((a) => {
      const b = button(
        a.icon,
        () => {
          if (a === task.answer) win('みつけたね！ ' + a.name + 'でした！');
          else {
            b.disabled = true;
            count = Math.min(3, count + 1);
            drawHints();
            retry('ヒントに あう どうぶつを もういちど さがそう。');
          }
        },
        'item',
        a.name
      );
      b.append(el('small', '', a.name));
      options.append(b);
    });
    board.append(hints, hint, options);
    drawHints();
    say('だれでしょう？ ' + task.hints.slice(0, count).join('。') + '。');
  }
  function balance({ board, level, say, win, retry }) {
    const task = M.balance(level),
      amounts = task.weights.map(() => 0),
      icons = ['🍎', '🍐', '🍊'];
    const scale = el('div', 'scale'),
      pans = el('div', 'scale-pans'),
      left = el('div', 'pan'),
      right = el('div', 'pan'),
      status = el('p', 'key'),
      add = el('div', 'items'),
      remove = el('div', 'basket');
    left.textContent = '🧊 × ' + task.target;
    pans.append(left, right);
    scale.append(pans);
    function draw() {
      const sum = amounts.reduce((n, a, i) => n + a * task.weights[i], 0);
      right.textContent =
        amounts
          .map((a, i) => (a ? icons[i] + ' × ' + a : ''))
          .filter(Boolean)
          .join('　') || 'からっぽ';
      scale.style.setProperty(
        '--tilt',
        (sum === task.target ? 0 : sum > task.target ? 5 : -5) + 'deg'
      );
      status.textContent =
        sum === task.target
          ? '＝ おなじ おもさ！'
          : sum > task.target
            ? 'みぎが おもいよ'
            : 'ひだりが おもいよ';
      remove.replaceChildren();
      amounts.forEach((a, i) => {
        if (a)
          remove.append(
            button(
              icons[i] + ' −１',
              () => {
                amounts[i]--;
                draw();
              },
              'secondary',
              icons[i] + 'を ひとつ もどす'
            )
          );
      });
    }
    task.weights.forEach((w, i) => {
      const b = button(
        icons[i] + ' ＋',
        () => {
          if (amounts[i] < 12) amounts[i]++;
          draw();
          KidsApp.Sound.tap();
        },
        'item',
        icons[i] + 'を ひとつ のせる'
      );
      b.append(el('small', '', '🧊 × ' + w + ' と おなじ'));
      add.append(b);
    });
    board.append(
      el(
        'p',
        'key',
        'くだものを のせて、ひだりの つみきと おなじ おもさに しよう。'
      ),
      scale,
      status,
      add,
      remove,
      el('div', 'actions')
    );
    board.lastChild.append(
      button(
        'つりあったかな？',
        () => {
          if (
            amounts.reduce((n, a, i) => n + a * task.weights[i], 0) ===
            task.target
          )
            win('ぴったり！ おなじ おもさに なったね！');
          else
            retry(
              'かたむきを みよう。くだものを ふやしたり へらしたり してね。'
            );
        },
        'primary'
      )
    );
    draw();
    say('てんびんを おなじ おもさに しよう。くだものを おすと ふえるよ。');
  }
  const mounts = {
    shopping: shopping,
    'animal-path': road,
    'robot-code': robot,
    bento: bento,
    'animal-detective': detective,
    balance: balance,
  };
  global.ChallengeGames = { start };
})(window);
