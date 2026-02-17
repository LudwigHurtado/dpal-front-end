import React, { useMemo, useState } from 'react';
import { ArrowLeft, Monitor, Zap, Activity, Coins, Plus, CheckCircle, Play } from './icons';
import GoogleAdSlot from './GoogleAdSlot';

interface SustainmentCenterProps {
    onReturn: () => void;
    onReward: (hc: number) => void;
}

interface SupportVideo {
    id: string;
    title: string;
    youtubeId: string;
    addedBy: 'system' | 'user';
}

const STORAGE_KEY = 'dpal-support-node-videos';

const DEFAULT_VIDEOS: SupportVideo[] = [
    { id: 'default-1', title: 'DPAL Channel Update', youtubeId: 'dQw4w9WgXcQ', addedBy: 'system' },
    { id: 'default-2', title: 'Transparency Briefing', youtubeId: 'M7lc1UVf-VE', addedBy: 'system' },
];

const extractYouTubeId = (value: string): string | null => {
    const raw = value.trim();
    if (!raw) return null;

    const short = raw.match(/^([a-zA-Z0-9_-]{11})$/);
    if (short) return short[1];

    try {
        const u = new URL(raw);
        if (u.hostname.includes('youtu.be')) {
            const id = u.pathname.replace('/', '').trim();
            return id.length === 11 ? id : null;
        }
        if (u.hostname.includes('youtube.com')) {
            const v = u.searchParams.get('v');
            if (v && v.length === 11) return v;
            const parts = u.pathname.split('/').filter(Boolean);
            const candidate = parts[parts.length - 1];
            if (candidate && candidate.length === 11) return candidate;
        }
    } catch {
        return null;
    }

    return null;
};

const loadUserVideos = (): SupportVideo[] => {
    try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (!raw) return [];
        const parsed = JSON.parse(raw);
        if (!Array.isArray(parsed)) return [];
        return parsed.filter((v) => v?.youtubeId && v?.title);
    } catch {
        return [];
    }
};

const saveUserVideos = (videos: SupportVideo[]) => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(videos));
};

const SustainmentCenter: React.FC<SustainmentCenterProps> = ({ onReturn, onReward }) => {
    const [userVideos, setUserVideos] = useState<SupportVideo[]>(loadUserVideos);
    const [selectedVideoId, setSelectedVideoId] = useState<string>(DEFAULT_VIDEOS[0].id);
    const [newVideoTitle, setNewVideoTitle] = useState('');
    const [newVideoUrl, setNewVideoUrl] = useState('');
    const [addError, setAddError] = useState('');
    const [supportCount, setSupportCount] = useState(0);
    const [status, setStatus] = useState<'IDLE' | 'COMPLETE'>('IDLE');

    const videos = useMemo(() => [...DEFAULT_VIDEOS, ...userVideos], [userVideos]);
    const selectedVideo = videos.find((v) => v.id === selectedVideoId) || videos[0];

    const handleAddVideo = () => {
        setAddError('');
        const youtubeId = extractYouTubeId(newVideoUrl);
        if (!youtubeId) {
            setAddError('Invalid YouTube URL or ID.');
            return;
        }

        const title = newVideoTitle.trim() || `Support Video ${videos.length + 1}`;
        const newVideo: SupportVideo = {
            id: `user-${Date.now()}`,
            title,
            youtubeId,
            addedBy: 'user',
        };

        const updated = [newVideo, ...userVideos];
        setUserVideos(updated);
        saveUserVideos(updated);
        setSelectedVideoId(newVideo.id);
        setNewVideoTitle('');
        setNewVideoUrl('');
    };

    const handleSupportClaim = () => {
        onReward(25);
        setSupportCount((n) => n + 1);
        setStatus('COMPLETE');
        setTimeout(() => setStatus('IDLE'), 2500);
    };

    return (
        <div className="bg-zinc-950 text-white min-h-[85vh] rounded-[3.5rem] border-2 border-zinc-800 shadow-2xl animate-fade-in font-mono overflow-hidden flex flex-col relative">
            <header className="bg-zinc-900 border-b-2 border-zinc-800 px-10 py-8 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6 z-30 relative overflow-hidden">
                <div className="flex items-center space-x-6">
                    <div className="p-5 bg-purple-500/10 rounded-3xl border border-purple-500/30 shadow-xl">
                        <Monitor className="w-10 h-10 text-purple-400" />
                    </div>
                    <div>
                        <h1 className="text-3xl font-black uppercase tracking-tighter text-white">Support_Node</h1>
                        <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-[0.4em] mt-2">Google/YouTube Video Support Feed</p>
                    </div>
                </div>
                <button onClick={onReturn} className="flex items-center space-x-3 text-xs font-black uppercase tracking-widest text-zinc-500 hover:text-purple-400 transition-colors group bg-black/60 px-6 py-3 rounded-2xl border border-zinc-800">
                    <ArrowLeft className="w-5 h-5 transition-transform group-hover:-translate-x-2" />
                    <span>Back</span>
                </button>
            </header>

            <main className="flex-grow grid grid-cols-1 lg:grid-cols-12 bg-black p-8 lg:p-10 gap-8">
                <section className="lg:col-span-8 space-y-6">
                    <div className="relative w-full aspect-video rounded-3xl overflow-hidden border-2 border-zinc-800 bg-zinc-900">
                        {selectedVideo ? (
                            <iframe
                                className="w-full h-full"
                                src={`https://www.youtube.com/embed/${selectedVideo.youtubeId}?rel=0`}
                                title={selectedVideo.title}
                                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                                referrerPolicy="strict-origin-when-cross-origin"
                                allowFullScreen
                            />
                        ) : (
                            <div className="w-full h-full flex items-center justify-center text-zinc-500">No video selected</div>
                        )}
                    </div>

                    <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-5 flex items-center justify-between gap-4">
                        <div>
                            <p className="text-xs text-zinc-400 uppercase tracking-widest">Now Playing</p>
                            <p className="text-lg font-black text-white uppercase tracking-tight">{selectedVideo?.title}</p>
                        </div>
                        <button
                            onClick={handleSupportClaim}
                            className="bg-emerald-600 hover:bg-emerald-500 text-white font-black py-3 px-5 rounded-2xl uppercase text-[10px] tracking-widest flex items-center gap-2"
                        >
                            {status === 'COMPLETE' ? <CheckCircle className="w-4 h-4" /> : <Coins className="w-4 h-4" />}
                            Claim +25 HC
                        </button>
                    </div>
                </section>

                <aside className="lg:col-span-4 space-y-6">
                    <div className="bg-zinc-900 border-2 border-zinc-800 rounded-3xl p-6 space-y-4">
                        <h3 className="text-[11px] font-black uppercase tracking-[0.3em] text-white flex items-center gap-3">
                            <Plus className="w-4 h-4 text-cyan-400" /> Add Channel Video
                        </h3>
                        <input
                            value={newVideoTitle}
                            onChange={(e) => setNewVideoTitle(e.target.value)}
                            placeholder="Video title"
                            className="w-full bg-zinc-950 border border-zinc-700 rounded-xl px-3 py-2 text-sm text-white"
                        />
                        <input
                            value={newVideoUrl}
                            onChange={(e) => setNewVideoUrl(e.target.value)}
                            placeholder="YouTube URL or video ID"
                            className="w-full bg-zinc-950 border border-zinc-700 rounded-xl px-3 py-2 text-sm text-white"
                        />
                        {addError && <p className="text-rose-400 text-xs font-bold">{addError}</p>}
                        <button onClick={handleAddVideo} className="w-full bg-cyan-600 hover:bg-cyan-500 text-white font-black py-2.5 rounded-xl uppercase text-[10px] tracking-widest">
                            Add to Support Node
                        </button>
                    </div>

                    <div className="bg-zinc-900 border-2 border-zinc-800 rounded-3xl p-6 space-y-4 max-h-[360px] overflow-y-auto">
                        <h3 className="text-[11px] font-black uppercase tracking-[0.3em] text-white flex items-center gap-3">
                            <Play className="w-4 h-4 text-purple-400" /> Video Queue
                        </h3>
                        {videos.map((video) => (
                            <button
                                key={video.id}
                                onClick={() => setSelectedVideoId(video.id)}
                                className={`w-full text-left p-3 rounded-xl border transition ${selectedVideoId === video.id ? 'border-cyan-500 bg-zinc-800' : 'border-zinc-700 bg-zinc-950 hover:border-zinc-500'}`}
                            >
                                <p className="text-sm font-black text-white uppercase tracking-tight truncate">{video.title}</p>
                                <p className="text-[10px] text-zinc-500 uppercase tracking-widest">{video.addedBy === 'user' ? 'Community Added' : 'Official Feed'}</p>
                            </button>
                        ))}
                    </div>

                    <div className="bg-zinc-900 border-2 border-zinc-800 rounded-3xl p-6 space-y-3">
                        <p className="text-[10px] text-zinc-400 uppercase tracking-widest">Sponsored Support</p>
                        <GoogleAdSlot
                            slot={import.meta.env.VITE_ADSENSE_SLOT_SUPPORT_NODE || ''}
                            format="auto"
                            className="rounded-xl overflow-hidden"
                            style={{ minHeight: 120 }}
                        />
                        <p className="text-[10px] text-zinc-600">Ads help fund infrastructure and transparency tooling.</p>
                    </div>

                    <div className="bg-purple-950/20 border border-purple-500/30 rounded-3xl p-6">
                        <p className="text-[10px] text-zinc-400 uppercase tracking-widest">Support Actions Today</p>
                        <p className="text-4xl font-black text-white mt-2">{supportCount}</p>
                        <p className="text-[11px] text-zinc-500 mt-2">Each claim rewards +25 HC and marks engagement for channel transparency.</p>
                    </div>
                </aside>
            </main>
        </div>
    );
};

export default SustainmentCenter;
