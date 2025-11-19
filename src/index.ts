import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import authRoutes from './routes/auth.routes';
import userRoutes from './routes/user.routes';
import playerRoutes from './routes/player.routes';
import conversationRoutes from './routes/conversation.routes';
import chatRoutes from './routes/chat.routes';
import leadRoutes from './routes/lead.routes';
import os from 'os';

dotenv.config();

const app = express();
const PORT = parseInt(process.env.PORT || '3000', 10);

app.use(cors({
  origin: process.env.CORS_ORIGIN || '*',
  credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/players', playerRoutes); // Rutas para gestión de jugadores desde el videojuego
app.use('/api/conversations', conversationRoutes); // Rutas para conversaciones (requieren autenticación)
app.use('/api/chat', chatRoutes); // Rutas para el chatbot RAG (proxy a Python)
app.use('/api/leads', leadRoutes); // Rutas para gestión de leads (contacto)

app.get('/health', (req, res) => {
  res.json({ status: 'ok', message: 'Vampyr Assistant Backend is running' });
});

app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error(err.stack);
  res.status(err.status || 500).json({
    error: err.message || 'Internal Server Error'
  });
});

// Bind to 0.0.0.0 so the server is reachable from other devices on the network
app.listen(PORT, '0.0.0.0', () => {
  console.log(`Vampyr Assistant Backend running on port ${PORT}`);

  // Print local network addresses to help testing from a physical device
  const nets = os.networkInterfaces();
  const addresses: string[] = [];
  for (const name of Object.keys(nets)) {
    for (const net of nets[name] || []) {
      // Skip internal (loopback) and non-IPv4 addresses
      if (net.family === 'IPv4' && !net.internal) {
        addresses.push(net.address!);
      }
    }
  }

  if (addresses.length > 0) {
    console.log('Accessible on your local network at:');
    for (const addr of addresses) {
      console.log(`  http://${addr}:${PORT}`);
    }
  } else {
    console.log('No non-internal IPv4 addresses found. You can still test using http://localhost:' + PORT);
  }
});
