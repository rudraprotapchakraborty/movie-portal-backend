import { Schema, model, Document } from "mongoose";

export interface ISubscriber extends Document {
  email: string;
  createdAt: Date;
}

const subscriberSchema = new Schema<ISubscriber>(
  { email: { type: String, required: true, unique: true, lowercase: true, trim: true } },
  { timestamps: { createdAt: true, updatedAt: false } }
);

export const Subscriber = model<ISubscriber>("Subscriber", subscriberSchema);
