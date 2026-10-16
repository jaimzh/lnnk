import { z } from "zod";

export const signupSchema = z
  .object({
    username: z
      .string()
      .trim()
      .toLowerCase()
      .min(3, "Username must be at least 3 characters.")
      .max(32, "Username must be 32 characters or fewer.")
      .regex(/^[a-z0-9_-]+$/, "Use only letters, numbers, underscores, and hyphens."),
    password: z
      .string()
      .min(8, "Password must be at least 8 characters.")
      .refine(
        (password) => new TextEncoder().encode(password).length <= 72,
        "Password must be 72 bytes or fewer. Symbols may use more than one byte.",
      ),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords must match.",
    path: ["confirmPassword"],
  });
