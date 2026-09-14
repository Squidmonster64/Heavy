import test from 'node:test';
import assert from 'node:assert/strict';
import { applyCompletedSetTargets } from './routine-target-sync.js';

test('copies completed workout values into matching routine targets', () => {
  const routine = {
    id: 'routine-1',
    exerciseBlocks: [
      {
        exerciseId: 'bench',
        sets: [
          { targetWeightKg: 37.5, targetReps: 10 },
          { targetWeightKg: 37.5, targetReps: 10 }
        ]
      }
    ]
  };
  const session = {
    routineId: 'routine-1',
    exercises: [
      {
        exerciseId: 'bench',
        sets: [
          { weightKg: 15.6, reps: 13, isCompleted: true },
          { weightKg: 15.6, reps: 13, isCompleted: true }
        ]
      }
    ]
  };

  assert.equal(applyCompletedSetTargets(routine, session), true);
  assert.deepEqual(routine.exerciseBlocks[0].sets, [
    { targetWeightKg: 15.6, targetReps: 13 },
    { targetWeightKg: 15.6, targetReps: 13 }
  ]);
});

test('does not overwrite a target from an incomplete set', () => {
  const routine = {
    id: 'routine-1',
    exerciseBlocks: [{ exerciseId: 'bench', sets: [{ targetWeightKg: 20, targetReps: 8 }] }]
  };
  const session = {
    routineId: 'routine-1',
    exercises: [{ exerciseId: 'bench', sets: [{ weightKg: 10, reps: 20, isCompleted: false }] }]
  };

  assert.equal(applyCompletedSetTargets(routine, session), false);
  assert.deepEqual(routine.exerciseBlocks[0].sets[0], { targetWeightKg: 20, targetReps: 8 });
});

test('ignores sessions belonging to another routine', () => {
  const routine = {
    id: 'routine-1',
    exerciseBlocks: [{ exerciseId: 'bench', sets: [{ targetWeightKg: 20, targetReps: 8 }] }]
  };
  const session = {
    routineId: 'routine-2',
    exercises: [{ exerciseId: 'bench', sets: [{ weightKg: 15.6, reps: 13, isCompleted: true }] }]
  };

  assert.equal(applyCompletedSetTargets(routine, session), false);
  assert.deepEqual(routine.exerciseBlocks[0].sets[0], { targetWeightKg: 20, targetReps: 8 });
});
