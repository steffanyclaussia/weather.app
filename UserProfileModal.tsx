import React from 'react';
import { X, Mail, User } from 'lucide-react';
import { Profile } from '../types';

interface UserProfileModalProps {
  profile: Profile;
  onClose: () => void;
}

export const UserProfileModal: React.FC<UserProfileModalProps> = ({ profile, onClose }) => {
  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-fade-in">
      <div className="bg-[#0f172a] w-full max-w-sm rounded-2xl shadow-[0_20px_50px_rgba(0,0,0,0.5)] overflow-hidden border border-slate-800/50 relative">
        
        {/* Banner */}
        <div className="h-28 bg-gradient-to-br from-indigo-900 via-slate-800 to-slate-900 w-full relative border-b border-slate-800/50">
          <button 
            onClick={onClose} 
            className="absolute top-4 right-4 bg-black/20 hover:bg-black/40 text-slate-300 p-2 rounded-full transition-colors backdrop-blur-sm"
          >
            <X size={16} />
          </button>
        </div>
        
        {/* Profile Content */}
        <div className="px-6 pb-8 relative">
          {/* Avatar */}
          <div className="w-28 h-28 rounded-full border-[6px] border-[#0f172a] bg-slate-800 absolute -top-14 flex items-center justify-center text-4xl text-indigo-200 font-medium overflow-hidden shadow-lg">
            {profile.avatar_url ? (
              <img src={profile.avatar_url} alt="avatar" className="w-full h-full object-cover opacity-90" />
            ) : (
              profile.username[0].toUpperCase()
            )}
          </div>
          
          <div className="pt-16">
            <h2 className="text-2xl font-medium text-slate-100 flex items-center tracking-wide">
              {profile.username}
            </h2>
            
            <div className="mt-6 bg-slate-900/50 p-5 rounded-xl border border-slate-800/50 shadow-inner">
              <h3 className="text-[10px] font-semibold text-slate-500 uppercase tracking-widest mb-4">Informasi Pengguna</h3>
              
              <div className="flex items-center text-slate-300 mb-4">
                <div className="p-2 bg-slate-800 rounded-lg mr-4 border border-slate-700/50">
                  <User size={16} className="text-indigo-400/70" />
                </div>
                <div className="flex flex-col">
                  <span className="text-[10px] text-slate-500 uppercase tracking-wider">Username</span>
                  <span className="text-sm font-medium tracking-wide">{profile.username}</span>
                </div>
              </div>
              
              <div className="flex items-center text-slate-300">
                <div className="p-2 bg-slate-800 rounded-lg mr-4 border border-slate-700/50">
                  <Mail size={16} className="text-indigo-400/70" />
                </div>
                <div className="flex flex-col">
                  <span className="text-[10px] text-slate-500 uppercase tracking-wider">Email</span>
                  <span className="text-sm font-medium tracking-wide">{profile.email}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
