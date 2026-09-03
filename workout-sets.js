export function carryWorkoutWeightForward(exercises, setId, nextWeightKg) {
  for (const exercise of exercises || []) {
    const setIndex = exercise.sets?.findIndex(set => set.id === setId) ?? -1;
    if (setIndex < 0) continue;

    const sourceSet = exercise.sets[setIndex];
    const previousWeightKg = sourceSet.weightKg;
    sourceSet.weightKg = nextWeightKg;
    const changedSetIds = [sourceSet.id];

    for (const followingSet of exercise.sets.slice(setIndex + 1)) {
      if (followingSet.isCompleted || Number(followingSet.weightKg) !== Number(previousWeightKg)) break;
      followingSet.weightKg = nextWeightKg;
      changedSetIds.push(followingSet.id);
    }

    return changedSetIds;
  }

  return [];
}
