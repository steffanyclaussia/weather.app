import React, { useState } from 'react';
import { SplashScreen } from './components/SplashScreen';
import { WeatherApp } from './components/WeatherApp';
import { PinEntry } from './components/PinEntry';
import { ChatApp } from './components/ChatApp';
import { AppState } from './types';

const App: React.FC = () => {
  // Set initial state ke 'splash' agar animasi pembuka muncul pertama kali
  const [appState, setAppState] = useState<AppState>('splash');

  return (
    <div className="w-full h-screen overflow-hidden">
      {appState === 'splash' && (
        <SplashScreen onComplete={() => setAppState('weather')} />
      )}

      {appState === 'weather' && (
        <WeatherApp onUnlock={() => setAppState('pin')} />
      )}
      
      {appState === 'pin' && (
        <PinEntry 
          onSuccess={() => setAppState('chat')} 
          onCancel={() => setAppState('weather')} 
        />
      )}
      
      {appState === 'chat' && (
        <ChatApp onBackToWeather={() => setAppState('weather')} />
      )}
    </div>
  );
};

export default App;
