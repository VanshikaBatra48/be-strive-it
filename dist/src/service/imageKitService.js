"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.imagekit = void 0;
exports.uploadToImageKit = uploadToImageKit;
exports.deleteFromImageKit = deleteFromImageKit;
exports.bulkDeleteFromImageKit = bulkDeleteFromImageKit;
require("dotenv/config");
const imagekit_1 = __importDefault(require("imagekit"));
// 1. Validate environment configuration
const publicKey = process.env.IMAGEKIT_PUBLIC_KEY?.trim();
const privateKey = process.env.IMAGEKIT_PRIVATE_KEY?.trim();
const urlEndpoint = process.env.IMAGEKIT_URL_ENDPOINT?.trim();
if (!publicKey || !privateKey || !urlEndpoint) {
    console.warn('WARNING: ImageKit credentials missing in .env (IMAGEKIT_PUBLIC_KEY, IMAGEKIT_PRIVATE_KEY, IMAGEKIT_URL_ENDPOINT).');
}
// 2. Initialize ImageKit instance
exports.imagekit = new imagekit_1.default({
    publicKey: publicKey || '',
    privateKey: privateKey || '',
    urlEndpoint: urlEndpoint || '',
});
/**
 * Upload a file buffer directly to ImageKit.
 *
 * @param buffer - File content buffer (from multer memoryStorage)
 * @param fileName - Original or sanitized file name
 * @param folder - Target folder path in ImageKit (e.g. '/chat', '/tasks')
 */
async function uploadToImageKit(buffer, fileName, folder = '/chat') {
    try {
        const response = await exports.imagekit.upload({
            file: buffer,
            fileName,
            folder,
            useUniqueFileName: true, // Prevents overwriting files with the same name
        });
        return {
            fileId: response.fileId,
            url: response.url,
            name: response.name,
            size: response.size,
            filePath: response.filePath,
        };
    }
    catch (error) {
        console.error('ImageKit upload error:', error);
        throw new Error(error?.message || 'Failed to upload file to ImageKit');
    }
}
/**
 * Delete a single file from ImageKit by its fileId.
 *
 * @param fileId - ImageKit unique fileId
 */
async function deleteFromImageKit(fileId) {
    try {
        await exports.imagekit.deleteFile(fileId);
    }
    catch (error) {
        console.error(`Failed to delete file (${fileId}) from ImageKit:`, error);
        // Don't throw if file was already deleted
    }
}
/**
 * Bulk delete multiple files from ImageKit by their fileIds.
 *
 * @param fileIds - Array of ImageKit fileIds
 */
async function bulkDeleteFromImageKit(fileIds) {
    if (!fileIds || fileIds.length === 0)
        return;
    try {
        await exports.imagekit.bulkDeleteFiles(fileIds);
    }
    catch (error) {
        console.error('Failed to bulk delete files from ImageKit:', error);
    }
}
exports.default = exports.imagekit;
//# sourceMappingURL=imageKitService.js.map