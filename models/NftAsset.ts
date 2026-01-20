// Import Buffer to resolve 'Cannot find name Buffer' error in environments without Node.js types.
import { Buffer } from 'buffer';
import { Schema, model, Document } from 'mongoose';

export interface INftAsset extends Document {
  tokenId: string;
  collectionId: string;
  chain: string;
  metadataUri: string;
  imageUri: string;
  attributes: Array<{ trait_type: string, value: any }>;
  createdByUserId: string;
  status: 'DRAFT' | 'MINTED' | 'BURNED';
  imageData?: Buffer;
}

const NftAssetSchema = new Schema<INftAsset>({
  tokenId: { type: String, required: true, unique: true },
  collectionId: { type: String, required: true },
  chain: { type: String, required: true },
  metadataUri: { type: String, required: true },
  imageUri: { type: String, required: true },
  attributes: [{ trait_type: String, value: Schema.Types.Mixed }],
  createdByUserId: { type: String, required: true },
  status: { type: String, default: 'MINTED' },
  imageData: { type: Schema.Types.Buffer }
}, { timestamps: true });

export const NftAsset = model<INftAsset>('NftAsset', NftAssetSchema);