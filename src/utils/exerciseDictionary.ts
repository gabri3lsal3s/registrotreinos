export type MuscleGroup = 
  | 'Peito'
  | 'Costas'
  | 'Pernas'
  | 'Ombros'
  | 'Bíceps'
  | 'Tríceps'
  | 'Core'
  | 'Outros';

export type ExerciseCategory = 'weight' | 'bodyweight' | 'time';

interface ExerciseDef {
  canonicalName: string;
  muscleGroup: MuscleGroup;
  aliases: string[]; // Variations of the name to match against
  category?: ExerciseCategory;
  multiplier?: number;
}

// Helper to remove accents and special chars, and lowercase
export function normalizeExerciseName(name: string): string {
  if (!name) return '';
  
  // Remove any text inside parentheses carefully
  const noParenthesis = name.replace(/\([^)]*\)/g, ' ');

  return noParenthesis
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // remove acentos
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ') // mantém espaços, substitui outros por espaço
    .replace(/\s+/g, ' ') // remove espaços duplos
    .trim();
}

// A dictionary mapping normalized aliases to their central definition
const exerciseDict: Record<string, ExerciseDef> = {};

function addExercise(
  canonicalName: string, 
  muscleGroup: MuscleGroup, 
  aliases: string[], 
  category: ExerciseCategory = 'weight', 
  multiplier?: number
) {
  const def: ExerciseDef = { canonicalName, muscleGroup, aliases, category, multiplier };
  
  // Add canonical name as an alias too
  const allAliases = [...aliases, canonicalName];
  
  allAliases.forEach(alias => {
    const normalized = normalizeExerciseName(alias);
    if (normalized) {
      exerciseDict[normalized] = def;
    }
  });
}

// PEITO
addExercise('Supino Reto', 'Peito', ['supino reto barra', 'supino reto com barra', 'supino maquina', 'supino reto maquina', 'supino articulado']);
addExercise('Supino Inclinado', 'Peito', ['supino inclinado barra', 'supino inclinado com barra', 'supino inclinado maquina', 'supino inclinado articulado']);
addExercise('Supino Declinado', 'Peito', ['supino declinado barra', 'supino canadense']);
addExercise('Supino Reto com Halteres', 'Peito', ['supino reto halteres', 'supino reto halter']);
addExercise('Supino Inclinado com Halteres', 'Peito', ['supino inclinado halteres', 'supino inclinado halter']);
addExercise('Crucifixo Reto', 'Peito', ['crucifixo reto halteres', 'crucifixo']);
addExercise('Crucifixo Inclinado', 'Peito', ['crucifixo inclinado halteres']);
addExercise('Crucifixo Maquina', 'Peito', ['peck deck', 'voador', 'voador peitoral', 'peck-deck', 'crucifixo peck deck']);
addExercise('Crossover', 'Peito', ['cross over', 'crossover polia', 'cruzamento de cabos']);
addExercise('Crossover Polia Alta', 'Peito', ['cross over polia alta']);
addExercise('Crossover Polia Baixa', 'Peito', ['cross over polia baixa']);

// COSTAS
addExercise('Puxada Frontal', 'Costas', ['pulley frente', 'puxada frente', 'puxador frente', 'puxador frontal', 'puxada aberta', 'puxada frontal']);
addExercise('Puxada Supinada', 'Costas', ['pulley supinado', 'puxada frente supinada', 'puxador supinado']);
addExercise('Puxada Articulada', 'Costas', ['puxada maquina']);
addExercise('Remada Curvada', 'Costas', ['remada curvada barra', 'remada barra']);
addExercise('Remada Baixa', 'Costas', ['remada sentada', 'remada polia baixa', 'remada triangulo']);
addExercise('Remada Unilateral', 'Costas', ['serrote', 'remada serrote', 'remada unilateral halteres', 'remada unilateral maquina']);
addExercise('Remada Articulada', 'Costas', ['remada cavalinho', 'remada articulada maquina']);
addExercise('Pull Down', 'Costas', ['pulldown', 'pulldown corda', 'puxada alta corda braços estendidos']);
addExercise('Barra Fixa', 'Costas', ['pull up', 'chin up', 'barra fixa supinada', 'barra fixa pronada'], 'bodyweight', 0.95);

// PERNAS
addExercise('Agachamento Livre', 'Pernas', ['agachamento', 'agachamento barra', 'agachamento costas', 'squat']);
addExercise('Agachamento Hack', 'Pernas', ['hack squat', 'hack', 'hack machine']);
addExercise('Agachamento Smith', 'Pernas', ['smith', 'smith machine']);
addExercise('Leg Press 45', 'Pernas', ['leg press', 'leg 45', 'leg press 45o']);
addExercise('Cadeira Extensora', 'Pernas', ['extensora', 'cadeira extensora pernas', 'extensao de pernas']);
addExercise('Cadeira Flexora', 'Pernas', ['flexora', 'cadeira flexora sentada']);
addExercise('Mesa Flexora', 'Pernas', ['mesa flexora deitada']);
addExercise('Stiff', 'Pernas', ['stiff barra', 'stiff com barra', 'stiff halteres']);
addExercise('Levantamento Terra', 'Pernas', ['deadlift', 'terra']);
addExercise('Elevação Pélvica', 'Pernas', ['hip thrust', 'elevacao pelvica barra', 'elevacao pelvica maquina']);
addExercise('Passada', 'Pernas', ['avanco', 'passada halteres', 'lunge', 'lunges']);
addExercise('Afundo', 'Pernas', ['bulgaro', 'agachamento bulgaro']);
addExercise('Cadeira Abdutora', 'Pernas', ['abdutora', 'abducao maquina']);
addExercise('Cadeira Adutora', 'Pernas', ['adutora', 'aducao maquina']);
addExercise('Panturrilha em Pé', 'Pernas', ['gemeos em pe', 'panturrilha maquina em pe', 'elevacao de panturrilha']);
addExercise('Panturrilha Sentado', 'Pernas', ['gemeos sentado', 'panturrilha burrico']);
addExercise('Panturrilha no Leg Press', 'Pernas', ['gemeos leg press']);

// OMBROS
addExercise('Desenvolvimento com Halteres', 'Ombros', ['desenvolvimento halteres', 'desenvolvimento sentado']);
addExercise('Desenvolvimento com Barra', 'Ombros', ['desenvolvimento barra', 'desenvolvimento militar', 'militar', 'overhead press']);
addExercise('Desenvolvimento Máquina', 'Ombros', ['desenvolvimento articulado']);
addExercise('Elevação Lateral', 'Ombros', ['elevacao lateral halteres', 'lateral raise']);
addExercise('Elevação Lateral na Polia', 'Ombros', ['elevacao lateral cabo', 'elevacao lateral cross']);
addExercise('Elevação Frontal', 'Ombros', ['elevacao frontal halteres', 'elevacao frontal barra', 'elevacao frontal polia']);
addExercise('Crucifixo Inverso', 'Ombros', ['voador inverso', 'crucifixo invertido', 'peck deck inverso']);
addExercise('Face Pull', 'Ombros', ['face pull', 'facepull']);

// BÍCEPS
addExercise('Rosca Direta', 'Bíceps', ['rosca direta barra', 'rosca barra reta', 'rosca barra w']);
addExercise('Rosca Alternada', 'Bíceps', ['rosca alternada halteres']);
addExercise('Rosca Martelo', 'Bíceps', ['rosca martelo halteres', 'rosca martelo corda']);
addExercise('Rosca Scott', 'Bíceps', ['biceps scott', 'scott maquina', 'rosca scott barra w']);
addExercise('Rosca Concentrada', 'Bíceps', ['biceps concentrado']);
addExercise('Rosca na Polia', 'Bíceps', ['rosca polia baixa', 'rosca cross', 'biceps polia']);

// TRÍCEPS
addExercise('Tríceps Pulley', 'Tríceps', ['triceps polia', 'triceps barra reta', 'triceps barra v']);
addExercise('Tríceps Corda', 'Tríceps', ['triceps polia corda', 'triceps pulley corda']);
addExercise('Tríceps Testa', 'Tríceps', ['rosca testa', 'triceps testa barra w', 'triceps testa polia']);
addExercise('Tríceps Frances', 'Tríceps', ['triceps frances halteres', 'triceps frances corda']);
addExercise('Tríceps Coice', 'Tríceps', ['triceps coice polia', 'triceps coice halter']);
addExercise('Mergulho nas Paralelas', 'Tríceps', ['paralelas', 'triceps banco', 'mergulho', 'dips'], 'bodyweight', 0.95);

// PEITO EXTRA
addExercise('Flexão de Braço', 'Peito', ['flexao', 'flexao de braco', 'push up', 'pushups'], 'bodyweight', 0.65);

// CORE
addExercise('Abdominal Reto', 'Core', ['abdominal', 'crunch', 'abdominal supra'], 'bodyweight', 0.30);
addExercise('Abdominal Infra', 'Core', ['elevacao de pernas', 'elevacao de pernas pendurado', 'infra'], 'bodyweight', 0.30);
addExercise('Prancha', 'Core', ['plank', 'prancha isometrica', 'abdominal prancha', 'ponte'], 'time', 0.65);

// KEYWORD MAPPING FOR HEURISTIC DETECTION
const muscleKeywords: Record<MuscleGroup, string[]> = {
  'Peito': ['supino', 'voador', 'peck', 'deck', 'crucifixo', 'cross', 'crossover', 'flexao', 'pushup', 'peitoral', 'chest'],
  'Costas': ['remada', 'puxada', 'pulley', 'puxador', 'barra fixa', 'pullup', 'chinup', 'serrote', 'cavalinho', 'pulldown', 'lat', 'back', 'costas', 'trap'],
  'Pernas': ['agachamento', 'leg', 'press', 'extensora', 'flexora', 'stiff', 'terra', 'deadlift', 'panturrilha', 'gemeos', 'afundo', 'passada', 'bulgaro', 'abdutora', 'adutora', 'squat', 'lunge', 'perna', 'gluteo'],
  'Ombros': ['desenvolvimento', 'elevacao', 'lateral', 'frontal', 'militar', 'overhead', 'shoulder', 'ombro', 'deltoide', 'facepull', 'trapezio'],
  'Bíceps': ['rosca', 'biceps', 'martelo', 'scott', 'concentrada', 'curl'],
  'Tríceps': ['triceps', 'testa', 'frances', 'coice', 'mergulho', 'corda', 'pulley', 'skullcrusher', 'dips'],
  'Core': ['abdominal', 'prancha', 'plank', 'crunch', 'supra', 'infra', 'lombar', 'core'],
  'Outros': []
};

export function getExerciseInfo(rawName: string, fallbackMuscleGroup?: string): { canonicalName: string, muscleGroup: string, category: ExerciseCategory, multiplier?: number } {
  const normName = normalizeExerciseName(rawName);
  
  // 1. Exact Dictionary Match (Alias or Canonical)
  // We need to re-scan the dict because normName now has spaces
  for (const key in exerciseDict) {
    if (normalizeExerciseName(key) === normName) {
      const def = exerciseDict[key];
      return {
        canonicalName: def.canonicalName,
        muscleGroup: def.muscleGroup,
        category: def.category || 'weight',
        multiplier: def.multiplier
      };
    }
  }

  // 2. Heuristic Search by Keywords
  const words = normName.split(' ');
  const scores: Record<string, number> = {
    'Peito': 0, 'Costas': 0, 'Pernas': 0, 'Ombros': 0, 'Bíceps': 0, 'Tríceps': 0, 'Core': 0
  };

  words.forEach(word => {
    // Skip small or generic words
    if (word.length < 3) return;

    for (const [group, keywords] of Object.entries(muscleKeywords)) {
      if (group === 'Outros') continue;
      
      keywords.forEach(kw => {
        const normKw = normalizeExerciseName(kw);
        // Match exact word or start of word for better accuracy
        if (word === normKw || (word.includes(normKw) && word.length - normKw.length < 3)) {
          scores[group] += 1;
          
          // Boost for certain primary keywords
          if (['supino', 'agachamento', 'remada', 'rosca', 'triceps'].includes(normKw)) {
            scores[group] += 2;
          }
        }
      });
    }
  });

  // Special rules: "Supinada" usually means Costas, not Biceps
  if (normName.includes('puxada') || normName.includes('pulley')) {
    scores['Costas'] += 2;
  }

  // Find the winning group
  let winner: MuscleGroup = (fallbackMuscleGroup as MuscleGroup) || 'Outros';
  let maxScore = 0;

  for (const [group, score] of Object.entries(scores)) {
    if (score > maxScore) {
      maxScore = score;
      winner = group as MuscleGroup;
    }
  }

  // Final category/multiplier heuristic
  let finalCat: ExerciseCategory = 'weight';
  let finalMult = 1;

  if (normName.includes('prancha') || normName.includes('plank')) {
    finalCat = 'time';
    finalMult = 0.65;
  } else if (normName.includes('flexao') || normName.includes('pushup') || normName.includes('paralela') || normName.includes('barra fixa') || normName.includes('pullup') || normName.includes('chinup') || normName.includes('abdominal')) {
    finalCat = 'bodyweight';
    // Se não for possível ser específico, usamos o mais comum para o grupo
    if (winner === 'Peito') finalMult = 0.65;
    else if (winner === 'Costas') finalMult = 0.95;
    else if (winner === 'Core') finalMult = 0.30;
    else if (winner === 'Tríceps') finalMult = 0.95;
  }

  // Fallback title case for canonical name
  const formattedName = rawName
    .trim()
    .split(' ')
    .filter(Boolean)
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');

  return {
    canonicalName: formattedName || 'Exercício Desconhecido',
    muscleGroup: winner,
    category: finalCat,
    multiplier: finalMult
  };
}
