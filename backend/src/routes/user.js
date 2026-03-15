import { v4 as uuidv4 } from 'uuid';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import pool from '../db.js';

const router = express.Router();

// Cadastro de usuário
router.post('/register', async (req, res) => {
  const { email, password, id: customId } = req.body;
  if (!email || !password) return res.status(400).json({ error: 'Dados obrigatórios' });
  try {
    const conn = await pool.getConnection();
    const [rows] = await conn.query('SELECT id FROM users WHERE email = ?', [email]);
    if (rows.length > 0) {
      conn.release();
      return res.status(409).json({ error: 'Usuário já existe' });
    }
    const hash = await bcrypt.hash(password, 10);
    const userId = customId || uuidv4();
    await conn.query('INSERT INTO users (id, email, password) VALUES (?, ?, ?)', [userId, email, hash]);
    conn.release();
    res.status(201).json({ message: 'Usuário cadastrado', id: userId });
  } catch (err) {
    res.status(500).json({ error: 'Erro no servidor' });
  }
});

// Login
router.post('/login', async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) return res.status(400).json({ error: 'Dados obrigatórios' });
  try {
    const conn = await pool.getConnection();
    const [rows] = await conn.query('SELECT id, password FROM users WHERE email = ?', [email]);
    conn.release();
    if (rows.length === 0) return res.status(404).json({ error: 'Usuário não encontrado' });
    const valid = await bcrypt.compare(password, rows[0].password);
    if (!valid) return res.status(401).json({ error: 'Senha incorreta' });
    const token = jwt.sign({ id: rows[0].id, email }, process.env.JWT_SECRET, { expiresIn: '7d' });
    res.json({ token });
  } catch (err) {
    res.status(500).json({ error: 'Erro no servidor' });
  }
});

export default router;
