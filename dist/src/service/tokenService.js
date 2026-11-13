"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.RefreshTokenError = exports.REFRESH_TTL_MS = exports.REFRESH_TTL_DAYS = exports.REFRESH_COOKIE_NAME = void 0;
exports.setRefreshCookie = setRefreshCookie;
exports.clearRefreshCookie = clearRefreshCookie;
exports.createRefreshToken = createRefreshToken;
exports.rotateRefreshToken = rotateRefreshToken;
exports.revokeRefreshToken = revokeRefreshToken;
exports.revokeAllForUser = revokeAllForUser;
exports.deleteExpiredTokens = deleteExpiredTokens;
const crypto_1 = __importDefault(require("crypto"));
const sequelize_1 = require("sequelize");
const refreshToken_1 = __importDefault(require("../models/refreshToken"));
exports.REFRESH_COOKIE_NAME = 'refreshToken';
exports.REFRESH_TTL_DAYS = Number(process.env.REFRESH_TOKEN_DAYS) || 7;
exports.REFRESH_TTL_MS = exports.REFRESH_TTL_DAYS * 24 * 60 * 60 * 1000;
/** If a just-rotated token is replayed within this window (e.g. two tabs
 *  refreshing at once) we reject it but do NOT revoke the whole family. */
const REUSE_GRACE_MS = 10000;
class RefreshTokenError extends Error {
    constructor(message) {
        super(message);
        this.name = 'RefreshTokenError';
    }
}
exports.RefreshTokenError = RefreshTokenError;
const hashToken = (raw) => crypto_1.default.createHash('sha256').update(raw).digest('hex');
const generateRawToken = () => crypto_1.default.randomBytes(48).toString('hex');
// ---------- Cookie helpers ----------
function cookieOptions() {
    const sameSite = process.env.COOKIE_SAMESITE || 'strict';
    return {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production' || sameSite === 'none',
        sameSite,
        // Must be a prefix of your refresh + logout routes, e.g. '/api'
        path: process.env.REFRESH_COOKIE_PATH || '/api',
    };
}
function setRefreshCookie(res, rawToken) {
    res.cookie(exports.REFRESH_COOKIE_NAME, rawToken, {
        ...cookieOptions(),
        maxAge: exports.REFRESH_TTL_MS,
    });
}
function clearRefreshCookie(res) {
    res.clearCookie(exports.REFRESH_COOKIE_NAME, cookieOptions());
}
// ---------- Token lifecycle ----------
/** Create a refresh token. Omit familyId on login to start a new family. */
async function createRefreshToken(userId, familyId = crypto_1.default.randomUUID()) {
    const raw = generateRawToken();
    await refreshToken_1.default.create({
        userId,
        tokenHash: hashToken(raw),
        familyId,
        expiresAt: new Date(Date.now() + exports.REFRESH_TTL_MS),
    });
    return raw;
}
/**
 * Validate the presented refresh token, revoke it, and issue a replacement
 * in the same family. Throws RefreshTokenError if invalid.
 */
async function rotateRefreshToken(rawToken) {
    const record = await refreshToken_1.default.findOne({
        where: { tokenHash: hashToken(rawToken) },
    });
    if (!record)
        throw new RefreshTokenError('Invalid refresh token');
    if (record.revokedAt) {
        const withinGrace = Date.now() - record.revokedAt.getTime() < REUSE_GRACE_MS;
        if (!withinGrace) {
            // Old token replayed -> likely stolen. Kill the whole session family.
            await refreshToken_1.default.update({ revokedAt: new Date() }, { where: { familyId: record.familyId, revokedAt: null } });
        }
        throw new RefreshTokenError('Refresh token has been revoked');
    }
    if (record.expiresAt.getTime() < Date.now()) {
        throw new RefreshTokenError('Refresh token has expired');
    }
    // Conditional update so two concurrent requests can't both rotate the same token
    const [affected] = await refreshToken_1.default.update({ revokedAt: new Date() }, { where: { id: record.id, revokedAt: null } });
    if (affected === 0)
        throw new RefreshTokenError('Refresh token has been revoked');
    const newToken = await createRefreshToken(record.userId, record.familyId);
    return { userId: record.userId, newToken };
}
/** Revoke a single token (logout on this device). */
async function revokeRefreshToken(rawToken) {
    await refreshToken_1.default.update({ revokedAt: new Date() }, { where: { tokenHash: hashToken(rawToken), revokedAt: null } });
}
/** Revoke every session for a user (password change, logout everywhere, deactivation). */
async function revokeAllForUser(userId) {
    await refreshToken_1.default.update({ revokedAt: new Date() }, { where: { userId, revokedAt: null } });
}
/** Housekeeping: call from a cron / setInterval once a day. */
async function deleteExpiredTokens() {
    return refreshToken_1.default.destroy({ where: { expiresAt: { [sequelize_1.Op.lt]: new Date() } } });
}
//# sourceMappingURL=tokenService.js.map