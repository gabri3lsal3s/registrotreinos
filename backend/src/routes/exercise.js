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

// Listar exercícios de um protocolo
router.get('/:protocolId', authenticateToken, async (req, res) => {
  try {
    const conn = await pool.getConnection();
    const [rows] = await conn.query('SELECT * FROM exercises WHERE protocol_id = ?', [req.params.protocolId]);
    conn.release();
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: 'Erro ao buscar exercícios' });
  }
});

// Criar exercício
router.post('/', authenticateToken, async (req, res) => {
  const { protocol_id, name, muscle_group, order_index } = req.body;
  try {
    const conn = await pool.getConnection();
    await conn.query('INSERT INTO exercises (protocol_id, name, muscle_group, order_index) VALUES (?, ?, ?, ?)', [protocol_id, name, muscle_group, order_index]);
    conn.release();
    res.status(201).json({ message: 'Exercício criado' });
  } catch (err) {
    res.status(500).json({ error: 'Erro ao criar exercício' });
  }
});

export default router;
