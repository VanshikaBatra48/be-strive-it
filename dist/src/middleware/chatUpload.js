"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ensureCanPost = ensureCanPost;
exports.uploadFiles = uploadFiles;
const fs_1 = __importDefault(require("fs"));
const crypto_1 = __importDefault(require("crypto"));
const multer_1 = __importDefault(require("multer"));
const chatService_1 = require("../service/chatService");
fs_1.default.mkdirSync(chatService_1.UPLOAD_DIR, { recursive: true });
// Allow-list of types -> extension we choose ourselves (we never trust the client's filename).
// SVG and HTML are deliberately excluded (script injection risk).
const ALLOWED_TYPES = new Map([
    ['image/jpeg', '.jpg'],
    ['image/png', '.png'],
    ['image/webp', '.webp'],
    ['image/gif', '.gif'],
    ['application/pdf', '.pdf'],
    ['text/plain', '.txt'],
    ['application/vnd.openxmlformats-officedocument.wordprocessingml.document', '.docx'],
    ['application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', '.xlsx'],
    ['application/vnd.openxmlformats-officedocument.presentationml.presentation', '.pptx'],
]);
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB
const MAX_FILES = 5;
const upload = (0, multer_1.default)({
    storage: multer_1.default.diskStorage({
        destination: (_req, _file, cb) => cb(null, chatService_1.UPLOAD_DIR),
        filename: (_req, file, cb) => cb(null, `${crypto_1.default.randomUUID()}${ALLOWED_TYPES.get(file.mimetype) ?? ''}`),
    }),
    fileFilter: (_req, file, cb) => {
        if (!ALLOWED_TYPES.has(file.mimetype)) {
            return cb(new chatService_1.ChatError('This file type is not allowed'));
        }
        cb(null, true);
    },
    limits: { fileSize: MAX_FILE_SIZE, files: MAX_FILES },
}).array('files', MAX_FILES);
/**
 * Runs BEFORE multer: confirms the user is an active member of an active group,
 * so non-members can never write files to disk.
 */
async function ensureCanPost(req, res, next) {
    try {
        const groupId = Number(req.params.groupId);
        if (!req.user || !Number.isInteger(groupId))
            throw new chatService_1.ChatError('Group not found', 404);
        await (0, chatService_1.assertCanPost)(req.user, groupId);
        next();
    }
    catch (err) {
        if (err instanceof chatService_1.ChatError) {
            res.status(err.statusCode).json({ success: false, message: err.message });
            return;
        }
        console.error('ensureCanPost error:', err);
        res.status(500).json({ success: false, message: 'Something went wrong.' });
    }
}
/** multer wrapped so upload errors become clean 400 responses. */
function uploadFiles(req, res, next) {
    upload(req, res, (err) => {
        if (!err)
            return next();
        let message = 'Upload failed';
        if (err instanceof multer_1.default.MulterError) {
            message =
                err.code === 'LIMIT_FILE_SIZE'
                    ? 'Each file must be 10 MB or smaller'
                    : err.code === 'LIMIT_FILE_COUNT' || err.code === 'LIMIT_UNEXPECTED_FILE'
                        ? `You can attach at most ${MAX_FILES} files`
                        : err.message;
        }
        else if (err instanceof chatService_1.ChatError) {
            message = err.message;
        }
        res.status(400).json({ success: false, message });
    });
}
//# sourceMappingURL=chatUpload.js.map