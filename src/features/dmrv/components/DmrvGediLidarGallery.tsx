import React, { useState } from 'react';

export const GEDI_LIDAR_PRIMARY_IMAGE = '/dmrv/lidar/gedi-iss-mount.png';

export const GEDI_LIDAR_GALLERY: { src: string; alt: string; caption: string }[] = [
  {
    src: GEDI_LIDAR_PRIMARY_IMAGE,
    alt: 'GEDI instrument mounted on the International Space Station',
    caption: 'GEDI on ISS — spaceborne lidar on the JEM exposed facility',
  },
  {
    src: '/dmrv/lidar/gedi-laser-optics.png',
    alt: 'GEDI laser optical cavity schematic',
    caption: 'Laser bench — 40 cm cavity (high-reflectivity mirror to graded reflectivity mirror)',
  },
];

export type DmrvGediLidarGalleryProps = {
  compact?: boolean;
  className?: string;
};

function GalleryImage({
  src,
  alt,
  caption,
  compact,
}: {
  src: string;
  alt: string;
  caption: string;
  compact?: boolean;
}): React.ReactElement {
  const [failed, setFailed] = useState(false);
  if (failed) {
    return (
      <figure className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-center text-[10px] text-slate-500">
        {caption}
      </figure>
    );
  }
  return (
    <figure className="overflow-hidden rounded-lg border border-slate-200 bg-gradient-to-b from-slate-50 to-white">
      <img
        src={src}
        alt={alt}
        loading="lazy"
        decoding="async"
        className={`mx-auto w-full object-contain ${compact ? 'max-h-[140px] p-2' : 'max-h-[200px] p-3'}`}
        onError={() => setFailed(true)}
      />
      <figcaption className="border-t border-slate-100 px-2.5 py-1.5 text-[10px] leading-snug text-slate-600">
        {caption}
      </figcaption>
    </figure>
  );
}

/** NASA GEDI mission reference — ISS mount + laser cavity (educational, not live product imagery). */
export function DmrvGediLidarGallery({
  compact = false,
  className = '',
}: DmrvGediLidarGalleryProps): React.ReactElement {
  return (
    <div className={`space-y-2 ${className}`.trim()}>
      <p className="text-[10px] font-black uppercase tracking-[0.12em] text-[#1e3a5f]">NASA GEDI LiDAR</p>
      <div className={compact ? 'space-y-2' : 'grid gap-2 sm:grid-cols-2'}>
        {GEDI_LIDAR_GALLERY.map((item) => (
          <GalleryImage key={item.src} {...item} compact={compact} />
        ))}
      </div>
      <p className="text-[10px] leading-relaxed text-slate-500">
        Reference imagery for canopy height and 3D structure validation — not a live scene pull from your AOI.
      </p>
    </div>
  );
}
