import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!supabaseUrl || !supabaseServiceKey) {
  throw new Error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY env vars');
}

// Service-role client — server side only, never expose to frontend
export const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

export const STORAGE_BUCKET = process.env.SUPABASE_STORAGE_BUCKET ?? 'help-attachments';

/** Upload a file buffer to Supabase Storage. Returns the public URL. */
export async function uploadAttachment(
  reportId: string,
  fileName: string,
  buffer: Buffer,
  mimeType: string,
): Promise<{ path: string; publicUrl: string }> {
  const safeName = fileName.replace(/[^a-z0-9._-]/gi, '_');
  const path = `${reportId}/${Date.now()}_${safeName}`;

  const { error } = await supabase.storage.from(STORAGE_BUCKET).upload(path, buffer, {
    contentType: mimeType,
    upsert: false,
  });

  if (error) throw new Error(`Storage upload failed: ${error.message}`);

  const { data } = supabase.storage.from(STORAGE_BUCKET).getPublicUrl(path);
  return { path, publicUrl: data.publicUrl };
}
