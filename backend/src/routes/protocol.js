import express from 'express';
import pool from '../db.js';
import jwt from 'jsonwebtoken';

const router = express.Router();

// Middleware de autenticação JWT
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

// Listar protocolos do usuário
router.get('/', authenticateToken, async (req, res) => {
  try {
    const conn = await pool.getConnection();
    const [rows] = await conn.query('SELECT * FROM protocols WHERE user_id = ?', [req.user.id]);
    conn.release();
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: 'Erro ao buscar protocolos' });
  }
});

// Criar novo protocolo
router.post('/', authenticateToken, async (req, res) => {
  const { name, description } = req.body;
  try {
    const conn = await pool.getConnection();
    await conn.query('INSERT INTO protocols (user_id, name, description) VALUES (?, ?, ?)', [req.user.id, name, description]);
    conn.release();
    res.status(201).json({ message: 'Protocolo criado' });
  } catch (err) {
    res.status(500).json({ error: 'Erro ao criar protocolo' });
  }
});

export default router;
