import type { ExerciseCategory } from '../types';

export interface StarterPackExercise {
  name: string;
  muscleGroup: string;
  category: ExerciseCategory;
  multiplier?: number;
  sets: number;
  reps: number;
  pinnedNotes?: string;
}

export interface StarterPackTemplate {
  id: string;
  name: string;
  description: string;
  split: string;
  daysCount: number;
  daysOfWeek: string[];
  exercisesByDay: Record<string, StarterPackExercise[]>;
}

export const STARTER_PACKS: StarterPackTemplate[] = [
  {
    id: 'ppl_6days',
    name: 'Push / Pull / Legs (PPL Clássico 6x)',
    description: 'Divisão hipertrófica de alta frequência dividida em Empurrar, Puxar e Pernas (2x por semana).',
    split: 'Push / Pull / Legs',
    daysCount: 6,
    daysOfWeek: ['mon', 'tue', 'wed', 'thu', 'fri', 'sat'],
    exercisesByDay: {
      mon: [
        { name: 'Supino Reto com Barra', muscleGroup: 'Peito', category: 'weight', sets: 4, reps: 8, pinnedNotes: 'Pés firmes no chão, arco escapular' },
        { name: 'Supino Inclinado com Halteres', muscleGroup: 'Peito', category: 'weight', sets: 3, reps: 10, pinnedNotes: 'Banco a 30 graus' },
        { name: 'Desenvolvimento Militar com Halteres', muscleGroup: 'Ombros', category: 'weight', sets: 3, reps: 10 },
        { name: 'Elevação Lateral', muscleGroup: 'Ombros', category: 'weight', sets: 4, reps: 12 },
        { name: 'Tríceps Corda na Polia', muscleGroup: 'Tríceps', category: 'weight', sets: 3, reps: 12 },
        { name: 'Tríceps Testa', muscleGroup: 'Tríceps', category: 'weight', sets: 3, reps: 10 }
      ],
      tue: [
        { name: 'Puxada Frontal na Polia', muscleGroup: 'Costas', category: 'weight', sets: 4, reps: 10, pinnedNotes: 'Puxar com os cotovelos' },
        { name: 'Remada Curvada com Barra', muscleGroup: 'Costas', category: 'weight', sets: 4, reps: 8 },
        { name: 'Remada Baixa no Triângulo', muscleGroup: 'Costas', category: 'weight', sets: 3, reps: 10 },
        { name: 'Crucifixo Inverso com Halteres', muscleGroup: 'Ombros', category: 'weight', sets: 3, reps: 12 },
        { name: 'Rosca Direta com Barra W', muscleGroup: 'Bíceps', category: 'weight', sets: 3, reps: 10 },
        { name: 'Rosca Martelo com Halteres', muscleGroup: 'Bíceps', category: 'weight', sets: 3, reps: 12 }
      ],
      wed: [
        { name: 'Agachamento Livre com Barra', muscleGroup: 'Pernas', category: 'weight', sets: 4, reps: 8, pinnedNotes: 'Base na largura dos ombros' },
        { name: 'Leg Press 45', muscleGroup: 'Pernas', category: 'weight', sets: 4, reps: 10 },
        { name: 'Cadeira Extensora', muscleGroup: 'Pernas', category: 'weight', sets: 3, reps: 12 },
        { name: 'Mesa Flexora', muscleGroup: 'Pernas', category: 'weight', sets: 4, reps: 10 },
        { name: 'Elevação Pélvica', muscleGroup: 'Pernas', category: 'weight', sets: 3, reps: 12 },
        { name: 'Gêmeos Sentado', muscleGroup: 'Pernas', category: 'weight', sets: 4, reps: 15 }
      ],
      thu: [
        { name: 'Supino Reto com Halteres', muscleGroup: 'Peito', category: 'weight', sets: 4, reps: 10 },
        { name: 'Crucifixo no Crossover', muscleGroup: 'Peito', category: 'weight', sets: 3, reps: 12, pinnedNotes: 'Polia na altura do peito' },
        { name: 'Desenvolvimento Máquina', muscleGroup: 'Ombros', category: 'weight', sets: 3, reps: 10 },
        { name: 'Elevação Lateral na Polia', muscleGroup: 'Ombros', category: 'weight', sets: 4, reps: 12 },
        { name: 'Tríceps Francês com Halter', muscleGroup: 'Tríceps', category: 'weight', sets: 3, reps: 10 },
        { name: 'Mergulho nas Paralelas', muscleGroup: 'Tríceps', category: 'bodyweight', multiplier: 0.9, sets: 3, reps: 10 }
      ],
      fri: [
        { name: 'Barra Fixa (Pronada)', muscleGroup: 'Costas', category: 'bodyweight', multiplier: 0.95, sets: 4, reps: 8 },
        { name: 'Remada Cavalinho', muscleGroup: 'Costas', category: 'weight', sets: 4, reps: 10 },
        { name: 'Pull Down com Corda', muscleGroup: 'Costas', category: 'weight', sets: 3, reps: 12 },
        { name: 'Encolhimento com Halteres', muscleGroup: 'Costas', category: 'weight', sets: 3, reps: 12 },
        { name: 'Rosca Scott com Barra W', muscleGroup: 'Bíceps', category: 'weight', sets: 3, reps: 10 },
        { name: 'Rosca Concentrada', muscleGroup: 'Bíceps', category: 'weight', sets: 3, reps: 12 }
      ],
      sat: [
        { name: 'Levantamento Terra Romeno (RDL)', muscleGroup: 'Pernas', category: 'weight', sets: 4, reps: 8, pinnedNotes: 'Foco em posteriores e glúteos' },
        { name: 'Agachamento Búlgaro', muscleGroup: 'Pernas', category: 'weight', sets: 3, reps: 10 },
        { name: 'Cadeira Flexora', muscleGroup: 'Pernas', category: 'weight', sets: 3, reps: 12 },
        { name: 'Cadeira Extensora', muscleGroup: 'Pernas', category: 'weight', sets: 3, reps: 12 },
        { name: 'Cadeira Abdutora', muscleGroup: 'Pernas', category: 'weight', sets: 3, reps: 15 },
        { name: 'Panturrilha no Leg Press', muscleGroup: 'Pernas', category: 'weight', sets: 4, reps: 15 }
      ]
    }
  },
  {
    id: 'upper_lower_4days',
    name: 'Upper / Lower (Superior & Inferior 4x)',
    description: 'Excelente para quem treina 4 dias na semana, maximizando recuperação e força progressiva.',
    split: 'Upper / Lower',
    daysCount: 4,
    daysOfWeek: ['mon', 'tue', 'thu', 'fri'],
    exercisesByDay: {
      mon: [
        { name: 'Supino Reto com Barra', muscleGroup: 'Peito', category: 'weight', sets: 4, reps: 6 },
        { name: 'Remada Curvada com Barra', muscleGroup: 'Costas', category: 'weight', sets: 4, reps: 6 },
        { name: 'Desenvolvimento Militar com Barra', muscleGroup: 'Ombros', category: 'weight', sets: 3, reps: 8 },
        { name: 'Puxada Frontal na Polia', muscleGroup: 'Costas', category: 'weight', sets: 3, reps: 10 },
        { name: 'Tríceps Testa', muscleGroup: 'Tríceps', category: 'weight', sets: 3, reps: 10 },
        { name: 'Rosca Direta com Barra W', muscleGroup: 'Bíceps', category: 'weight', sets: 3, reps: 10 }
      ],
      tue: [
        { name: 'Agachamento Livre com Barra', muscleGroup: 'Pernas', category: 'weight', sets: 4, reps: 6 },
        { name: 'Levantamento Terra Romeno (RDL)', muscleGroup: 'Pernas', category: 'weight', sets: 4, reps: 8 },
        { name: 'Leg Press 45', muscleGroup: 'Pernas', category: 'weight', sets: 3, reps: 10 },
        { name: 'Mesa Flexora', muscleGroup: 'Pernas', category: 'weight', sets: 3, reps: 12 },
        { name: 'Gêmeos em Pé', muscleGroup: 'Pernas', category: 'weight', sets: 4, reps: 15 },
        { name: 'Prancha Abdominal', muscleGroup: 'Core', category: 'time', sets: 3, reps: 60 }
      ],
      thu: [
        { name: 'Supino Inclinado com Halteres', muscleGroup: 'Peito', category: 'weight', sets: 4, reps: 10 },
        { name: 'Remada Baixa no Triângulo', muscleGroup: 'Costas', category: 'weight', sets: 4, reps: 10 },
        { name: 'Elevação Lateral', muscleGroup: 'Ombros', category: 'weight', sets: 4, reps: 12 },
        { name: 'Crucifixo Reto com Halteres', muscleGroup: 'Peito', category: 'weight', sets: 3, reps: 12 },
        { name: 'Tríceps Corda na Polia', muscleGroup: 'Tríceps', category: 'weight', sets: 3, reps: 12 },
        { name: 'Rosca Martelo com Halteres', muscleGroup: 'Bíceps', category: 'weight', sets: 3, reps: 12 }
      ],
      fri: [
        { name: 'Agachamento Búlgaro', muscleGroup: 'Pernas', category: 'weight', sets: 4, reps: 10 },
        { name: 'Cadeira Extensora', muscleGroup: 'Pernas', category: 'weight', sets: 3, reps: 12 },
        { name: 'Cadeira Flexora', muscleGroup: 'Pernas', category: 'weight', sets: 4, reps: 10 },
        { name: 'Elevação Pélvica', muscleGroup: 'Pernas', category: 'weight', sets: 3, reps: 12 },
        { name: 'Gêmeos Sentado', muscleGroup: 'Pernas', category: 'weight', sets: 4, reps: 15 },
        { name: 'Abdominal Supra na Polia', muscleGroup: 'Core', category: 'weight', sets: 3, reps: 15 }
      ]
    }
  },
  {
    id: 'fullbody_3days',
    name: 'Full Body (Corpo Inteiro 3x)',
    description: 'Perfeito para rotinas corridas (Seg/Qua/Sex), estimulando todos os grandes grupamentos musculares por sessão.',
    split: 'Full Body',
    daysCount: 3,
    daysOfWeek: ['mon', 'wed', 'fri'],
    exercisesByDay: {
      mon: [
        { name: 'Agachamento Livre com Barra', muscleGroup: 'Pernas', category: 'weight', sets: 3, reps: 8 },
        { name: 'Supino Reto com Barra', muscleGroup: 'Peito', category: 'weight', sets: 3, reps: 8 },
        { name: 'Remada Curvada com Barra', muscleGroup: 'Costas', category: 'weight', sets: 3, reps: 8 },
        { name: 'Desenvolvimento Militar com Halteres', muscleGroup: 'Ombros', category: 'weight', sets: 3, reps: 10 },
        { name: 'Rosca Direta com Barra W', muscleGroup: 'Bíceps', category: 'weight', sets: 2, reps: 12 },
        { name: 'Tríceps Corda na Polia', muscleGroup: 'Tríceps', category: 'weight', sets: 2, reps: 12 }
      ],
      wed: [
        { name: 'Levantamento Terra', muscleGroup: 'Costas', category: 'weight', sets: 3, reps: 6 },
        { name: 'Supino Inclinado com Halteres', muscleGroup: 'Peito', category: 'weight', sets: 3, reps: 10 },
        { name: 'Puxada Frontal na Polia', muscleGroup: 'Costas', category: 'weight', sets: 3, reps: 10 },
        { name: 'Leg Press 45', muscleGroup: 'Pernas', category: 'weight', sets: 3, reps: 10 },
        { name: 'Elevação Lateral', muscleGroup: 'Ombros', category: 'weight', sets: 3, reps: 12 },
        { name: 'Prancha Abdominal', muscleGroup: 'Core', category: 'time', sets: 3, reps: 60 }
      ],
      fri: [
        { name: 'Leg Press 45', muscleGroup: 'Pernas', category: 'weight', sets: 3, reps: 10 },
        { name: 'Mesa Flexora', muscleGroup: 'Pernas', category: 'weight', sets: 3, reps: 12 },
        { name: 'Crucifixo no Crossover', muscleGroup: 'Peito', category: 'weight', sets: 3, reps: 12 },
        { name: 'Remada Baixa no Triângulo', muscleGroup: 'Costas', category: 'weight', sets: 3, reps: 10 },
        { name: 'Rosca Martelo com Halteres', muscleGroup: 'Bíceps', category: 'weight', sets: 2, reps: 12 },
        { name: 'Tríceps Testa', muscleGroup: 'Tríceps', category: 'weight', sets: 2, reps: 12 }
      ]
    }
  }
];
