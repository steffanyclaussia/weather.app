import React, { useState, useEffect } from 'react';
import { X, Users, Loader2, Check } from 'lucide-react';
import { supabase } from '../supabaseClient';
import { Profile } from '../types';

interface CreateGroupModalProps {
  currentUser: any;
  onClose: () => void;
  onSuccess: () => void;
}

export const CreateGroupModal: React.FC<CreateGroupModalProps> = ({ currentUser, onClose, onSuccess }) => {
  const [groupName, setGroupName] = useState('');
  const [friends, setFriends] = useState<Profile[]>([]);
  const [selectedFriends, setSelectedFriends] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchFriends();
  }, []);

  const fetchFriends = async () => {
    const { data: friendships } = await supabase
      .from('friendships')
      .select('*')
      .or(`user_id.eq.${currentUser.id},friend_id.eq.${currentUser.id}`)
      .eq('status', 'accepted');

    if (friendships && friendships.length > 0) {
      const friendIds = friendships.map(f => f.user_id === currentUser.id ? f.friend_id : f.user_id);
      const { data: profiles } = await supabase.from('profiles').select('*').in('id', friendIds);
      if (profiles) {
        const updatedProfiles = profiles.map(p => {
          const localAvatar = localStorage.getItem(`avatar_${p.id}`);
          if (localAvatar) p.avatar_url = localAvatar;
          return p;
        });
        setFriends(updatedProfiles);
      }
    }
  };

  const toggleFriend = (id: string) => {
    setSelectedFriends(prev => 
      prev.includes(id) ? prev.filter(fId => fId !== id) : [...prev, id]
    );
  };

  const handleCreateGroup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!groupName.trim()) return;

    setLoading(true);
    try {
      const { data: group, error: groupError } = await supabase
        .from('groups')
        .insert([{ name: groupName, created_by: currentUser.id }])
        .select()
        .single();

      if (groupError) throw groupError;

      const members = [
        { group_id: group.id, user_id: currentUser.id },
        ...selectedFriends.map(id => ({ group_id: group.id, user_id: id }))
      ];

      const { error: membersError } = await supabase.from('group_members').insert(members);
      if (membersError) throw membersError;

      onSuccess();
      onClose();
    } catch (error: any) {
      console.error("Gagal membuat grup:", error);
      alert("Gagal membuat grup. Pastikan tabel groups dan group_members sudah ada.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-fade-in">
      <div className="bg-[#0f172a] w-full max-w-md rounded-2xl shadow-[0_20px_50px_rgba(0,0,0,0.5)] overflow-hidden flex flex-col border border-slate-800/50">
        <div className="flex items-center justify-between p-5 border-b border-slate-800/50 bg-slate-900/50">
          <h2 className="text-xl font-medium text-slate-100 flex items-center tracking-wide">
            <Users className="mr-3 text-indigo-400/70" size={22} />
            Buat Grup Baru
          </h2>
          <button onClick={onClose} className="text-slate-500 hover:text-slate-300 transition-colors bg-slate-800/50 p-1.5 rounded-full">
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleCreateGroup} className="p-6 flex flex-col max-h-[70vh]">
          <div className="mb-6">
            <label className="block text-slate-500 text-[10px] font-semibold uppercase tracking-widest mb-2">Nama Grup</label>
            <input
              type="text"
              value={groupName}
              onChange={(e) => setGroupName(e.target.value)}
              placeholder="Masukkan nama grup..."
              className="w-full bg-slate-900/50 border border-slate-800 text-slate-200 p-3 rounded-lg focus:outline-none focus:border-indigo-500/50 transition-all placeholder-slate-600 text-sm"
              required
            />
          </div>

          <div className="flex-1 overflow-y-auto custom-scrollbar mb-6">
            <label className="block text-slate-500 text-[10px] font-semibold uppercase tracking-widest mb-2">Pilih Teman ({selectedFriends.length})</label>
            {friends.length === 0 ? (
              <p className="text-slate-500 text-xs bg-slate-900/30 p-4 rounded-lg border border-slate-800/50 text-center font-light">Anda belum memiliki teman untuk ditambahkan.</p>
            ) : (
              <div className="space-y-2">
                {friends.map(friend => (
                  <div 
                    key={friend.id} 
                    onClick={() => toggleFriend(friend.id)}
                    className="flex items-center justify-between p-2.5 bg-slate-900/30 hover:bg-slate-800/50 rounded-xl cursor-pointer transition-colors border border-slate-800/50 hover:border-slate-700/50"
                  >
                    <div className="flex items-center space-x-3">
                      <div className="w-8 h-8 rounded-full bg-slate-800 flex items-center justify-center text-indigo-200 text-xs font-medium overflow-hidden border border-slate-700/50">
                        {friend.avatar_url ? (
                          <img src={friend.avatar_url} alt="avatar" className="w-full h-full object-cover opacity-90" />
                        ) : (
                          friend.username[0].toUpperCase()
                        )}
                      </div>
                      <span className="text-slate-300 text-sm font-medium tracking-wide">{friend.username}</span>
                    </div>
                    <div className={`w-5 h-5 rounded-md border flex items-center justify-center transition-colors ${selectedFriends.includes(friend.id) ? 'bg-indigo-500/80 border-indigo-500' : 'border-slate-700 bg-slate-900/50'}`}>
                      {selectedFriends.includes(friend.id) && <Check size={12} className="text-white" />}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="flex justify-end space-x-3 pt-5 border-t border-slate-800/50">
            <button type="button" onClick={onClose} className="px-4 py-2 text-slate-400 hover:text-slate-300 text-sm font-medium transition-colors">Batal</button>
            <button type="submit" disabled={loading || !groupName.trim()} className="bg-indigo-600 hover:bg-indigo-500 text-white px-6 py-2.5 rounded-xl font-medium flex items-center transition-colors disabled:opacity-50 shadow-lg shadow-indigo-900/20 text-sm tracking-wide">
              {loading ? <Loader2 size={16} className="animate-spin mr-2" /> : null}
              Buat Grup
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
