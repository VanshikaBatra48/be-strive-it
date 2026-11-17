"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getAllUsersSchema = exports.changePasswordSchema = exports.loginSchema = exports.getUserSchema = exports.assignMentorSchema = exports.updateUserSchema = exports.createUserSchema = exports.userStatusEnum = exports.userRoleEnum = void 0;
const zod_1 = require("zod");
exports.userRoleEnum = zod_1.z.enum(["admin", "mentee", "mentor"]);
exports.userStatusEnum = zod_1.z.enum(["active", "inactive"]);
const idParam = zod_1.z.object({
    id: zod_1.z.string().regex(/^[1-9]\d*$/, "Invalid user ID"),
});
const positiveIntId = zod_1.z.preprocess((v) => (typeof v === "string" && /^\d+$/.test(v.trim()) ? Number(v.trim()) : v), zod_1.z.number().int("Invalid mentor ID").positive("Invalid mentor ID"));
const nullableMentorIdField = zod_1.z.preprocess((v) => (v === "" ? null : v), positiveIntId.nullable());
const emailField = zod_1.z.email("Invalid email").trim().toLowerCase();
const nameField = zod_1.z
    .string()
    .trim()
    .min(2, "Name must be at least 2 characters")
    .max(50, "Name must be at most 50 characters")
    .regex(/^[\p{L}][\p{L}\s'.-]*$/u, "Name can only contain letters and spaces");
const passwordField = zod_1.z
    .string()
    .min(8, "Password must be at least 8 characters")
    .max(72, "Password must be at most 72 characters");
const assignedMenteesField = zod_1.z.array(zod_1.z.coerce.number().int().positive("Mentee ID must be a positive integer"));
// CREATE: optional password (backend generates temp password if omitted), role required
exports.createUserSchema = zod_1.z.object({
    body: zod_1.z.strictObject({
        name: nameField,
        email: emailField,
        role: exports.userRoleEnum,
        status: exports.userStatusEnum.optional(),
        password: passwordField.optional(),
        mentor_id: nullableMentorIdField.optional(),
        assigned_to: zod_1.z.string().trim().min(1).nullable().optional(),
        assignedMentees: assignedMenteesField.optional(),
    }),
});
// UPDATE: all optional, at least one required
exports.updateUserSchema = zod_1.z.object({
    params: idParam,
    body: zod_1.z
        .strictObject({
        name: nameField,
        email: emailField,
        role: exports.userRoleEnum,
        status: exports.userStatusEnum,
        password: passwordField,
        mentor_id: nullableMentorIdField,
        assigned_to: zod_1.z.string().trim().min(1).nullable(),
        assignedMentees: assignedMenteesField,
    })
        .partial()
        .refine((d) => Object.keys(d).length > 0, {
        message: "At least one field is required",
    }),
});
// ASSIGN / CHANGE / REMOVE MENTOR (Admin only)
exports.assignMentorSchema = zod_1.z.object({
    params: idParam,
    body: zod_1.z
        .strictObject({
        mentor_id: nullableMentorIdField.optional(),
        mentorId: nullableMentorIdField.optional(),
    })
        .refine((d) => d.mentor_id !== undefined || d.mentorId !== undefined, {
        message: "mentor_id is required (pass a mentor ID or null to unassign)",
    })
        .refine((d) => d.mentor_id === undefined ||
        d.mentorId === undefined ||
        d.mentor_id === d.mentorId, {
        message: "Conflicting mentor_id and mentorId values",
    })
        .transform((d) => ({
        mentor_id: d.mentor_id !== undefined ? d.mentor_id : (d.mentorId ?? null),
    })),
});
// GET / DELETE / complete-first-login
exports.getUserSchema = zod_1.z.object({ params: idParam });
// LOGIN
exports.loginSchema = zod_1.z.object({
    body: zod_1.z.object({
        email: emailField,
        password: zod_1.z.string().min(1, "Password is required"),
    }),
});
// CHANGE PASSWORD
exports.changePasswordSchema = zod_1.z.object({
    body: zod_1.z.object({
        currentPassword: zod_1.z.string().min(1, "Current password is required").optional(),
        newPassword: zod_1.z
            .string()
            .min(8, "New password must be at least 8 characters")
            .max(72, "New password must be at most 72 characters")
            .regex(/[A-Z]/, "Password must contain at least one uppercase letter")
            .regex(/[a-z]/, "Password must contain at least one lowercase letter")
            .regex(/[0-9]/, "Password must contain at least one number")
            .regex(/[!@#$%^&*(),.?":{}|<>_\-]/, "Password must contain at least one special character")
    }),
});
// GET ALL USERS (query filters)
exports.getAllUsersSchema = zod_1.z.object({
    query: zod_1.z.object({
        id: zod_1.z.string().regex(/^[1-9]\d*$/, "Invalid id").optional(),
        email: zod_1.z.string().trim().optional(),
        role: exports.userRoleEnum.optional(),
        status: exports.userStatusEnum.optional(),
        name: zod_1.z.string().trim().optional(),
        assigned_to: zod_1.z.string().trim().optional(),
        mentor_id: zod_1.z.string().regex(/^[1-9]\d*$/, "Invalid mentor_id").optional(),
    }),
});
//# sourceMappingURL=userSchema.js.map