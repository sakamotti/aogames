(function (global) {
  'use strict';
  const games = [
    [
      'shopping',
      '🛒',
      'おつかいできるかな？',
      'おぼえて、えらんで、おかいもの',
      'life',
      4,
      true,
    ],
    [
      'animal-path',
      '🏡',
      'どうぶつの道づくり',
      'みちを つないで おうちへ',
      'think',
      4,
      true,
    ],
    [
      'robot-code',
      '🤖',
      'ロボットにおしえて',
      'じゅんばんを くんで たからさがし',
      'think',
      5,
      true,
    ],
    [
      'bento',
      '🍱',
      'おべんとう工場',
      'ちゅうもんどおりに つめよう',
      'life',
      4,
      true,
    ],
    [
      'animal-detective',
      '🔎',
      'どうぶつ探偵',
      'ヒントから なかまを みつけよう',
      'think',
      4,
      true,
    ],
    [
      'balance',
      '⚖️',
      'どっちがおもい？',
      'てんびんを つりあわせよう',
      'think',
      5,
      true,
    ],
    [
      'pattern-next',
      '🔴',
      'つぎはどれ？',
      'ならびかたを みつけよう',
      'think',
      4,
    ],
    ['memory-match', '🃏', 'えあわせ', 'おなじ えを おぼえよう', 'think', 3],
    ['counting', '🔢', 'かずあそび', 'いくつ あるかな？', 'think', 3],
    ['shape-sorter', '🧩', 'かたちあわせ', 'ぴったりの かたちは？', 'think', 3],
    [
      'animal-quiz',
      '🐻',
      'どうぶつクイズ',
      'なまえを きいて えらぼう',
      'think',
      3,
    ],
    ['color-hunt', '🌈', 'いろさがし', 'おなじ いろを みつけよう', 'think', 3],
    [
      'crosswalk',
      '🚦',
      'おうだんほどう',
      'とまる・みる・てを あげる',
      'life',
      3,
    ],
    ['elevator', '🛗', 'エレベーター', 'いきたい かいへ いこう', 'life', 3],
    ['pet-friends', '🐱', 'なでなで', 'なでて ごはんを あげよう', 'free', 2],
    ['finger-paint', '🎨', 'おえかき', 'じゆうに いろで あそぼう', 'free', 2],
    ['bubble-pop', '🫧', 'しゃぼんだま', 'さわって ぱちん！', 'free', 2],
    ['animal-sounds', '🐶', 'なきごえ', 'どうぶつの こえを きこう', 'free', 2],
    ['fireworks', '🎆', 'はなび', 'おそらに はなを さかせよう', 'free', 2],
    ['star-catch', '⭐', 'ほしとり', 'きらきらを つかまえよう', 'free', 2],
    ['rain-ripples', '💧', 'あめふり', 'ぽつぽつ みずの おと', 'free', 2],
    ['gacha', '🎁', 'ガチャガチャ', 'どうぶつ ずかんを あつめよう', 'free', 2],
    [
      'night-safari',
      '🔦',
      'よるのさがしもの',
      'ひかりで なかまを さがそう',
      'free',
      3,
    ],
  ].map(([id, icon, title, description, category, age, isNew]) => ({
    id,
    icon,
    title,
    description,
    category,
    age,
    isNew: !!isNew,
  }));
  const KEY = 'asobibako_journey_v1';
  function read() {
    try {
      return JSON.parse(localStorage.getItem(KEY)) || {};
    } catch (_) {
      return {};
    }
  }
  function update(fn) {
    const data = read();
    fn(data);
    try {
      localStorage.setItem(KEY, JSON.stringify(data));
    } catch (_) {}
    return data;
  }
  function visit(id) {
    if (games.some((g) => g.id === id))
      update((d) => {
        d.recent = [id, ...(d.recent || []).filter((x) => x !== id)].slice(
          0,
          4
        );
      });
  }
  function complete(id, level) {
    update((d) => {
      d.stars = d.stars || {};
      const key = id + ':' + level;
      d.stars[key] = Math.min(3, (d.stars[key] || 0) + 1);
    });
  }
  global.PlayCatalog = { games, read, update, visit, complete };
})(window);
