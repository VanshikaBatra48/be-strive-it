"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const chatController_1 = __importDefault(require("../controllers/chatController"));
const authMiddleware_1 = require("../middleware/authMiddleware");
const chatUpload_1 = require("../middleware/chatUpload");
// If your other routes use firstLoginCheckMiddleware, add it here the same way
// (e.g. router.use(verifyToken, firstLoginCheck)).
const router = (0, express_1.Router)();
router.use(authMiddleware_1.verifyToken);
// ---- Groups ----
router.get('/groups', chatController_1.default.listGroups); // ?scope=all => admin management list
router.post('/groups', (0, authMiddleware_1.authorize)('admin', 'mentor'), chatController_1.default.createGroup);
router.get('/groups/:groupId', chatController_1.default.getGroup);
router.post('/groups/:groupId/members', (0, authMiddleware_1.authorize)('admin', 'mentor'), chatController_1.default.addMembers);
router.delete('/groups/:groupId/members/:userId', (0, authMiddleware_1.authorize)('admin', 'mentor'), chatController_1.default.removeMember);
router.post('/groups/:groupId/archive', (0, authMiddleware_1.authorize)('admin', 'mentor'), chatController_1.default.archiveGroup);
// ---- Messages ----
router.get('/groups/:groupId/messages', chatController_1.default.getMessages);
router.patch('/groups/:groupId', (0, authMiddleware_1.authorize)('admin', 'mentor'), chatController_1.default.renameGroup);
router.delete('/groups/:groupId', (0, authMiddleware_1.authorize)('admin', 'mentor'), chatController_1.default.deleteGroup);
// Order matters: membership check -> upload -> controller
router.post('/groups/:groupId/messages', chatUpload_1.ensureCanPost, chatUpload_1.uploadFiles, chatController_1.default.sendMessage);
router.delete('/groups/:groupId/messages/:messageId', chatController_1.default.deleteMessage);
router.post('/groups/:groupId/read', chatController_1.default.markRead);
// ---- Files (authenticated download, never served statically) ----
router.get('/attachments/:attachmentId', chatController_1.default.downloadAttachment);
exports.default = router;
//# sourceMappingURL=chatRoutes.js.map