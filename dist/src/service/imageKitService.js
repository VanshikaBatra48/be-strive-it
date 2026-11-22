"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.imagekit = void 0;
exports.uploadToImageKit = uploadToImageKit;
exports.fetchAndDecryptFromImageKit = fetchAndDecryptFromImageKit;
exports.deleteFromImageKit = deleteFromImageKit;
exports.bulkDeleteFromImageKit = bulkDeleteFromImageKit;
require("dotenv/config");
const imagekit_1 = __importDefault(require("imagekit"));
const cryptoService_1 = require("./cryptoService");
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
 * Encrypts a file buffer and uploads the encrypted ciphertext directly to ImageKit.
 *
 * @param buffer - Plaintext file content buffer (from multer memoryStorage)
 * @param fileName - Original or sanitized file name
 * @param folder - Target folder path in ImageKit (e.g. '/chat', '/tasks', '/submissions')
 */
async function uploadToImageKit(buffer, fileName, folder = '/chat') {
    try {
        // App-level encryption: encrypt file buffer before uploading to cloud
        const encryptedBuffer = (0, cryptoService_1.encryptBuffer)(buffer);
        const response = await exports.imagekit.upload({
            file: encryptedBuffer,
            fileName,
            folder,
            useUniqueFileName: true,
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
 * Downloads an encrypted file from ImageKit and decrypts it back to plaintext.
 *
 * @param url - Direct ImageKit CDN URL
 * @returns Decrypted plaintext Buffer
 */
async function fetchAndDecryptFromImageKit(url) {
    try {
        const response = await fetch(url);
        if (!response.ok) {
            throw new Error(`Failed to fetch file from ImageKit: ${response.statusText}`);
        }
        const arrayBuffer = await response.arrayBuffer();
        const encryptedBuffer = Buffer.from(arrayBuffer);
        try {
            // Decrypt using AES-256-GCM
            return (0, cryptoService_1.decryptBuffer)(encryptedBuffer);
        }
        catch (decryptErr) {
            // Fallback: If decryption fails, the file might be an older legacy file uploaded before encryption was added
            console.warn('Decryption failed, falling back to raw buffer (legacy file):', decryptErr);
            return encryptedBuffer;
        }
    }
    catch (error) {
        console.error('Failed to fetch and decrypt file from ImageKit:', error);
        throw new Error(error?.message || 'Failed to decrypt file from storage');
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