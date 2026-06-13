import React, { useState, useEffect, useRef } from 'react';
import { Sun, Cloud } from 'lucide-react';

interface SplashScreenProps {
  onComplete: () => void;
}

export const SplashScreen: React.FC<SplashScreenProps> = ({ onComplete }) => {
  const [displayedText, setDisplayedText] = useState('');
  const [isFadingOut, setIsFadingOut] = useState(false);
  
  const fullText = "Memantau masa depanmu yang cerah... secerah matahari hari ini yang siap membakar semangat (dan kulit) Anda. ☀️✨";
  const audioCtxRef = useRef<AudioContext | null>(null);

  useEffect(() => {
    let typeWriterInterval: number;
    let typeWriterTimeout: number;
    let fadeOutTimeout: number;
    let navigationTimeout: number;

    const initAudio = () => {
      try {
        const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
        if (!AudioContextClass) return;
        
        const ctx = new AudioContextClass();
        audioCtxRef.current = ctx;

        const playWind = () => {
          const bufferSize = ctx.sampleRate * 4; 
          const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
          const data = buffer.getChannelData(0);
          for (let i = 0; i < bufferSize; i++) data[i] = Math.random() * 2 - 1; 
          
          const noise = ctx.createBufferSource();
          noise.buffer = buffer;
          
          const filter = ctx.createBiquadFilter();
          filter.type = 'lowpass';
          filter.frequency.value = 300; 
          
          const gain = ctx.createGain();
          gain.gain.setValueAtTime(0, ctx.currentTime);
          gain.gain.linearRampToValueAtTime(0.5, ctx.currentTime + 1);
          gain.gain.linearRampToValueAtTime(0, ctx.currentTime + 4); 
          
          noise.connect(filter).connect(gain).connect(ctx.destination);
          noise.start();
        };

        const playTing = () => {
          const osc = ctx.createOscillator();
          osc.type = 'sine';
          osc.frequency.setValueAtTime(1500, ctx.currentTime + 2.5); 
          
          const gain = ctx.createGain();
          gain.gain.setValueAtTime(0, ctx.currentTime + 2.5);
          gain.gain.linearRampToValueAtTime(0.3, ctx.currentTime + 2.52);
          gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 3.5);
          
          osc.connect(gain).connect(ctx.destination);
          osc.start(ctx.currentTime + 2.5);
          osc.stop(ctx.currentTime + 3.5);
        };

        playWind();
        playTing();
      } catch (error) {
        console.warn("Audio autoplay diblokir oleh browser:", error);
      }
    };

    const playTypewriterClick = () => {
      if (!audioCtxRef.current) return;
      const ctx = audioCtxRef.current;
      if (ctx.state === 'suspended') return;

      const osc = ctx.createOscillator();
      osc.type = 'square';
      osc.frequency.setValueAtTime(300, ctx.currentTime);
      
      const gain = ctx.createGain();
      gain.gain.setValueAtTime(0, ctx.currentTime);
      gain.gain.linearRampToValueAtTime(0.05, ctx.currentTime + 0.01);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.05);
      
      osc.connect(gain).connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.05);
    };

    initAudio();

    typeWriterTimeout = setTimeout(() => {
      let currentIndex = 0;
      typeWriterInterval = setInterval(() => {
        if (currentIndex <= fullText.length) {
          setDisplayedText(fullText.slice(0, currentIndex));
          if (currentIndex % 3 === 0 && currentIndex < fullText.length) {
            playTypewriterClick();
          }
          currentIndex++;
        } else {
          clearInterval(typeWriterInterval);
        }
      }, 40); 
    }, 3000);

    fadeOutTimeout = setTimeout(() => {
      setIsFadingOut(true);
    }, 8500);

    navigationTimeout = setTimeout(() => {
      onComplete();
    }, 9000);

    return () => {
      clearTimeout(typeWriterTimeout);
      clearInterval(typeWriterInterval);
      clearTimeout(fadeOutTimeout);
      clearTimeout(navigationTimeout);
      if (audioCtxRef.current && audioCtxRef.current.state !== 'closed') {
        audioCtxRef.current.close();
      }
    };
  }, [onComplete]);

  return (
    <div className={`min-h-screen bg-pastel-dawn flex flex-col items-center justify-center p-6 overflow-hidden animate-fade-in transition-opacity duration-500 ${isFadingOut ? 'opacity-0' : 'opacity-100'}`}>
      <div className="relative w-72 h-72 mb-8 flex items-center justify-center">
        <div className="absolute z-0 animate-sun-rise text-yellow-400 drop-shadow-lg">
          <div className="relative">
            <Sun size={160} fill="#FDE047" strokeWidth={1.5} />
            <div className="absolute top-1/2 left-1/2 animate-glasses">
              <svg width="90" height="35" viewBox="0 0 100 40" className="drop-shadow-md">
                <path d="M10,10 Q30,10 45,20 Q50,25 55,20 Q70,10 90,10 L95,25 Q70,40 50,25 Q30,40 5,25 Z" fill="#1F2937" />
                <line x1="5" y1="15" x2="-5" y2="5" stroke="#1F2937" strokeWidth="4" strokeLinecap="round" />
                <line x1="95" y1="15" x2="105" y2="5" stroke="#1F2937" strokeWidth="4" strokeLinecap="round" />
                <circle cx="25" cy="18" r="3" fill="white" opacity="0.8" />
                <circle cx="75" cy="18" r="3" fill="white" opacity="0.8" />
              </svg>
              <svg width="40" height="20" viewBox="0 0 40 20" className="absolute -bottom-6 left-1/2 transform -translate-x-1/2">
                <path d="M5,5 Q20,20 35,5" fill="none" stroke="#B45309" strokeWidth="3" strokeLinecap="round" />
              </svg>
            </div>
          </div>
        </div>

        <div className="absolute z-10 w-full h-full flex items-center justify-center mt-24 animate-cloud-pop">
          <div className="absolute -ml-24 animate-cloud-drift-1 text-white drop-shadow-xl">
            <Cloud size={150} fill="currentColor" strokeWidth={0} />
          </div>
          <div className="absolute ml-20 mt-6 animate-cloud-drift-2 text-gray-50 drop-shadow-xl opacity-95">
            <Cloud size={170} fill="currentColor" strokeWidth={0} />
          </div>
          <div className="absolute mt-12 animate-cloud-drift-1 text-white drop-shadow-2xl" style={{ animationDelay: '0.5s' }}>
            <Cloud size={130} fill="currentColor" strokeWidth={0} />
          </div>
        </div>
      </div>
      
      <div className="h-24 flex items-start justify-center max-w-md text-center z-20 mt-4">
        <p className="text-lg md:text-xl italic font-medium text-slate-600 leading-relaxed">
          {displayedText}
          <span className="typewriter-cursor"></span>
        </p>
      </div>
    </div>
  );
};