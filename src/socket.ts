import { Server } from "socket.io";
import type { Server as HttpServer } from "node:http";
import { verifyJwt } from "./middleware/authMiddleware"; // adjust path
import User from "./models/user";                         // adjust path

interface SocketUser {
  id: number;
  role: string;
}

let io: Server | null = null;

export function initSocket(httpServer: HttpServer, allowedOrigins: string[]) {
  io = new Server(httpServer, {
    cors: { origin: allowedOrigins, credentials: true },
  });

  io.use(async (socket, next) => {
    const token = socket.handshake.auth?.token as string | undefined;
    if (!token) return next(new Error("Unauthorized: no token"));

    try {
      const payload = verifyJwt(token);

      // Same check as REST: the user must still exist
      const user = await User.findByPk(payload.id, { attributes: ["id", "role"] });
      if (!user) return next(new Error("Unauthorized: user not found"));

      socket.data.user = { id: user.id, role: user.role } satisfies SocketUser;
      next();
    } catch {
      next(new Error("Unauthorized: invalid or expired token"));
    }
  });

  io.on("connection", (socket) => {
    const { id, role } = socket.data.user as SocketUser;
    socket.join(`user:${id}`);
    socket.join(`role:${role}`);
    console.log(`Socket connected: user ${id} (${socket.id})`);

    socket.on("disconnect", () => {
      console.log(`Socket disconnected: user ${id} (${socket.id})`);
    });
  });

  return io;
}

export function getIO() {
  if (!io) throw new Error("Socket.IO not initialised");
  return io;
}