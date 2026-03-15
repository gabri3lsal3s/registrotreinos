import express from 'express';
import pool from '../db.js';
import jwt from 'jsonwebtoken';

const router = express.Router();

function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  if (!token) return res.sendStatus(401);
  jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
    if (err) return res.sendStatus(403);
    req.user = user;
    next();
  });
}

// Sincronização bidirecional
router.post('/', authenticateToken, async (req, res) => {
  const { protocols, exercises, workouts, workoutSets } = req.body;
  const userId = req.user.id;

  try {
    const conn = await pool.getConnection();
    await conn.beginTransaction();

    try {
      // 1. Salvar Protocolos recebidos
      if (protocols && protocols.length > 0) {
        for (const p of protocols) {
          await conn.query(
            'REPLACE INTO protocols (id, user_id, name, description) VALUES (?, ?, ?, ?)',
            [p.id, userId, p.name, p.description]
          );
        }
      }

      // 2. Salvar Exercícios
      if (exercises && exercises.length > 0) {
        for (const e of exercises) {
          await conn.query(
            'REPLACE INTO exercises (id, protocol_id, name, muscle_group, order_index) VALUES (?, ?, ?, ?, ?)',
            [e.id, e.protocolId, e.name, e.muscleGroup, e.orderIndex]
          );
        }
      }

      // 3. Salvar Treinos (Workouts)
      if (workouts && workouts.length > 0) {
        for (const w of workouts) {
          await conn.query(
            'REPLACE INTO workouts (id, user_id, protocol_id, date, mood, stress_level, notes) VALUES (?, ?, ?, ?, ?, ?, ?)',
            [w.id, userId, w.protocolId, w.date, w.mood, w.stressLevel, w.notes]
          );
        }
      }

      // 4. Salvar Séries (Workout Sets)
      if (workoutSets && workoutSets.length > 0) {
        for (const s of workoutSets) {
          await conn.query(
            'REPLACE INTO workout_sets (id, workout_id, exercise_id, weight, reps, rpe) VALUES (?, ?, ?, ?, ?, ?)',
            [s.id, s.workoutId, s.exerciseId, s.weight, s.reps, s.rpe]
          );
        }
      }

      await conn.commit();
      
      // Retornar dados atualizados do servidor para o cliente
      const [allProtocols] = await conn.query('SELECT * FROM protocols WHERE user_id = ?', [userId]);
      const [allWorkouts] = await conn.query('SELECT * FROM workouts WHERE user_id = ?', [userId]);
      
      const protocolIds = allProtocols.map(p => p.id);
      let allExercises = [];
      if (protocolIds.length > 0) {
        [allExercises] = await conn.query('SELECT * FROM exercises WHERE protocol_id IN (?)', [protocolIds]);
      }

      const workoutIds = allWorkouts.map(w => w.id);
      let allSets = [];
      if (workoutIds.length > 0) {
        [allSets] = await conn.query('SELECT * FROM workout_sets WHERE workout_id IN (?)', [workoutIds]);
      }

      conn.release();
      res.json({ 
        protocols: allProtocols, 
        exercises: allExercises, 
        workouts: allWorkouts, 
        workout_sets: allSets 
      });

    } catch (err) {
      await conn.rollback();
      conn.release();
      throw err;
    }
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro na sincronização' });
  }
});

export default router;
