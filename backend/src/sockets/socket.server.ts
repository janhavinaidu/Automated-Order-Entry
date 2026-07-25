import { Server as HttpServer } from 'http';
import { Server as SocketServer } from 'socket.io';
import jwt from 'jsonwebtoken';
import { env } from '../config/env';
import { logger } from '../config/logger';
import { SOCKET_EVENTS } from '../shared/constants';

// ─── Singleton Socket.IO Server ───────────────────────────────────────────────
let io: SocketServer;

export const initSocketServer = (httpServer: HttpServer): SocketServer => {
  io = new SocketServer(httpServer, {
    cors: {
      origin: env.FRONTEND_URL,
      credentials: true,
    },
    transports: ['websocket', 'polling'],
    pingTimeout: 60000,
    pingInterval: 25000,
  });

  // ─── Auth Middleware ───────────────────────────────────────────────────────
  io.use((socket, next) => {
    const token = socket.handshake.auth?.token as string | undefined;

    if (!token) {
      // Allow anonymous connections (dashboard viewers)
      return next();
    }

    try {
      const payload = jwt.verify(token, env.JWT_ACCESS_SECRET) as {
        sub: string;
        role: string;
        name: string;
      };
      socket.data.userId = payload.sub;
      socket.data.role = payload.role;
      socket.data.name = payload.name;
      next();
    } catch {
      return next(new Error('Invalid authentication token'));
    }
  });

  // ─── Connection Handler ────────────────────────────────────────────────────
  io.on('connection', (socket) => {
    const userId = socket.data.userId ?? 'anonymous';
    logger.debug(`Socket connected: ${socket.id} (user: ${userId})`);

    // Auto-join user-specific room for personal notifications
    if (socket.data.userId) {
      socket.join(`user:${socket.data.userId}`);
    }

    // Join dashboard room for all authenticated users
    socket.join('dashboard');

    // ─── Room Management ─────────────────────────────────────────────────────
    socket.on(SOCKET_EVENTS.JOIN_ROOM, (room: string) => {
      socket.join(room);
      logger.debug(`Socket ${socket.id} joined room: ${room}`);
    });

    socket.on(SOCKET_EVENTS.LEAVE_ROOM, (room: string) => {
      socket.leave(room);
    });

    socket.on('disconnect', (reason) => {
      logger.debug(`Socket disconnected: ${socket.id} — reason: ${reason}`);
    });
  });

  logger.info('✅ Socket.IO server initialized');
  return io;
};

// ─── Emitter Functions ────────────────────────────────────────────────────────
// Used by services to push real-time events to connected clients

export const getIO = (): SocketServer => {
  if (!io) throw new Error('Socket.IO not initialized. Call initSocketServer first.');
  return io;
};

export const emitToAll = (event: string, data: unknown): void => {
  getIO().emit(event, data);
};

export const emitToRoom = (room: string, event: string, data: unknown): void => {
  getIO().to(room).emit(event, data);
};

export const emitToUser = (userId: string, event: string, data: unknown): void => {
  getIO().to(`user:${userId}`).emit(event, data);
};

export const emitToDashboard = (event: string, data: unknown): void => {
  getIO().to('dashboard').emit(event, data);
};

export const emitOrderUpdate = (orderId: string, data: unknown): void => {
  getIO().to(`order:${orderId}`).to('dashboard').emit(SOCKET_EVENTS.ORDER_STATUS_CHANGED, data);
};

export const emitExtractionComplete = (emailId: string, data: unknown): void => {
  getIO().to('dashboard').emit(SOCKET_EVENTS.EXTRACTION_COMPLETE, { emailId, ...data as object });
};

export const emitExtractionFailed = (emailId: string, error: string): void => {
  getIO().to('dashboard').emit(SOCKET_EVENTS.EXTRACTION_FAILED, { emailId, error });
};

export const emitLowStockAlert = (data: unknown): void => {
  getIO().to('dashboard').emit(SOCKET_EVENTS.INVENTORY_LOW_STOCK, data);
};

export const emitNewNotification = (userId: string | null, data: unknown): void => {
  if (userId) {
    emitToUser(userId, SOCKET_EVENTS.NOTIFICATION_NEW, data);
  } else {
    emitToAll(SOCKET_EVENTS.NOTIFICATION_NEW, data);
  }
};

export { io };
