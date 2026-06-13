import React, { useState, useEffect } from 'react';
import { MessageSquare, Plus, Hash, CloudSun, MoonStar } from 'lucide-react';
import { supabase } from '../supabaseClient';
import { Auth } from './Auth';
import { Sidebar } from './Sidebar';
import { ChatArea } from './ChatArea';
import { GroupSidebar } from './GroupSidebar';
import { GroupChatArea } from './GroupChatArea';
import { CreateGroupModal } from './CreateGroupModal';
import { Profile, Group } from '../types';

interface ChatAppProps {
  onBackToWeather: () => void;
}

export const ChatApp: React.FC<ChatAppProps> = ({ onBackToWeather }) => {
  const [session, setSession] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  
  const [activeView, setActiveView] = useState<'dm' | 'group'>('dm');
  const [selectedFriend, setSelectedFriend] = useState<Profile | null>(null);
  const [selectedGroup, setSelectedGroup] = useState<Group | null>(null);
  
  const [groups, setGroups] = useState<Group[]>([]);
  const [showCreateGroup, setShowCreateGroup] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (session?.user) {
      fetchGroups();
      
      const channel = supabase.channel('public:group_members')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'group_members', filter: `user_id=eq.${session.user.id}` }, () => {
          fetchGroups();
        })
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [session]);

  const fetchGroups = async () => {
    if (!session?.user) return;
    try {
      const { data, error } = await supabase
        .from('group_members')
        .select('group_id')
        .eq('user_id', session.user.id);

      if (data && data.length > 0) {
        const groupIds = data.map(d => d.group_id);
        const { data: groupsData } = await supabase.from('groups').select('*').in('id', groupIds);
        if (groupsData) setGroups(groupsData);
      } else {
        setGroups([]);
      }
    } catch (err) {
      console.error("Error fetching groups", err);
    }
  };

  const handleGroupUpdate = async () => {
    await fetchGroups();
    if (selectedGroup) {
      const { data } = await supabase.from('groups').select('*').eq('id', selectedGroup.id).single();
      if (data) setSelectedGroup(data);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
  };

  if (loading) {
    return <div className="min-h-screen bg-[#0f172a] flex items-center justify-center text-indigo-400">Memuat...</div>;
  }

  if (!session) {
    return <Auth onBack={onBackToWeather} />;
  }

  return (
    <div className="flex h-screen bg-[#0f172a] overflow-hidden font-sans text-slate-300 selection:bg-indigo-500/30 selection:text-indigo-100">
      
      {/* SERVER BAR (Midnight Theme) */}
      <div className="w-[72px] bg-[#020617] border-r border-slate-800/50 flex flex-col items-center py-3 space-y-3 flex-shrink-0 z-20 overflow-y-auto custom-scrollbar shadow-[4px_0_24px_rgba(0,0,0,0.5)]">
        
        {/* Back to Surface (Weather App) Button */}
        <div className="relative group mb-1">
          <button 
            onClick={onBackToWeather} 
            className="w-12 h-12 transition-all duration-300 flex items-center justify-center shadow-lg bg-slate-900 text-amber-400/80 rounded-[24px] hover:rounded-[16px] hover:bg-amber-500/10 hover:text-amber-300 hover:shadow-[0_0_20px_rgba(251,191,36,0.2)] border border-slate-800 hover:border-amber-500/30"
            title="Kembali ke Cuaca"
          >
            <CloudSun size={22} />
          </button>
        </div>

        <div className="w-8 h-[1px] bg-slate-800/60 rounded-full my-1"></div>

        {/* DM Button (Home) */}
        <div className="relative group">
          <button 
            onClick={() => setActiveView('dm')} 
            className={`w-12 h-12 transition-all duration-300 flex items-center justify-center shadow-lg ${activeView === 'dm' ? 'bg-indigo-600 text-white rounded-[16px] shadow-[0_0_20px_rgba(79,70,229,0.4)]' : 'bg-slate-900 text-indigo-400/70 rounded-[24px] hover:rounded-[16px] hover:bg-indigo-500/20 hover:text-indigo-300 border border-slate-800 hover:border-indigo-500/30'}`}
            title="Pesan Langsung"
          >
            <MessageSquare size={22} />
          </button>
          {activeView === 'dm' && <div className="absolute -left-3 top-1/2 transform -translate-y-1/2 w-1.5 h-8 bg-indigo-400 rounded-r-full shadow-[0_0_10px_rgba(129,140,248,0.8)]"></div>}
        </div>

        <div className="w-8 h-[1px] bg-slate-800/60 rounded-full my-1"></div>

        {/* Group List */}
        {groups.map(g => (
          <div key={g.id} className="relative group">
            <button 
              onClick={() => { setActiveView('group'); setSelectedGroup(g); }} 
              className={`w-12 h-12 transition-all duration-300 flex items-center justify-center shadow-lg overflow-hidden ${activeView === 'group' && selectedGroup?.id === g.id ? 'bg-indigo-600 text-white rounded-[16px] shadow-[0_0_20px_rgba(79,70,229,0.4)] border-transparent' : 'bg-slate-900 text-indigo-400/70 rounded-[24px] hover:rounded-[16px] hover:bg-indigo-500/20 hover:text-indigo-300 border border-slate-800 hover:border-indigo-500/30'}`}
              title={g.name}
            >
              {g.avatar_url ? (
                <img src={g.avatar_url} alt={g.name} className="w-full h-full object-cover opacity-90 group-hover:opacity-100 transition-opacity" />
              ) : (
                <span className="font-medium text-lg">{g.name[0].toUpperCase()}</span>
              )}
            </button>
            {activeView === 'group' && selectedGroup?.id === g.id && <div className="absolute -left-3 top-1/2 transform -translate-y-1/2 w-1.5 h-8 bg-indigo-400 rounded-r-full shadow-[0_0_10px_rgba(129,140,248,0.8)]"></div>}
          </div>
        ))}

        {/* Create Group Button */}
        <button 
          onClick={() => setShowCreateGroup(true)} 
          className="w-12 h-12 rounded-[24px] hover:rounded-[16px] transition-all duration-300 bg-slate-900 text-emerald-500/70 hover:bg-emerald-500/10 hover:text-emerald-400 flex items-center justify-center shadow-lg mt-2 border border-slate-800 hover:border-emerald-500/30"
          title="Buat Grup Baru"
        >
          <Plus size={24} />
        </button>
      </div>

      {/* SIDEBAR (Middle) */}
      {activeView === 'dm' ? (
        <Sidebar currentUser={session.user} onSelectFriend={setSelectedFriend} selectedFriendId={selectedFriend?.id} />
      ) : (
        selectedGroup ? <GroupSidebar currentUser={session.user} group={selectedGroup} onLogout={handleLogout} onGroupUpdate={handleGroupUpdate} /> : <div className="w-64 bg-[#0f172a] border-r border-slate-800/50"></div>
      )}

      {/* CHAT AREA (Right) */}
      {activeView === 'dm' ? (
        selectedFriend ? <ChatArea currentUser={session.user} friend={selectedFriend} /> : (
          <div className="flex-1 flex flex-col items-center justify-center text-slate-500 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-slate-900 via-[#0f172a] to-[#020617]">
            <div className="w-32 h-32 bg-slate-900/50 border border-slate-800/50 rounded-full flex items-center justify-center mb-8 shadow-[0_0_40px_rgba(0,0,0,0.5)] backdrop-blur-sm">
              <MessageSquare size={48} className="text-indigo-500/50" />
            </div>
            <h2 className="text-indigo-100/80 text-2xl font-light tracking-wide mb-3 drop-shadow-md">Pesan Langsung</h2>
            <p className="text-slate-500 font-light tracking-wide">Pilih teman dari panel kiri untuk mulai mengobrol.</p>
          </div>
        )
      ) : (
        selectedGroup ? <GroupChatArea currentUser={session.user} group={selectedGroup} /> : (
          <div className="flex-1 flex flex-col items-center justify-center text-slate-500 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-slate-900 via-[#0f172a] to-[#020617]">
            <div className="w-32 h-32 bg-slate-900/50 border border-slate-800/50 rounded-full flex items-center justify-center mb-8 shadow-[0_0_40px_rgba(0,0,0,0.5)] backdrop-blur-sm">
              <Hash size={48} className="text-indigo-500/50" />
            </div>
            <h2 className="text-indigo-100/80 text-2xl font-light tracking-wide mb-3 drop-shadow-md">Grup Chat</h2>
            <p className="text-slate-500 font-light tracking-wide">Pilih grup dari panel kiri untuk mulai mengobrol.</p>
          </div>
        )
      )}

      {/* Modals */}
      {showCreateGroup && (
        <CreateGroupModal 
          currentUser={session.user} 
          onClose={() => setShowCreateGroup(false)} 
          onSuccess={fetchGroups} 
        />
      )}
    </div>
  );
};
