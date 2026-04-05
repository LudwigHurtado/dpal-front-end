import React, { useState } from 'react';
import { type Hero } from '../../types';
import { Award, Package, ChevronRight } from '../icons';

interface InventoryPreviewProps {
    hero: Hero;
}

const InventoryPreview: React.FC<InventoryPreviewProps> = ({ hero }) => {
    const [filter, setFilter] = useState<'ALL' | 'NFT' | 'BADGE'>('ALL');

    const nfts = hero.personas.map((p) => ({
        id: p.id,
        type: 'NFT' as const,
        title: p.name,
        img: p.imageUrl,
        rarity: 'Rare',
    }));
    const badges = [
        { id: 'b1', type: 'BADGE' as const, title: 'Trusted helper', img: null, rarity: 'Special' },
        { id: 'b2', type: 'BADGE' as const, title: 'Community pillar', img: null, rarity: 'Standard' },
    ];

    const items = [...nfts, ...badges].filter((i) => filter === 'ALL' || i.type === filter);

    return (
        <div className="relative overflow-hidden rounded-3xl border border-stone-700/80 bg-stone-900/70 p-8 shadow-xl">
            <div className="relative z-10 mb-8 flex flex-col items-stretch justify-between gap-4 sm:flex-row sm:items-center">
                <div className="flex rounded-2xl border border-stone-700 bg-stone-950/60 p-1">
                    {(['ALL', 'NFT', 'BADGE'] as const).map((f) => (
                        <button
                            key={f}
                            type="button"
                            onClick={() => setFilter(f)}
                            className={`rounded-xl px-4 py-2 text-[11px] font-semibold transition-colors ${
                                filter === f ? 'bg-stone-700 text-amber-100' : 'text-stone-500 hover:text-stone-300'
                            }`}
                        >
                            {f === 'ALL' ? 'All' : f === 'NFT' ? 'Portraits' : 'Badges'}
                        </button>
                    ))}
                </div>
                <button
                    type="button"
                    className="flex items-center justify-center gap-1 text-sm font-medium text-amber-200/90 hover:text-amber-100"
                >
                    Open full collection
                    <ChevronRight className="h-4 w-4" />
                </button>
            </div>

            <div className="relative z-10 grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4">
                {items.length > 0 ? (
                    items.map((item) => (
                        <div
                            key={item.id}
                            className="rounded-2xl border border-stone-700/80 bg-stone-950/50 p-3 shadow-md transition-colors hover:border-amber-900/50"
                        >
                            <div className="relative mb-3 aspect-[3/4] overflow-hidden rounded-xl border border-stone-700/60 bg-stone-900">
                                {item.img ? (
                                    <img src={item.img} className="h-full w-full object-cover" alt="" />
                                ) : (
                                    <div className="flex h-full w-full items-center justify-center text-stone-600">
                                        <Award className="h-10 w-10" />
                                    </div>
                                )}
                                <div className="absolute right-2 top-2">
                                    <span
                                        className={`rounded border px-1.5 py-0.5 text-[9px] font-semibold ${
                                            item.rarity === 'Special'
                                                ? 'border-amber-500/60 bg-black/70 text-amber-200'
                                                : 'border-stone-600 bg-black/70 text-stone-400'
                                        }`}
                                    >
                                        {item.rarity}
                                    </span>
                                </div>
                            </div>
                            <h4 className="mb-2 truncate text-center text-[11px] font-semibold text-stone-100">{item.title}</h4>
                            <button
                                type="button"
                                className="w-full rounded-lg bg-stone-800 py-2 text-[10px] font-semibold text-stone-200 transition-colors hover:bg-stone-700"
                            >
                                Use
                            </button>
                        </div>
                    ))
                ) : (
                    <div className="col-span-full flex flex-col items-center py-16 text-stone-500">
                        <Package className="mb-4 h-14 w-14 opacity-40" />
                        <p className="text-sm">No items yet—help others to earn keepsakes.</p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default InventoryPreview;
