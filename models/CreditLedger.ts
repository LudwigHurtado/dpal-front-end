import { Schema, model, Document } from 'mongoose';

export interface ICreditLedger extends Document {
  userId: string;
  type: 'CREDIT_LOCK' | 'CREDIT_SPEND' | 'CREDIT_UNLOCK' | 'DEPOSIT';
  amount: number;
  direction: 'CREDIT' | 'DEBIT';
  referenceId: string;
  idempotencyKey: string;
  meta?: any;
  createdAt: Date;
}

const CreditLedgerSchema = new Schema<ICreditLedger>({
  userId: { type: String, required: true },
  type: { type: String, required: true },
  amount: { type: Number, required: true },
  direction: { type: String, required: true },
  referenceId: { type: String, required: true },
  idempotencyKey: { type: String, required: true, unique: true },
  meta: Schema.Types.Mixed
}, { timestamps: { createdAt: true, updatedAt: false } });

export const CreditLedger = model<ICreditLedger>('CreditLedger', CreditLedgerSchema);