import { Schema, model, models, type InferSchemaType, type Model } from "mongoose";

const UserSchema = new Schema(
  {
    username: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      lowercase: true,
    },
    // Signup will hash the password before saving it here.
    // Login must explicitly request this field with .select("+passwordHash").
    passwordHash: {
      type: String,
      required: true,
      select: false,
    },
  },
  { timestamps: true },
);

export type UserDoc = InferSchemaType<typeof UserSchema>;

// Reuse the model during Next.js hot reloads.
export const User =
  (models.User as Model<UserDoc> | undefined) ||
  model<UserDoc>("User", UserSchema, "users");
