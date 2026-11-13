// import { Server } from "socket.io";
// import type { Server as HttpServer } from "node:http";
// import { verifyJwt } from "./middleware/authMiddleware"; // adjust path
// import User from "./models/user";                         // adjust path

// interface SocketUser {
//   id: number;
//   role: string;
// }

// let io: Server | null = null;

// export function initSocket(httpServer: HttpServer, allowedOrigins: string[]) {
//   io = new Server(httpServer, {
//     cors: { origin: allowedOrigins, credentials: true },
//   });

//   io.use(async (socket, next) => {
//     const token = socket.handshake.auth?.token as string | undefined;
//     if (!token) return next(new Error("Unauthorized: no token"));

//     try {
//       const payload = verifyJwt(token);

//       // Same check as REST: the user must still exist
//       const user = await User.findByPk(payload.id, { attributes: ["id", "role", "status"] });
//       if (!user) return next(new Error("Unauthorized: user not found"));
//       if (user.status !== 'active') return next(new Error("Unauthorized: account deactivated"));

//       socket.data.user = { id: user.id, role: user.role } satisfies SocketUser;
//       next();
//     } catch {
//       next(new Error("Unauthorized: invalid or expired token"));
//     }
//   });

//   io.on("connection", (socket) => {
//     const { id, role } = socket.data.user as SocketUser;
//     socket.join(`user:${id}`);
//     socket.join(`role:${role}`);
//     console.log(`Socket connected: user ${id} (${socket.id})`);

//     socket.on("disconnect", () => {
//       console.log(`Socket disconnected: user ${id} (${socket.id})`);
//     });
//   });

//   return io;
// }

// export function getIO() {
//   if (!io) throw new Error("Socket.IO not initialised");
//   return io;
// }


import { Server } from "socket.io";
import type { Server as HttpServer } from "node:http";
import { verifyJwt } from "./middleware/authMiddleware"; // adjust path
import User from "./models/user";                         // adjust path
import { ChatMember } from "./models/chat";         // adjust path

interface SocketUser {
  id: number;
  role: string;
  name: string;
}

let io: Server | null = null;

// Room names. `user:<id>` is the same room your notifications already use.
export const userRoom = (userId: number) => `user:${userId}`;
export const groupRoom = (groupId: number) => `group:${groupId}`;

export function initSocket(httpServer: HttpServer, allowedOrigins: string[]) {
  io = new Server(httpServer, {
    cors: { origin: allowedOrigins, credentials: true },
  });

  // ---------- Auth (shared by notifications AND chat) ----------
  io.use(async (socket, next) => {
    const token = socket.handshake.auth?.token as string | undefined;
    if (!token) return next(new Error("Unauthorized: no token"));

    try {
      const payload = verifyJwt(token);

      // Same check as REST: the user must still exist
      const user = await User.findByPk(payload.id, {
        attributes: ["id", "name", "role", "status"],
      });
      if (!user) return next(new Error("Unauthorized: user not found"));
      if (user.status !== "active") return next(new Error("Unauthorized: account deactivated"));

      socket.data.user = { id: user.id, role: user.role, name: user.name } satisfies SocketUser;
      next();
    } catch (err) {
      // The chat client looks for exactly "TOKEN_EXPIRED" to refresh the token and reconnect.
      // (Works if verifyJwt lets jsonwebtoken's TokenExpiredError through.)
      if ((err as { name?: string })?.name === "TokenExpiredError") {
        return next(new Error("TOKEN_EXPIRED"));
      }
      next(new Error("Unauthorized: invalid or expired token"));
    }
  });

  io.on("connection", async (socket) => {
    const { id, role } = socket.data.user as SocketUser;

    // ---- Notifications (unchanged) ----
    socket.join(userRoom(id));
    socket.join(`role:${role}`);
    console.log(`Socket connected: user ${id} (${socket.id})`);

    // ---- Chat: typing indicator (ephemeral, never stored) ----
    // Registered BEFORE the async work below so no events are missed.
    socket.on("typing", (payload: { groupId?: number }) => {
      const groupId = Number(payload?.groupId);
      if (!Number.isInteger(groupId)) return;
      // socket.rooms only contains rooms the SERVER put us in => membership is guaranteed
      if (!socket.rooms.has(groupRoom(groupId))) return;
      socket.to(groupRoom(groupId)).emit("typing", {
        groupId,
        userId: id,
        name: (socket.data.user as SocketUser).name,
      });
    });

    socket.on("disconnect", () => {
      console.log(`Socket disconnected: user ${id} (${socket.id})`);
    });

    // ---- Chat: join ONLY groups this user is currently an active member of ----
    // Clients can never join a group room themselves.
    try {
      const memberships = await ChatMember.findAll({
        where: { userId: id, leftAt: null },
        attributes: ["groupId"],
      });
      await Promise.all(memberships.map((m) => socket.join(groupRoom(m.groupId))));
    } catch (err) {
      console.error(`Failed to join chat rooms for user ${id}:`, err);
    }
  });

  return io;
}

export function getIO() {
  if (!io) throw new Error("Socket.IO not initialised");
  return io;
}

// ---------- Chat helpers (used by chatService) ----------
// These are no-ops if the socket server isn't running (e.g. scripts/tests).

export function emitToGroup(groupId: number, event: string, payload: unknown): void {
  io?.to(groupRoom(groupId)).emit(event, payload);
}

export function emitToUser(userId: number, event: string, payload: unknown): void {
  io?.to(userRoom(userId)).emit(event, payload);
}

/** Put all of a user's live sockets into a group room (after they are added). */
export function addUserToGroupRoom(userId: number, groupId: number): void {
  io?.in(userRoom(userId)).socketsJoin(groupRoom(groupId));
}

/** Kick all of a user's live sockets out of a group room (after removal). */
export function removeUserFromGroupRoom(userId: number, groupId: number): void {
  io?.in(userRoom(userId)).socketsLeave(groupRoom(groupId));
}

/** Force-close all sockets of a user (deactivated / deleted account). */
export function disconnectUser(userId: number): void {
  io?.in(userRoom(userId)).disconnectSockets(true);
}