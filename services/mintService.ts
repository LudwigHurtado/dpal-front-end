// Import Buffer to resolve 'Cannot find name Buffer' error in environments without Node.js types.
import { Buffer } from 'buffer';
import mongoose from 'mongoose';
import { CreditWallet } from '../models/CreditWallet';
import { CreditLedger } from '../models/CreditLedger';
import { MintRequest } from '../models/MintRequest';
import { MintReceipt } from '../models/MintReceipt';
import { NftAsset } from '../models/NftAsset';
import { AuditEvent } from '../models/AuditEvent';
import { GoogleGenAI } from "@google/genai";

// Fix: Always use literal process.env.API_KEY for initialization as per coding guidelines.
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

/**
 * Executes the full NFT minting transaction on the server.
 * Handles credit locking, image generation, asset creation, and ledger settlement.
 */
export const executeMintFlow = async (userId: string, payload: any) => {
  const { idempotencyKey, prompt, theme, category, priceCredits, nonce, timestamp } = payload;
  
  console.log(`[BACKEND_MINT_START] userId: ${userId} idempotency: ${idempotencyKey}`);

  // 1. Check Idempotency First
  const existingReceipt = await MintReceipt.findOne({ userId, idempotencyKey });
  if (existingReceipt) {
    console.log(`[MINT_IDEMPOTENCY_HIT] Returning existing receipt for ${idempotencyKey}`);
    return {
        ok: true,
        tokenId: existingReceipt.tokenId,
        imageUrl: `/api/assets/${existingReceipt.tokenId}.png`,
        txHash: existingReceipt.txHash,
        priceCredits: existingReceipt.priceCredits,
        mintedAt: existingReceipt.createdAt
    };
  }

  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    // 2. Credit Lock
    console.log(`[MINT_CREDIT_LOCK] Attempting lock for ${priceCredits} HC`);
    const wallet = await CreditWallet.findOneAndUpdate(
      { userId, balance: { $gte: priceCredits } },
      { 
        $inc: { balance: -priceCredits, lockedBalance: priceCredits },
        $set: { updatedAt: new Date() }
      },
      { session, new: true }
    );

    if (!wallet) throw new Error('INSUFFICIENT_CREDITS_SYNCHRONIZATION_FAILED');

    // 3. Create Mint Request Record
    const request = await MintRequest.create([{
      ...payload,
      userId,
      status: 'PROCESSING'
    }], { session });

    // 4. Generate Image via Google GenAI (Server Side Only)
    console.log(`[MINT_IMAGE_GEN_START] Creating artifact for concept: ${prompt}`);
    const imageResponse = await ai.models.generateContent({
      model: 'gemini-2.5-flash-image',
      contents: { 
        parts: [{ text: `A futuristic holographic accountability artifact for a decentralized ledger. Concept: ${prompt}. Visual Theme: ${theme}. Category: ${category}. High fidelity, 4K, ray-traced, cinematic perspective.` }] 
      },
      config: {
        imageConfig: {
          aspectRatio: "1:1"
        }
      }
    });

    let base64Image = '';
    for (const part of imageResponse.candidates[0].content.parts) {
      if (part.inlineData) {
        base64Image = part.inlineData.data;
        break;
      }
    }
    
    if (!base64Image) throw new Error('IMAGE_GENERATION_SUBSYSTEM_FAILURE');
    console.log(`[MINT_IMAGE_GEN_SUCCESS] Binary data materialized.`);

    // 5. Generate Ledger Identifiers
    const tokenId = `DPAL-${Date.now()}-${Math.floor(Math.random() * 9999).toString().padStart(4, '0')}`;
    const txHash = `0x${Math.random().toString(16).slice(2)}${Date.now().toString(16)}`;

    // 6. Persist Asset and Image Binary
    const asset = await NftAsset.create([{
      tokenId,
      collectionId: payload.collectionId || 'GENESIS_01',
      chain: payload.chain || 'DPAL_INTERNAL',
      metadataUri: `dpal://metadata/${tokenId}`,
      imageUri: `/api/assets/${tokenId}.png`, 
      attributes: payload.traits || [],
      createdByUserId: userId,
      status: 'MINTED',
      imageData: Buffer.from(base64Image, 'base64') 
    } as any], { session });

    // 7. Settle Credits and Ledger
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

    // 8. Final Immutable Receipt
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

    // 9. Permanent Audit Trail
    await AuditEvent.create([{
      actorUserId: userId,
      action: 'NFT_MINT',
      entityType: 'NftAsset',
      entityId: asset[0]._id,
      hash: txHash,
      meta: { priceCredits, tokenId, prompt }
    }], { session });

    await session.commitTransaction();
    console.log(`[MINT_TRANSACTION_COMMITTED] Token ${tokenId} stored.`);
    
    return {
        ok: true,
        tokenId,
        imageUrl: `/api/assets/${tokenId}.png`,
        txHash,
        priceCredits,
        mintedAt: receipt[0].createdAt
    };

  } catch (error: any) {
    if (session.inTransaction()) {
        await session.abortTransaction();
    }
    console.error(`[MINT_TRANSACTION_FAILED] userId: ${userId} error: ${error.message}`);
    
    try {
      await MintRequest.updateOne(
        { userId, idempotencyKey: payload.idempotencyKey },
        { status: 'FAILED', error: error.message }
      );
    } catch (e) { /* ignore secondary write failure */ }

    throw error;
  } finally {
    session.endSession();
  }
};

/**
 * Endpoint handler logic for GET /api/assets/:tokenId.png
 */
export const serveAssetImage = async (tokenId: string): Promise<{ buffer: Buffer, mimeType: string }> => {
  const asset = await NftAsset.findOne({ tokenId }) as any;
  if (!asset || !asset.imageData) throw new Error('ASSET_IDENTIFIER_INVALID_OR_NOT_FOUND');
  return { buffer: asset.imageData, mimeType: 'image/png' };
};
