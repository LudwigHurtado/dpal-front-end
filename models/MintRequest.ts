import { Schema, model, Document } from 'mongoose';

export interface IMintRequest extends Document {
  userId: string;
  assetDraftId: string;
  collectionId: string;
  priceCredits: number;
  chain: string;
  idempotencyKey: string;
  nonce: string;
  timestamp: number;
  signature?: string;
  status: 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED';
  error?: string;
}

const MintRequestSchema = new Schema<IMintRequest>({
  userId: { type: String, required: true },
  assetDraftId: { type: String, required: true },
  collectionId: { type: String, required: true },
  priceCredits: { type: Number, required: true },
  chain: { type: String, required: true },
  idempotencyKey: { type: String, required: true, unique: true },
  nonce: { type: String, required: true },
  timestamp: { type: Number, required: true },
  signature: { type: String, required: false }, // Signature optional for prototype forging
  status: { type: String, default: 'PENDING' },
  error: String
}, { timestamps: true });

// Prevent replay by unique (userId, nonce)
MintRequestSchema.index({ userId: 1, nonce: 1 }, { unique: true });

export const MintRequest = model<IMintRequest>('MintRequest', MintRequestSchema);