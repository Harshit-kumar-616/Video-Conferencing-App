import express from 'express';
import bodyParser from 'body-parser';
import mongoose from 'mongoose';
import cors from 'cors';
import {Server} from 'socket.io';
import http from 'http';
import dotenv from 'dotenv';

import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '../.env') });



import roomHandler from './socket/roomHandler.js';


import authRoutes from './routes/auth.js';
import { generateRtcToken } from './controllers/agora.js';

const app = express();

app.use(express.json());
app.use(bodyParser.json({limit: "30mb", extended: true}));
app.use(cors());

// Routes are registered after DB connects (see bottom of file)


const server = http.createServer(app);

const io = new Server(server, {
    cors: {
        origin: '*',
        methods: ['GET', 'POST', 'PUT', 'DELETE']
    }
});

// Socket handlers are registered after DB connects (see bottom of file)
const PORT = process.env.PORT || 6001;
const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/meet-app';

console.log(`🔌 Connecting to MongoDB...`);

mongoose
    .connect(MONGO_URI)
    .then(() => {
        console.log(`✅ MongoDB connected successfully`);

        // ── Register REST routes AFTER DB is ready ──────────────────
        app.use('/auth', authRoutes);
        app.get('/api/token', generateRtcToken);

        // ── Register Socket.io handlers AFTER DB is ready ───────────
        io.on('connection', (socket) => {
            console.log(`🔗 User connected: ${socket.id}`);
            roomHandler(socket);
            socket.on('disconnect', () => {
                console.log(`❌ User disconnected: ${socket.id}`);
            });
        });

        // ── Start listening AFTER DB is ready ───────────────────────
        server.listen(PORT, () => {
            console.log(`🚀 Server running on port ${PORT}`);
        });
    })
    .catch((err) => {
        console.error('❌ MongoDB connection failed:', err.message);
        process.exit(1); // Exit so the process manager can restart
    });

