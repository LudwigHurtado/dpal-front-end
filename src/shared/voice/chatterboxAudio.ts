/** Convert data:audio URIs to blob URLs for reliable HTMLAudioElement playback. */
export function toPlayableAudioSrc(audioUrl: string): { src: string; revoke?: () => void } {
  if (!audioUrl.startsWith('data:')) {
    return { src: audioUrl };
  }

  try {
    const comma = audioUrl.indexOf(',');
    if (comma < 0) return { src: audioUrl };

    const header = audioUrl.slice(0, comma);
    const base64 = audioUrl.slice(comma + 1);
    let mime = header.match(/data:([^;]+)/i)?.[1]?.trim() ?? 'audio/wav';
    if (mime === 'audio/x-wav' || mime === 'audio/wave') {
      mime = 'audio/wav';
    }

    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i += 1) {
      bytes[i] = binary.charCodeAt(i);
    }

    const blob = new Blob([bytes], { type: mime });
    const objectUrl = URL.createObjectURL(blob);
    return {
      src: objectUrl,
      revoke: () => URL.revokeObjectURL(objectUrl),
    };
  } catch {
    return { src: audioUrl };
  }
}
