"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.uploadSubmissionAttachment = exports.uploadTaskAttachments = void 0;
const multer_1 = __importDefault(require("multer"));
// Deliverable attachments from mentor when creating a task (PDF, DOC, DOCX, etc.)
exports.uploadTaskAttachments = (0, multer_1.default)({
    storage: multer_1.default.memoryStorage(),
    limits: {
        fileSize: 25 * 1024 * 1024, // 25 MB
        files: 5,
    },
}).array('attachments', 5);
// Attachment from mentee when submitting a task (file, zip, document, screenshot)
exports.uploadSubmissionAttachment = (0, multer_1.default)({
    storage: multer_1.default.memoryStorage(),
    limits: {
        fileSize: 25 * 1024 * 1024, // 25 MB
        files: 1,
    },
}).single('attachment');
//# sourceMappingURL=taskUpload.js.map