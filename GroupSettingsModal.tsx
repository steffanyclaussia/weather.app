import React, { useState, useEffect, useRef } from 'react';
import { X, Users, Save, Loader2, Settings, Shield, Calendar, UserPlus, Check, Camera } from 'lucide-react';
import { supabase } from '../supabaseClient';
import { Group, Profile } from '../types';

interface GroupSettingsModalProps {
  group: Group;
  memberCount: number;
  currentUser: any;
  onClose: () => void;
  onUpdate: () => void;
}

export const GroupSettingsModal: React.FC<GroupSettingsModalProps> = ({ group, memberCount, currentUser, onClose, onUpdate }) => {
  const [name, setName] = useState(group.name);
  const [avatarUrl, setAvatarUrl] = useState(group.avatar_url || '');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

  const [friendsNotInGroup, setFriendsNotInGroup] = useState<Profile[]>([]);
  const [selectedNewMembers, setSelectedNewMembers] = useState<string[]>([]);
  const [isAdding, setIsAdding] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const isAdmin = group.created_by === currentUser.id;

  useEffect(() => {
    fetchFriendsToAdd();
  }, []);

  const fetchFriendsToAdd = async () => {
    try {
      const { data: members } = await supabase.from('group_members').select('user_id').eq('group_id', group.id);
      const memberIds = members?.map(m => m.user_id) || [];

      const { data: friendships } = await supabase
        .from('friendships')
        .select('*')
        .or(`user_id.eq.${currentUser.id},friend_id.eq.${currentUser.id}`)
        .eq('status', 'accepted');

      if (friendships && friendships.length > 0) {
        const friendIds = friendships.map(f => f.user_id === currentUser.id ? f.friend_id : f.user_id);
        
        const idsToFetch = friendIds.filter(id => !memberIds.includes(id));

        if (idsToFetch.length > 0) {
          const { data: profiles } = await supabase.from('profiles').select('*').in('id', idsToFetch);
          if (profiles) {
            const updatedProfiles = profiles.map(p => {
              const localAvatar = localStorage.getItem(`avatar_${p.id}`);
              if (localAvatar) p.avatar_url = localAvatar;
              return p;
            });
            setFriendsNotInGroup(updatedProfiles);
          }
        } else {
          setFriendsNotInGroup([]);
        }
      }
    } catch (error) {
      console.error("Gagal mengambil daftar teman:", error);
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setLoading(true);

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = async () => {
        const canvas = document.createElement('canvas');
        const MAX_SIZE = 300; 
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > MAX_SIZE) {
            height *= MAX_SIZE / width;
            width = MAX_SIZE;
          }
        } else {
          if (height > MAX_SIZE) {
            width *= MAX_SIZE / height;
            height = MAX_SIZE;
          }
        }
        
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx?.drawImage(img, 0, 0, width, height);
        
        canvas.toBlob(async (blob) => {
          if (!blob) {
            setLoading(false);
            setMessage({ type: 'error', text: 'Gagal memproses gambar' });
            return;
          }

          try {
            const fileName = `group_${group.id}_${Date.now()}.jpg`;

            const { error: uploadError } = await supabase.storage
              .from('avatars')
              .upload(fileName, blob, {
                contentType: 'image/jpeg',
                upsert: true
              });

            if (uploadError) throw uploadError;

            const { data: { publicUrl } } = supabase.storage
              .from('avatars')
              .getPublicUrl(fileName);

            const { error: updateError } = await supabase
              .from('groups')
              .update({ avatar_url: publicUrl })
              .eq('id', group.id);
              
            if (updateError) throw updateError;
            
            setAvatarUrl(publicUrl);
            onUpdate();
            setMessage({ type: 'success', text: 'Foto grup berhasil diperbarui' });
          } catch (err: any) {
            console.warn("Upload error, fallback to base64:", err);
            // Fallback jika bucket storage belum disiapkan
            const base64Image = canvas.toDataURL('image/jpeg', 0.8);
            try {
              await supabase.from('groups').update({ avatar_url: base64Image }).eq('id', group.id);
              setAvatarUrl(base64Image);
              onUpdate();
              setMessage({ type: 'success', text: 'Foto grup diperbarui (Lokal)' });
            } catch (fallbackErr) {
              setMessage({ type: 'error', text: 'Gagal mengunggah foto grup.' });
            }
          } finally {
            setLoading(false);
          }
        }, 'image/jpeg', 0.8);
      };
      img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || name === group.name) return;
    
    setLoading(true);
    try {
      const { error } = await supabase.from('groups').update({ name }).eq('id', group.id);
      if (error) throw error;
      
      setMessage({ type: 'success', text: 'Nama grup berhasil diubah!' });
      onUpdate();
      setTimeout(() => onClose(), 1500);
    } catch (err: any) {
      setMessage({ type: 'error', text: 'Gagal mengubah nama grup.' });
    } finally {
      setLoading(false);
    }
  };

  const toggleNewMember = (id: string) => {
    setSelectedNewMembers(prev => 
      prev.includes(id) ? prev.filter(fId => fId !== id) : [...prev, id]
    );
  };

  const handleAddMembers = async () => {
    if (selectedNewMembers.length === 0) return;
    setIsAdding(true);
    try {
      const membersToAdd = selectedNewMembers.map(id => ({
        group_id: group.id,
        user_id: id
      }));
      
      const { error } = await supabase.from('group_members').insert(membersToAdd);
      if (error) throw error;

      setMessage({ type: 'success', text: `${selectedNewMembers.length} anggota berhasil ditambahkan!` });
      setSelectedNewMembers([]);
      fetchFriendsToAdd(); 
      onUpdate(); 
    } catch (err) {
      setMessage({ type: 'error', text: 'Gagal menambahkan anggota ke grup.' });
    } finally {
      setIsAdding(false);
    }
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return 'Tidak diketahui';
    return new Date(dateString).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-fade-in">
      <div className="bg-[#0f172a] w-full max-w-md rounded-2xl shadow-[0_20px_50px_rgba(0,0,0,0.5)] overflow-hidden flex flex-col border border-slate-800/50 max-h-[90vh]">
        
        <div className="flex items-center justify-between p-5 border-b border-slate-800/50 bg-slate-900/50 flex-shrink-0">
          <h2 className="text-xl font-medium text-slate-100 flex items-center tracking-wide">
            <Settings className="mr-3 text-indigo-400/70" size={22} />
            Pengaturan Grup
          </h2>
          <button onClick={onClose} className="text-slate-500 hover:text-slate-300 transition-colors bg-slate-800/50 p-1.5 rounded-full">
            <X size={18} />
          </button>
        </div>

        <div className="p-6 overflow-y-auto custom-scrollbar">
          {message && (
            <div className={`p-3 rounded-lg mb-5 text-sm font-medium border ${message.type === 'success' ? 'bg-emerald-900/20 text-emerald-400 border-emerald-800/50' : 'bg-rose-900/20 text-rose-400 border-rose-800/50'}`}>
              {message.text}
            </div>
          )}

          {/* Group Info Card */}
          <div className="flex items-center space-x-4 mb-8 bg-slate-900/50 p-5 rounded-xl border border-slate-800/50 shadow-inner">
            <div className="relative">
              <div 
                className={`w-16 h-16 rounded-2xl bg-indigo-900/50 flex items-center justify-center text-indigo-200 text-2xl font-medium shadow-sm border border-indigo-800/50 flex-shrink-0 overflow-hidden ${isAdmin ? 'cursor-pointer group' : ''}`}
                onClick={() => isAdmin && fileInputRef.current?.click()}
              >
                {avatarUrl ? (
                  <img src={avatarUrl} alt="Group Avatar" className="w-full h-full object-cover" />
                ) : (
                  group.name[0].toUpperCase()
                )}
                {isAdmin && (
                  <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                    <Camera size={20} className="text-white" />
                  </div>
                )}
              </div>
              {isAdmin && (
                <input 
                  type="file" 
                  ref={fileInputRef} 
                  onChange={handleFileChange} 
                  accept="image/*" 
                  className="hidden" 
                />
              )}
            </div>
            <div className="overflow-hidden">
              <h3 className="text-slate-200 font-medium text-lg truncate tracking-wide">{group.name}</h3>
              <div className="text-slate-500 text-xs mt-2 space-y-1.5 font-light">
                <p className="flex items-center"><Users size={12} className="mr-2 text-indigo-400/50" /> {memberCount} Anggota</p>
                <p className="flex items-center"><Calendar size={12} className="mr-2 text-indigo-400/50" /> Dibuat: {formatDate(group.created_at)}</p>
              </div>
            </div>
          </div>

          {/* Edit Group Name Form */}
          <form onSubmit={handleSave} className="space-y-4 mb-8">
            <div>
              <label className="block text-slate-500 text-[10px] font-semibold uppercase tracking-widest mb-2">Nama Grup</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                disabled={!isAdmin}
                className="w-full bg-slate-900/50 border border-slate-800 text-slate-200 p-3 rounded-lg focus:outline-none focus:border-indigo-500/50 transition-all disabled:opacity-50 placeholder-slate-600 text-sm"
              />
              {!isAdmin && (
                <p className="text-[10px] text-amber-500/70 mt-2 flex items-center font-light">
                  <Shield size={12} className="mr-1.5"/> Hanya admin yang dapat mengubah nama dan foto.
                </p>
              )}
            </div>

            {isAdmin && (
              <div className="flex justify-end">
                <button type="submit" disabled={loading || !name.trim() || name === group.name} className="bg-indigo-500/20 hover:bg-indigo-500/30 text-indigo-300 border border-indigo-500/30 px-5 py-2 rounded-lg font-medium flex items-center transition-colors disabled:opacity-50 text-xs tracking-wide">
                  {loading ? <Loader2 size={14} className="animate-spin mr-2" /> : <Save size={14} className="mr-2" />}
                  Simpan Nama
                </button>
              </div>
            )}
          </form>

          {/* Add Members Section */}
          <div className="border-t border-slate-800/50 pt-6">
            <h3 className="text-slate-500 text-[10px] font-semibold uppercase tracking-widest mb-4 flex items-center">
              <UserPlus size={14} className="mr-2 text-indigo-400/70" /> Tambah Anggota Baru
            </h3>
            
            {friendsNotInGroup.length === 0 ? (
              <p className="text-slate-500 text-xs bg-slate-900/30 p-4 rounded-lg border border-slate-800/50 text-center font-light">
                Semua teman Anda sudah berada di dalam grup ini, atau Anda belum memiliki teman baru.
              </p>
            ) : (
              <>
                <div className="space-y-2 max-h-48 overflow-y-auto custom-scrollbar pr-1 mb-5">
                  {friendsNotInGroup.map(friend => (
                    <div 
                      key={friend.id} 
                      onClick={() => toggleNewMember(friend.id)}
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
                      <div className={`w-5 h-5 rounded-md border flex items-center justify-center transition-colors ${selectedNewMembers.includes(friend.id) ? 'bg-indigo-500/80 border-indigo-500' : 'border-slate-700 bg-slate-900/50'}`}>
                        {selectedNewMembers.includes(friend.id) && <Check size={12} className="text-white" />}
                      </div>
                    </div>
                  ))}
                </div>
                
                {selectedNewMembers.length > 0 && (
                  <button 
                    type="button" 
                    onClick={handleAddMembers}
                    disabled={isAdding} 
                    className="w-full bg-indigo-600 hover:bg-indigo-500 text-white py-3 rounded-xl text-sm font-medium transition-colors flex items-center justify-center shadow-lg shadow-indigo-900/20 tracking-wide"
                  >
                    {isAdding ? <Loader2 size={16} className="animate-spin mr-2" /> : <UserPlus size={16} className="mr-2" />}
                    Tambahkan {selectedNewMembers.length} Anggota
                  </button>
                )}
              </>
            )}
          </div>

        </div>
      </div>
    </div>
  );
};
