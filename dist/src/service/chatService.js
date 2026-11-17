"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ChatError = exports.UPLOAD_DIR = exports.MAX_BODY_LENGTH = exports.MIN_GROUP_MEMBERS = void 0;
exports.serializeMessage = serializeMessage;
exports.cleanupUploadedFiles = cleanupUploadedFiles;
exports.createGroup = createGroup;
exports.listGroups = listGroups;
exports.listAllGroups = listAllGroups;
exports.getGroupDetail = getGroupDetail;
exports.addMembers = addMembers;
exports.removeMember = removeMember;
exports.archiveGroup = archiveGroup;
exports.getMessages = getMessages;
exports.assertCanPost = assertCanPost;
exports.sendMessage = sendMessage;
exports.deleteMessage = deleteMessage;
exports.markRead = markRead;
exports.getAttachmentFile = getAttachmentFile;
exports.addUsersToTaskGroups = addUsersToTaskGroups;
exports.removeUserFromTaskGroups = removeUserFromTaskGroups;
exports.archiveTaskGroups = archiveTaskGroups;
exports.handleUserDeleted = handleUserDeleted;
exports.handleUserDeactivated = handleUserDeactivated;
const promises_1 = __importDefault(require("fs/promises"));
const path_1 = __importDefault(require("path"));
const sequelize_1 = require("sequelize");
const database_1 = require("../config/database");
const user_1 = __importDefault(require("../models/user"));
const chat_1 = require("../models/chat");
const socket_1 = require("../socket");
const notificationService_1 = require("../service/notificationService");
// ---------- Config ----------
exports.MIN_GROUP_MEMBERS = 2; // creator + at least 1 other 
exports.MAX_BODY_LENGTH = 2000;
exports.UPLOAD_DIR = path_1.default.join(process.cwd(), 'uploads', 'chat'); // NOT served statically
// ---------- Types ----------
class ChatError extends Error {
    constructor(message, statusCode = 400) {
        super(message);
        this.name = 'ChatError';
        this.statusCode = statusCode;
    }
}
exports.ChatError = ChatError;
const canManageRole = (role) => role === 'admin' || role === 'mentor';
// ---------- Internal helpers ----------
async function getGroupOrThrow(groupId) {
    const group = await chat_1.ChatGroup.findByPk(groupId);
    if (!group)
        throw new ChatError('Group not found', 404);
    return group;
}
async function getActiveMembership(groupId, userId) {
    return chat_1.ChatMember.findOne({ where: { groupId, userId, leftAt: null } });
}
/**
 * THE privacy gate. Every read of conversation data goes through this.
 * Returns 404 (not 403) so outsiders can't discover which groups exist.
 */
async function requireMember(groupId, userId) {
    const group = await chat_1.ChatGroup.findByPk(groupId);
    const member = group ? await getActiveMembership(groupId, userId) : null;
    if (!group || !member)
        throw new ChatError('Group not found', 404);
    return { group, member };
}
/** Admin: any group. Mentor: only groups they own. */
async function requireManager(actor, groupId) {
    if (!canManageRole(actor.role)) {
        throw new ChatError('Only mentors and admins can manage groups', 403);
    }
    const group = await getGroupOrThrow(groupId);
    if (actor.role === 'admin')
        return { group };
    const member = await getActiveMembership(groupId, actor.id);
    if (!member)
        throw new ChatError('Group not found', 404);
    if (member.role !== 'owner')
        throw new ChatError('Only the group owner can do this', 403);
    return { group };
}
async function assertCanAdd(actor, userIds) {
    const users = await user_1.default.findAll({
        where: { id: { [sequelize_1.Op.in]: userIds } },
        attributes: ['id', 'status'],
    });
    if (users.length !== userIds.length)
        throw new ChatError('One or more users do not exist');
    if (users.some((u) => u.status !== 'active')) {
        throw new ChatError('Deactivated users cannot be added');
    }
    if (actor.role === 'mentor') {
        const allowed = new Set(actor.assignedMentees ?? []);
        if (userIds.some((id) => !allowed.has(id))) {
            throw new ChatError('Mentors can only add their own assigned mentees', 403);
        }
    }
}
async function userNames(ids) {
    if (!ids.length)
        return new Map();
    const users = await user_1.default.findAll({ where: { id: { [sequelize_1.Op.in]: ids } }, attributes: ['id', 'name'] });
    return new Map(users.map((u) => [u.id, u.name]));
}
async function loadAttachments(messageIds) {
    const map = new Map();
    if (!messageIds.length)
        return map;
    const rows = await chat_1.ChatAttachment.findAll({ where: { messageId: { [sequelize_1.Op.in]: messageIds } } });
    for (const a of rows) {
        const list = map.get(a.messageId) ?? [];
        list.push(a);
        map.set(a.messageId, list);
    }
    return map;
}
/** Shape sent to clients. Deleted messages never leak body/attachments. */
function serializeMessage(m, attachments = []) {
    const deleted = !!m.deletedAt;
    return {
        id: m.id,
        groupId: m.groupId,
        senderId: m.senderId,
        senderName: m.senderName,
        type: m.type,
        body: deleted ? null : m.body,
        deleted,
        createdAt: m.createdAt,
        attachments: deleted
            ? []
            : attachments
                .filter((a) => !a.deletedAt)
                .map((a) => ({
                id: a.id,
                originalName: a.originalName ?? 'file',
                mimeType: a.mimeType,
                size: a.size,
                url: `/chat/attachments/${a.id}`, // relative to your API base URL
            })),
    };
}
/** Post a system message ("X was added") and broadcast it. */
async function announce(groupId, body) {
    const m = await chat_1.ChatMessage.create({
        groupId,
        senderId: null,
        senderName: 'System',
        type: 'system',
        body,
    });
    (0, socket_1.emitToGroup)(groupId, 'message:new', serializeMessage(m));
}
async function removeFile(storedName) {
    await promises_1.default.unlink(path_1.default.join(exports.UPLOAD_DIR, path_1.default.basename(storedName))).catch(() => undefined);
}
async function cleanupUploadedFiles(files = []) {
    await Promise.all(files.map((f) => removeFile(f.filename)));
}
/** Add or re-activate a membership. Returns true if the user was newly added. */
async function upsertMember(groupId, userId) {
    const existing = await chat_1.ChatMember.findOne({ where: { groupId, userId } });
    if (existing && !existing.leftAt)
        return false;
    if (existing) {
        await existing.update({ leftAt: null, leftReason: null, joinedAt: new Date() });
    }
    else {
        await chat_1.ChatMember.create({ groupId, userId, role: 'member', joinedAt: new Date() });
    }
    (0, socket_1.addUserToGroupRoom)(userId, groupId);
    (0, socket_1.emitToUser)(userId, 'group:changed', { groupId });
    return true;
}
/** End a membership: history stays, access stops immediately (REST + live socket). */
async function endMembership(member, reason) {
    await member.update({ leftAt: new Date(), leftReason: reason });
    (0, socket_1.removeUserFromGroupRoom)(member.userId, member.groupId);
    (0, socket_1.emitToUser)(member.userId, 'group:changed', { groupId: member.groupId });
    (0, socket_1.emitToGroup)(member.groupId, 'group:changed', { groupId: member.groupId });
}
// ==========================================================
// Groups
// ==========================================================
async function createGroup(actor, input) {
    if (!canManageRole(actor.role)) {
        throw new ChatError('Only mentors and admins can create groups', 403);
    }
    const memberIds = [...new Set(input.memberIds)].filter((id) => id !== actor.id);
    if (memberIds.length + 1 < exports.MIN_GROUP_MEMBERS) {
        throw new ChatError(`A group needs at least ${exports.MIN_GROUP_MEMBERS} members including you.`);
    }
    await assertCanAdd(actor, memberIds);
    const group = await database_1.sequelize.transaction(async (t) => {
        const g = await chat_1.ChatGroup.create({
            name: input.name.trim(),
            description: input.description?.trim() || null,
            taskId: input.taskId ?? null,
            createdBy: actor.id,
        }, { transaction: t });
        const now = new Date();
        await chat_1.ChatMember.bulkCreate([
            { groupId: g.id, userId: actor.id, role: 'owner', joinedAt: now },
            ...memberIds.map((userId) => ({ groupId: g.id, userId, role: 'member', joinedAt: now })),
        ], { transaction: t });
        return g;
    });
    for (const id of [actor.id, ...memberIds]) {
        (0, socket_1.addUserToGroupRoom)(id, group.id);
        (0, socket_1.emitToUser)(id, 'group:changed', { groupId: group.id });
    }
    await announce(group.id, `${actor.name} created the group`);
    return getGroupDetail(actor, group.id);
}
/** Groups the actor is an active member of, with last message + unread count. */
async function listGroups(actor) {
    const memberships = await chat_1.ChatMember.findAll({ where: { userId: actor.id, leftAt: null } });
    if (!memberships.length)
        return [];
    const byGroup = new Map(memberships.map((m) => [m.groupId, m]));
    const groups = await chat_1.ChatGroup.findAll({ where: { id: { [sequelize_1.Op.in]: [...byGroup.keys()] } } });
    const items = await Promise.all(groups.map(async (g) => {
        const member = byGroup.get(g.id);
        const [last, unread] = await Promise.all([
            chat_1.ChatMessage.findOne({ where: { groupId: g.id }, order: [['id', 'DESC']] }),
            chat_1.ChatMessage.count({
                where: {
                    groupId: g.id,
                    id: { [sequelize_1.Op.gt]: member.lastReadMessageId ?? 0 },
                    deletedAt: null,
                    senderId: { [sequelize_1.Op.ne]: actor.id }, // own + system messages don't count as unread
                },
            }),
        ]);
        return {
            id: g.id,
            name: g.name,
            description: g.description,
            taskId: g.taskId,
            status: g.status,
            myRole: member.role,
            unreadCount: unread,
            lastMessage: last ? serializeMessage(last) : null,
            lastActivityAt: (last?.createdAt ?? g.createdAt).toISOString(),
        };
    }));
    return items.sort((a, b) => b.lastActivityAt.localeCompare(a.lastActivityAt));
}
/** Admin only: group metadata for management. NEVER includes messages. */
async function listAllGroups(actor) {
    if (actor.role !== 'admin')
        throw new ChatError('Admins only', 403);
    const groups = await chat_1.ChatGroup.findAll({ order: [['createdAt', 'DESC']] });
    const mine = new Map((await chat_1.ChatMember.findAll({ where: { userId: actor.id, leftAt: null } })).map((m) => [m.groupId, m]));
    return Promise.all(groups.map(async (g) => ({
        id: g.id,
        name: g.name,
        description: g.description,
        taskId: g.taskId,
        status: g.status,
        myRole: mine.get(g.id)?.role ?? null,
        memberCount: await chat_1.ChatMember.count({ where: { groupId: g.id, leftAt: null } }),
        lastActivityAt: g.createdAt.toISOString(),
    })));
}
/** Members can view their group. Admin can view the roster (not messages) of any group. */
async function getGroupDetail(actor, groupId) {
    const group = await getGroupOrThrow(groupId);
    const mine = await getActiveMembership(groupId, actor.id);
    if (!mine && actor.role !== 'admin')
        throw new ChatError('Group not found', 404);
    const members = await chat_1.ChatMember.findAll({
        where: { groupId, leftAt: null },
        order: [['joinedAt', 'ASC']],
    });
    const users = await user_1.default.findAll({
        where: { id: { [sequelize_1.Op.in]: members.map((m) => m.userId) } },
        attributes: ['id', 'name', 'email', 'role'],
    });
    const byId = new Map(users.map((u) => [u.id, u]));
    return {
        id: group.id,
        name: group.name,
        description: group.description,
        taskId: group.taskId,
        status: group.status,
        createdBy: group.createdBy,
        myRole: mine?.role ?? null,
        members: members.map((m) => ({
            userId: m.userId,
            role: m.role,
            name: byId.get(m.userId)?.name ?? 'Unknown user',
            email: byId.get(m.userId)?.email ?? '',
            userRole: byId.get(m.userId)?.role ?? '',
        })),
    };
}
async function addMembers(actor, groupId, userIds) {
    const { group } = await requireManager(actor, groupId);
    if (group.status !== 'active')
        throw new ChatError('This group is archived', 409);
    const ids = [...new Set(userIds)];
    await assertCanAdd(actor, ids);
    const added = [];
    for (const id of ids) {
        if (await upsertMember(groupId, id))
            added.push(id);
    }
    if (added.length) {
        const names = await userNames(added);
        (0, socket_1.emitToGroup)(groupId, 'group:changed', { groupId });
        await announce(groupId, `${actor.name} added ${added.map((id) => names.get(id) ?? 'a user').join(', ')}`);
    }
    return getGroupDetail(actor, groupId);
}
async function removeMember(actor, groupId, targetUserId) {
    const { group } = await requireManager(actor, groupId);
    if (group.status !== 'active')
        throw new ChatError('This group is archived', 409);
    const target = await getActiveMembership(groupId, targetUserId);
    if (!target)
        throw new ChatError('Member not found', 404);
    if (target.role === 'owner' && actor.role !== 'admin') {
        throw new ChatError('Only an admin can remove the group owner', 403);
    }
    const activeCount = await chat_1.ChatMember.count({ where: { groupId, leftAt: null } });
    if (activeCount - 1 < exports.MIN_GROUP_MEMBERS) {
        throw new ChatError(`A group needs at least ${exports.MIN_GROUP_MEMBERS} members. Archive the group instead.`);
    }
    const names = await userNames([targetUserId]);
    await endMembership(target, 'removed'); // kick sockets first so they don't see the next line
    await announce(groupId, `${actor.name} removed ${names.get(targetUserId) ?? 'a member'}`);
    return getGroupDetail(actor, groupId);
}
/** Archive = read-only for everyone, history kept. (Groups are never hard-deleted.) */
async function archiveGroup(actor, groupId) {
    const { group } = await requireManager(actor, groupId);
    if (group.status === 'archived')
        return getGroupDetail(actor, groupId);
    await announce(groupId, `${actor.name} archived this group. It is now read-only.`);
    await group.update({ status: 'archived' });
    (0, socket_1.emitToGroup)(groupId, 'group:changed', { groupId });
    return getGroupDetail(actor, groupId);
}
// ==========================================================
// Messages
// ==========================================================
async function getMessages(actor, groupId, opts = {}) {
    await requireMember(groupId, actor.id);
    const take = Math.min(Math.max(opts.limit ?? 30, 1), 100);
    const where = { groupId };
    if (opts.before)
        where.id = { [sequelize_1.Op.lt]: opts.before };
    const rows = await chat_1.ChatMessage.findAll({ where, order: [['id', 'DESC']], limit: take + 1 });
    const hasMore = rows.length > take;
    const page = rows.slice(0, take).reverse(); // oldest -> newest
    const attachments = await loadAttachments(page.map((m) => m.id));
    return { messages: page.map((m) => serializeMessage(m, attachments.get(m.id))), hasMore };
}
/** Used BEFORE multer runs, so non-members can't even write files to disk. */
async function assertCanPost(actor, groupId) {
    const { group } = await requireMember(groupId, actor.id);
    if (group.status !== 'active')
        throw new ChatError('This group is archived and read-only', 409);
    return group;
}
async function sendMessage(actor, groupId, input) {
    //Check whether the sender is allowed to post
    const group = await assertCanPost(actor, groupId);
    await assertCanPost(actor, groupId);
    const body = (input.body ?? '').trim();
    const files = input.files ?? [];
    if (!body && files.length === 0)
        throw new ChatError('Message cannot be empty');
    if (body.length > exports.MAX_BODY_LENGTH) {
        throw new ChatError(`Message is too long (max ${exports.MAX_BODY_LENGTH} characters)`);
    }
    const { message, attachments } = await database_1.sequelize.transaction(async (t) => {
        const message = await chat_1.ChatMessage.create({
            groupId,
            senderId: actor.id,
            senderName: actor.name,
            type: files.length ? 'file' : 'text',
            body: body || null,
        }, { transaction: t });
        const attachments = await chat_1.ChatAttachment.bulkCreate(files.map((f) => ({
            messageId: message.id,
            originalName: f.originalname.slice(0, 255),
            storedName: f.filename,
            mimeType: f.mimetype,
            size: f.size,
        })), { transaction: t });
        return { message, attachments };
    });
    const payload = serializeMessage(message, attachments);
    (0, socket_1.emitToGroup)(groupId, 'message:new', payload);
    //  Get all active members of this group
    const groupMembers = await chat_1.ChatMember.findAll({
        where: {
            groupId,
            leftAt: null,
        },
    });
    // Prepare a short message preview for the notification
    const messagePreview = body
        ? body.slice(0, 150)
        : 'Sent an attachment';
    //Notify every group member except the sender
    await Promise.all(groupMembers
        .filter((member) => member.userId !== actor.id)
        .map((member) => (0, notificationService_1.safeNotify)(() => (0, notificationService_1.notifyNewMessage)(member.userId, // Notification recipient
    groupId, // Group ID
    group.name, // Group name
    actor.id, // Sender ID
    actor.name, // Sender name
    message.id, // Message ID
    messagePreview // Message preview
    ))));
    // Return the message to the controller
    return payload;
}
/**
 * Soft delete: row stays (so history order/"message deleted" placeholder is kept),
 * but the text is erased and attached files are removed from disk.
 * Allowed: the sender, the group owner, or an admin.
 */
async function deleteMessage(actor, groupId, messageId) {
    let isOwner = false;
    if (actor.role !== 'admin') {
        const { group, member } = await requireMember(groupId, actor.id);
        if (group.status !== 'active')
            throw new ChatError('This group is archived', 409);
        isOwner = member.role === 'owner';
    }
    else {
        const group = await getGroupOrThrow(groupId);
        if (group.status !== 'active')
            throw new ChatError('This group is archived', 409);
    }
    const message = await chat_1.ChatMessage.findOne({ where: { id: messageId, groupId } });
    if (!message)
        throw new ChatError('Message not found', 404);
    if (message.type === 'system')
        throw new ChatError('System messages cannot be deleted');
    if (actor.role !== 'admin' && !isOwner && message.senderId !== actor.id) {
        throw new ChatError('You can only delete your own messages', 403);
    }
    if (message.deletedAt)
        return { id: message.id, groupId, deleted: true };
    const attachments = await chat_1.ChatAttachment.findAll({ where: { messageId: message.id } });
    const now = new Date();
    await database_1.sequelize.transaction(async (t) => {
        // Keep 'body' intact in the database; only record deletedAt and deletedBy
        await message.update({ deletedAt: now, deletedBy: actor.id }, { transaction: t });
        // Keep 'originalName' intact in the database; only record deletedAt
        await chat_1.ChatAttachment.update({ deletedAt: now }, { where: { messageId: message.id }, transaction: t });
    });
    (0, socket_1.emitToGroup)(groupId, 'message:deleted', { groupId, messageId: message.id });
    return { id: message.id, groupId, deleted: true };
}
async function markRead(actor, groupId, messageId) {
    const { member } = await requireMember(groupId, actor.id);
    const msg = await chat_1.ChatMessage.findOne({ where: { id: messageId, groupId } });
    if (!msg)
        throw new ChatError('Message not found', 404);
    if (!member.lastReadMessageId || messageId > member.lastReadMessageId) {
        await member.update({ lastReadMessageId: messageId });
    }
}
/** Authorise + locate an attachment. Only active group members may download. */
async function getAttachmentFile(actor, attachmentId) {
    const att = await chat_1.ChatAttachment.findByPk(attachmentId);
    if (!att || att.deletedAt)
        throw new ChatError('File not found', 404);
    const msg = await chat_1.ChatMessage.findByPk(att.messageId);
    if (!msg || msg.deletedAt)
        throw new ChatError('File not found', 404);
    await requireMember(msg.groupId, actor.id);
    return {
        filePath: path_1.default.join(exports.UPLOAD_DIR, path_1.default.basename(att.storedName)),
        mimeType: att.mimeType,
        originalName: att.originalName ?? 'file',
    };
}
// ==========================================================
// Hooks for the rest of your app (tasks / users)
// ==========================================================
/** Call when users are ASSIGNED to a task: they join that task's chat group(s). */
async function addUsersToTaskGroups(taskId, userIds) {
    if (!userIds.length)
        return;
    const groups = await chat_1.ChatGroup.findAll({ where: { taskId, status: 'active' } });
    const names = await userNames(userIds);
    for (const g of groups) {
        for (const userId of userIds) {
            if (await upsertMember(g.id, userId)) {
                (0, socket_1.emitToGroup)(g.id, 'group:changed', { groupId: g.id });
                await announce(g.id, `${names.get(userId) ?? 'A user'} joined (assigned to the task)`);
            }
        }
    }
}
/** Call when a user is UNASSIGNED from a task: they lose access to that task's chat. */
async function removeUserFromTaskGroups(taskId, userId) {
    const groups = await chat_1.ChatGroup.findAll({ where: { taskId } });
    const names = await userNames([userId]);
    for (const g of groups) {
        const member = await getActiveMembership(g.id, userId);
        if (!member || member.role === 'owner')
            continue; // never auto-remove the owner
        await endMembership(member, 'task_unassigned');
        if (g.status === 'active') {
            await announce(g.id, `${names.get(userId) ?? 'A member'} was removed (unassigned from the task)`);
        }
    }
}
/** Call when a task is DELETED: its chat becomes read-only history. */
async function archiveTaskGroups(taskId) {
    const groups = await chat_1.ChatGroup.findAll({ where: { taskId, status: 'active' } });
    for (const g of groups) {
        await announce(g.id, 'The linked task was deleted. This group is now read-only.');
        await g.update({ status: 'archived' });
        (0, socket_1.emitToGroup)(g.id, 'group:changed', { groupId: g.id });
    }
}
/** Call when a user account is DELETED. Their old messages stay (name snapshot). */
async function handleUserDeleted(userId) {
    const memberships = await chat_1.ChatMember.findAll({ where: { userId, leftAt: null } });
    for (const m of memberships)
        await endMembership(m, 'user_deleted');
    (0, socket_1.disconnectUser)(userId);
}
/** Call when a user is DEACTIVATED. Memberships are kept so re-activation restores access. */
function handleUserDeactivated(userId) {
    (0, socket_1.disconnectUser)(userId);
}
//# sourceMappingURL=chatService.js.map