
import mongoose from 'mongoose';
import { CreditWallet } from '../models/CreditWallet';
import { CreditLedger } from '../models/CreditLedger';
import { MintRequest } from '../models/MintRequest';
import { MintReceipt } from '../models/MintReceipt';
import { NftAsset } from '../models/NftAsset';
import { AuditEvent } from '../models/AuditEvent';
import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY || '' });

export const executeMintFlow = async (userId: string, payload: any) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const { assetDraftId, collectionId, chain, priceCredits, idempotencyKey } = payload;

    // 1. Lock Credits
    const wallet = await CreditWallet.findOneAndUpdate(
      { userId, balance: { $gte: priceCredits } },
      { 
        $inc: { balance: -priceCredits, lockedBalance: priceCredits },
        $set: { updatedAt: new Date() }
      },
      { session, new: true }
    );

    if (!wallet) throw new Error('INSUFFICIENT_CREDITS');

    const lockLedger = await CreditLedger.create([{
      userId,
      type: 'CREDIT_LOCK',
      amount: priceCredits,
      direction: 'DEBIT',
      referenceId: assetDraftId,
      idempotencyKey: `lock-${idempotencyKey}`
    }], { session });

    // 2. Initialize Request
    const request = await MintRequest.create([{
      ...payload,
      userId,
      status: 'PROCESSING'
    }], { session });

    // 3. Perform Mint (Internal Simulation)
    // In a production app, this would call the On-Chain Service
    const tokenId = `TOK-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
    const txHash = `0x-internal-${Math.random().toString(16).slice(2)}`;

    // 4. Generate Metadata via Gemini (Optional enhancement)
    const asset = await NftAsset.create([{
      tokenId,
      collectionId,
      chain,
      metadataUri: `dpal://metadata/${tokenId}`,
      imageUri: `https://api.dpal.net/v1/assets/${tokenId}.png`,
      attributes: payload.attributes || [],
      createdByUserId: userId,
      status: 'MINTED'
    }], { session });

    // 5. Settle Credits
    await CreditWallet.updateOne(
      { userId },
      { $inc: { lockedBalance: -priceCredits } },
      { session }
    );

    await CreditLedger.create([{
      userId,
      type: 'CREDIT_SPEND',
      amount: priceCredits,
      direction: 'DEBIT',
      referenceId: request[0]._id,
      idempotencyKey: `spend-${idempotencyKey}`
    }], { session });

    // 6. Final Receipt
    const receipt = await MintReceipt.create([{
      mintRequestId: request[0]._id,
      userId,
      tokenId,
      txHash,
      chain,
      metadataUri: asset[0].metadataUri,
      priceCredits,
      ledgerEntryId: lockLedger[0]._id
    }], { session });

    await MintRequest.updateOne({ _id: request[0]._id }, { status: 'COMPLETED' }, { session });

    // 7. Audit
    await AuditEvent.create([{
      actorUserId: userId,
      action: 'NFT_MINT',
      entityType: 'NftAsset',
      entityId: asset[0]._id,
      hash: txHash,
      meta: { priceCredits, tokenId }
    }], { session });

    await session.commitTransaction();
    return receipt[0];

  } catch (error: any) {
    await session.abortTransaction();
    
    // Compensation if failure happened outside the auto-abort scope
    // (e.g. external API call that we want to track as FAILED rather than rolled back)
    console.error(`[MINT_FAILURE] userId: ${userId} error: ${error.message}`);
    throw error;
  } finally {
    session.endSession();
  }
};
