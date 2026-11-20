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
exports.getSubmissionById = exports.getSubmissionHistory = exports.approveSubmission = exports.requestChanges = exports.submitTask = void 0;
const taskSubmissionService = __importStar(require("../service/taskSubmissionService"));
// -------------------------------------
// SUBMIT TASK
// -------------------------------------
const submitTask = async (req, res) => {
    try {
        const taskId = Number(req.params.taskId);
        const submittedBy = Number(req.user?.id);
        const { submissionText, attachmentUrl } = req.body;
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
        if (typeof submissionText !== 'string' ||
            !submissionText.trim()) {
            return res.status(400).json({
                success: false,
                message: 'Submission text is required'
            });
        }
        // Validate attachment URL
        if (attachmentUrl !== undefined &&
            attachmentUrl !== null &&
            typeof attachmentUrl !== 'string') {
            return res.status(400).json({
                success: false,
                message: 'Invalid attachment URL'
            });
        }
        const result = await taskSubmissionService.submitTask({
            taskId,
            submittedBy,
            submissionText: submissionText.trim(),
            attachmentUrl
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
//# sourceMappingURL=taskSubmissionController.js.map