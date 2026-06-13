import React, { useState, useEffect, useRef } from 'react';
import { Send, Hash, Image as ImageIcon, Mic, Smile, X, Square, Loader2, Trash2, Paperclip, FileText, Download, MessageSquare } from 'lucide-react';
import { supabase } from '../supabaseClient';
import { Profile, Message } from '../types';

interface ChatAreaProps {
  currentUser: any;
  friend: Profile;
}

const STICKERS = ['😂', '😍', '🥺', '😭', '😡', '👍', '🙏', '❤️', '🔥', '🎉', '💩', '👻', '👽', '🤖', '🤡'];

export const ChatArea: React.FC<ChatAreaProps> = ({ currentUser, friend }) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [myProfile, setMyProfile] = useState<Profile | null>(null);
  
  const [showStickers, setShowStickers] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const docInputRef = useRef<HTMLInputElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  useEffect(() => {
    fetchMyProfile();
    fetchMessages();

    const channel = supabase.channel(`chat_room_${currentUser.id}_${friend.id}`)
      .on('postgres_changes', { 
        event: '*', 
        schema: 'public', 
        table: 'messages'
      }, payload => {
        if (payload.eventType === 'INSERT') {
          const newMsg = payload.new as Message;
          const isRelevant = 
            (newMsg.sender_id === currentUser.id && newMsg.receiver_id === friend.id) ||
            (newMsg.sender_id === friend.id && newMsg.receiver_id === currentUser.id);

          if (isRelevant && newMsg.sender_id !== currentUser.id) {
            setMessages(prev => {
              if (prev.find(m => m.id === newMsg.id)) return prev;
              return [...prev, newMsg];
            });
          }
        } else if (payload.eventType === 'DELETE') {
          setMessages(prev => prev.filter(m => m.id !== payload.old.id));
        }
      })
      .subscribe();

    const interval = setInterval(() => {
      fetchMessages();
    }, 5000);

    return () => {
      supabase.removeChannel(channel);
      clearInterval(interval);
      if (mediaRecorderRef.current && isRecording) {
        mediaRecorderRef.current.stop();
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [friend.id, currentUser.id]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const fetchMyProfile = async () => {
    const { data } = await supabase.from('profiles').select('*').eq('id', currentUser.id).single();
    if (data) {
      const localAvatar = localStorage.getItem(`avatar_${currentUser.id}`);
      if (localAvatar && !data.avatar_url) {
        data.avatar_url = localAvatar;
      }
      setMyProfile(data);
    }
  };

  const fetchMessages = async () => {
    const { data: sentMessages } = await supabase
      .from('messages')
      .select('*')
      .eq('sender_id', currentUser.id)
      .eq('receiver_id', friend.id);
      
    const { data: receivedMessages } = await supabase
      .from('messages')
      .select('*')
      .eq('sender_id', friend.id)
      .eq('receiver_id', currentUser.id);

    const allMessages = [...(sentMessages || []), ...(receivedMessages || [])];
    
    allMessages.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());

    setMessages(allMessages);
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const sendMessageToDB = async (content: string) => {
    const newMsgObj = {
      sender_id: currentUser.id,
      receiver_id: friend.id,
      content: content,
    };

    const tempId = `temp-${Date.now()}`;
    setMessages(prev => [...prev, { ...newMsgObj, id: tempId, created_at: new Date().toISOString() } as Message]);

    const { error } = await supabase.from('messages').insert([newMsgObj]);
    
    if (error) {
      console.error("Error sending message:", error.message);
    }
    
    fetchMessages();
  };

  const handleDeleteMessage = async (msgId: string) => {
    if (msgId.startsWith('temp-')) return; 
    
    setMessages(prev => prev.filter(m => m.id !== msgId));
    
    const { error } = await supabase.from('messages').delete().eq('id', msgId);
    if (error) {
      console.error("Gagal menghapus pesan:", error);
      fetchMessages(); 
    }
  };

  const handleSendText = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim()) return;
    const msgContent = newMessage.trim();
    setNewMessage('');
    setShowStickers(false);
    await sendMessageToDB(msgContent);
  };

  const handleSendSticker = async (sticker: string) => {
    setShowStickers(false);
    await sendMessageToDB(`[STICKER]${sticker}`);
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = async () => {
        const canvas = document.createElement('canvas');
        const MAX_WIDTH = 800; 
        let width = img.width;
        let height = img.height;

        if (width > MAX_WIDTH) {
          height *= MAX_WIDTH / width;
          width = MAX_WIDTH;
        }
        
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx?.drawImage(img, 0, 0, width, height);
        
        const base64Image = canvas.toDataURL('image/jpeg', 0.7);
        await sendMessageToDB(`[IMAGE]${base64Image}`);
        setIsUploading(false);
      };
      img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);
    
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleDocUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 2 * 1024 * 1024) {
      alert("Ukuran file maksimal 2MB");
      if (docInputRef.current) docInputRef.current.value = '';
      return;
    }

    setIsUploading(true);
    const reader = new FileReader();
    reader.onloadend = async () => {
      const base64Data = reader.result as string;
      await sendMessageToDB(`[FILE:${file.name}]${base64Data}`);
      setIsUploading(false);
    };
    reader.readAsDataURL(file);
    
    if (docInputRef.current) docInputRef.current.value = '';
  };

  const toggleRecording = async () => {
    if (isRecording) {
      if (mediaRecorderRef.current) {
        mediaRecorderRef.current.stop();
      }
      setIsRecording(false);
    } else {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        const mediaRecorder = new MediaRecorder(stream);
        mediaRecorderRef.current = mediaRecorder;
        audioChunksRef.current = [];

        mediaRecorder.ondataavailable = (e) => {
          if (e.data.size > 0) audioChunksRef.current.push(e.data);
        };

        mediaRecorder.onstop = () => {
          const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
          const reader = new FileReader();
          reader.readAsDataURL(audioBlob);
          reader.onloadend = async () => {
            const base64Audio = reader.result as string;
            await sendMessageToDB(`[AUDIO]${base64Audio}`);
          };
          stream.getTracks().forEach(track => track.stop());
        };

        mediaRecorder.start();
        setIsRecording(true);
      } catch (err) {
        console.error("Mic access denied", err);
        alert("Akses mikrofon ditolak atau tidak tersedia.");
      }
    }
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const renderMessageContent = (content: string) => {
    if (content.startsWith('[IMAGE]')) {
      const src = content.replace('[IMAGE]', '');
      return <img src={src} alt="Sent image" className="max-w-sm max-h-64 rounded-lg object-contain border border-slate-700/50 shadow-sm" />;
    }
    if (content.startsWith('[AUDIO]')) {
      const src = content.replace('[AUDIO]', '');
      return (
        <div className="mt-1">
          <audio controls src={src} className="h-10 w-48 md:w-64 outline-none opacity-90" />
        </div>
      );
    }
    if (content.startsWith('[FILE:')) {
      const splitIndex = content.indexOf(']');
      const fileName = content.substring(6, splitIndex);
      const base64Data = content.substring(splitIndex + 1);
      return (
        <div className="flex items-center space-x-3 bg-black/20 p-3 rounded-xl border border-slate-700/30 mt-1 shadow-inner">
          <div className="p-2.5 bg-indigo-500/10 rounded-lg border border-indigo-500/20">
            <FileText size={20} className="text-indigo-400" />
          </div>
          <div className="flex flex-col overflow-hidden">
            <span className="text-sm font-medium text-slate-200 truncate max-w-[150px] md:max-w-[200px]">{fileName}</span>
            <a href={base64Data} download={fileName} className="text-[11px] text-indigo-400 hover:text-indigo-300 hover:underline flex items-center mt-1 w-max transition-colors">
              <Download size={12} className="mr-1" /> Unduh File
            </a>
          </div>
        </div>
      );
    }
    if (content.startsWith('[STICKER]')) {
      const emoji = content.replace('[STICKER]', '');
      return <div className="text-6xl drop-shadow-lg">{emoji}</div>;
    }
    return <span className="whitespace-pre-wrap break-words leading-relaxed text-[15px]">{content}</span>;
  };

  return (
    <div className="flex-1 flex flex-col bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-slate-900 via-[#0f172a] to-[#020617] h-full relative">
      {/* Header */}
      <div className="h-16 border-b border-slate-800/50 flex items-center px-6 shadow-sm flex-shrink-0 bg-[#0f172a]/80 backdrop-blur-md z-10">
        <div className="w-10 h-10 rounded-full bg-slate-800 flex items-center justify-center text-indigo-200 font-medium overflow-hidden mr-4 shadow-sm border border-slate-700/50">
          {friend.avatar_url ? (
            <img src={friend.avatar_url} alt="avatar" className="w-full h-full object-cover opacity-90" />
          ) : (
            friend.username[0].toUpperCase()
          )}
        </div>
        <div className="flex flex-col">
          <span className="text-slate-100 font-medium text-base tracking-wide">{friend.username}</span>
          <span className="text-emerald-400 text-[11px] font-medium flex items-center tracking-wider uppercase mt-0.5">
            <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full mr-1.5 shadow-[0_0_5px_rgba(52,211,153,0.8)]"></span>
            Online
          </span>
        </div>
      </div>

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto p-6 space-y-3 custom-scrollbar">
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-slate-500">
            <div className="w-24 h-24 bg-slate-900/50 border border-slate-800/50 rounded-full flex items-center justify-center mb-6 overflow-hidden shadow-[0_0_30px_rgba(0,0,0,0.3)] backdrop-blur-sm">
              {friend.avatar_url ? (
                <img src={friend.avatar_url} alt="avatar" className="w-full h-full object-cover opacity-40 mix-blend-luminosity" />
              ) : (
                <MessageSquare size={40} className="text-indigo-500/40" />
              )}
            </div>
            <h2 className="text-indigo-200/80 text-xl font-light tracking-wide mb-2">Mulai Obrolan!</h2>
            <p className="text-sm font-light">Kirim pesan pertama ke {friend.username}.</p>
          </div>
        ) : (
          messages.map((msg, index) => {
            const isMe = msg.sender_id === currentUser.id;
            const showHeader = index === 0 || messages[index - 1].sender_id !== msg.sender_id || 
              (new Date(msg.created_at).getTime() - new Date(messages[index - 1].created_at).getTime() > 5 * 60 * 1000);

            const isSticker = msg.content.startsWith('[STICKER]');
            const isTemp = msg.id.startsWith('temp-');

            return (
              <div key={msg.id} className={`flex w-full ${isMe ? 'justify-end' : 'justify-start'} ${showHeader ? 'mt-6' : 'mt-1.5'} group`}>
                
                {/* Avatar Teman (Kiri) */}
                {!isMe && (
                  <div className="flex flex-col justify-end mr-3 pb-1">
                    {showHeader ? (
                      <div className="w-8 h-8 rounded-full bg-slate-800 flex items-center justify-center text-indigo-200 text-xs font-medium overflow-hidden shadow-sm border border-slate-700/50 flex-shrink-0">
                        {friend.avatar_url ? (
                          <img src={friend.avatar_url} alt="avatar" className="w-full h-full object-cover opacity-90" />
                        ) : (
                          friend.username[0].toUpperCase()
                        )}
                      </div>
                    ) : (
                      <div className="w-8 h-8 flex-shrink-0"></div>
                    )}
                  </div>
                )}
                
                {/* Tombol Hapus (Kiri Bubble jika isMe) */}
                {isMe && !isTemp && (
                  <div className="flex items-center justify-center mr-3 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button 
                      onClick={() => handleDeleteMessage(msg.id)}
                      className="p-1.5 text-rose-500/70 hover:text-rose-400 hover:bg-rose-500/10 rounded-full transition-colors"
                      title="Hapus Pesan"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                )}

                {/* Bubble Chat */}
                <div className={`flex flex-col max-w-[75%] md:max-w-[65%] ${isMe ? 'items-end' : 'items-start'}`}>
                  <div className={`relative ${isSticker ? '' : 'px-4 py-2.5 shadow-sm'} ${
                    isSticker ? 'bg-transparent' :
                    isMe 
                      ? 'bg-indigo-600/90 text-indigo-50 rounded-2xl rounded-br-sm border border-indigo-500/30 backdrop-blur-sm' 
                      : 'bg-slate-800/80 text-slate-200 rounded-2xl rounded-bl-sm border border-slate-700/50 backdrop-blur-sm'
                  }`}>
                    
                    {renderMessageContent(msg.content)}
                    
                    {/* Waktu (Hanya tampil jika bukan stiker) */}
                    {!isSticker && (
                      <div className={`text-[10px] mt-1.5 flex items-center justify-end space-x-1.5 ${isMe ? 'text-indigo-200/70' : 'text-slate-500'}`}>
                        <span className="font-light tracking-wider">{formatTime(msg.created_at)}</span>
                        {isMe && isTemp && <Loader2 size={10} className="animate-spin" />}
                      </div>
                    )}
                  </div>
                  
                  {/* Waktu untuk Stiker */}
                  {isSticker && (
                    <div className={`text-[10px] mt-1.5 flex items-center space-x-1.5 ${isMe ? 'text-indigo-400/70 justify-end' : 'text-slate-600 justify-start'}`}>
                      <span className="font-light tracking-wider">{formatTime(msg.created_at)}</span>
                      {isMe && isTemp && <Loader2 size={10} className="animate-spin" />}
                    </div>
                  )}
                </div>

              </div>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Sticker Popover */}
      {showStickers && (
        <div className="absolute bottom-24 left-6 bg-slate-900/95 border border-slate-700/50 rounded-2xl shadow-[0_10px_40px_rgba(0,0,0,0.5)] p-4 w-72 z-20 animate-fade-in backdrop-blur-xl">
          <div className="flex justify-between items-center mb-3 border-b border-slate-800 pb-2">
            <span className="text-slate-300 font-medium text-sm tracking-wide">Stiker</span>
            <button onClick={() => setShowStickers(false)} className="text-slate-500 hover:text-slate-300 transition-colors">
              <X size={16} />
            </button>
          </div>
          <div className="grid grid-cols-5 gap-3">
            {STICKERS.map((sticker, idx) => (
              <button 
                key={idx} 
                onClick={() => handleSendSticker(sticker)}
                className="text-3xl hover:scale-125 transition-transform flex items-center justify-center p-1 hover:drop-shadow-[0_0_10px_rgba(255,255,255,0.2)]"
              >
                {sticker}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Input Area */}
      <div className="p-4 flex-shrink-0 bg-[#0f172a]/80 backdrop-blur-md border-t border-slate-800/50">
        <div className="bg-slate-900/80 rounded-2xl flex items-center px-4 py-2.5 shadow-inner border border-slate-800/80">
          
          {/* Attachment Buttons */}
          <div className="flex items-center space-x-3 mr-4">
            <button 
              type="button"
              onClick={() => setShowStickers(!showStickers)}
              className={`transition-colors ${showStickers ? 'text-indigo-400 drop-shadow-[0_0_8px_rgba(99,102,241,0.5)]' : 'text-slate-500 hover:text-indigo-300'}`}
              title="Kirim Stiker"
              disabled={isRecording}
            >
              <Smile size={20} />
            </button>
            
            {/* Tombol Upload Gambar */}
            <button 
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="text-slate-500 hover:text-indigo-300 transition-colors"
              title="Kirim Gambar"
              disabled={isUploading || isRecording}
            >
              {isUploading ? <Loader2 size={20} className="animate-spin text-indigo-500" /> : <ImageIcon size={20} />}
            </button>
            <input 
              type="file" 
              ref={fileInputRef} 
              onChange={handleImageUpload} 
              accept="image/*" 
              className="hidden" 
            />

            {/* Tombol Upload File/Dokumen */}
            <button 
              type="button"
              onClick={() => docInputRef.current?.click()}
              className="text-slate-500 hover:text-indigo-300 transition-colors"
              title="Kirim File/Dokumen"
              disabled={isUploading || isRecording}
            >
              <Paperclip size={18} />
            </button>
            <input 
              type="file" 
              ref={docInputRef} 
              onChange={handleDocUpload} 
              accept=".pdf,.doc,.docx,.txt,.xls,.xlsx,.zip,.rar" 
              className="hidden" 
            />
          </div>

          {/* Text Input or Recording Indicator */}
          {isRecording ? (
            <div className="flex-1 flex items-center text-rose-400 animate-pulse">
              <div className="w-2.5 h-2.5 bg-rose-500 rounded-full mr-3 shadow-[0_0_8px_rgba(244,63,94,0.8)]"></div>
              <span className="font-medium text-sm tracking-wide">Merekam Pesan Suara...</span>
            </div>
          ) : (
            <form onSubmit={handleSendText} className="flex-1 flex items-center">
              <input
                type="text"
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                placeholder="Ketik pesan..."
                className="flex-1 bg-transparent text-slate-200 focus:outline-none placeholder-slate-600 text-[15px] font-light tracking-wide"
              />
              {newMessage.trim() && (
                <button 
                  type="submit" 
                  className="ml-3 bg-indigo-500/20 text-indigo-400 p-2 rounded-xl hover:bg-indigo-500 hover:text-white transition-all duration-300 border border-indigo-500/30 hover:shadow-[0_0_15px_rgba(99,102,241,0.4)]"
                >
                  <Send size={18} className="ml-0.5" />
                </button>
              )}
            </form>
          )}

          {/* Voice Note Button (Only show if no text) */}
          {!newMessage.trim() && (
            <button 
              type="button"
              onClick={toggleRecording}
              className={`ml-3 transition-all duration-300 p-2 rounded-xl border ${isRecording ? 'bg-rose-500/20 text-rose-400 border-rose-500/50 hover:bg-rose-500 hover:text-white shadow-[0_0_15px_rgba(244,63,94,0.4)]' : 'bg-slate-800/50 text-slate-400 hover:text-indigo-300 hover:bg-slate-800 border-slate-700/50'}`}
              title={isRecording ? "Berhenti & Kirim" : "Kirim Voice Note"}
            >
              {isRecording ? <Square size={18} fill="currentColor" /> : <Mic size={18} />}
            </button>
          )}

        </div>
      </div>
    </div>
  );
};
