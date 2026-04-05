import React, { useState, useRef, useEffect } from 'react';
import type { ChatMessage, Hero } from '../types';
import { Send, ShieldCheck, User, Zap, Loader, Camera, X, Broadcast, Maximize2, Mic, Play, Square, Volume2, Paperclip, MapPin } from './icons';

interface MissionChatroomProps {
    missionId: string;
    messages: ChatMessage[];
    onSendMessage: (text: string, imageUrl?: string, audioUrl?: string) => void;
    hero: Hero;
}

const AudioPlayer: React.FC<{ url: string }> = ({ url }) => {
    const [isPlaying, setIsPlaying] = useState(false);
    const audioRef = useRef<HTMLAudioElement>(null);

    const togglePlay = () => {
        if (!audioRef.current) return;
        if (isPlaying) audioRef.current.pause();
        else audioRef.current.play();
    };

    return (
        <div className="flex items-center space-x-4 bg-white p-4 rounded-none border border-slate-200 shadow-sm w-full max-w-[280px]">
            <button type="button" onClick={togglePlay} className="w-10 h-10 rounded-full bg-emerald-600 flex items-center justify-center text-white hover:bg-emerald-500 transition-all shadow-md active:scale-95">
                {isPlaying ? <Square className="w-4 h-4 fill-current" /> : <Play className="w-4 h-4 fill-current translate-x-0.5" />}
            </button>
            <div className="flex-grow space-y-2">
                <div className="flex items-end justify-between gap-1 h-4">
                    {[...Array(12)].map((_, i) => (
                        <div key={i} className={`w-1 rounded-full bg-emerald-400/70 ${isPlaying ? 'animate-waveform' : ''}`} style={{ height: `${Math.random() * 100}%`, animationDelay: `${i * 0.1}s` }}/>
                    ))}
                </div>
                <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-wide">Voice message</p>
            </div>
            <audio ref={audioRef} src={url} onPlay={() => setIsPlaying(true)} onPause={() => setIsPlaying(false)} onEnded={() => setIsPlaying(false)} className="hidden"/>
        </div>
    );
};

const MissionChatroom: React.FC<MissionChatroomProps> = ({ missionId, messages, onSendMessage, hero }) => {
    const [inputText, setInputText] = useState('');
    const [attachment, setAttachment] = useState<string | null>(null);
    const [audioAttachment, setAudioAttachment] = useState<string | null>(null);
    const [selectedImage, setSelectedImage] = useState<string | null>(null);
    const [isRecording, setIsRecording] = useState(false);
    const [isLocating, setIsLocating] = useState(false);
    const [uploadHint, setUploadHint] = useState<string | null>(null);
    
    const scrollRef = useRef<HTMLDivElement>(null);
    /** When true, new messages / image loads keep the thread pinned to the latest. False after user scrolls up to read history. */
    const stickToBottomRef = useRef(true);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const recognitionRef = useRef<any>(null);
    const mediaRecorderRef = useRef<MediaRecorder | null>(null);
    const audioChunksRef = useRef<Blob[]>([]);

    const scrollToBottomIfPinned = () => {
        const el = scrollRef.current;
        if (!el || !stickToBottomRef.current) return;
        el.scrollTop = el.scrollHeight;
    };

    useEffect(() => {
        scrollToBottomIfPinned();
    }, [messages]);

    const handleMessagesScroll = () => {
        const el = scrollRef.current;
        if (!el) return;
        const nearBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 120;
        stickToBottomRef.current = nearBottom;
    };

    const startRecording = async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            const mediaRecorder = new MediaRecorder(stream);
            mediaRecorderRef.current = mediaRecorder;
            audioChunksRef.current = [];

            mediaRecorder.ondataavailable = (event) => {
                if (event.data.size > 0) audioChunksRef.current.push(event.data);
            };

            mediaRecorder.onstop = () => {
                const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
                const reader = new FileReader();
                reader.onloadend = () => {
                    setAudioAttachment(reader.result as string);
                };
                reader.readAsDataURL(audioBlob);
                stream.getTracks().forEach(track => track.stop());
            };

            mediaRecorder.start();
            setIsRecording(true);

            // Also start STT for live transcription
            const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
            if (SpeechRecognition) {
                const recognition = new SpeechRecognition();
                recognition.lang = 'en-US';
                recognition.continuous = true;
                recognition.interimResults = true;
                recognition.onresult = (event: any) => {
                    let transcript = '';
                    for (let i = event.resultIndex; i < event.results.length; ++i) {
                        transcript += event.results[i][0].transcript;
                    }
                    setInputText(prev => transcript);
                };
                recognitionRef.current = recognition;
                recognition.start();
            }
        } catch (err) {
            console.error("Recording failed", err);
            alert("Microphone access denied or unavailable.");
        }
    };

    const stopRecording = () => {
        if (mediaRecorderRef.current && isRecording) {
            mediaRecorderRef.current.stop();
            recognitionRef.current?.stop();
            setIsRecording(false);
        }
    };

    const handleVoiceToggle = () => {
        if (isRecording) stopRecording();
        else startRecording();
    };

    const handleSend = (e: React.FormEvent) => {
        e.preventDefault();
        if (!inputText.trim() && !attachment && !audioAttachment) return;
        stickToBottomRef.current = true;
        onSendMessage(inputText.trim(), attachment || undefined, audioAttachment || undefined);
        setInputText('');
        setAttachment(null);
        setAudioAttachment(null);
        setUploadHint(null);
    };

    const handleShareLocation = () => {
        if (!navigator.geolocation) return;
        setIsLocating(true);
        navigator.geolocation.getCurrentPosition(
            (pos) => {
                const text = `[GEOSPATIAL_SIGNAL]: Lat: ${pos.coords.latitude.toFixed(5)}, Lng: ${pos.coords.longitude.toFixed(5)} // Verified by Device_OS.`;
                stickToBottomRef.current = true;
                onSendMessage(text);
                setIsLocating(false);
            },
            () => setIsLocating(false),
            { timeout: 8000 }
        );
    };

    const compressImageToDataUrl = async (file: File): Promise<string> => {
        const objectUrl = URL.createObjectURL(file);
        try {
            const img = await new Promise<HTMLImageElement>((resolve, reject) => {
                const i = new Image();
                i.onload = () => resolve(i);
                i.onerror = reject;
                i.src = objectUrl;
            });

            const maxDim = 1600;
            const scale = Math.min(1, maxDim / Math.max(img.width, img.height));
            const w = Math.max(1, Math.round(img.width * scale));
            const h = Math.max(1, Math.round(img.height * scale));

            const canvas = document.createElement('canvas');
            canvas.width = w;
            canvas.height = h;
            const ctx = canvas.getContext('2d');
            if (!ctx) throw new Error('Canvas not supported');
            ctx.drawImage(img, 0, 0, w, h);

            return canvas.toDataURL('image/jpeg', 0.82);
        } finally {
            URL.revokeObjectURL(objectUrl);
        }
    };

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        try {
            setUploadHint('Optimizing image for room upload...');
            const compressed = await compressImageToDataUrl(file);
            setAttachment(compressed);
            setUploadHint('Image ready. Send to persist in shared room history.');
        } catch (err) {
            console.error('Image prepare failed:', err);
            setUploadHint('Image processing failed. Try another image.');
        }
    };

    return (
        <div className="flex h-full min-h-0 max-h-full flex-1 flex-col bg-slate-100 font-sans relative text-slate-900 overflow-hidden">
            <style>{`
                @keyframes waveform { 0%, 100% { transform: scaleY(1); } 50% { transform: scaleY(0.4); } }
                .animate-waveform { animation: waveform 0.8s ease-in-out infinite; }
                @keyframes mic-pulse { 0% { box-shadow: 0 0 0 0 rgba(14, 165, 233, 0.45); } 70% { box-shadow: 0 0 0 12px rgba(14, 165, 233, 0); } 100% { box-shadow: 0 0 0 0 rgba(14, 165, 233, 0); } }
                .animate-mic-pulse { animation: mic-pulse 2s infinite; }
            `}</style>

            {/* LIGHTBOX */}
            {selectedImage && (
                <div className="fixed inset-0 z-[500] bg-black/95 backdrop-blur-2xl flex items-center justify-center p-6 animate-fade-in" onClick={() => setSelectedImage(null)}>
                    <button type="button" className="absolute top-10 right-10 p-4 bg-zinc-900 rounded-full text-white border border-zinc-800 shadow-2xl hover:bg-zinc-800 transition-all"><X className="w-8 h-8"/></button>
                    <div className="relative max-w-full max-h-full rounded-none overflow-hidden border-2 border-zinc-800 shadow-[0_0_100px_rgba(6,182,212,0.2)]">
                        <img src={selectedImage} alt="Shard Preview" className="max-w-full max-h-[85vh] object-contain" onClick={(e) => e.stopPropagation()} />
                    </div>
                </div>
            )}

            {/* CHANNEL INFO */}
            <div className="bg-white border-b border-slate-200 px-4 py-3.5 md:px-6 flex items-center justify-between flex-shrink-0 shadow-sm">
                <div className="flex items-center gap-3 min-w-0">
                    <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 shrink-0 ring-4 ring-emerald-500/20" aria-hidden />
                    <div className="min-w-0">
                        <p className="text-xs font-semibold text-slate-800 truncate">Live coordination</p>
                        <p className="text-[11px] text-slate-500 font-mono truncate">Room · {missionId.substring(0, 12)}…</p>
                    </div>
                </div>
                {isRecording && (
                    <div className="flex items-center gap-2 text-sky-700 text-xs font-semibold shrink-0">
                        <span className="relative flex h-2 w-2"><span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-sky-400 opacity-75" /><span className="relative inline-flex rounded-full h-2 w-2 bg-sky-600" /></span>
                        Recording…
                    </div>
                )}
            </div>

            {/* MESSAGES — flex-1 + min-h-0 keeps scroll region high in the panel */}
            <div
                ref={scrollRef}
                onScroll={handleMessagesScroll}
                className="min-h-0 flex-1 space-y-5 overflow-y-auto overflow-x-hidden px-4 pb-4 pt-4 md:space-y-6 md:px-6 md:pb-6 md:pt-5 custom-scrollbar"
            >
                {messages.length === 0 ? (
                    <div className="flex min-h-[min(220px,38vh)] flex-col items-center justify-center gap-3 py-10 px-4 text-center">
                        <div className="rounded-none bg-white p-4 shadow-md border border-slate-200">
                            <Broadcast className="w-10 h-10 text-sky-600 mx-auto" />
                        </div>
                        <p className="text-sm font-semibold text-slate-700">No messages yet</p>
                        <p className="text-xs text-slate-500 max-w-sm leading-relaxed">
                            Say hello, share an update, or use <strong className="text-slate-700">Add photo</strong> below. The full thread is your history — including photos that may later prove irrelevant; they stay visible for accountability.
                        </p>
                    </div>
                ) : (
                    messages.map((msg) => {
                        const isSelf = msg.sender === hero.name;
                        if (msg.isSystem) {
                            return (
                                <div key={msg.id} className="flex justify-center my-4">
                                    <div className="bg-amber-50 px-4 py-2.5 rounded-none border border-amber-200/90 shadow-sm max-w-[95%]">
                                        <span className="text-xs font-medium text-amber-900/90 leading-snug">{msg.text}</span>
                                    </div>
                                </div>
                            );
                        }
                        return (
                            <div key={msg.id} className={`flex flex-col ${isSelf ? 'items-end' : 'items-start'} gap-1.5`}>
                                <div className="flex items-center gap-2 text-[11px] font-medium text-slate-500 px-1">
                                    {!isSelf && <span className="text-sky-700">{msg.sender.length > 14 ? `${msg.sender.slice(0, 14)}…` : msg.sender}</span>}
                                    <span>{new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                                </div>
                                <div className={`max-w-[min(92%,28rem)] p-4 md:p-5 rounded-none text-sm relative group transition-shadow border shadow-md ${
                                    isSelf
                                        ? 'bg-emerald-600 text-white border-emerald-700/30'
                                        : 'bg-white text-slate-800 border-slate-200'
                                }`}>
                                    {msg.imageUrl && (
                                        <div className="mb-3 rounded-none overflow-hidden border border-slate-200/80 cursor-zoom-in shadow-sm" onClick={() => setSelectedImage(msg.imageUrl || null)}>
                                            <img
                                                src={msg.imageUrl}
                                                alt="Attachment"
                                                className="h-auto w-full max-h-[min(70vh,560px)] object-contain object-top"
                                                onLoad={scrollToBottomIfPinned}
                                            />
                                        </div>
                                    )}
                                    {msg.audioUrl && <div className="mb-3"><AudioPlayer url={msg.audioUrl} /></div>}
                                    {msg.text && <p className={`leading-relaxed whitespace-pre-wrap text-[15px] md:text-base ${isSelf ? 'text-white/95' : 'text-slate-800'}`}>{msg.text}</p>}
                                    <div className={`mt-2 pt-2 border-t flex items-center gap-2 ${isSelf ? 'border-white/20' : 'border-slate-100'}`}>
                                        <ShieldCheck className={`w-3.5 h-3.5 shrink-0 ${isSelf ? 'text-emerald-200' : 'text-emerald-600'}`} />
                                        <span className={`text-[10px] font-mono tracking-tight ${isSelf ? 'text-emerald-100/90' : 'text-slate-500'}`}>Record · {msg.ledgerProof.substring(0, 12)}…</span>
                                    </div>
                                </div>
                            </div>
                        );
                    })
                )}
            </div>

            {/* INPUT FOOTER — high-contrast, pro toolbar */}
            <div className="flex-shrink-0 border-t border-slate-200 bg-white p-3 md:p-4 shadow-[0_-4px_24px_rgba(15,23,42,0.06)]">
                {uploadHint && (
                    <div className="mb-3 text-xs font-medium text-sky-700 bg-sky-50 border border-sky-100 rounded-none px-3 py-2">
                        {uploadHint}
                    </div>
                )}
                {(attachment || audioAttachment) && (
                    <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-none border border-slate-200 mb-3">
                        <div className="w-12 h-12 rounded-none overflow-hidden bg-white border border-slate-200 flex items-center justify-center shrink-0">
                            {attachment ? <img src={attachment} alt="" className="w-full h-full object-cover" /> : <Volume2 className="w-6 h-6 text-sky-600"/>}
                        </div>
                        <span className="text-xs font-semibold text-slate-700">{attachment ? 'Image ready to send' : 'Voice note ready'}</span>
                        <button type="button" onClick={() => { setAttachment(null); setAudioAttachment(null); }} className="ml-auto p-2 rounded-none text-slate-500 hover:text-rose-600 hover:bg-rose-50 transition-colors" aria-label="Remove attachment">
                            <X className="w-5 h-5"/>
                        </button>
                    </div>
                )}
                
                <form onSubmit={handleSend} className="flex flex-col gap-2 w-full min-w-0">
                    <p className="text-[10px] font-medium text-slate-500 leading-snug px-0.5">
                        <span className="text-slate-600 font-semibold">Photos:</span> saved in this room’s history and added to this report’s filing gallery (hero image updates when you send a new photo).
                    </p>
                    <div className="flex flex-nowrap items-center gap-2 md:gap-3 w-full min-w-0">
                    <div className="flex items-center gap-1.5 shrink-0">
                        <button
                            type="button"
                            onClick={() => fileInputRef.current?.click()}
                            className="inline-flex h-12 min-w-[44px] px-3 md:px-3.5 md:min-w-0 items-center justify-center gap-2 rounded-none bg-sky-600 border-2 border-sky-700 text-white shadow-sm hover:bg-sky-700 active:scale-[0.97] transition-all"
                            title="Add a photo from camera or gallery"
                            aria-label="Add photo to room"
                        >
                            <Camera className="w-5 h-5 shrink-0 stroke-[2]" />
                            <span className="hidden sm:inline text-[11px] font-black uppercase tracking-wide">Add photo</span>
                        </button>
                        <button
                            type="button"
                            onClick={() => fileInputRef.current?.click()}
                            className="inline-flex h-12 w-12 md:h-11 md:w-11 items-center justify-center rounded-none bg-white border-2 border-slate-300 text-slate-700 shadow-sm hover:bg-slate-50 hover:border-slate-400 active:scale-[0.97] transition-all"
                            title="Attach image (same as Add photo)"
                            aria-label="Attach image"
                        >
                            <Paperclip className="w-[22px] h-[22px] stroke-[2.5]" />
                        </button>
                        <button
                            type="button"
                            onClick={handleShareLocation}
                            disabled={isLocating}
                            className={`inline-flex h-12 w-12 md:h-11 md:w-11 items-center justify-center rounded-none bg-white border-2 border-slate-300 text-slate-700 shadow-sm hover:bg-violet-50 hover:border-violet-400 hover:text-violet-900 active:scale-[0.97] transition-all disabled:opacity-60 ${isLocating ? 'ring-2 ring-sky-400 border-sky-400' : ''}`}
                            title="Share your location"
                            aria-label="Share location"
                        >
                            <MapPin className="w-[22px] h-[22px] stroke-[2.5]" />
                        </button>
                        <button
                            type="button"
                            onClick={handleVoiceToggle}
                            className={`inline-flex h-12 w-12 md:h-11 md:w-11 items-center justify-center rounded-none border-2 shadow-sm active:scale-[0.97] transition-all ${
                                isRecording
                                    ? 'bg-sky-600 border-sky-700 text-white animate-mic-pulse'
                                    : 'bg-white border-slate-300 text-slate-700 hover:bg-slate-50 hover:border-slate-400'
                            }`}
                            title={isRecording ? 'Stop recording' : 'Voice note'}
                            aria-label={isRecording ? 'Stop recording' : 'Record voice note'}
                        >
                            {isRecording ? <Square className="w-5 h-5 fill-current" /> : <Mic className="w-[22px] h-[22px] stroke-[2.5]" />}
                        </button>
                    </div>

                    <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={handleFileChange}
                    />
                    
                    <input 
                        type="text" 
                        value={inputText}
                        onChange={(e) => setInputText(e.target.value)}
                        placeholder={isRecording ? 'Listening… speak or type below.' : isLocating ? 'Getting your location…' : 'Type a message…'}
                        className={`min-w-0 flex-1 min-h-[48px] rounded-none border-2 bg-slate-50 px-4 py-3 text-[15px] text-slate-900 placeholder:text-slate-400 shadow-inner transition-all focus:bg-white focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-500/25 md:min-h-[44px] ${isRecording ? 'border-sky-400 ring-1 ring-sky-200' : 'border-slate-200'}`}
                    />
                    
                    <button
                        type="submit"
                        disabled={!inputText.trim() && !attachment && !audioAttachment}
                        className="inline-flex h-12 min-w-[52px] md:min-w-[56px] items-center justify-center rounded-none bg-sky-600 text-white shadow-md hover:bg-sky-700 disabled:opacity-35 disabled:cursor-not-allowed disabled:hover:bg-sky-600 active:scale-[0.98] transition-all border border-sky-700/30"
                        title="Send"
                        aria-label="Send message"
                    >
                        <Send className="w-6 h-6 md:w-[26px] md:h-[26px]" />
                    </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default MissionChatroom;
