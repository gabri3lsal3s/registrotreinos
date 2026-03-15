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

// Listar treinos do usuário
router.get('/', authenticateToken, async (req, res) => {
  try {
    const conn = await pool.getConnection();
    const [rows] = await conn.query('SELECT * FROM workouts WHERE user_id = ?', [req.user.id]);
    conn.release();
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: 'Erro ao buscar treinos' });
  }
});

// Criar treino
router.post('/', authenticateToken, async (req, res) => {
  const { protocol_id, date, mood, sleep_quality, stress_level, notes } = req.body;
  try {
    const conn = await pool.getConnection();
    await conn.query('INSERT INTO workouts (user_id, protocol_id, date, mood, sleep_quality, stress_level, notes) VALUES (?, ?, ?, ?, ?, ?, ?)', [req.user.id, protocol_id, date, mood, sleep_quality, stress_level, notes]);
    conn.release();
    res.status(201).json({ message: 'Treino registrado' });
  } catch (err) {
    res.status(500).json({ error: 'Erro ao registrar treino' });
  }
});

export default router;
