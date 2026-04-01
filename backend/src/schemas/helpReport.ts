import { z } from 'zod';

// ─── Enums ────────────────────────────────────────────────────────────────────

export const ReportStatusEnum = z.enum([
  'submitted', 'under_review', 'awaiting_contact', 'awaiting_documents',
  'assigned', 'in_progress', 'referred_out', 'resolved', 'closed',
  'rejected', 'duplicate',
]);

export const ReportUrgencyEnum = z.enum(['low', 'normal', 'high', 'urgent', 'emergency']);

export const ReportSourceEnum = z.enum(['web', 'mobile', 'admin', 'phone_intake', 'api']);

export const NoteTypeEnum = z.enum(['internal', 'follow_up', 'resolution', 'contact_log']);

export const ContactMethodEnum = z.enum(['email', 'phone', 'text', 'any']);

// ─── Schemas ──────────────────────────────────────────────────────────────────

export const ContactSchema = z.object({
  fullName:               z.string().max(120).optional(),
  phone:                  z.string().max(30).optional(),
  email:                  z.string().email().max(180).optional(),
  preferredContactMethod: ContactMethodEnum.default('email'),
  safeToCall:             z.boolean().default(true),
  safeToText:             z.boolean().default(true),
});

export const LocationSchema = z.object({
  country:       z.string().max(80).optional(),
  stateRegion:   z.string().max(80).optional(),
  city:          z.string().max(80).optional(),
  address:       z.string().max(200).optional(),
  latitude:      z.number().min(-90).max(90).optional(),
  longitude:     z.number().min(-180).max(180).optional(),
  locationNotes: z.string().max(300).optional(),
});

export const CreateHelpReportSchema = z.object({
  category:               z.string().min(1).max(80),
  subcategory:            z.string().max(80).optional(),
  tags:                   z.array(z.string().max(40)).max(10).default([]),
  title:                  z.string().min(3).max(200),
  description:            z.string().min(10).max(5000),
  urgency:                ReportUrgencyEnum.default('normal'),
  source:                 ReportSourceEnum.default('web'),
  isAnonymous:            z.boolean().default(false),
  needsImmediateResponse: z.boolean().default(false),
  language:               z.string().max(10).default('en'),
  occurredAt:             z.string().datetime().optional(),
  contact:                ContactSchema.optional(),
  location:               LocationSchema.optional(),
});

export const UpdateStatusSchema = z.object({
  status: ReportStatusEnum,
  reason: z.string().max(500).optional(),
});

export const AddNoteSchema = z.object({
  noteType: NoteTypeEnum.default('internal'),
  body:     z.string().min(1).max(2000),
});

export const AssignReportSchema = z.object({
  assignedTo: z.string().min(1),
  team:       z.string().max(80).optional(),
});

export const AdminListQuerySchema = z.object({
  page:       z.coerce.number().int().min(1).default(1),
  limit:      z.coerce.number().int().min(1).max(100).default(25),
  status:     ReportStatusEnum.optional(),
  urgency:    ReportUrgencyEnum.optional(),
  category:   z.string().optional(),
  search:     z.string().max(200).optional(),
  dateFrom:   z.string().optional(),
  dateTo:     z.string().optional(),
  assignedTo: z.string().optional(),
  city:       z.string().optional(),
  sortBy:     z.enum(['createdAt', 'updatedAt', 'urgency']).default('createdAt'),
  sortDir:    z.enum(['asc', 'desc']).default('desc'),
});

export type CreateHelpReportInput  = z.infer<typeof CreateHelpReportSchema>;
export type UpdateStatusInput      = z.infer<typeof UpdateStatusSchema>;
export type AddNoteInput           = z.infer<typeof AddNoteSchema>;
export type AssignReportInput      = z.infer<typeof AssignReportSchema>;
export type AdminListQueryInput    = z.infer<typeof AdminListQuerySchema>;
