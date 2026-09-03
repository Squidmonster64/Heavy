import assert from 'node:assert/strict';
import test from 'node:test';

import { carryWorkoutWeightForward } from './workout-sets.js';

function exerciseWithWeights(...weights) {
  return [{
    id: 'exercise-1',
    sets: weights.map((weightKg, index) => ({
      id: `set-${index + 1}`,
      weightKg,
      isCompleted: false
    }))
  }];
}

test('editing set one carries its weight through matching later sets', () => {
  const exercises = exerciseWithWeights(5, 5, 5);

  assert.deepEqual(carryWorkoutWeightForward(exercises, 'set-1', 7.5), ['set-1', 'set-2', 'set-3']);
  assert.deepEqual(exercises[0].sets.map(set => set.weightKg), [7.5, 7.5, 7.5]);
});

test('editing a later set carries forward sequentially', () => {
  const exercises = exerciseWithWeights(5, 5, 5);

  assert.deepEqual(carryWorkoutWeightForward(exercises, 'set-2', 6), ['set-2', 'set-3']);
  assert.deepEqual(exercises[0].sets.map(set => set.weightKg), [5, 6, 6]);
});

test('an independently edited or completed later set is never overwritten', () => {
  const exercises = exerciseWithWeights(5, 5, 7.5, 5);

  assert.deepEqual(carryWorkoutWeightForward(exercises, 'set-1', 6), ['set-1', 'set-2']);
  assert.deepEqual(exercises[0].sets.map(set => set.weightKg), [6, 6, 7.5, 5]);

  exercises[0].sets[1].isCompleted = true;
  assert.deepEqual(carryWorkoutWeightForward(exercises, 'set-1', 8), ['set-1']);
  assert.deepEqual(exercises[0].sets.map(set => set.weightKg), [8, 6, 7.5, 5]);
});

test('unknown sets leave the workout unchanged', () => {
  const exercises = exerciseWithWeights(5, 5, 5);

  assert.deepEqual(carryWorkoutWeightForward(exercises, 'missing', 10), []);
  assert.deepEqual(exercises[0].sets.map(set => set.weightKg), [5, 5, 5]);
});
