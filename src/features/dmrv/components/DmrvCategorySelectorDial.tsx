import React, { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { ShieldCheck } from '../../../../components/icons';
import { DMRV_CATEGORIES } from '../dmrvRegistry';
import { dmrvCategoryPath } from '../dmrvNavigation';
import { DmrvBlockchainSymbol } from './DmrvBlockchainSymbol';
import {
  AdaptiveDmrvSelectorDial,
  type AdaptiveDmrvSelectorItem,
} from './AdaptiveDmrvSelectorDial';

const CATEGORY_SHORT_LABELS: Record<string, string> = {
  'carbon-land': 'Forest / Land',
  'water-blue-carbon': 'Wetland / Water',
  'pollution-emissions': 'Pollution',
  'biodiversity-ecosystems': 'Biodiversity',
  'climate-risk-disaster': 'Climate Risk',
  'urban-energy-infrastructure': 'Urban / Built',
  'supply-chain-corporate-claims': 'Supply Chain',
  'community-public-accountability': 'Community',
  'custom-advanced-intelligence': 'Custom',
};

export type DmrvCategorySelectorDialProps = {
  currentSlug?: string;
  projectId?: string | null;
  typeId?: string | null;
};

export function DmrvCategorySelectorDial({
  currentSlug,
  projectId,
  typeId,
}: DmrvCategorySelectorDialProps): React.ReactElement {
  const navigate = useNavigate();
  const activeSlug = currentSlug ?? DMRV_CATEGORIES[0]?.slug ?? 'carbon-land';
  const activeCategory = DMRV_CATEGORIES.find((c) => c.slug === activeSlug) ?? DMRV_CATEGORIES[0];
  const accentColor = activeCategory?.color ?? '#1e3a5f';

  const items = useMemo<AdaptiveDmrvSelectorItem[]>(
    () =>
      DMRV_CATEGORIES.map((category) => ({
        id: category.slug,
        label: category.title,
        shortLabel: CATEGORY_SHORT_LABELS[category.slug] ?? category.title,
        color: category.color,
      })),
    [],
  );

  const handleSelect = (slug: string) => {
    navigate(dmrvCategoryPath(slug, typeId ?? undefined, projectId ?? undefined));
  };

  return (
    <AdaptiveDmrvSelectorDial
      title="DMRV selector"
      helperText="Choose the environment type to determine the appropriate DMRV approach."
      items={items}
      activeId={activeSlug}
      onSelect={handleSelect}
      footer={<CategoryDialFooter accentColor={accentColor} />}
    />
  );
}

function CategoryDialFooter({ accentColor }: { accentColor: string }): React.ReactElement {
  return (
    <div
      className="flex items-start gap-2 rounded-xl border px-3 py-2.5 text-[10px] leading-snug text-slate-600"
      style={{ borderColor: `${accentColor}55`, backgroundColor: `${accentColor}0d` }}
    >
      <span className="mt-0.5 flex shrink-0 flex-col items-center gap-1">
        <DmrvBlockchainSymbol size={22} accentColor={accentColor} className="rounded overflow-hidden" />
        <ShieldCheck className="h-3.5 w-3.5 shrink-0" style={{ color: accentColor }} aria-hidden />
      </span>
      <p>
        Each domain opens its own DMRV board with evaluation types and evidence inputs. Selection does not imply
        certification or automatic verification.
      </p>
    </div>
  );
}
