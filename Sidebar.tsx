import React, { useState, useEffect, useRef } from 'react';
import { Search, UserPlus, Check, X, MessageSquare, LogOut, Settings, Edit2, Bell } from 'lucide-react';
import { supabase } from '../supabaseClient';
import { Profile, Friendship } from '../types';
import { ProfileSettings } from './ProfileSettings';

interface SidebarProps {
  currentUser: any;
  onSelectFriend: (friend: Profile) => void;
  selectedFriendId?: string;
}

export const Sidebar: React.FC<SidebarProps> = ({ currentUser, onSelectFriend, selectedFriendId }) => {
  const [friends, setFriends] = useState<Profile[]>([]);
  const [requests, setRequests] = useState<{ id: string, profile: Profile }[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Profile[]>([]);
  const [activeTab, setActiveTab] = useState<'friends' | 'add' | 'notifications'>('friends');
  const [myProfile, setMyProfile] = useState<Profile | null>(null);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  
  const [toastMsg, setToastMsg] = useState<{ title: string, desc: string, type: 'info' | 'success' | 'error' } | null>(null);

  const prevRequestsRef = useRef<string[]>([]);
  const prevFriendsRef = useRef<string[]>([]);

  useEffect(() => {
    fetchMyProfile();
    fetchFriendsAndRequests();

    const channel = supabase.channel('public:friendships')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'friendships' }, (payload) => {
        fetchFriendsAndRequests();
        
        if (payload.eventType === 'INSERT' && payload.new?.friend_id === currentUser.id && payload.new?.status === 'pending') {
          showToast('Permintaan Baru', 'Seseorang ingin menambahkan Anda sebagai teman.', 'info');
        }
        else if (payload.eventType === 'UPDATE' && payload.new?.user_id === currentUser.id && payload.new?.status === 'accepted') {
          showToast('Permintaan Diterima', 'Anda memiliki teman baru.', 'success');
        }
      })
      .subscribe();

    const interval = setInterval(() => {
      fetchFriendsAndRequests();
    }, 5000);

    return () => {
      supabase.removeChannel(channel);
      clearInterval(interval);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentUser]);

  const showToast = (title: string, desc: string, type: 'info' | 'success' | 'error' = 'info') => {
    setToastMsg({ title, desc, type });
    setTimeout(() => setToastMsg(null), 4000);
  };

  const fetchMyProfile = async () => {
    const { data } = await supabase.from('profiles').select('*').eq('id', currentUser.id).single();
    
    let currentProfile = data || { 
      id: currentUser.id, 
      username: currentUser.email?.split('@')[0] || 'User', 
      email: currentUser.email 
    };

    const localAvatar = localStorage.getItem(`avatar_${currentUser.id}`);
    if (localAvatar) currentProfile.avatar_url = localAvatar;

    const localUsername = localStorage.getItem(`username_${currentUser.id}`);
    if (localUsername) currentProfile.username = localUsername;

    setMyProfile(currentProfile);
  };

  const fetchFriendsAndRequests = async () => {
    if (!currentUser) return;

    const { data: sentRequests } = await supabase.from('friendships').select('*').eq('user_id', currentUser.id);
    const { data: receivedRequests } = await supabase.from('friendships').select('*').eq('friend_id', currentUser.id);

    const allFriendships = [...(sentRequests || []), ...(receivedRequests || [])];
    const uniqueFriendships = Array.from(new Map(allFriendships.map(item => [item.id, item])).values());

    const acceptedIds: string[] = [];
    const pendingRequests: { id: string, userId: string }[] = [];

    uniqueFriendships.forEach(f => {
      if (f.status === 'accepted') {
        acceptedIds.push(f.user_id === currentUser.id ? f.friend_id : f.user_id);
      } else if (f.status === 'pending' && f.friend_id === currentUser.id) {
        pendingRequests.push({ id: f.id, userId: f.user_id });
      }
    });

    if (acceptedIds.length > 0) {
      const { data: friendsProfiles } = await supabase.from('profiles').select('*').in('id', acceptedIds);
      if (friendsProfiles) {
        const updatedFriends = friendsProfiles.map(friend => {
          const localAvatar = localStorage.getItem(`avatar_${friend.id}`);
          if (localAvatar) friend.avatar_url = localAvatar;
          return friend;
        });
        setFriends(updatedFriends);

        const currentFriendIds = updatedFriends.map(f => f.id);
        const newFriends = currentFriendIds.filter(id => !prevFriendsRef.current.includes(id));
        if (prevFriendsRef.current.length > 0 && newFriends.length > 0) {
          showToast('Permintaan Diterima', 'Anda memiliki teman baru.', 'success');
        }
        prevFriendsRef.current = currentFriendIds;
      }
    } else {
      setFriends([]);
      prevFriendsRef.current = [];
    }

    if (pendingRequests.length > 0) {
      const requestUserIds = pendingRequests.map(pr => pr.userId);
      const { data: requestProfiles } = await supabase.from('profiles').select('*').in('id', requestUserIds);
      
      if (requestProfiles) {
        const formattedRequests = pendingRequests.map(pr => {
          const profile = requestProfiles.find(p => p.id === pr.userId);
          if (!profile) return null; 
          const localAvatar = localStorage.getItem(`avatar_${profile.id}`);
          if (localAvatar) profile.avatar_url = localAvatar;
          return { id: pr.id, profile };
        }).filter(Boolean) as { id: string, profile: Profile }[]; 
        
        setRequests(formattedRequests);

        const currentReqIds = formattedRequests.map(r => r.id);
        const newReqs = currentReqIds.filter(id => !prevRequestsRef.current.includes(id));
        if (prevRequestsRef.current.length > 0 && newReqs.length > 0) {
          showToast('Permintaan Baru', 'Seseorang ingin menambahkan Anda sebagai teman.', 'info');
        }
        prevRequestsRef.current = currentReqIds;
      }
    } else {
      setRequests([]);
      prevRequestsRef.current = [];
    }
  };

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;

    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .ilike('username', `%${searchQuery}%`)
      .neq('id', currentUser.id);

    if (data) {
      const updatedResults = data.map(user => {
        const localAvatar = localStorage.getItem(`avatar_${user.id}`);
        if (localAvatar) user.avatar_url = localAvatar;
        return user;
      });
      setSearchResults(updatedResults);
    }
  };

  const sendRequest = async (friendId: string) => {
    try {
      const { data: existing1 } = await supabase.from('friendships').select('*').eq('user_id', currentUser.id).eq('friend_id', friendId);
      const { data: existing2 } = await supabase.from('friendships').select('*').eq('user_id', friendId).eq('friend_id', currentUser.id);
        
      if ((existing1 && existing1.length > 0) || (existing2 && existing2.length > 0)) {
        showToast('Gagal', 'Anda sudah berteman atau permintaan sudah ada.', 'error');
        return;
      }

      const { error } = await supabase.from('friendships').insert([
        { user_id: currentUser.id, friend_id: friendId, status: 'pending' }
      ]);

      if (error) {
        showToast('Gagal', error.message || 'Terjadi kesalahan.', 'error');
      } else {
        setSearchQuery('');
        setSearchResults([]);
        showToast('Terkirim', 'Permintaan pertemanan berhasil dikirim.', 'success');
        fetchFriendsAndRequests(); 
      }
    } catch (err: any) {
      showToast('Error', err.message, 'error');
    }
  };

  const handleRequest = async (friendshipId: string, status: 'accepted' | 'rejected') => {
    if (status === 'rejected') {
      const { error } = await supabase.from('friendships').delete().eq('id', friendshipId);
      if (!error) showToast('Ditolak', 'Permintaan pertemanan ditolak.', 'info');
    } else {
      const { error } = await supabase.from('friendships').update({ status }).eq('id', friendshipId);
      if (!error) {
        showToast('Diterima', 'Permintaan pertemanan diterima.', 'success');
        setActiveTab('friends'); 
      }
    }
    fetchFriendsAndRequests();
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
  };

  const displayUsername = myProfile?.username || currentUser?.email?.split('@')[0] || 'User';
  const displayInitial = myProfile?.username?.[0]?.toUpperCase() || currentUser?.email?.[0]?.toUpperCase() || '?';

  return (
    <>
      <div className="w-72 bg-[#0f172a] flex flex-col h-full border-r border-slate-800/50 relative shadow-[4px_0_24px_rgba(0,0,0,0.2)] z-10">
        
        {/* Toast Notification */}
        {toastMsg && (
          <div className={`absolute top-16 left-1/2 transform -translate-x-1/2 w-[90%] p-3 rounded-xl shadow-[0_10px_30px_rgba(0,0,0,0.5)] z-50 animate-fade-in flex items-start space-x-3 text-white border backdrop-blur-md ${toastMsg.type === 'success' ? 'bg-emerald-900/80 border-emerald-500/50' : toastMsg.type === 'error' ? 'bg-rose-900/80 border-rose-500/50' : 'bg-indigo-900/80 border-indigo-500/50'}`}>
            <Bell size={18} className={`mt-0.5 flex-shrink-0 animate-pulse ${toastMsg.type === 'success' ? 'text-emerald-400' : toastMsg.type === 'error' ? 'text-rose-400' : 'text-indigo-400'}`} />
            <div className="flex flex-col">
              <span className="font-medium text-sm tracking-wide">{toastMsg.title}</span>
              <span className="text-xs opacity-80 mt-0.5 font-light">{toastMsg.desc}</span>
            </div>
          </div>
        )}

        {/* Header */}
        <div className="h-16 flex items-center px-4 shadow-sm bg-[#0f172a] z-10 space-x-3 border-b border-slate-800/50">
          <div className="flex-1 relative">
            <input
              type="text"
              placeholder="Cari teman..."
              className="w-full bg-slate-900/50 border border-slate-800 text-sm text-slate-200 px-4 py-2 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500/50 focus:border-indigo-500/50 transition-all placeholder-slate-600"
              readOnly
              onClick={() => setActiveTab('add')}
            />
          </div>
          <button
            onClick={() => setActiveTab('notifications')}
            className={`relative p-2.5 rounded-lg transition-all duration-300 ${activeTab === 'notifications' ? 'bg-indigo-500/20 text-indigo-400 border border-indigo-500/30' : 'bg-slate-900/50 text-slate-500 border border-slate-800 hover:bg-slate-800 hover:text-indigo-300'}`}
            title="Notifikasi"
          >
            <Bell size={18} />
            {requests.length > 0 && (
              <span className="absolute -top-1 -right-1 bg-rose-500 text-white text-[10px] font-bold w-4 h-4 flex items-center justify-center rounded-full shadow-[0_0_10px_rgba(244,63,94,0.6)] animate-pulse">
                {requests.length}
              </span>
            )}
          </button>
        </div>

        {/* Tabs */}
        <div className="flex px-3 pt-4 space-x-2 mb-2">
          <button
            onClick={() => setActiveTab('friends')}
            className={`flex-1 py-2 text-xs font-medium tracking-wide rounded-lg flex items-center justify-center space-x-2 transition-all duration-300 ${activeTab === 'friends' ? 'bg-slate-800/80 text-indigo-300 shadow-inner border border-slate-700/50' : 'text-slate-500 hover:bg-slate-800/50 hover:text-slate-300 border border-transparent'}`}
          >
            <MessageSquare size={14} />
            <span>Teman</span>
          </button>
          <button
            onClick={() => setActiveTab('add')}
            className={`flex-1 py-2 text-xs font-medium tracking-wide rounded-lg flex items-center justify-center space-x-2 transition-all duration-300 ${activeTab === 'add' ? 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 shadow-[inset_0_0_15px_rgba(79,70,229,0.1)]' : 'text-slate-500 hover:bg-slate-800/50 hover:text-slate-300 border border-transparent'}`}
          >
            <UserPlus size={14} />
            <span>Tambah</span>
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-3 custom-scrollbar">
          
          {/* TAB: NOTIFIKASI */}
          {activeTab === 'notifications' && (
            <div className="py-2 animate-fade-in">
              <h2 className="text-indigo-300/80 font-medium text-sm mb-4 flex items-center tracking-wide px-1">
                <Bell size={16} className="mr-2 text-indigo-500/70" />
                Notifikasi
              </h2>
              
              {requests.length === 0 ? (
                <div className="flex flex-col items-center justify-center mt-12 text-slate-600">
                  <div className="w-16 h-16 rounded-full bg-slate-900/50 flex items-center justify-center mb-4 border border-slate-800/50">
                    <Bell size={24} className="opacity-40" />
                  </div>
                  <p className="text-xs text-center px-4 font-light tracking-wide">Tidak ada notifikasi baru.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {requests.map(req => (
                    <div key={req.id} className="flex flex-col p-3 bg-slate-900/40 rounded-xl border border-slate-800/60 shadow-sm hover:border-slate-700/60 transition-colors">
                      <div className="flex items-center space-x-3 mb-3">
                        <div className="w-10 h-10 rounded-full bg-slate-800 flex items-center justify-center text-indigo-200 font-medium overflow-hidden flex-shrink-0 border border-slate-700/50">
                          {req.profile.avatar_url ? (
                            <img src={req.profile.avatar_url} alt="avatar" className="w-full h-full object-cover opacity-90" />
                          ) : (
                            req.profile.username[0].toUpperCase()
                          )}
                        </div>
                        <div className="flex flex-col overflow-hidden">
                          <span className="text-slate-200 font-medium text-sm truncate">{req.profile.username}</span>
                          <span className="text-slate-500 text-[10px] uppercase tracking-wider mt-0.5 truncate">Ingin menjadi teman Anda</span>
                        </div>
                      </div>
                      <div className="flex space-x-2">
                        <button 
                          onClick={() => handleRequest(req.id, 'accepted')} 
                          className="flex-1 py-1.5 bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 text-xs font-medium rounded-lg hover:bg-indigo-500/30 transition-colors flex items-center justify-center"
                        >
                          <Check size={14} className="mr-1.5" /> Terima
                        </button>
                        <button 
                          onClick={() => handleRequest(req.id, 'rejected')} 
                          className="flex-1 py-1.5 bg-slate-800/50 text-slate-400 border border-slate-700/50 text-xs font-medium rounded-lg hover:bg-slate-800 hover:text-slate-300 transition-colors flex items-center justify-center"
                        >
                          <X size={14} className="mr-1.5" /> Tolak
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TAB: TEMAN */}
          {activeTab === 'friends' && (
            <div className="py-2 animate-fade-in">
              <h3 className="text-[10px] font-semibold text-slate-500 uppercase tracking-widest mb-3 px-2 mt-1">
                Daftar Teman
              </h3>
              {friends.length === 0 ? (
                <div className="flex flex-col items-center justify-center mt-12 text-slate-600">
                  <div className="w-16 h-16 rounded-full bg-slate-900/50 flex items-center justify-center mb-4 border border-slate-800/50">
                    <MessageSquare size={24} className="opacity-40" />
                  </div>
                  <p className="text-xs text-center px-4 font-light tracking-wide">Belum ada teman. Tambahkan teman untuk mulai mengobrol!</p>
                </div>
              ) : (
                <div className="space-y-1">
                  {friends.map(friend => (
                    <button
                      key={friend.id}
                      onClick={() => onSelectFriend(friend)}
                      className={`w-full flex items-center space-x-3 p-2.5 rounded-xl transition-all duration-200 border ${selectedFriendId === friend.id ? 'bg-slate-800/80 border-slate-700/50 shadow-sm' : 'bg-transparent border-transparent hover:bg-slate-900/50 hover:border-slate-800/50'}`}
                    >
                      <div className="w-9 h-9 rounded-full bg-slate-800 flex items-center justify-center text-indigo-200 font-medium relative overflow-hidden border border-slate-700/50 flex-shrink-0">
                        {friend.avatar_url ? (
                          <img src={friend.avatar_url} alt="avatar" className="w-full h-full object-cover opacity-90" />
                        ) : (
                          friend.username[0].toUpperCase()
                        )}
                        <div className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-emerald-500 border-2 border-[#0f172a] rounded-full z-10"></div>
                      </div>
                      <span className={`font-medium text-sm truncate transition-colors ${selectedFriendId === friend.id ? 'text-indigo-100' : 'text-slate-400'}`}>{friend.username}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TAB: TAMBAH TEMAN */}
          {activeTab === 'add' && (
            <div className="py-2 animate-fade-in">
              <h2 className="text-indigo-300/80 font-medium text-sm mb-2 px-1 tracking-wide">Tambah Teman</h2>
              <p className="text-slate-500 text-[11px] mb-4 px-1 font-light">Cari pengguna lain menggunakan username mereka.</p>
              <form onSubmit={handleSearch} className="flex mb-5 shadow-sm">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Masukkan username"
                  className="flex-1 bg-slate-900/50 border border-slate-800 border-r-0 text-slate-200 p-2.5 text-xs rounded-l-lg focus:outline-none focus:border-indigo-500/50 transition-colors placeholder-slate-600"
                />
                <button type="submit" className="bg-indigo-500/20 border border-indigo-500/30 border-l-0 text-indigo-400 px-3.5 rounded-r-lg hover:bg-indigo-500/30 transition-colors">
                  <Search size={16} />
                </button>
              </form>

              <div className="space-y-2">
                {searchResults.map(user => (
                  <div key={user.id} className="flex items-center justify-between p-2.5 bg-slate-900/40 rounded-xl border border-slate-800/60 hover:border-slate-700/60 transition-colors">
                    <div className="flex items-center space-x-3 overflow-hidden">
                      <div className="w-9 h-9 rounded-full bg-slate-800 flex items-center justify-center text-indigo-200 text-sm font-medium overflow-hidden flex-shrink-0 border border-slate-700/50">
                        {user.avatar_url ? (
                          <img src={user.avatar_url} alt="avatar" className="w-full h-full object-cover opacity-90" />
                        ) : (
                          user.username[0].toUpperCase()
                        )}
                      </div>
                      <span className="text-slate-300 text-sm font-medium truncate">{user.username}</span>
                    </div>
                    <button
                      onClick={() => sendRequest(user.id)}
                      className="bg-indigo-500/20 border border-indigo-500/30 text-indigo-300 text-[11px] font-medium px-3 py-1.5 rounded-lg hover:bg-indigo-500/30 transition-colors flex-shrink-0 ml-2"
                    >
                      Tambah
                    </button>
                  </div>
                ))}
                {searchQuery && searchResults.length === 0 && (
                  <p className="text-center text-slate-600 text-xs mt-6 font-light">Pengguna tidak ditemukan.</p>
                )}
              </div>
            </div>
          )}
        </div>

        {/* User Profile Area */}
        <div className="h-[76px] bg-[#020617] flex items-center justify-between px-4 flex-shrink-0 border-t border-slate-800/50">
          <div 
            className="flex items-center space-x-3 overflow-hidden cursor-pointer hover:bg-slate-900/50 p-2 -ml-2 rounded-xl transition-all duration-300 flex-1 group border border-transparent hover:border-slate-800/50"
            onClick={() => setIsSettingsOpen(true)}
            title="Pengaturan Profil"
          >
            <div className="w-10 h-10 rounded-full bg-slate-800 flex items-center justify-center text-indigo-200 font-medium flex-shrink-0 overflow-hidden relative shadow-sm border border-slate-700/50">
              {myProfile?.avatar_url ? (
                <img src={myProfile.avatar_url} alt="avatar" className="w-full h-full object-cover opacity-90 group-hover:opacity-50 transition-opacity" />
              ) : (
                displayInitial
              )}
              <div className="absolute inset-0 bg-black/40 hidden group-hover:flex items-center justify-center transition-all">
                <Settings size={16} className="text-indigo-300" />
              </div>
              <div className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-emerald-500 border-2 border-[#020617] rounded-full"></div>
            </div>
            <div className="flex flex-col overflow-hidden">
              <span className="text-slate-200 text-sm font-medium truncate group-hover:text-indigo-100 transition-colors">{displayUsername}</span>
              <span className="text-slate-500 text-[10px] uppercase tracking-wider mt-0.5 truncate group-hover:text-indigo-400/70 transition-colors">Pengaturan</span>
            </div>
          </div>
          
          <div className="flex items-center ml-2">
            <button 
              onClick={handleLogout} 
              className="text-slate-500 hover:text-rose-400 p-2.5 rounded-xl hover:bg-rose-500/10 transition-colors" 
              title="Keluar"
            >
              <LogOut size={18} />
            </button>
          </div>
        </div>
      </div>

      {isSettingsOpen && myProfile && (
        <ProfileSettings 
          currentUser={currentUser} 
          profile={myProfile} 
          onClose={() => setIsSettingsOpen(false)} 
          onUpdate={fetchMyProfile} 
        />
      )}
    </>
  );
};
