(function () {
  'use strict';
  KidsApp.initCommon({ home: false });
  KidsApp.BGM.start('calm');
  const { games, read, update } = PlayCatalog;
  let age = 'all',
    category = 'all';
  const host = document.getElementById('catalog');
  function card(game) {
    const data = read(),
      favorites = data.favorites || [];
    const article = document.createElement('article');
    article.className = 'game-card';
    const link = document.createElement('a');
    link.href = 'games/' + game.id + '/index.html';
    const icon = document.createElement('span');
    icon.className = 'icon';
    icon.textContent = game.icon;
    icon.setAttribute('aria-hidden', 'true');
    const title = document.createElement('h3');
    title.textContent = game.title;
    const desc = document.createElement('p');
    desc.textContent = game.description;
    const meta = document.createElement('div');
    meta.className = 'meta';
    const badge = document.createElement('span');
    badge.className = 'badge';
    badge.textContent = game.isNew ? 'NEW · 3だんかい' : game.age + 'さい〜';
    meta.append(badge);
    if (game.isNew) {
      const medals = document.createElement('span');
      medals.textContent =
        '★ ' +
        [1, 2, 3].reduce(
          (n, l) => n + (data.stars?.[game.id + ':' + l] || 0),
          0
        ) +
        '/9';
      meta.append(medals);
    }
    link.append(icon, title, desc, meta);
    const favorite = document.createElement('button');
    favorite.type = 'button';
    favorite.dataset.favorite = game.id;
    favorite.className = 'favorite';
    favorite.textContent = favorites.includes(game.id) ? '♥' : '♡';
    favorite.setAttribute('aria-label', game.title + 'を おきにいり');
    favorite.setAttribute('aria-pressed', String(favorites.includes(game.id)));
    favorite.addEventListener('click', () => {
      update((d) => {
        const f = d.favorites || [];
        d.favorites = f.includes(game.id)
          ? f.filter((x) => x !== game.id)
          : [...f, game.id];
      });
      render();
      const target =
        host.querySelector('[data-favorite="' + game.id + '"]') ||
        host.querySelector('.favorite') ||
        document.querySelector('[data-category="favorites"]');
      target.focus({ preventScroll: true });
    });
    article.append(link, favorite);
    return article;
  }
  function section(title, list) {
    if (!list.length) return;
    const s = document.createElement('section'),
      h = document.createElement('h2'),
      grid = document.createElement('div');
    h.className = 'section-title';
    h.textContent = title;
    grid.className = 'cards';
    list.forEach((g) => grid.append(card(g)));
    s.append(h, grid);
    host.append(s);
  }
  function matches(g) {
    return (
      (age === 'all' ||
        (age === 'little'
          ? g.age <= 3
          : g.age >= 3 && g.category !== 'free')) &&
      (category === 'all' || category === 'favorites'
        ? category !== 'favorites' || (read().favorites || []).includes(g.id)
        : g.category === category)
    );
  }
  function render() {
    host.replaceChildren();
    const visible = games.filter(matches);
    document.getElementById('filterStatus').textContent =
      visible.length + 'この あそび';
    document
      .querySelectorAll('[data-age]')
      .forEach((b) =>
        b.setAttribute('aria-pressed', String(b.dataset.age === age))
      );
    document
      .querySelectorAll('[data-category]')
      .forEach((b) =>
        b.setAttribute('aria-pressed', String(b.dataset.category === category))
      );
    if (age === 'all' && category === 'all') {
      section(
        'もういちど あそぶ',
        (read().recent || [])
          .map((id) => games.find((g) => g.id === id))
          .filter(Boolean)
      );
      section(
        'あたらしい ひらめき',
        visible.filter((g) => g.isNew)
      );
    }
    const normal =
      age === 'all' && category === 'all'
        ? visible.filter((g) => !g.isNew)
        : visible;
    [
      ['think', '🧩 ひらめきの へや'],
      ['life', '🛒 くらしの へや'],
      ['free', '🎨 じゆうあそびの へや'],
    ].forEach(([key, title]) =>
      section(
        title,
        normal.filter((g) => g.category === key)
      )
    );
    if (!visible.length) {
      const p = document.createElement('p');
      p.className = 'empty';
      p.textContent =
        category === 'favorites'
          ? '♡ すきな あそびの ハートを おしてね。'
          : 'この くみあわせの あそびは まだ ないよ。「すべて」から えらんでね。';
      host.append(p);
    }
  }
  document.querySelectorAll('[data-age]').forEach((b) =>
    b.addEventListener('click', () => {
      age = b.dataset.age;
      render();
    })
  );
  document.querySelectorAll('[data-category]').forEach((b) =>
    b.addEventListener('click', () => {
      category = b.dataset.category;
      render();
    })
  );
  function version() {
    KidsApp.getServiceWorkerVersion().then((v) => {
      document.getElementById('versionTag').textContent = v
        ? 'バージョン ' + v
        : '';
    });
  }
  if ('serviceWorker' in navigator)
    navigator.serviceWorker.addEventListener('controllerchange', version);
  render();
  version();
})();
