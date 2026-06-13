export interface Profile {
  id: string;
  username: string;
  email: string;
  avatar_url?: string;
}

export interface Friendship {
  id: string;
  user_id: string;
  friend_id: string;
  status: 'pending' | 'accepted' | 'rejected';
}

export interface Message {
  id: string;
  sender_id: string;
  receiver_id: string;
  content: string;
  created_at: string;
  is_read?: boolean;
}

export interface Group {
  id: string;
  name: string;
  created_by: string;
  created_at: string;
  avatar_url?: string;
}

export interface GroupMember {
  id: string;
  group_id: string;
  user_id: string;
  joined_at: string;
  profiles?: Profile; // Untuk relasi join
}

export interface GroupMessage {
  id: string;
  group_id: string;
  sender_id: string;
  content: string;
  created_at: string;
}

export type AppState = 'splash' | 'weather' | 'pin' | 'chat';
