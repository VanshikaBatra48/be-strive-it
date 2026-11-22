"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.downloadSubmissionAttachment = exports.getSubmissionById = exports.getSubmissionHistory = exports.approveSubmission = exports.requestChanges = exports.submitTask = void 0;
const taskSubmissionService = __importStar(require("../service/taskSubmissionService"));
const imageKitService_1 = require("../service/imageKitService");
// -------------------------------------
// SUBMIT TASK
// -------------------------------------
const submitTask = async (req, res) => {
    try {
        const taskId = Number(req.params.taskId);
        const submittedBy = Number(req.user?.id);
        const submissionText = typeof req.body.submissionText === 'string'
            ? req.body.submissionText.trim()
            : typeof req.body.submission_notes === 'string'
                ? req.body.submission_notes.trim()
                : typeof req.body.comments === 'string'
                    ? req.body.comments.trim()
                    : '';
        const submissionUrl = typeof req.body.submissionUrl === 'string' && req.body.submissionUrl.trim()
            ? req.body.submissionUrl.trim()
            : typeof req.body.submission_url === 'string' && req.body.submission_url.trim()
                ? req.body.submission_url.trim()
                : null;
        const demoUrl = typeof req.body.demoUrl === 'string' && req.body.demoUrl.trim()
            ? req.body.demoUrl.trim()
            : typeof req.body.demo_url === 'string' && req.body.demo_url.trim()
                ? req.body.demo_url.trim()
                : null;
        // Validate task ID
        if (!Number.isInteger(taskId) || taskId <= 0) {
            return res.status(400).json({
                success: false,
                message: 'Invalid task ID'
            });
        }
        // Validate authenticated user
        if (!Number.isInteger(submittedBy) || submittedBy <= 0) {
            return res.status(401).json({
                success: false,
                message: 'Authentication required'
            });
        }
        // Validate submission text
        if (!submissionText) {
            return res.status(400).json({
                success: false,
                message: 'Submission text / comments are required'
            });
        }
        // Validate attachment URL
        let finalAttachmentUrl = typeof req.body.attachmentUrl === 'string' && req.body.attachmentUrl.trim()
            ? req.body.attachmentUrl.trim()
            : null;
        // If mentee uploaded a file, upload to ImageKit
        if (req.file) {
            const uploaded = await (0, imageKitService_1.uploadToImageKit)(req.file.buffer, req.file.originalname, '/submissions');
            finalAttachmentUrl = uploaded.url;
        }
        // Must provide either a submission URL or an attached deliverable
        if (!submissionUrl && !finalAttachmentUrl) {
            return res.status(400).json({
                success: false,
                message: 'Please provide a submission URL or attach a file'
            });
        }
        const result = await taskSubmissionService.submitTask({
            taskId,
            submittedBy,
            submissionText,
            submissionUrl,
            demoUrl,
            attachmentUrl: finalAttachmentUrl,
        });
        return res.status(201).json({
            success: true,
            ...result
        });
    }
    catch (error) {
        console.error('Submit task error:', error);
        return res.status(400).json({
            success: false,
            message: error.message || 'Unable to submit task'
        });
    }
};
exports.submitTask = submitTask;
// -------------------------------------
// REQUEST CHANGES
// -------------------------------------
const requestChanges = async (req, res) => {
    try {
        const submissionId = Number(req.params.submissionId);
        const mentorId = Number(req.user?.id);
        const { feedback } = req.body;
        // Validate submission ID
        if (!Number.isInteger(submissionId) || submissionId <= 0) {
            return res.status(400).json({
                success: false,
                message: 'Invalid submission ID'
            });
        }
        // Validate mentor authentication
        if (!Number.isInteger(mentorId) || mentorId <= 0) {
            return res.status(401).json({
                success: false,
                message: 'Authentication required'
            });
        }
        // Validate feedback
        if (typeof feedback !== 'string' ||
            !feedback.trim()) {
            return res.status(400).json({
                success: false,
                message: 'Mentor feedback is required'
            });
        }
        const result = await taskSubmissionService.requestChanges({
            submissionId,
            mentorId,
            feedback: feedback.trim()
        });
        return res.status(200).json({
            success: true,
            ...result
        });
    }
    catch (error) {
        console.error('Request changes error:', error);
        return res.status(400).json({
            success: false,
            message: error.message || 'Unable to request changes'
        });
    }
};
exports.requestChanges = requestChanges;
// -------------------------------------
// APPROVE SUBMISSION
// -------------------------------------
const approveSubmission = async (req, res) => {
    try {
        const submissionId = Number(req.params.submissionId);
        const mentorId = Number(req.user?.id);
        // Validate submission ID
        if (!Number.isInteger(submissionId) || submissionId <= 0) {
            return res.status(400).json({
                success: false,
                message: 'Invalid submission ID'
            });
        }
        // Validate mentor authentication
        if (!Number.isInteger(mentorId) || mentorId <= 0) {
            return res.status(401).json({
                success: false,
                message: 'Authentication required'
            });
        }
        const result = await taskSubmissionService.approveSubmission({
            submissionId,
            mentorId
        });
        return res.status(200).json({
            success: true,
            ...result
        });
    }
    catch (error) {
        console.error('Approve submission error:', error);
        return res.status(400).json({
            success: false,
            message: error.message || 'Unable to approve submission'
        });
    }
};
exports.approveSubmission = approveSubmission;
// -------------------------------------
// GET SUBMISSION HISTORY
// -------------------------------------
const getSubmissionHistory = async (req, res) => {
    try {
        const taskId = Number(req.params.taskId);
        const userId = Number(req.user?.id);
        // IMPORTANT: Validate role before passing it to service.
        const role = req.user?.role;
        // Validate task ID
        if (!Number.isInteger(taskId) || taskId <= 0) {
            return res.status(400).json({
                success: false,
                message: 'Invalid task ID'
            });
        }
        // Validate user ID
        if (!Number.isInteger(userId) || userId <= 0) {
            return res.status(401).json({
                success: false,
                message: 'Authentication required'
            });
        }
        // Validate user role
        if (typeof role !== 'string' ||
            !['admin', 'mentor', 'mentee'].includes(role)) {
            return res.status(401).json({
                success: false,
                message: 'Valid user role not found'
            });
        }
        const result = await taskSubmissionService.getSubmissionHistory(taskId, userId, role);
        return res.status(200).json({
            success: true,
            ...result
        });
    }
    catch (error) {
        console.error('Get submission history error:', error);
        return res.status(400).json({
            success: false,
            message: error.message || 'Unable to fetch submission history'
        });
    }
};
exports.getSubmissionHistory = getSubmissionHistory;
// -------------------------------------
// GET SINGLE SUBMISSION
// -------------------------------------
const getSubmissionById = async (req, res) => {
    try {
        const submissionId = Number(req.params.submissionId);
        const userId = Number(req.user?.id);
        const role = req.user?.role;
        // Validate submission ID
        if (!Number.isInteger(submissionId) || submissionId <= 0) {
            return res.status(400).json({
                success: false,
                message: 'Invalid submission ID'
            });
        }
        // Validate authentication
        if (!Number.isInteger(userId) || userId <= 0) {
            return res.status(401).json({
                success: false,
                message: 'Authentication required'
            });
        }
        if (typeof role !== 'string' ||
            !['admin', 'mentor', 'mentee'].includes(role)) {
            return res.status(401).json({
                success: false,
                message: 'Valid user role not found'
            });
        }
        const result = await taskSubmissionService.getSubmissionById(submissionId, userId, role);
        return res.status(200).json({
            success: true,
            submission: result
        });
    }
    catch (error) {
        console.error('Get submission error:', error);
        return res.status(404).json({
            success: false,
            message: error.message || 'Submission not found'
        });
    }
};
exports.getSubmissionById = getSubmissionById;
// DOWNLOAD & DECRYPT SUBMISSION ATTACHMENT
const downloadSubmissionAttachment = async (req, res) => {
    try {
        const submissionId = Number(req.params.submissionId);
        const userId = Number(req.user?.id);
        const role = String(req.user?.role);
        if (!Number.isInteger(submissionId) || submissionId <= 0) {
            return res.status(400).json({ success: false, message: 'Invalid submission ID' });
        }
        const submission = await taskSubmissionService.getSubmissionById(submissionId, userId, role);
        if (!submission) {
            return res.status(404).json({ success: false, message: 'Submission not found' });
        }
        if (!submission.attachmentUrl) {
            return res.status(404).json({ success: false, message: 'No attachment found for this submission' });
        }
        const decryptedBuffer = await (0, imageKitService_1.fetchAndDecryptFromImageKit)(submission.attachmentUrl);
        res.setHeader('Content-Type', 'application/octet-stream');
        res.setHeader('Content-Length', decryptedBuffer.length);
        res.setHeader('X-Content-Type-Options', 'nosniff');
        res.setHeader('Cache-Control', 'private, no-cache');
        res.setHeader('Content-Disposition', `attachment; filename="submission-${submissionId}-deliverable"`);
        return res.send(decryptedBuffer);
    }
    catch (error) {
        return res.status(403).json({
            success: false,
            message: error.message || 'Unable to download attachment'
        });
    }
};
exports.downloadSubmissionAttachment = downloadSubmissionAttachment;
//# sourceMappingURL=taskSubmissionController.js.map