
import { Schema, model, Document, Types } from 'mongoose';

export interface ICreditWallet extends Document {
  userId: Types.ObjectId;
  balance: number;
  lockedBalance: number;
  updatedAt: Date;
  version: number;
}

const CreditWalletSchema = new Schema<ICreditWallet>({
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
  balance: { type: Number, default: 0, min: 0 },
  lockedBalance: { type: Number, default: 0, min: 0 },
  updatedAt: { type: Date, default: Date.now }
}, { timestamps: true, versionKey: 'version' });

export const CreditWallet = model<ICreditWallet>('CreditWallet', CreditWalletSchema);
