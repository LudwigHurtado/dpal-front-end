/**
 * Build persistent data URLs for image attachments so feeds and localStorage JSON
 * can display thumbnails (File objects do not serialize).
 * Large photos are downscaled to limit heap and localStorage size.
 */

const MAX_DIMENSION = 1400;
const JPEG_QUALITY = 0.82;
/** Skip canvas work for small files (bytes) */
const INLINE_THRESHOLD = 450_000;

function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(typeof r.result === 'string' ? r.result : '');
    r.onerror = () => reject(r.error);
    r.readAsDataURL(file);
  });
}

async function downscaleImageToJpegDataUrl(file: File): Promise<string> {
  if (typeof createImageBitmap === 'undefined' || typeof document === 'undefined') {
    return readFileAsDataUrl(file);
  }
  let bitmap: ImageBitmap | null = null;
  try {
    bitmap = await createImageBitmap(file);
    const w = bitmap.width;
    const h = bitmap.height;
    const scale = Math.min(1, MAX_DIMENSION / Math.max(w, h));
    const tw = Math.max(1, Math.round(w * scale));
    const th = Math.max(1, Math.round(h * scale));
    const canvas = document.createElement('canvas');
    canvas.width = tw;
    canvas.height = th;
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      bitmap.close();
      return readFileAsDataUrl(file);
    }
    ctx.drawImage(bitmap, 0, 0, tw, th);
    bitmap.close();
    bitmap = null;
    return canvas.toDataURL('image/jpeg', JPEG_QUALITY);
  } catch {
    if (bitmap) try { bitmap.close(); } catch { /* ignore */ }
    return readFileAsDataUrl(file);
  }
}

async function fileToOptimizedDataUrl(file: File): Promise<string> {
  if (!file.type.startsWith('image/')) return '';
  if (file.size <= INLINE_THRESHOLD) {
    return readFileAsDataUrl(file);
  }
  return downscaleImageToJpegDataUrl(file);
}

export async function deriveImageDataUrlsFromFiles(files: File[], maxImages = 6): Promise<string[]> {
  const out: string[] = [];
  for (const f of files) {
    if (!f?.type?.startsWith('image/')) continue;
    try {
      const dataUrl = await fileToOptimizedDataUrl(f);
      if (dataUrl.length > 32) out.push(dataUrl);
      if (out.length >= maxImages) break;
    } catch {
      /* skip unreadable file */
    }
  }
  return out;
}
