import 'dotenv/config';
import express from 'express';
import { createServer } from 'http';
import cors from 'cors';
import session from 'express-session';
import connectDB from './config/database.js';
import passport from './config/passport.js';
import initializeSocket from './socket/index.js';
import authRoutes from './routes/auth.js';
import studioRoutes from './routes/studios.js';
import recordingRoutes from './routes/recordings.js';
import uploadRoutes from './routes/upload.js';

const app = express();
const server = createServer(app);

connectDB();

app.use(cors({
  origin: process.env.CLIENT_URL || 'http://localhost:3000',
  credentials: true
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use(session({
  secret: process.env.JWT_SECRET || 'your-session-secret',
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: process.env.NODE_ENV === 'production',
    maxAge: 24 * 60 * 60 * 1000
  }
}));

app.use(passport.initialize());
app.use(passport.session());

initializeSocket(server);

app.use('/api/auth', authRoutes);
app.use('/api/studios', studioRoutes);
app.use('/api/recordings', recordingRoutes);
app.use('/api/upload', uploadRoutes);

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'Streamly server is running' });
});

app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ message: 'Something went wrong!' });
});

const PORT = process.env.PORT || 5000;

server.listen(PORT, () => {
  console.log(`🚀 Streamly server running on port ${PORT}`);
  console.log(`📡 Environment: ${process.env.NODE_ENV || 'development'}`);
});
