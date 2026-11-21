"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const taskBlockerController_1 = require("../controllers/taskBlockerController");
const authMiddleware_1 = require("../middleware/authMiddleware");
const router = (0, express_1.Router)();
// Every blocker route requires a logged-in user
router.use(authMiddleware_1.authenticate);
// List blockers (mentee: own, mentor: assigned, admin: all)
router.get('/', taskBlockerController_1.listTaskBlockers);
// Raise a blocker: mentees only
router.post('/', (0, authMiddleware_1.authorize)('mentee'), taskBlockerController_1.raiseTaskBlocker);
router.post('/tasks/:taskId', (0, authMiddleware_1.authorize)('mentee'), taskBlockerController_1.raiseTaskBlocker);
// Latest conversation for a task
router.get('/tasks/:taskId', taskBlockerController_1.getTaskBlockerConversation);
// Messages
router.get('/:conversationId/messages', taskBlockerController_1.getTaskBlockerMessages);
router.post('/:conversationId/messages', (0, authMiddleware_1.authorize)('mentee', 'mentor'), taskBlockerController_1.sendTaskBlockerMessage);
// Resolve: mentees only (a mentor gets 403 here)
router.patch('/:conversationId/resolve', (0, authMiddleware_1.authorize)('mentee'), taskBlockerController_1.resolveTaskBlocker);
// One conversation with details and messages (keep this LAST)
router.get('/:conversationId', taskBlockerController_1.getTaskBlockerById);
exports.default = router;
//# sourceMappingURL=taskBlockerRoute.js.map