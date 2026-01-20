
import { Schema, model, Document, Types } from 'mongoose';

export interface IAuditEvent extends Document {
  actorUserId: Types.ObjectId;
  action: string;
  entityType: string;
  entityId: string;
  hash: string;
  ip?: string;
  userAgent?: string;
  meta?: any;
  createdAt: Date;
}

const AuditEventSchema = new Schema<IAuditEvent>({
  actorUserId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  action: { type: String, required: true },
  entityType: { type: String, required: true },
  entityId: { type: String, required: true },
  hash: { type: String, required: true },
  ip: String,
  userAgent: String,
  meta: Schema.Types.Mixed
}, { timestamps: { createdAt: true, updatedAt: false } });

export const AuditEvent = model<IAuditEvent>('AuditEvent', AuditEventSchema);
