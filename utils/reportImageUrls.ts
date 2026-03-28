/**
 * Build persistent data URLs for image attachments so feeds and localStorage JSON
 * can display thumbnails (File objects do not serialize).
 */
export async function deriveImageDataUrlsFromFiles(files: File[], maxImages = 6): Promise<string[]> {
  const out: string[] = [];
  for (const f of files) {
    if (!f?.type?.startsWith('image/')) continue;
    try {
      const dataUrl = await new Promise<string>((resolve, reject) => {
        const r = new FileReader();
        r.onload = () => resolve(typeof r.result === 'string' ? r.result : '');
        r.onerror = () => reject(r.error);
        r.readAsDataURL(f);
      });
      if (dataUrl.length > 32) out.push(dataUrl);
      if (out.length >= maxImages) break;
    } catch {
      /* skip unreadable file */
    }
  }
  return out;
}
