import { Schema, model, models, type InferSchemaType, type Model } from "mongoose";

const SessionSchema = new Schema(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    // Store only the hash. The original random token belongs in the cookie.
    tokenHash: {
      type: String,
      required: true,
      unique: true,
      select: false,
    },
    expiresAt: {
      type: Date,
      required: true,
    },
  },
  { timestamps: true },
);

// MongoDB removes expired records in the background, not immediately.
// Authentication must still check expiresAt on every session lookup.
SessionSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export type SessionDoc = InferSchemaType<typeof SessionSchema>;

export const Session =
  (models.Session as Model<SessionDoc> | undefined) ||
  model<SessionDoc>("Session", SessionSchema, "sessions");
