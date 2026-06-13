import React, { useState, useEffect } from 'react';
import { Lock, ArrowLeft, ShieldAlert, ShieldCheck } from 'lucide-react';

interface PinEntryProps {
  onSuccess: () => void;
  onCancel: () => void;
}

type PinMode = 'enter' | 'create' | 'confirm';

export const PinEntry: React.FC<PinEntryProps> = ({ onSuccess, onCancel }) => {
  const [pin, setPin] = useState('');
  const [tempPin, setTempPin] = useState('');
  const [error, setError] = useState(false);
  const [mode, setMode] = useState<PinMode>('enter');

  useEffect(() => {
    const savedPin = localStorage.getItem('secret_pin');
    if (!savedPin) {
      setMode('create');
    }
  }, []);

  const handleNumberClick = (num: string) => {
    if (pin.length < 4) {
      const newPin = pin + num;
      setPin(newPin);
      setError(false);
      
      if (newPin.length === 4) {
        if (mode === 'create') {
          setTempPin(newPin);
          setTimeout(() => {
            setPin('');
            setMode('confirm');
          }, 300);
        } else if (mode === 'confirm') {
          if (newPin === tempPin) {
            localStorage.setItem('secret_pin', newPin);
            setTimeout(onSuccess, 300);
          } else {
            setError(true);
            setTimeout(() => {
              setPin('');
              setMode('create');
              setTempPin('');
            }, 800);
          }
        } else if (mode === 'enter') {
          const savedPin = localStorage.getItem('secret_pin');
          if (newPin === savedPin) {
            setTimeout(onSuccess, 300);
          } else {
            setError(true);
            setTimeout(() => setPin(''), 800);
          }
        }
      }
    }
  };

  const handleDelete = () => {
    setPin(pin.slice(0, -1));
    setError(false);
  };

  const getTitle = () => {
    if (mode === 'create') return 'Buat PIN Baru';
    if (mode === 'confirm') return 'Konfirmasi PIN';
    return 'Masukkan PIN';
  };

  const getSubtitle = () => {
    if (mode === 'create') return 'Buat 4 digit PIN untuk mengamankan chat';
    if (mode === 'confirm') return error ? 'PIN tidak cocok, ulangi pembuatan' : 'Masukkan kembali PIN yang baru dibuat';
    if (error) return 'PIN salah, silakan coba lagi';
    return 'Masukkan 4 digit PIN rahasia Anda';
  };

  const getIcon = () => {
    if (mode === 'create') return <ShieldAlert size={32} className="text-indigo-400" />;
    if (mode === 'confirm') return <ShieldCheck size={32} className="text-green-400" />;
    return <Lock size={32} className={error ? "text-red-500" : "text-indigo-500"} />;
  };

  return (
    <div className="min-h-screen bg-gray-900 flex flex-col items-center justify-center text-white p-4 animate-fade-in">
      <button 
        onClick={onCancel}
        className="absolute top-6 left-6 p-3 bg-gray-800 rounded-full text-gray-400 hover:text-white hover:bg-gray-700 transition-colors shadow-lg"
      >
        <ArrowLeft size={24} />
      </button>

      <div className="mb-10 flex flex-col items-center text-center">
        <div className={`p-4 rounded-full mb-5 shadow-lg transition-colors duration-300 ${error ? 'bg-red-500/20' : 'bg-gray-800'}`}>
          {getIcon()}
        </div>
        <h2 className="text-2xl font-bold tracking-wide text-white">{getTitle()}</h2>
        <p className={`text-sm mt-2 transition-colors duration-300 ${error ? 'text-red-400 font-medium' : 'text-gray-400'}`}>
          {getSubtitle()}
        </p>
      </div>

      <div className="flex space-x-5 mb-14">
        {[0, 1, 2, 3].map((i) => (
          <div 
            key={i}
            className={`w-4 h-4 rounded-full border-2 transition-all duration-200 ${
              pin.length > i 
                ? mode === 'confirm' ? 'bg-green-500 border-green-500' : 'bg-indigo-500 border-indigo-500' 
                : error 
                  ? 'border-red-500 bg-red-500/20' 
                  : 'border-gray-600'
            }`}
          />
        ))}
      </div>

      <div className="grid grid-cols-3 gap-6 max-w-xs w-full">
        {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((num) => (
          <button
            key={num}
            onClick={() => handleNumberClick(num.toString())}
            className="w-20 h-20 rounded-full bg-gray-800 hover:bg-gray-700 flex items-center justify-center text-3xl font-medium transition-all active:scale-95 mx-auto shadow-sm text-white"
          >
            {num}
          </button>
        ))}
        <div className="w-20 h-20"></div>
        <button
          onClick={() => handleNumberClick('0')}
          className="w-20 h-20 rounded-full bg-gray-800 hover:bg-gray-700 flex items-center justify-center text-3xl font-medium transition-all active:scale-95 mx-auto shadow-sm text-white"
        >
          0
        </button>
        <button
          onClick={handleDelete}
          className="w-20 h-20 rounded-full bg-gray-800 hover:bg-gray-700 flex items-center justify-center text-sm font-bold transition-all active:scale-95 mx-auto shadow-sm text-gray-400 hover:text-red-400"
        >
          DEL
        </button>
      </div>
    </div>
  );
};
