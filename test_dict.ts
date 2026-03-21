import { normalizeExerciseName, getExerciseInfo } from './src/utils/exerciseDictionary';

console.log("TESTING NORMALIZE");
const names = [
  "Supino Reto (Seg)",
  "Puxada frontal",
  "Face pull",
  "Puxada Frontal (Segunda)",
  "Supino inclinado halteres",
  "Tríceps pulley",
  "Abdominal prancha"
];

names.forEach(n => {
  console.log(`Original: "${n}"`);
  console.log(`Normalized: "${normalizeExerciseName(n)}"`);
  console.log(`Info:`, getExerciseInfo(n));
  console.log("-------------------");
});
