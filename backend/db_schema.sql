-- Script SQL para MariaDB: Estrutura inicial do app Registro de Treinos

CREATE TABLE IF NOT EXISTS users (
  id VARCHAR(36) PRIMARY KEY,
  email VARCHAR(255) NOT NULL UNIQUE,
  password VARCHAR(255) NOT NULL,
  credential_id VARCHAR(255),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS protocols (
  id VARCHAR(36) PRIMARY KEY,
  user_id VARCHAR(36) NOT NULL,
  name VARCHAR(100) NOT NULL,
  description TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS exercises (
  id VARCHAR(36) PRIMARY KEY,
  protocol_id VARCHAR(36) NOT NULL,
  name VARCHAR(100) NOT NULL,
  muscle_group VARCHAR(100),
  order_index INT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (protocol_id) REFERENCES protocols(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS workouts (
  id VARCHAR(36) PRIMARY KEY,
  user_id VARCHAR(36) NOT NULL,
  protocol_id VARCHAR(36),
  date DATE NOT NULL,
  mood INT,
  sleep_quality INT,
  stress_level INT,
  notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (protocol_id) REFERENCES protocols(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS workout_sets (
  id VARCHAR(36) PRIMARY KEY,
  workout_id VARCHAR(36) NOT NULL,
  exercise_id VARCHAR(36) NOT NULL,
  weight DECIMAL(6,2),
  reps INT,
  sets INT,
  rpe DECIMAL(3,1),
  set_index INT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (workout_id) REFERENCES workouts(id) ON DELETE CASCADE,
  FOREIGN KEY (exercise_id) REFERENCES exercises(id) ON DELETE CASCADE
);
