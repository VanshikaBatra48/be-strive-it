"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.viewingGroupRoom = exports.groupRoom = exports.userRoom = void 0;
exports.initSocket = initSocket;
exports.getIO = getIO;
exports.emitToGroup = emitToGroup;
exports.emitToUser = emitToUser;
exports.addUserToGroupRoom = addUserToGroupRoom;
exports.removeUserFromGroupRoom = removeUserFromGroupRoom;
exports.disconnectUser = disconnectUser;
exports.getUsersViewingGroup = getUsersViewingGroup;
const socket_io_1 = require("socket.io");
const authMiddleware_1 = require("./middleware/authMiddleware");
const user_1 = __importDefault(require("./models/user"));
const chat_1 = require("./models/chat");
// --------------------------------------------------
// SOCKET.IO SERVER
// --------------------------------------------------
let io = null;
// --------------------------------------------------
// ROOM NAMES
// --------------------------------------------------
// Personal room for notifications
const userRoom = (userId) => `user:${userId}`;
exports.userRoom = userRoom;
// Group room for actual chat messages
const groupRoom = (groupId) => `group:${groupId}`;
exports.groupRoom = groupRoom;
// Separate room for users currently viewing a group
const viewingGroupRoom = (groupId) => `viewing-group:${groupId}`;
exports.viewingGroupRoom = viewingGroupRoom;
// --------------------------------------------------
// INITIALIZE SOCKET.IO
// --------------------------------------------------
function initSocket(httpServer, allowedOrigins) {
    io = new socket_io_1.Server(httpServer, {
        cors: {
            origin: allowedOrigins,
            credentials: true,
        },
    });
    // --------------------------------------------------
    // SOCKET AUTHENTICATION
    // --------------------------------------------------
    io.use(async (socket, next) => {
        const token = socket.handshake.auth?.token;
        if (!token) {
            return next(new Error("Unauthorized: no token"));
        }
        try {
            const payload = (0, authMiddleware_1.verifyJwt)(token);
            const user = await user_1.default.findByPk(payload.id, {
                attributes: ["id", "name", "role", "status"],
            });
            if (!user) {
                return next(new Error("Unauthorized: user not found"));
            }
            if (user.status !== "active") {
                return next(new Error("Unauthorized: account deactivated"));
            }
            socket.data.user = {
                id: user.id,
                role: user.role,
                name: user.name,
            };
            next();
        }
        catch (error) {
            if (error?.name === "TokenExpiredError") {
                return next(new Error("TOKEN_EXPIRED"));
            }
            next(new Error("Unauthorized: invalid or expired token"));
        }
    });
    // --------------------------------------------------
    // SOCKET CONNECTION
    // --------------------------------------------------
    io.on("connection", async (socket) => {
        const { id, role, name } = socket.data.user;
        console.log(`Socket connected: user ${id} (${socket.id})`);
        // --------------------------------------------------
        // 1. JOIN PERSONAL AND ROLE ROOMS
        // --------------------------------------------------
        socket.join((0, exports.userRoom)(id));
        socket.join(`role:${role}`);
        // --------------------------------------------------
        // 2. TYPING INDICATOR
        // --------------------------------------------------
        socket.on("typing", (payload) => {
            const groupId = Number(payload?.groupId);
            if (!Number.isInteger(groupId) || groupId <= 0) {
                return;
            }
            // Only active group members can send typing events
            if (!socket.rooms.has((0, exports.groupRoom)(groupId))) {
                return;
            }
            socket.to((0, exports.groupRoom)(groupId)).emit("typing", {
                groupId,
                userId: id,
                name,
            });
        });
        // --------------------------------------------------
        // 3. TRACK CURRENTLY VIEWED GROUP
        // --------------------------------------------------
        socket.on("chat:active", async (payload) => {
            try {
                const groupId = Number(payload?.groupId);
                if (!Number.isInteger(groupId) || groupId <= 0) {
                    return;
                }
                // Verify that the user is an active member or an admin
                const membership = await chat_1.ChatMember.findOne({
                    where: {
                        groupId,
                        userId: id,
                        leftAt: null,
                    },
                });
                if (!membership && role !== "admin") {
                    return;
                }
                const previousGroupId = socket.data.activeGroupId;
                // Leave the previously viewed group
                if (previousGroupId &&
                    previousGroupId !== groupId) {
                    await socket.leave((0, exports.viewingGroupRoom)(previousGroupId));
                    if (role === "admin") {
                        const wasMember = await chat_1.ChatMember.findOne({
                            where: { groupId: previousGroupId, userId: id, leftAt: null },
                        });
                        if (!wasMember) {
                            await socket.leave((0, exports.groupRoom)(previousGroupId));
                        }
                    }
                }
                // Join the currently viewed group
                await socket.join((0, exports.viewingGroupRoom)(groupId));
                if (role === "admin") {
                    await socket.join((0, exports.groupRoom)(groupId));
                }
                socket.data.activeGroupId = groupId;
                console.log(`User ${id} is viewing group ${groupId}`);
            }
            catch (error) {
                console.error("Failed to update active chat group:", error);
            }
        });
        // --------------------------------------------------
        // 4. STOP TRACKING VIEWED GROUP
        // --------------------------------------------------
        socket.on("chat:inactive", async () => {
            try {
                const activeGroupId = socket.data.activeGroupId;
                if (!activeGroupId) {
                    return;
                }
                await socket.leave((0, exports.viewingGroupRoom)(activeGroupId));
                if (role === "admin") {
                    const wasMember = await chat_1.ChatMember.findOne({
                        where: { groupId: activeGroupId, userId: id, leftAt: null },
                    });
                    if (!wasMember) {
                        await socket.leave((0, exports.groupRoom)(activeGroupId));
                    }
                }
                socket.data.activeGroupId = null;
                console.log(`User ${id} stopped viewing group ${activeGroupId}`);
            }
            catch (error) {
                console.error("Failed to leave viewing group:", error);
            }
        });
        // --------------------------------------------------
        // 5. JOIN ALL ACTIVE CHAT GROUPS
        // --------------------------------------------------
        try {
            const memberships = await chat_1.ChatMember.findAll({
                where: {
                    userId: id,
                    leftAt: null,
                },
                attributes: ["groupId"],
            });
            await Promise.all(memberships.map((membership) => socket.join((0, exports.groupRoom)(membership.groupId))));
            console.log(`User ${id} joined ${memberships.length} chat groups`);
        }
        catch (error) {
            console.error(`Failed to join chat rooms for user ${id}:`, error);
        }
        // --------------------------------------------------
        // 6. DISCONNECT
        // --------------------------------------------------
        socket.on("disconnect", () => {
            console.log(`Socket disconnected: user ${id} (${socket.id})`);
            // Socket.IO automatically removes the disconnected
            // socket from all rooms.
        });
    });
    return io;
}
// --------------------------------------------------
// GET SOCKET.IO INSTANCE
// --------------------------------------------------
function getIO() {
    if (!io) {
        throw new Error("Socket.IO not initialised");
    }
    return io;
}
// --------------------------------------------------
// EMIT CHAT MESSAGE TO GROUP
// --------------------------------------------------
function emitToGroup(groupId, event, payload) {
    io?.to((0, exports.groupRoom)(groupId)).emit(event, payload);
}
// --------------------------------------------------
// EMIT NOTIFICATION TO USER
// --------------------------------------------------
function emitToUser(userId, event, payload) {
    io?.to((0, exports.userRoom)(userId)).emit(event, payload);
}
// --------------------------------------------------
// ADD USER TO GROUP ROOM
// --------------------------------------------------
function addUserToGroupRoom(userId, groupId) {
    io
        ?.in((0, exports.userRoom)(userId))
        .socketsJoin((0, exports.groupRoom)(groupId));
}
// --------------------------------------------------
// REMOVE USER FROM GROUP ROOM
// --------------------------------------------------
function removeUserFromGroupRoom(userId, groupId) {
    io
        ?.in((0, exports.userRoom)(userId))
        .socketsLeave((0, exports.groupRoom)(groupId));
}
// --------------------------------------------------
// DISCONNECT ALL USER SOCKETS
// --------------------------------------------------
function disconnectUser(userId) {
    io
        ?.in((0, exports.userRoom)(userId))
        .disconnectSockets(true);
}
// --------------------------------------------------
// GET USERS CURRENTLY VIEWING A GROUP
// --------------------------------------------------
async function getUsersViewingGroup(groupId) {
    if (!io) {
        return new Set();
    }
    const sockets = await io
        .in((0, exports.viewingGroupRoom)(groupId))
        .fetchSockets();
    const viewingUserIds = new Set();
    for (const socket of sockets) {
        const userId = Number(socket.data.user?.id);
        if (Number.isInteger(userId)) {
            viewingUserIds.add(userId);
        }
    }
    return viewingUserIds;
}
//# sourceMappingURL=socket.js.map