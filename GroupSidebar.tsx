import React, { useState, useEffect } from 'react';
import { Users, LogOut, Settings, Edit2, Info } from 'lucide-react';
import { supabase } from '../supabaseClient';
import { Group, Profile } from '../types';
import { ProfileSettings } from './ProfileSettings';
import { UserProfileModal } from './UserProfileModal';
import { GroupSettingsModal } from './GroupSettingsModal';

interface GroupSidebarProps {
  currentUser: any;
  group: Group;
  onLogout: () => void;
  onGroupUpdate: () => void;
}

export const GroupSidebar: React.FC<GroupSidebarProps> = ({ currentUser, group, onLogout, onGroupUpdate }) => {
  const [members, setMembers] = useState<Profile[]>([]);
  const [myProfile, setMyProfile] = useState<Profile | null>(null);
  
  // Modals state
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [selectedUserProfile, setSelectedUserProfile] = useState<Profile | null>(null);
  const [isGroupSettingsOpen, setIsGroupSettingsOpen] = useState(false);

  useEffect(() => {
    fetchMyProfile();
    fetchMembers();

    const channel = supabase.channel(`group_members_${group.id}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'group_members', filter: `group_id=eq.${group.id}` }, () => {
        fetchMembers();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [group.id, currentUser]);

  const fetchMyProfile = async () => {
    const { data } = await supabase.from('profiles').select('*').eq('id', currentUser.id).single();
    if (data) {
      const localAvatar = localStorage.getItem(`avatar_${currentUser.id}`);
      if (localAvatar && !data.avatar_url) data.avatar_url = localAvatar;
      setMyProfile(data);
    }
  };

  const fetchMembers = async () => {
    const { data, error } = await supabase
      .from('group_members')
      .select('user_id')
      .eq('group_id', group.id);

    if (data && data.length > 0) {
      const userIds = data.map(m => m.user_id);
      const { data: profiles } = await supabase.from('profiles').select('*').in('id', userIds);
      if (profiles) {
        const updatedProfiles = profiles.map(p => {
          const localAvatar = localStorage.getItem(`avatar_${p.id}`);
          if (localAvatar) p.avatar_url = localAvatar;
          return p;
        });
        setMembers(updatedProfiles);
      }
    }
  };

  const displayUsername = myProfile?.username || currentUser?.email?.split('@')[0] || 'User';
  const displayInitial = myProfile?.username?.[0]?.toUpperCase() || currentUser?.email?.[0]?.toUpperCase() || '?';

  return (
    <>
      <div className="w-64 bg-[#0f172a] flex flex-col h-full border-r border-slate-800/50">
        {/* Header */}
        <div className="h-16 flex items-center justify-between px-4 shadow-sm bg-[#0f172a] z-10 border-b border-slate-800/50 hover:bg-slate-900/50 transition-colors cursor-pointer" onClick={() => setIsGroupSettingsOpen(true)}>
          <h2 className="text-slate-100 font-medium truncate flex items-center tracking-wide">
            <Users size={18} className="mr-2 text-indigo-400/70" />
            {group.name}
          </h2>
          <Info size={18} className="text-slate-500 hover:text-indigo-300 transition-colors" />
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-3 py-4 custom-scrollbar">
          <h3 className="text-[10px] font-semibold text-slate-500 uppercase tracking-widest mb-3 px-1">
            Anggota — {members.length}
          </h3>
          <div className="space-y-1">
            {members.map(member => (
              <div 
                key={member.id} 
                onClick={() => setSelectedUserProfile(member)}
                className="flex items-center space-x-3 p-2.5 rounded-xl hover:bg-slate-900/50 transition-colors cursor-pointer group border border-transparent hover:border-slate-800/50"
              >
                <div className="w-9 h-9 rounded-full bg-slate-800 flex items-center justify-center text-indigo-200 font-medium relative overflow-hidden border border-slate-700/50">
                  {member.avatar_url ? (
                    <img src={member.avatar_url} alt="avatar" className="w-full h-full object-cover opacity-90" />
                  ) : (
                    member.username[0].toUpperCase()
                  )}
                  <div className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-emerald-500 border-2 border-[#0f172a] rounded-full z-10"></div>
                </div>
                <div className="flex flex-col">
                  <span className="text-slate-400 group-hover:text-indigo-100 font-medium text-sm truncate transition-colors">{member.username}</span>
                  {member.id === group.created_by && <span className="text-[10px] text-indigo-400/70 font-medium tracking-wide">Admin</span>}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* User Profile Area */}
        <div className="h-[76px] bg-[#020617] flex items-center justify-between px-4 flex-shrink-0 border-t border-slate-800/50">
          <div 
            className="flex items-center space-x-3 overflow-hidden cursor-pointer hover:bg-slate-900/50 p-2 -ml-2 rounded-xl transition-all duration-300 flex-1 group border border-transparent hover:border-slate-800/50"
            onClick={() => setIsSettingsOpen(true)}
          >
            <div className="w-10 h-10 rounded-full bg-slate-800 flex items-center justify-center text-indigo-200 font-medium flex-shrink-0 overflow-hidden relative shadow-sm border border-slate-700/50">
              {myProfile?.avatar_url ? (
                <img src={myProfile.avatar_url} alt="avatar" className="w-full h-full object-cover opacity-90 group-hover:opacity-50 transition-opacity" />
              ) : (
                displayInitial
              )}
              <div className="absolute inset-0 bg-black/40 hidden group-hover:flex items-center justify-center transition-all">
                <Edit2 size={16} className="text-indigo-300" />
              </div>
              <div className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-emerald-500 border-2 border-[#020617] rounded-full"></div>
            </div>
            <div className="flex flex-col overflow-hidden">
              <span className="text-slate-200 text-sm font-medium truncate group-hover:text-indigo-100 transition-colors">{displayUsername}</span>
              <span className="text-slate-500 text-[10px] uppercase tracking-wider mt-0.5 truncate group-hover:text-indigo-400/70 transition-colors">Pengaturan Profil</span>
            </div>
          </div>
          
          <div className="flex items-center ml-2">
            <button onClick={onLogout} className="text-slate-500 hover:text-rose-400 p-2.5 rounded-xl hover:bg-rose-500/10 transition-colors" title="Keluar">
              <LogOut size={18} />
            </button>
          </div>
        </div>
      </div>

      {/* Modals */}
      {isSettingsOpen && myProfile && (
        <ProfileSettings currentUser={currentUser} profile={myProfile} onClose={() => setIsSettingsOpen(false)} onUpdate={fetchMyProfile} />
      )}

      {selectedUserProfile && (
        <UserProfileModal profile={selectedUserProfile} onClose={() => setSelectedUserProfile(null)} />
      )}

      {isGroupSettingsOpen && (
        <GroupSettingsModal 
          group={group} 
          memberCount={members.length} 
          currentUser={currentUser} 
          onClose={() => setIsGroupSettingsOpen(false)} 
          onUpdate={onGroupUpdate} 
        />
      )}
    </>
  );
};
