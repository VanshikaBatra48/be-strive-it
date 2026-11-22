"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.encryptBuffer = encryptBuffer;
exports.decryptBuffer = decryptBuffer;
exports.isEncryptedBuffer = isEncryptedBuffer;
const crypto_1 = __importDefault(require("crypto"));
require("dotenv/config");
const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 16; // 16 bytes for AES-GCM IV
const TAG_LENGTH = 16; // 16 bytes authentication tag
/**
 * Resolves the 32-byte key from environment variables.
 */
function getEncryptionKey() {
    const rawKey = process.env.FILE_ENCRYPTION_KEY?.trim();
    if (!rawKey) {
        throw new Error('FILE_ENCRYPTION_KEY is not defined in environment variables.');
    }
    // If hex string (64 chars), convert to 32 bytes buffer
    if (rawKey.length === 64 && /^[0-9a-fA-F]+$/.test(rawKey)) {
        return Buffer.from(rawKey, 'hex');
    }
    // Fallback: SHA-256 hash to ensure a strict 32-byte key
    return crypto_1.default.createHash('sha256').update(rawKey).digest();
}
/**
 * Encrypts a plain file buffer using AES-256-GCM.
 * Output payload structure: [ 16 bytes IV ] [ 16 bytes AuthTag ] [ Ciphertext ]
 *
 * @param plainBuffer - Plaintext file buffer
 * @returns Self-contained encrypted buffer
 */
function encryptBuffer(plainBuffer) {
    const key = getEncryptionKey();
    const iv = crypto_1.default.randomBytes(IV_LENGTH);
    const cipher = crypto_1.default.createCipheriv(ALGORITHM, key, iv);
    const encrypted = Buffer.concat([cipher.update(plainBuffer), cipher.final()]);
    const authTag = cipher.getAuthTag();
    // Combine IV + AuthTag + Encrypted data into one contiguous buffer
    return Buffer.concat([iv, authTag, encrypted]);
}
/**
 * Decrypts an encrypted file buffer using AES-256-GCM.
 * Expects structure: [ 16 bytes IV ] [ 16 bytes AuthTag ] [ Ciphertext ]
 *
 * @param encryptedBuffer - Encrypted file buffer
 * @returns Decrypted plaintext buffer
 */
function decryptBuffer(encryptedBuffer) {
    const key = getEncryptionKey();
    if (encryptedBuffer.length < IV_LENGTH + TAG_LENGTH) {
        throw new Error('Invalid encrypted buffer: payload too short.');
    }
    const iv = encryptedBuffer.subarray(0, IV_LENGTH);
    const authTag = encryptedBuffer.subarray(IV_LENGTH, IV_LENGTH + TAG_LENGTH);
    const ciphertext = encryptedBuffer.subarray(IV_LENGTH + TAG_LENGTH);
    const decipher = crypto_1.default.createDecipheriv(ALGORITHM, key, iv);
    decipher.setAuthTag(authTag);
    return Buffer.concat([decipher.update(ciphertext), decipher.final()]);
}
/**
 * Optional helper to check if a buffer is likely encrypted by our format.
 */
function isEncryptedBuffer(buffer) {
    return buffer.length >= IV_LENGTH + TAG_LENGTH;
}
//# sourceMappingURL=cryptoService.js.map