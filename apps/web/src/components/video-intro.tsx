import React, { useState, useEffect, useRef } from 'react';
import { Volume2, VolumeX, SkipForward } from 'lucide-react';

export function VideoIntro({ onComplete }: { onComplete: () => void }) {
  const [muted, setMuted] = useState(true);
  const [fading, setFading] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);

  const handleFinish = () => {
    setFading(true);
    setTimeout(() => {
      onComplete();
    }, 600); // 600ms fade transition
  };

  useEffect(() => {
    // Attempt auto play
    if (videoRef.current) {
      videoRef.current.play().catch(() => {
        // Fallback if browser blocks sound auto play
        if (videoRef.current) {
          videoRef.current.muted = true;
          videoRef.current.play().catch(() => {});
        }
      });
    }
  }, []);

  return (
    <div
      className={`fixed inset-0 z-[100] flex items-center justify-center bg-black transition-opacity duration-700 ease-out select-none ${
        fading ? 'opacity-0 pointer-events-none' : 'opacity-100'
      }`}
    >
      <video
        ref={videoRef}
        src="/loadin.mp4"
        autoPlay
        playsInline
        muted={muted}
        onEnded={handleFinish}
        className="w-full h-full object-cover sm:object-contain max-h-screen"
      />

      {/* Floating control buttons */}
      <div className="absolute top-6 right-6 flex items-center gap-3 z-10">
        <button
          onClick={() => {
            if (videoRef.current) {
              videoRef.current.muted = !muted;
              setMuted(!muted);
            }
          }}
          className="p-3 rounded-full bg-black/60 hover:bg-black/90 text-white backdrop-blur-md border border-white/20 transition-all shadow-lg hover:scale-105"
          aria-label={muted ? 'Unmute' : 'Mute'}
        >
          {muted ? <VolumeX size={18} /> : <Volume2 size={18} className="text-pink-400" />}
        </button>

        <button
          onClick={handleFinish}
          className="flex items-center gap-2 px-4 py-2.5 rounded-full bg-white/10 hover:bg-white/20 text-white backdrop-blur-md border border-white/20 text-xs font-semibold tracking-wider uppercase transition-all shadow-lg hover:scale-105"
        >
          <span>Skip</span>
          <SkipForward size={14} />
        </button>
      </div>

      {/* Subtle branding watermark during intro */}
      <div className="absolute bottom-6 left-6 flex items-center gap-2 text-white/50 text-xs font-mono tracking-widest uppercase pointer-events-none">
        <span className="w-2 h-2 rounded-full bg-pink-500 animate-pulse" />
        <span>MODERATORS // INITIALIZING</span>
      </div>
    </div>
  );
}
