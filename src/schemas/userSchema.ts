import { z } from "zod";

export const userRoleEnum = z.enum(["admin", "mentee", "mentor"]);
export const userStatusEnum = z.enum(["active", "inactive"]);

const idParam = z.object({
  id: z.string().regex(/^\d+$/, "Invalid user ID"),
});

const emailField = z.email("Invalid email").trim().toLowerCase();


export const createUserSchema = z.object({
  body: z.strictObject({
    name: z.string().trim().min(2, "Name must be at least 2 characters"),
    email: emailField,
    role: userRoleEnum,
    assigned_to: z.string().trim().min(1).nullable().optional(),
  }),
});

// UPDATE: all optional, at least one required
export const updateUserSchema = z.object({
  params: idParam,
  body: z
    .strictObject({
      name: z.string().trim().min(2, "Name cannot be empty"),
      email: emailField,
      role: userRoleEnum,
      status: userStatusEnum,
      assigned_to: z.string().trim().min(1).nullable(),
    })
    .partial()
    .refine((d) => Object.keys(d).length > 0, {
      message: "At least one field is required",
    }),
});

// GET / DELETE / complete-first-login
export const getUserSchema = z.object({ params: idParam });

// LOGIN
export const loginSchema = z.object({
  body: z.object({
    email: emailField,
    password: z.string().min(1, "Password is required"),
  }),
});

// CHANGE PASSWORD
export const changePasswordSchema = z.object({
  body: z.object({
    currentPassword: z.string().min(1, "Current password is required"),
    newPassword: z
      .string()
      .min(8, "New password must be at least 8 characters")
      .max(72, "New password must be at most 72 characters"),
  }),
});

// GET ALL USERS (query filters)
export const getAllUsersSchema = z.object({
  query: z.object({
    id: z.string().regex(/^\d+$/, "Invalid id").optional(),
    email: z.string().trim().optional(),
    role: userRoleEnum.optional(),
    status: userStatusEnum.optional(),
    name: z.string().trim().optional(),
    assigned_to: z.string().trim().optional(),
  }),
});

export type CreateUserBody = z.infer<typeof createUserSchema>["body"];
export type UpdateUserBody = z.infer<typeof updateUserSchema>["body"];
export type LoginBody = z.infer<typeof loginSchema>["body"];
export type ChangePasswordBody = z.infer<typeof changePasswordSchema>["body"];