import React, { useState, useRef } from 'react';
import { ArrowLeft, Camera, Check, Edit2, Loader2, X } from 'lucide-react';
import { supabase } from '../supabaseClient';
import { Profile } from '../types';

interface ProfileSettingsProps {
  currentUser: any;
  profile: Profile;
  onClose: () => void;
  onUpdate: () => void;
}

export const ProfileSettings: React.FC<ProfileSettingsProps> = ({ currentUser, profile, onClose, onUpdate }) => {
  const [avatarUrl, setAvatarUrl] = useState(profile.avatar_url || '');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);
  
  // State untuk inline editing ala WhatsApp
  const [editingField, setEditingField] = useState<'username' | 'email' | 'password' | null>(null);
  const [editValue, setEditValue] = useState('');

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Warna aksen ala WhatsApp Dark Mode
  const accentColor = "text-[#00a884]";
  const accentBorder = "border-[#00a884]";
  const accentBg = "bg-[#00a884]";

  // Fungsi untuk mengkompres dan mengunggah gambar ke Supabase Storage
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setLoading(true);

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = async () => {
        const canvas = document.createElement('canvas');
        const MAX_SIZE = 300; // Resolusi avatar yang cukup baik
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
        
        // Ubah canvas menjadi Blob untuk diunggah ke Storage
        canvas.toBlob(async (blob) => {
          if (!blob) {
            setLoading(false);
            showMessage('error', 'Gagal memproses gambar');
            return;
          }

          try {
            // 1. Buat nama file unik
            const fileName = `${currentUser.id}_${Date.now()}.jpg`;

            // 2. Unggah ke Supabase Storage bucket 'avatars'
            const { error: uploadError } = await supabase.storage
              .from('avatars')
              .upload(fileName, blob, {
                contentType: 'image/jpeg',
                upsert: true
              });

            if (uploadError) throw uploadError;

            // 3. Dapatkan Public URL dari file yang diunggah
            const { data: { publicUrl } } = supabase.storage
              .from('avatars')
              .getPublicUrl(fileName);

            // 4. Simpan URL ke kolom avatar_url di tabel profiles
            const { error: updateError } = await supabase
              .from('profiles')
              .update({ avatar_url: publicUrl })
              .eq('id', currentUser.id);
              
            if (updateError) throw updateError;
            
            // Update state lokal
            setAvatarUrl(publicUrl);
            localStorage.setItem(`avatar_${currentUser.id}`, publicUrl);
            onUpdate();
            showMessage('success', 'Foto profil berhasil diperbarui');
          } catch (err: any) {
            console.error("Upload error:", err);
            showMessage('error', 'Gagal mengunggah foto. Pastikan bucket "avatars" tersedia dan public.');
          } finally {
            setLoading(false);
          }
        }, 'image/jpeg', 0.8);
      };
      img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  const startEdit = (field: 'username' | 'email' | 'password', currentValue: string) => {
    setEditingField(field);
    setEditValue(currentValue);
  };

  const cancelEdit = () => {
    setEditingField(null);
    setEditValue('');
  };

  const showMessage = (type: 'success' | 'error', text: string) => {
    setMessage({ type, text });
    setTimeout(() => setMessage(null), 3000);
  };

  const saveField = async () => {
    if (!editValue.trim() && editingField !== 'password') {
      showMessage('error', 'Nilai tidak boleh kosong');
      return;
    }

    setLoading(true);
    try {
      if (editingField === 'username') {
        const { error } = await supabase.from('profiles').update({ username: editValue }).eq('id', currentUser.id);
        if (error) throw error;
        localStorage.setItem(`username_${currentUser.id}`, editValue);
      } else if (editingField === 'email') {
        const { error: authError } = await supabase.auth.updateUser({ email: editValue });
        if (authError) throw authError;
        const { error: profileError } = await supabase.from('profiles').update({ email: editValue }).eq('id', currentUser.id);
        if (profileError) throw profileError;
      } else if (editingField === 'password') {
        if (editValue.length < 6) throw new Error('Password minimal 6 karakter');
        const { error } = await supabase.auth.updateUser({ password: editValue });
        if (error) throw error;
      }

      showMessage('success', 'Data berhasil diperbarui');
      onUpdate();
      setEditingField(null);
    } catch (error: any) {
      console.warn("DB Update failed, using local fallback", error);
      if (editingField === 'username') {
         localStorage.setItem(`username_${currentUser.id}`, editValue);
         showMessage('success', 'Nama diperbarui (Lokal)');
         onUpdate();
         setEditingField(null);
      } else {
         showMessage('error', error.message || 'Terjadi kesalahan');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-fade-in">
      {/* Container ala WhatsApp Dark Mode */}
      <div className="bg-[#111b21] w-full max-w-md h-[85vh] max-h-[700px] rounded-xl shadow-2xl overflow-hidden flex flex-col border border-[#202c33]">
        
        {/* Header */}
        <div className="flex items-center p-4 bg-[#202c33] text-[#e9edef] shadow-md z-10">
          <button onClick={onClose} className="p-2 mr-3 rounded-full hover:bg-white/10 transition-colors">
            <ArrowLeft size={24} />
          </button>
          <h2 className="text-xl font-medium">Profil</h2>
        </div>

        {/* Content Scrollable */}
        <div className="flex-1 overflow-y-auto custom-scrollbar bg-[#111b21] relative">
          
          {/* Notifikasi Toast */}
          {message && (
            <div className={`absolute top-4 left-1/2 transform -translate-x-1/2 px-4 py-2 rounded-full shadow-lg text-sm font-medium z-50 flex items-center transition-all ${message.type === 'success' ? 'bg-[#00a884] text-white' : 'bg-red-500 text-white'}`}>
              {message.text}
            </div>
          )}

          {/* Avatar Section */}
          <div className="flex flex-col items-center justify-center py-10">
            <div className="relative">
              <div 
                className="w-48 h-48 rounded-full bg-[#202c33] flex items-center justify-center text-[#8696a0] text-6xl font-bold overflow-hidden shadow-lg cursor-pointer group"
                onClick={() => fileInputRef.current?.click()}
              >
                {avatarUrl ? (
                  <img src={avatarUrl} alt="Avatar" className="w-full h-full object-cover" />
                ) : (
                  profile.username?.[0]?.toUpperCase() || '?'
                )}
                {/* Overlay hover ala WhatsApp */}
                <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 flex flex-col items-center justify-center transition-opacity">
                  <Camera size={36} className="text-white mb-2" />
                  <span className="text-xs font-medium uppercase tracking-wider text-center px-4 text-white">Ubah Foto Profil</span>
                </div>
              </div>
              
              {/* Floating Camera Button */}
              <button 
                onClick={() => fileInputRef.current?.click()}
                className={`absolute bottom-2 right-2 w-14 h-14 ${accentBg} rounded-full flex items-center justify-center text-white shadow-lg hover:brightness-110 transition-transform hover:scale-105 border-4 border-[#111b21]`}
              >
                {loading && !editingField ? <Loader2 size={24} className="animate-spin" /> : <Camera size={24} />}
              </button>
              <input 
                type="file" 
                ref={fileInputRef} 
                onChange={handleFileChange} 
                accept="image/*" 
                className="hidden" 
              />
            </div>
          </div>

          {/* Info Sections */}
          <div className="space-y-0 pb-8">
            
            {/* Username Field */}
            <div className="px-8 py-4 hover:bg-[#202c33]/50 transition-colors">
              <div className={`text-sm ${accentColor} font-medium mb-2`}>Nama</div>
              {editingField === 'username' ? (
                <div className={`flex items-center border-b-2 ${accentBorder} py-1`}>
                  <input 
                    autoFocus
                    type="text"
                    value={editValue} 
                    onChange={e => setEditValue(e.target.value)} 
                    className="bg-transparent flex-1 text-[#e9edef] outline-none text-base" 
                    placeholder="Masukkan nama Anda"
                  />
                  <div className="flex space-x-3 ml-2">
                    <button onClick={cancelEdit} className="text-[#8696a0] hover:text-[#e9edef]"><X size={20} /></button>
                    <button onClick={saveField} disabled={loading} className={`${accentColor} hover:brightness-125`}>
                      {loading ? <Loader2 size={20} className="animate-spin" /> : <Check size={20} />}
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex items-center justify-between group cursor-pointer" onClick={() => startEdit('username', profile.username)}>
                  <div className="text-[#e9edef] text-base">{profile.username}</div>
                  <button className="p-1 text-[#8696a0] hover:text-[#e9edef] opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity">
                    <Edit2 size={18} />
                  </button>
                </div>
              )}
              <div className="text-sm text-[#8696a0] mt-3 leading-relaxed">
                Ini bukan PIN atau PIN rahasia Anda. Nama ini akan terlihat oleh kontak Anda.
              </div>
            </div>

            {/* Divider */}
            <div className="h-[1px] bg-[#202c33] mx-8 my-2"></div>

            {/* Email Field */}
            <div className="px-8 py-4 hover:bg-[#202c33]/50 transition-colors">
              <div className={`text-sm ${accentColor} font-medium mb-2`}>Email (ID Login)</div>
              {editingField === 'email' ? (
                <div className={`flex items-center border-b-2 ${accentBorder} py-1`}>
                  <input 
                    autoFocus
                    type="email"
                    value={editValue} 
                    onChange={e => setEditValue(e.target.value)} 
                    className="bg-transparent flex-1 text-[#e9edef] outline-none text-base" 
                  />
                  <div className="flex space-x-3 ml-2">
                    <button onClick={cancelEdit} className="text-[#8696a0] hover:text-[#e9edef]"><X size={20} /></button>
                    <button onClick={saveField} disabled={loading} className={`${accentColor} hover:brightness-125`}>
                      {loading ? <Loader2 size={20} className="animate-spin" /> : <Check size={20} />}
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex items-center justify-between group cursor-pointer" onClick={() => startEdit('email', profile.email)}>
                  <div className="text-[#e9edef] text-base">{profile.email}</div>
                  <button className="p-1 text-[#8696a0] hover:text-[#e9edef] opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity">
                    <Edit2 size={18} />
                  </button>
                </div>
              )}
            </div>

            {/* Divider */}
            <div className="h-[1px] bg-[#202c33] mx-8 my-2"></div>

            {/* Password Field */}
            <div className="px-8 py-4 hover:bg-[#202c33]/50 transition-colors">
              <div className={`text-sm ${accentColor} font-medium mb-2`}>Password</div>
              {editingField === 'password' ? (
                <div className={`flex items-center border-b-2 ${accentBorder} py-1`}>
                  <input 
                    autoFocus
                    type="password"
                    value={editValue} 
                    onChange={e => setEditValue(e.target.value)} 
                    className="bg-transparent flex-1 text-[#e9edef] outline-none text-base" 
                    placeholder="Masukkan password baru"
                  />
                  <div className="flex space-x-3 ml-2">
                    <button onClick={cancelEdit} className="text-[#8696a0] hover:text-[#e9edef]"><X size={20} /></button>
                    <button onClick={saveField} disabled={loading} className={`${accentColor} hover:brightness-125`}>
                      {loading ? <Loader2 size={20} className="animate-spin" /> : <Check size={20} />}
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex items-center justify-between group cursor-pointer" onClick={() => startEdit('password', '')}>
                  <div className="text-[#e9edef] text-base tracking-widest">••••••••</div>
                  <button className="p-1 text-[#8696a0] hover:text-[#e9edef] opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity">
                    <Edit2 size={18} />
                  </button>
                </div>
              )}
            </div>

          </div>
        </div>
      </div>
    </div>
  );
};
