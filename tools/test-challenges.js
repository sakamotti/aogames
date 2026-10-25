#!/usr/bin/env node
'use strict';
const assert = require('node:assert/strict');
const M = require('../shared/challenge-models');
for (let level = 1; level <= 3; level++) {
  for (let i = 0; i < 200; i++) {
    const order = M.shopping(level).order;
    const basket = Object.fromEntries(order.map((x) => [x.icon, x.count]));
    assert(M.quantitiesMatch(order, basket));
    assert(!M.quantitiesMatch(order, { ...basket, '🍫': 1 }));
    assert(
      !M.quantitiesMatch(order, {
        ...basket,
        [order[0].icon]: order[0].count + 1,
      })
    );
    const road = M.road(level);
    assert(M.roadConnected(road.n, road.solution));
    assert(
      !M.roadConnected(
        road.n,
        Array.from({ length: road.n ** 2 }, () => [])
      )
    );
    const robot = M.robot(level);
    let state = { position: 0, facing: 1 };
    for (const command of robot.solution) {
      state = M.robotStep(robot, state, command);
      assert(!state.blocked);
    }
    assert.equal(state.position, robot.goal);
    assert(robot.solution.length <= robot.limit);
    assert(M.robotStep(robot, { position: 0, facing: 0 }, 'F').blocked);
    assert.equal(
      M.robotStep(robot, { position: 0, facing: 1 }, 'R').position,
      0
    );
    const bento = M.bento(level);
    assert(M.bentoMatch(bento, bento.slots));
    assert(
      !M.bentoMatch(
        bento,
        bento.slots.map(() => null)
      )
    );
    if (!bento.positional)
      assert(M.bentoMatch(bento, bento.slots.slice().reverse()));
    else if (bento.slots.some((x) => x !== bento.slots[0])) {
      const wrong = bento.slots.slice(),
        j = wrong.findIndex((x) => x !== wrong[0]);
      [wrong[0], wrong[j]] = [wrong[j], wrong[0]];
      assert(!M.bentoMatch(bento, wrong));
    }
    const detective = M.detective(level);
    assert.equal(
      new Set(detective.options.map((x) => x.name)).size,
      detective.options.length
    );
    assert(detective.options.includes(detective.answer));
    assert.equal(detective.hints.length, 3);
    const balance = M.balance(level);
    assert(balance.weights.includes(1));
    assert(balance.target <= 12);
  }
}
assert(
  !M.roadConnected(2, [[3], [1], [3], [1]]),
  'roads cannot wrap around the edge'
);
console.log(
  'OK: 600 generated rounds per game: solvability, boundaries, counts, positions, clues, and reachable balance targets'
);
