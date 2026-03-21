export type MuscleGroup = 
  | 'Peito'
  | 'Costas'
  | 'Pernas'
  | 'Ombros'
  | 'Bíceps'
  | 'Tríceps'
  | 'Core'
  | 'Outros';

interface ExerciseDef {
  canonicalName: string;
  muscleGroup: MuscleGroup;
  aliases: string[]; // Variations of the name to match against
}

// Helper to remove accents and special chars, and lowercase
export function normalizeExerciseName(name: string): string {
  if (!name) return '';
  
  // Remove any text inside parentheses. Users often add notes like "(máquina)", "(halteres)", "(Segunda)" which break generic matching.
  const noParenthesis = name.replace(/\s*\([^)]*\)\s*/g, ' ');

  return noParenthesis
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // remove acentos
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '') // remove espaços, parênteses, barras etc pra comparar melhor
    .trim();
}

// A dictionary mapping normalized aliases to their central definition
const exerciseDict: Record<string, ExerciseDef> = {};

function addExercise(canonicalName: string, muscleGroup: MuscleGroup, aliases: string[]) {
  const def: ExerciseDef = { canonicalName, muscleGroup, aliases };
  
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
addExercise('Barra Fixa', 'Costas', ['pull up', 'chin up', 'barra fixa supinada', 'barra fixa pronada']);

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
addExercise('Mergulho nas Paralelas', 'Tríceps', ['paralelas', 'triceps banco', 'mergulho']);

// CORE
addExercise('Abdominal Reto', 'Core', ['abdominal', 'crunch', 'abdominal supra']);
addExercise('Abdominal Infra', 'Core', ['elevacao de pernas', 'elevacao de pernas pendurado']);
addExercise('Prancha', 'Core', ['plank', 'prancha isometrica', 'abdominal prancha']);

export function getExerciseInfo(rawName: string, fallbackMuscleGroup?: string): { canonicalName: string, muscleGroup: string } {
  const normName = normalizeExerciseName(rawName);
  const def = exerciseDict[normName];
  
  console.log(`[AutoMode] Analisando: "${rawName}" -> Norm: "${normName}" -> Encontrou:`, !!def);
  
  if (def) {
    return {
      canonicalName: def.canonicalName,
      muscleGroup: def.muscleGroup
    };
  }

  // Fallback if not found: title case the raw name (or just keep it) 
  // and use the provided muscle group or "Outros"
  const formattedName = rawName
    .trim()
    .split(' ')
    .filter(Boolean)
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');

  return {
    canonicalName: formattedName || 'Exercício Desconhecido',
    muscleGroup: fallbackMuscleGroup || 'Outros'
  };
}
