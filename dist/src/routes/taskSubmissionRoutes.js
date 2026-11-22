"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const taskSubmissionController_1 = require("../controllers/taskSubmissionController");
const authMiddleware_1 = require("../middleware/authMiddleware");
const taskUpload_1 = require("../middleware/taskUpload");
const router = (0, express_1.Router)();
// Mentee submits or resubmits a task.
router.post('/tasks/:taskId/submit', authMiddleware_1.authenticate, (0, authMiddleware_1.authorize)('mentee'), taskUpload_1.uploadSubmissionAttachment, taskSubmissionController_1.submitTask);
// Get all versions of a task.
router.get('/tasks/:taskId/submissions', authMiddleware_1.authenticate, taskSubmissionController_1.getSubmissionHistory);
// Get an individual submission.
router.get('/submissions/:submissionId', authMiddleware_1.authenticate, taskSubmissionController_1.getSubmissionById);
// Mentor requests changes.
router.patch('/submissions/:submissionId/request-changes', authMiddleware_1.authenticate, (0, authMiddleware_1.authorize)('mentor'), taskSubmissionController_1.requestChanges);
// Mentor approves a submission.
router.patch('/submissions/:submissionId/approve', authMiddleware_1.authenticate, (0, authMiddleware_1.authorize)('mentor'), taskSubmissionController_1.approveSubmission);
router.get('/submissions/:submissionId/attachment', authMiddleware_1.authenticate, taskSubmissionController_1.downloadSubmissionAttachment);
exports.default = router;
//# sourceMappingURL=taskSubmissionRoutes.js.map