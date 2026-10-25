(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.ChallengeModels = api;
})(typeof window !== 'undefined' ? window : globalThis, function () {
  'use strict';
  const int = (n) => Math.floor(Math.random() * n);
  function shuffle(items) {
    const a = items.slice();
    for (let i = a.length - 1; i > 0; i--) {
      const j = int(i + 1);
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }
  const foods = [
    ['🍎', 'りんご'],
    ['🥛', 'ぎゅうにゅう'],
    ['🍌', 'バナナ'],
    ['🥕', 'にんじん'],
    ['🍞', 'パン'],
    ['🥦', 'ブロッコリー'],
  ];
  function shopping(level) {
    const picks = shuffle(foods).slice(0, level);
    return {
      shelf: shuffle(foods),
      order: picks.map(([icon, name]) => ({
        icon,
        name,
        count: 1 + int(level + 1),
      })),
    };
  }
  function quantitiesMatch(order, basket) {
    return (
      Object.keys(basket).every(
        (k) => order.some((x) => x.icon === k) || !basket[k]
      ) && order.every((x) => (basket[x.icon] || 0) === x.count)
    );
  }
  const DELTAS = [
    [-1, 0],
    [0, 1],
    [1, 0],
    [0, -1],
  ];
  const rotate = (mask, turns) => mask.map((d) => (d + turns) % 4).sort();
  function road(level) {
    const n = level + 2;
    // Monotone randomized route is always simple and guarantees a solution.
    const moves = shuffle([...Array(n - 1).fill(1), ...Array(n - 1).fill(2)]);
    let p = 0;
    const route = [p];
    moves.forEach((d) => {
      p += d === 1 ? 1 : n;
      route.push(p);
    });
    const masks = Array.from({ length: n * n }, () => []);
    route.forEach((cell, i) => {
      if (i > 0) masks[cell].push((moves[i - 1] + 2) % 4);
      if (i < moves.length) masks[cell].push(moves[i]);
    });
    if (level > 1) {
      const detours = shuffle(
        masks.map((m, i) => (m.length ? -1 : i)).filter((i) => i >= 0)
      );
      detours.slice(0, level === 2 ? 2 : 5).forEach((i) => {
        masks[i] = level === 3 && int(2) ? [0, 1, 3] : [0, 1];
      });
    }
    return {
      n,
      route,
      solution: masks.map((m) => m.slice()),
      masks: masks.map((m) => rotate(m, int(4))),
    };
  }
  function roadConnected(n, masks) {
    const seen = new Set([0]),
      queue = [0];
    while (queue.length) {
      const p = queue.shift();
      if (p === n * n - 1) return true;
      for (const d of masks[p]) {
        const [dy, dx] = DELTAS[d],
          y = Math.floor(p / n) + dy,
          x = (p % n) + dx;
        const q = y * n + x;
        if (
          x >= 0 &&
          y >= 0 &&
          x < n &&
          y < n &&
          masks[q].includes((d + 2) % 4) &&
          !seen.has(q)
        ) {
          seen.add(q);
          queue.push(q);
        }
      }
    }
    return false;
  }
  function robot(level) {
    const n = level + 2;
    const first = level % 2 ? 1 : 2;
    const split = 1 + int(n - 1);
    const dirs = [
      ...Array(split).fill(first),
      ...Array(n - 1).fill(first === 1 ? 2 : 1),
      ...Array(n - 1 - split).fill(first),
    ];
    let p = 0,
      facing = 1;
    const route = [p],
      solution = [];
    dirs.forEach((d) => {
      if (d !== facing) solution.push(d === (facing + 1) % 4 ? 'R' : 'L');
      solution.push('F');
      facing = d;
      p += d === 1 ? 1 : n;
      route.push(p);
    });
    const obstacles = shuffle(
      Array.from({ length: n * n }, (_, i) => i).filter(
        (i) => !route.includes(i)
      )
    ).slice(0, level + 1);
    return {
      n,
      obstacles,
      solution,
      goal: n * n - 1,
      limit: solution.length + level + 2,
    };
  }
  function robotStep(board, state, command) {
    if (command === 'L' || command === 'R')
      return {
        ...state,
        facing: (state.facing + (command === 'R' ? 1 : 3)) % 4,
        blocked: false,
      };
    const [dy, dx] = DELTAS[state.facing],
      y = Math.floor(state.position / board.n) + dy,
      x = (state.position % board.n) + dx,
      position = y * board.n + x;
    if (
      x < 0 ||
      y < 0 ||
      x >= board.n ||
      y >= board.n ||
      board.obstacles.includes(position)
    )
      return { ...state, blocked: true };
    return { position, facing: state.facing, blocked: false };
  }
  const lunchFoods = [
    ['🍙', 'おにぎり'],
    ['🥚', 'たまご'],
    ['🥦', 'ブロッコリー'],
    ['🍅', 'トマト'],
  ];
  function bento(level) {
    const n = level === 1 ? 4 : 6;
    const menu = lunchFoods.slice(0, level + 1);
    return {
      menu,
      slots: Array.from({ length: n }, () => menu[int(menu.length)][0]),
      positional: level === 3,
    };
  }
  function bentoMatch(task, slots) {
    if (slots.length !== task.slots.length || slots.some((x) => !x))
      return false;
    return task.positional
      ? task.slots.every((v, i) => v === slots[i])
      : task.menu.every(
          ([icon]) =>
            slots.filter((x) => x === icon).length ===
            task.slots.filter((x) => x === icon).length
        );
  }
  const animals = [
    {
      icon: '🐰',
      name: 'うさぎ',
      hints: ['ながい みみ', 'ぴょんぴょん はねる', 'にんじんが すき'],
    },
    {
      icon: '🐘',
      name: 'ぞう',
      hints: ['ながい はな', 'おおきな からだ', 'はなで みずを あびる'],
    },
    {
      icon: '🦒',
      name: 'きりん',
      hints: [
        'ながい くび',
        'たかい きの はを たべる',
        'からだに もようが ある',
      ],
    },
    {
      icon: '🐧',
      name: 'ペンギン',
      hints: ['とべない とり', 'およぐのが とくい', 'しろと くろの からだ'],
    },
    {
      icon: '🐸',
      name: 'かえる',
      hints: [
        'みどりの からだ',
        'あめの ひに ケロケロ',
        'おたまじゃくしから そだつ',
      ],
    },
    {
      icon: '🦁',
      name: 'ライオン',
      hints: ['かおの まわりに たてがみ', 'ガオーと なく', 'おにくを たべる'],
    },
    {
      icon: '🐢',
      name: 'かめ',
      hints: ['せなかに こうら', 'ゆっくり あるく', 'あたまを こうらに かくす'],
    },
    {
      icon: '🐼',
      name: 'パンダ',
      hints: [
        'ささを たべる',
        'めの まわりが くろい',
        'しろと くろの くまの なかま',
      ],
    },
  ];
  function detective(level) {
    const options = shuffle(animals).slice(0, level * 2 + 2),
      answer = options[int(options.length)];
    return { options, answer, hints: shuffle(answer.hints) };
  }
  function balance(level) {
    const weights = [1, 2, 3].slice(0, level),
      target = 2 + int(3 + level * 2);
    return { weights, target };
  }
  return {
    shuffle,
    shopping,
    quantitiesMatch,
    rotate,
    road,
    roadConnected,
    robot,
    robotStep,
    bento,
    bentoMatch,
    detective,
    balance,
  };
});
