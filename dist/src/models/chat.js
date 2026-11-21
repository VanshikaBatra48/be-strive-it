"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ChatAttachment = exports.ChatMessage = exports.ChatMember = exports.ChatGroup = void 0;
const sequelize_1 = require("sequelize");
const database_1 = require("../config/database");
// ---------- Group ----------
class ChatGroup extends sequelize_1.Model {
}
exports.ChatGroup = ChatGroup;
ChatGroup.init({
    id: { type: sequelize_1.DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
    name: { type: sequelize_1.DataTypes.STRING(120), allowNull: false },
    description: { type: sequelize_1.DataTypes.STRING(500), allowNull: true },
    taskId: { type: sequelize_1.DataTypes.INTEGER, allowNull: true },
    createdBy: { type: sequelize_1.DataTypes.INTEGER, allowNull: true },
    status: { type: sequelize_1.DataTypes.STRING(20), allowNull: false, defaultValue: 'active' },
}, { sequelize: database_1.sequelize, tableName: 'chat_groups' });
// ---------- Membership ----------
// One row per (group, user). Leaving/removal sets leftAt instead of deleting,
// so there is an audit trail and re-adding someone just reactivates the row.
class ChatMember extends sequelize_1.Model {
}
exports.ChatMember = ChatMember;
ChatMember.init({
    id: { type: sequelize_1.DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
    groupId: { type: sequelize_1.DataTypes.INTEGER, allowNull: false },
    userId: { type: sequelize_1.DataTypes.INTEGER, allowNull: false },
    role: { type: sequelize_1.DataTypes.STRING(10), allowNull: false, defaultValue: 'member' },
    joinedAt: { type: sequelize_1.DataTypes.DATE, allowNull: false },
    leftAt: { type: sequelize_1.DataTypes.DATE, allowNull: true },
    leftReason: { type: sequelize_1.DataTypes.STRING(30), allowNull: true },
    lastReadMessageId: { type: sequelize_1.DataTypes.INTEGER, allowNull: true },
}, { sequelize: database_1.sequelize, tableName: 'chat_members' });
// ---------- Message ----------
// senderName is a snapshot, so history still reads correctly after a user is deleted.
// Deleted messages keep their row (history/ordering) but body is erased.
class ChatMessage extends sequelize_1.Model {
}
exports.ChatMessage = ChatMessage;
ChatMessage.init({
    id: { type: sequelize_1.DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
    groupId: { type: sequelize_1.DataTypes.INTEGER, allowNull: false },
    senderId: { type: sequelize_1.DataTypes.INTEGER, allowNull: true },
    senderName: { type: sequelize_1.DataTypes.STRING(120), allowNull: false },
    type: { type: sequelize_1.DataTypes.STRING(10), allowNull: false, defaultValue: 'text' },
    body: { type: sequelize_1.DataTypes.TEXT, allowNull: true },
    deletedAt: { type: sequelize_1.DataTypes.DATE, allowNull: true },
    deletedBy: { type: sequelize_1.DataTypes.INTEGER, allowNull: true },
}, { sequelize: database_1.sequelize, tableName: 'chat_messages' });
// ---------- Attachment ----------
// ---------- Attachment ----------
class ChatAttachment extends sequelize_1.Model {
}
exports.ChatAttachment = ChatAttachment;
ChatAttachment.init({
    id: { type: sequelize_1.DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
    messageId: { type: sequelize_1.DataTypes.INTEGER, allowNull: false },
    originalName: { type: sequelize_1.DataTypes.STRING(255), allowNull: true },
    storedName: { type: sequelize_1.DataTypes.STRING(255), allowNull: true },
    fileId: { type: sequelize_1.DataTypes.STRING(100), allowNull: true },
    url: { type: sequelize_1.DataTypes.STRING(1000), allowNull: true },
    mimeType: { type: sequelize_1.DataTypes.STRING(100), allowNull: false },
    size: { type: sequelize_1.DataTypes.INTEGER, allowNull: false },
    deletedAt: { type: sequelize_1.DataTypes.DATE, allowNull: true },
}, { sequelize: database_1.sequelize, tableName: 'chat_attachments' });
//# sourceMappingURL=chat.js.map