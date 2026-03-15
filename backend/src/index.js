
import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import userRoutes from './routes/user.js';
import protocolRoutes from './routes/protocol.js';
import exerciseRoutes from './routes/exercise.js';
import workoutRoutes from './routes/workout.js';
import syncRoutes from './routes/sync.js';

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

app.use('/api/users', userRoutes);
app.use('/api/protocols', protocolRoutes);
app.use('/api/exercises', exerciseRoutes);
app.use('/api/workouts', workoutRoutes);
app.use('/api/sync', syncRoutes);

app.get('/', (req, res) => {
  res.send('API Registro de Treinos rodando!');
});

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
  console.log(`Servidor backend rodando na porta ${PORT}`);
});
