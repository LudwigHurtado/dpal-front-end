import { Schema, model, Document, Types } from 'mongoose';

export interface IMintReceipt extends Document {
  mintRequestId: Types.ObjectId;
  userId: string;
  tokenId: string;
  txHash: string;
  chain: string;
  metadataUri: string;
  priceCredits: number;
  ledgerEntryId: Types.ObjectId;
  createdAt: Date;
}

const MintReceiptSchema = new Schema<IMintReceipt>({
  mintRequestId: { type: Schema.Types.ObjectId, ref: 'MintRequest', required: true },
  userId: { type: String, required: true },
  tokenId: { type: String, required: true, unique: true },
  txHash: { type: String, required: true },
  chain: { type: String, required: true },
  metadataUri: { type: String, required: true },
  priceCredits: { type: Number, required: true },
  ledgerEntryId: { type: Schema.Types.ObjectId, ref: 'CreditLedger', required: true }
}, { timestamps: { createdAt: true, updatedAt: false } });

export const MintReceipt = model<IMintReceipt>('MintReceipt', MintReceiptSchema);