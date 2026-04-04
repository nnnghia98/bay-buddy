/**
 * user.ts – Zod schemas for the User domain.
 *
 * Mirrors apps/api/models/user.py (UserCreate, UserRead, UserUpdate).
 * hashed_password is intentionally absent – never sent to the frontend.
 *
 * Auth reference: CLAUDE.md § Authentication & Security
 */

import { z } from "zod";
import { UserRoleSchema } from "./enums";

// ---------------------------------------------------------------------------
// Shared base – fields present on every user schema variant
// ---------------------------------------------------------------------------

const UserBaseSchema = z.object({
  /** Unique login identifier. Maps to Python: username */
  username: z
    .string()
    .min(3, "Username must be at least 3 characters.")
    .max(50, "Username must be at most 50 characters."),

  /** Access level role. Maps to Python: role */
  role: UserRoleSchema.default("STAFF"),

  /** Soft-delete flag. Maps to Python: is_active */
  is_active: z.boolean().default(true),
});

// ---------------------------------------------------------------------------
// UserCreate – POST /users
// ---------------------------------------------------------------------------

export const UserCreateSchema = UserBaseSchema.extend({
  /**
   * Plain-text password – hashed on the backend before storage.
   * Never persisted or returned as-is.
   */
  password: z.string().min(8, "Password must be at least 8 characters."),
});

export type UserCreate = z.infer<typeof UserCreateSchema>;

// ---------------------------------------------------------------------------
// UserRead – GET /users/:id (safe public representation)
// ---------------------------------------------------------------------------

export const UserReadSchema = UserBaseSchema.extend({
  /** UUID assigned by the backend. Read-only on the frontend. */
  id: z.string().uuid(),
});

export type UserRead = z.infer<typeof UserReadSchema>;

// ---------------------------------------------------------------------------
// UserUpdate – PATCH /users/:id (all fields optional)
// ---------------------------------------------------------------------------

export const UserUpdateSchema = z.object({
  username: z
    .string()
    .min(3, "Username must be at least 3 characters.")
    .max(50, "Username must be at most 50 characters.")
    .optional(),

  role: UserRoleSchema.optional(),

  is_active: z.boolean().optional(),

  /** Provide only when the user wants to change their password. */
  password: z
    .string()
    .min(8, "Password must be at least 8 characters.")
    .optional(),
});

export type UserUpdate = z.infer<typeof UserUpdateSchema>;
