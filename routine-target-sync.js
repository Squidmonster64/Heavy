import { STORES, getAll, getOne, putOne } from './db.js';

const MARKER_PREFIX = 'routine-target-sync:';
const SYNC_INTERVAL_MS = 2500;

function clampNumber(value, min, max) {
  const number = Number(value);
  if (!Number.isFinite(number)) return null;
  return Math.min(max, Math.max(min, number));
}

export function applyCompletedSetTargets(routine, session) {
  if (!routine || !session || routine.id !== session.routineId) return false;

  const sessionExercises = new Map(
    (session.exercises || []).map(exercise => [exercise.exerciseId, exercise])
  );
  let changed = false;

  for (const block of routine.exerciseBlocks || []) {
    const sessionExercise = sessionExercises.get(block.exerciseId);
    if (!sessionExercise) continue;

    for (let index = 0; index < (block.sets || []).length; index += 1) {
      const targetSet = block.sets[index];
      const completedSet = sessionExercise.sets?.[index];
      if (!completedSet?.isCompleted) continue;

      const weightKg = clampNumber(completedSet.weightKg, 0, 999.9);
      const repsValue = clampNumber(completedSet.reps, 0, 999);
      if (weightKg == null || repsValue == null) continue;
      const reps = Math.round(repsValue);

      if (Number(targetSet.targetWeightKg) !== weightKg) {
        targetSet.targetWeightKg = weightKg;
        changed = true;
      }
      if (Number(targetSet.targetReps) !== reps) {
        targetSet.targetReps = reps;
        changed = true;
      }
    }
  }

  return changed;
}

export async function syncRoutineTargetsToLatestSessions() {
  const [routines, sessions] = await Promise.all([
    getAll(STORES.routines),
    getAll(STORES.workoutSessions)
  ]);

  const latestByRoutine = new Map();
  sessions
    .filter(session => session.status === 'completed')
    .sort((a, b) => String(b.completedAt || b.updatedAt).localeCompare(String(a.completedAt || a.updatedAt)))
    .forEach(session => {
      if (!latestByRoutine.has(session.routineId)) latestByRoutine.set(session.routineId, session);
    });

  let changedRoutineCount = 0;

  for (const routine of routines) {
    const latest = latestByRoutine.get(routine.id);
    if (!latest?.id) continue;

    const markerKey = `${MARKER_PREFIX}${routine.id}`;
    const marker = await getOne(STORES.metadata, markerKey);
    if (marker?.sessionId === latest.id) continue;

    if (applyCompletedSetTargets(routine, latest)) {
      routine.updatedAt = new Date().toISOString();
      await putOne(STORES.routines, routine);
      changedRoutineCount += 1;
    }

    await putOne(STORES.metadata, {
      key: markerKey,
      sessionId: latest.id,
      syncedAt: new Date().toISOString()
    });
  }

  return changedRoutineCount;
}

if (typeof window !== 'undefined') {
  let running = false;

  const run = async () => {
    if (running) return;
    running = true;
    try {
      const changedRoutineCount = await syncRoutineTargetsToLatestSessions();
      if (changedRoutineCount > 0) window.location.reload();
    } catch (error) {
      console.error('Routine target sync failed', error);
    } finally {
      running = false;
    }
  };

  run();
  window.setInterval(run, SYNC_INTERVAL_MS);
}
