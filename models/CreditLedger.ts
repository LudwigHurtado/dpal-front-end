
import { Schema, model, Document, Types } from 'mongoose';

export interface ICreditLedger extends Document {
  userId: Types.ObjectId;
  type: 'CREDIT_LOCK' | 'CREDIT_SPEND' | 'CREDIT_UNLOCK' | 'DEPOSIT';
  amount: number;
  direction: 'CREDIT' | 'DEBIT';
  referenceId: string; // e.g., mintRequestId
  idempotencyKey: string;
  meta?: any;
  createdAt: Date;
}

const CreditLedgerSchema = new Schema<ICreditLedger>({
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  type: { type: String, required: true },
  amount: { type: Number, required: true },
  direction: { type: String, required: true },
  referenceId: { type: String, required: true },
  idempotencyKey: { type: String, required: true, unique: true },
  meta: Schema.Types.Mixed
}, { timestamps: { createdAt: true, updatedAt: false } });

export const CreditLedger = model<ICreditLedger>('CreditLedger', CreditLedgerSchema);
