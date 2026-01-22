import React, { useState } from 'react';
import { type Hero } from '../../types';
import { Box, Award, Sparkles, Package, ShieldCheck, ChevronRight } from '../icons';

interface InventoryPreviewProps {
    hero: Hero;
}

const InventoryPreview: React.FC<InventoryPreviewProps> = ({ hero }) => {
    const [filter, setFilter] = useState<'ALL' | 'NFT' | 'BADGE'>('ALL');

    const nfts = hero.personas.map(p => ({ id: p.id, type: 'NFT', title: p.name, img: p.imageUrl, rarity: 'Rare' }));
    // Mock Badges
    const badges = [
        { id: 'b1', type: 'BADGE', title: 'Evidence Ace', rarity: 'Legendary' },
        { id: 'b2', type: 'BADGE', title: 'Community Pillar', rarity: 'Standard' }
    ];

    const items = [...nfts, ...badges].filter(i => filter === 'ALL' || i.type === filter);

    return (
        <div className="bg-zinc-900 border-2 border-zinc-800 rounded-[3rem] p-10 space-y-10 shadow-2xl relative overflow-hidden">
             <div className="flex flex-col sm:flex-row justify-between items-center gap-6 relative z-10">
                <div className="flex bg-black/60 p-1 rounded-2xl border border-zinc-800">
                    {['ALL', 'NFT', 'BADGE'].map(f => (
                        <button 
                            key={f} 
                            onClick={() => setFilter(f as any)}
                            className={`px-6 py-2 rounded-xl text-[9px] font-black uppercase transition-all ${filter === f ? 'bg-zinc-800 text-cyan-400' : 'text-zinc-600 hover:text-zinc-400'}`}
                        >
                            {f}
                        </button>
                    ))}
                </div>
                <button className="text-[10px] font-black text-cyan-600 uppercase tracking-widest hover:text-cyan-400 flex items-center gap-2 group">
                    <span>Manage Archive</span>
                    <ChevronRight className="w-3 h-3 group-hover:translate-x-1 transition-transform" />
                </button>
             </div>

             <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-6 relative z-10">
                {items.length > 0 ? items.map(item => (
                    <div key={item.id} className="bg-zinc-950 border-2 border-zinc-800 hover:border-cyan-500/40 p-4 rounded-[2rem] transition-all group shadow-xl">
                        <div className="aspect-[3/4] rounded-2xl bg-zinc-900 overflow-hidden mb-4 border border-zinc-800 relative">
                            {item.img ? (
                                <img src={item.img} className="w-full h-full object-cover grayscale-[0.2] group-hover:grayscale-0 transition-all duration-700" alt={item.title}/>
                            ) : (
                                <div className="w-full h-full flex items-center justify-center text-zinc-800">
                                    <Award className="w-12 h-12" />
                                </div>
                            )}
                            <div className="absolute top-2 right-2">
                                <span className={`px-2 py-0.5 rounded text-[7px] font-black border bg-black/80 ${item.rarity === 'Legendary' ? 'border-amber-500 text-amber-500' : 'border-zinc-700 text-zinc-500'}`}>{item.rarity.toUpperCase()}</span>
                            </div>
                        </div>
                        <h4 className="text-[10px] font-black text-white uppercase truncate text-center mb-4">{item.title}</h4>
                        <button className="w-full py-2 bg-zinc-900 hover:bg-white hover:text-black rounded-xl text-[8px] font-black uppercase tracking-widest transition-all">Equip</button>
                    </div>
                )) : (
                    <div className="col-span-full py-20 text-center opacity-20">
                         <Package className="w-16 h-16 mx-auto mb-6" />
                         <p className="text-xs font-black uppercase tracking-[0.5em]">No_Materials_Found</p>
                    </div>
                )}
             </div>
        </div>
    );
};

export default InventoryPreview;