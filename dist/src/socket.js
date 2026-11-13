"use strict";
// import { Server } from "socket.io";
// import type { Server as HttpServer } from "node:http";
// import { verifyJwt } from "./middleware/authMiddleware"; // adjust path
// import User from "./models/user";                         // adjust path
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.groupRoom = exports.userRoom = void 0;
exports.initSocket = initSocket;
exports.getIO = getIO;
exports.emitToGroup = emitToGroup;
exports.emitToUser = emitToUser;
exports.addUserToGroupRoom = addUserToGroupRoom;
exports.removeUserFromGroupRoom = removeUserFromGroupRoom;
exports.disconnectUser = disconnectUser;
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
const socket_io_1 = require("socket.io");
const authMiddleware_1 = require("./middleware/authMiddleware"); // adjust path
const user_1 = __importDefault(require("./models/user")); // adjust path
const chat_1 = require("./models/chat"); // adjust path
let io = null;
// Room names. `user:<id>` is the same room your notifications already use.
const userRoom = (userId) => `user:${userId}`;
exports.userRoom = userRoom;
const groupRoom = (groupId) => `group:${groupId}`;
exports.groupRoom = groupRoom;
function initSocket(httpServer, allowedOrigins) {
    io = new socket_io_1.Server(httpServer, {
        cors: { origin: allowedOrigins, credentials: true },
    });
    // ---------- Auth (shared by notifications AND chat) ----------
    io.use(async (socket, next) => {
        const token = socket.handshake.auth?.token;
        if (!token)
            return next(new Error("Unauthorized: no token"));
        try {
            const payload = (0, authMiddleware_1.verifyJwt)(token);
            // Same check as REST: the user must still exist
            const user = await user_1.default.findByPk(payload.id, {
                attributes: ["id", "name", "role", "status"],
            });
            if (!user)
                return next(new Error("Unauthorized: user not found"));
            if (user.status !== "active")
                return next(new Error("Unauthorized: account deactivated"));
            socket.data.user = { id: user.id, role: user.role, name: user.name };
            next();
        }
        catch (err) {
            // The chat client looks for exactly "TOKEN_EXPIRED" to refresh the token and reconnect.
            // (Works if verifyJwt lets jsonwebtoken's TokenExpiredError through.)
            if (err?.name === "TokenExpiredError") {
                return next(new Error("TOKEN_EXPIRED"));
            }
            next(new Error("Unauthorized: invalid or expired token"));
        }
    });
    io.on("connection", async (socket) => {
        const { id, role } = socket.data.user;
        // ---- Notifications (unchanged) ----
        socket.join((0, exports.userRoom)(id));
        socket.join(`role:${role}`);
        console.log(`Socket connected: user ${id} (${socket.id})`);
        // ---- Chat: typing indicator (ephemeral, never stored) ----
        // Registered BEFORE the async work below so no events are missed.
        socket.on("typing", (payload) => {
            const groupId = Number(payload?.groupId);
            if (!Number.isInteger(groupId))
                return;
            // socket.rooms only contains rooms the SERVER put us in => membership is guaranteed
            if (!socket.rooms.has((0, exports.groupRoom)(groupId)))
                return;
            socket.to((0, exports.groupRoom)(groupId)).emit("typing", {
                groupId,
                userId: id,
                name: socket.data.user.name,
            });
        });
        socket.on("disconnect", () => {
            console.log(`Socket disconnected: user ${id} (${socket.id})`);
        });
        // ---- Chat: join ONLY groups this user is currently an active member of ----
        // Clients can never join a group room themselves.
        try {
            const memberships = await chat_1.ChatMember.findAll({
                where: { userId: id, leftAt: null },
                attributes: ["groupId"],
            });
            await Promise.all(memberships.map((m) => socket.join((0, exports.groupRoom)(m.groupId))));
        }
        catch (err) {
            console.error(`Failed to join chat rooms for user ${id}:`, err);
        }
    });
    return io;
}
function getIO() {
    if (!io)
        throw new Error("Socket.IO not initialised");
    return io;
}
// ---------- Chat helpers (used by chatService) ----------
// These are no-ops if the socket server isn't running (e.g. scripts/tests).
function emitToGroup(groupId, event, payload) {
    io?.to((0, exports.groupRoom)(groupId)).emit(event, payload);
}
function emitToUser(userId, event, payload) {
    io?.to((0, exports.userRoom)(userId)).emit(event, payload);
}
/** Put all of a user's live sockets into a group room (after they are added). */
function addUserToGroupRoom(userId, groupId) {
    io?.in((0, exports.userRoom)(userId)).socketsJoin((0, exports.groupRoom)(groupId));
}
/** Kick all of a user's live sockets out of a group room (after removal). */
function removeUserFromGroupRoom(userId, groupId) {
    io?.in((0, exports.userRoom)(userId)).socketsLeave((0, exports.groupRoom)(groupId));
}
/** Force-close all sockets of a user (deactivated / deleted account). */
function disconnectUser(userId) {
    io?.in((0, exports.userRoom)(userId)).disconnectSockets(true);
}
//# sourceMappingURL=socket.js.map