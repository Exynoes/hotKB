import express from 'express';
import cors from 'cors';
import { createServer } from 'http';
import { Server } from 'socket.io';
import { env } from './env.js';
import { pool } from './db.js';
import healthRouter from './routes/health.js';

const app = express();
app.use(cors({ origin: env.corsOrigin }));
app.use(express.json());

app.use('/api/health', healthRouter);

const httpServer = createServer(app);

// Socket.IO : choix documenté dans architecture.html, ADR-001.
export const io = new Server(httpServer, {
  cors: { origin: env.corsOrigin },
});

io.on('connection', (socket) => {
  console.log(`[socket] connecté : ${socket.id}`);

  socket.on('disconnect', (reason) => {
    console.log(`[socket] déconnecté : ${socket.id} (${reason})`);
  });
});

httpServer.listen(env.port, () => {
  console.log(`[server] HotKB API + WebSocket à l'écoute sur le port ${env.port}`);
});

process.on('SIGTERM', async () => {
  await pool.end();
  process.exit(0);
});
