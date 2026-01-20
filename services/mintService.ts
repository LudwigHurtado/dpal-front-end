import { Buffer } from 'buffer';
import mongoose from 'mongoose';
import { CreditWallet } from '../models/CreditWallet';
import { CreditLedger } from '../models/CreditLedger';
import { MintRequest } from '../models/MintRequest';
import { MintReceipt } from '../models/MintReceipt';
import { NftAsset } from '../models/NftAsset';
import { AuditEvent } from '../models/AuditEvent';
import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

/**
 * Executes the full NFT minting transaction on the server.
 * Robust implementation using String IDs for Operatives.
 */
export const executeMintFlow = async (userId: string, payload: any) => {
  const { idempotencyKey, prompt, theme, category, priceCredits, nonce, timestamp } = payload;
  
  console.log(`[BACKEND] Materializing Shard for Operative #${userId}...`);

  // 1. Idempotency Guard
  const existingReceipt = await MintReceipt.findOne({ userId, idempotencyKey });
  if (existingReceipt) {
    console.log(`[BACKEND] Shard already materialized for key: ${idempotencyKey}`);
    return {
        ok: true,
        tokenId: existingReceipt.tokenId,
        imageUrl: `/api/assets/${existingReceipt.tokenId}.png`,
        txHash: existingReceipt.txHash,
        priceCredits: existingReceipt.priceCredits,
        mintedAt: existingReceipt.createdAt
    };
  }

  // 2. Ensure Wallet Exists (Provision if missing)
  await CreditWallet.updateOne(
    { userId },
    { $setOnInsert: { balance: 10000, lockedBalance: 0 } }, 
    { upsert: true }
  );

  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    // 3. Lock Credits
    const wallet = await CreditWallet.findOneAndUpdate(
      { userId, balance: { $gte: priceCredits } },
      { 
        $inc: { balance: -priceCredits, lockedBalance: priceCredits },
        $set: { updatedAt: new Date() }
      },
      { session, new: true }
    );

    if (!wallet) throw new Error('INSUFFICIENT_RESOURCE_BALANCE');

    // 4. Record Request
    const request = await MintRequest.create([{
      ...payload,
      assetDraftId: `DRAFT-${Date.now()}`,
      collectionId: 'GENESIS_01',
      chain: 'DPAL_INTERNAL',
      userId,
      status: 'PROCESSING'
    }], { session });

    // 5. Generate Visual Telemetry (Gemini Oracle)
    console.log(`[BACKEND] Invoking Gemini Oracle for: ${prompt}`);
    const imageResponse = await ai.models.generateContent({
      model: 'gemini-2.5-flash-image',
      contents: { 
        parts: [{ text: `A futuristic holographic accountability artifact for a decentralized ledger. Concept: ${prompt}. Visual Theme: ${theme}. Category: ${category}. Cinematic lighting, 8k resolution, detailed glass and metal surfaces.` }] 
      },
      config: {
        imageConfig: { aspectRatio: "1:1" }
      }
    });

    let base64Image = '';
    for (const part of imageResponse.candidates[0].content.parts) {
      if (part.inlineData) {
        base64Image = part.inlineData.data;
        break;
      }
    }
    
    if (!base64Image) throw new Error('ORACLE_VISUAL_GENERATION_FAILED');

    // 6. Generate Shard Identifiers
    const tokenId = `DPAL-${Date.now()}-${Math.floor(Math.random() * 9999).toString().padStart(4, '0')}`;
    const txHash = `0x${Math.random().toString(16).slice(2)}${Date.now().toString(16)}`;

    // 7. Persist Shard Artifact
    const asset = await NftAsset.create([{
      tokenId,
      collectionId: 'GENESIS_01',
      chain: 'DPAL_INTERNAL',
      metadataUri: `dpal://metadata/${tokenId}`,
      imageUri: `/api/assets/${tokenId}.png`, 
      attributes: payload.traits || [],
      createdByUserId: userId,
      status: 'MINTED',
      imageData: Buffer.from(base64Image, 'base64') 
    }], { session });

    // 8. Settlement
    await CreditWallet.updateOne(
      { userId },
      { $inc: { lockedBalance: -priceCredits } },
      { session }
    );

    const ledgerEntry = await CreditLedger.create([{
      userId,
      type: 'CREDIT_SPEND',
      amount: priceCredits,
      direction: 'DEBIT',
      referenceId: request[0]._id,
      idempotencyKey: `spend-${idempotencyKey}`
    }], { session });

    const receipt = await MintReceipt.create([{
      mintRequestId: request[0]._id,
      userId,
      tokenId,
      txHash,
      chain: 'DPAL_INTERNAL',
      metadataUri: asset[0].metadataUri,
      priceCredits,
      ledgerEntryId: ledgerEntry[0]._id
    }], { session });

    await MintRequest.updateOne({ _id: request[0]._id }, { status: 'COMPLETED' }, { session });

    // 9. Permanent Audit
    await AuditEvent.create([{
      actorUserId: userId,
      action: 'NFT_MINT',
      entityType: 'NftAsset',
      entityId: asset[0]._id,
      hash: txHash,
      meta: { priceCredits, tokenId, prompt }
    }], { session });

    await session.commitTransaction();
    console.log(`[BACKEND] Shard ${tokenId} successfully committed to ledger.`);
    
    return {
        ok: true,
        tokenId,
        imageUrl: `/api/assets/${tokenId}.png`,
        txHash,
        priceCredits,
        mintedAt: receipt[0].createdAt
    };

  } catch (error: any) {
    if (session.inTransaction()) await session.abortTransaction();
    console.error(`[BACKEND] Materialization Failure: ${error.message}`);
    throw error;
  } finally {
    session.endSession();
  }
};

export const serveAssetImage = async (tokenId: string): Promise<{ buffer: Buffer, mimeType: string }> => {
  const asset = await NftAsset.findOne({ tokenId });
  if (!asset || !asset.imageData) throw new Error('SHARD_IDENTIFIER_NOT_FOUND');
  return { buffer: asset.imageData as Buffer, mimeType: 'image/png' };
};