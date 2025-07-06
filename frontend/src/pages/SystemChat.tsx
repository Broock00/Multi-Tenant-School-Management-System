import React, { useState, useRef, useEffect } from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  TextField,
  Button,
  List,
  ListItem,
  ListItemText,
  ListItemAvatar,
  Avatar,
  Chip,
  Paper,
  IconButton,
  Badge,
  ListItemButton,
  Autocomplete,
  CircularProgress,
} from '@mui/material';
import {
  Send,
  Chat,
  Person,
  Business,
  MoreVert,
} from '@mui/icons-material';
import { chatAPI } from '../services/api';
import { schoolsAPI } from '../services/api';
import { useAuth } from '../contexts/AuthContext';

interface Message {
  id: number;
  sender: string;
  senderRole: string;
  content: string;
  timestamp: string;
  isRead: boolean;
}

interface ChatSession {
  id: number;
  school: string;
  admin: string;
  lastMessage: string;
  lastMessageTime: string;
  unreadCount: number;
  isActive: boolean;
}

const SystemChat: React.FC = () => {
  const [selectedChat, setSelectedChat] = useState<ChatSession | null>(null);
  const [message, setMessage] = useState('');
  const [chats, setChats] = useState<ChatSession[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [loadingChats, setLoadingChats] = useState(false);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { user: currentUser } = useAuth();

  // Fetch chat rooms (admin type, super admin <-> school admin or super admin)
  useEffect(() => {
    const fetchChats = async () => {
      setLoadingChats(true);
      setError(null);
      try {
        const res = await chatAPI.getChatRooms();
        const rooms = (res.data.results || res.data || []).filter((room: any) => {
          if (room.room_type !== 'admin') return false;
          return true;
        });
        setChats(
          rooms.map((room: any) => ({
            id: room.id,
            school: room.name,
            admin: room.participants_info.find((p: any) => p.role.toLowerCase() === 'school admin')?.name || '',
            lastMessage: room.last_message?.content || '',
            lastMessageTime: room.last_message?.created_at || '',
            unreadCount: room.unread_count || 0,
            isActive: room.is_active,
          }))
        );
      } catch (err) {
        setError('Failed to load chats');
      } finally {
        setLoadingChats(false);
      }
    };
    fetchChats();
  }, []);

  // Fetch messages for selected chat
  useEffect(() => {
    if (!selectedChat) return;
    const fetchMessages = async () => {
      setLoadingMessages(true);
      setError(null);
      try {
        const res = await chatAPI.getMessages({ room: selectedChat.id });
        setMessages(
          (res.data.results || res.data || []).map((msg: any) => ({
            id: msg.id,
            sender: msg.sender_info?.name || '',
            senderRole: msg.sender_info?.role || '',
            content: msg.content,
            timestamp: msg.created_at,
            isRead: msg.is_read,
          }))
        );
      } catch (err) {
        setError('Failed to load messages');
      } finally {
        setLoadingMessages(false);
      }
    };
    fetchMessages();
  }, [selectedChat]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSendMessage = async () => {
    if (message.trim() && selectedChat) {
      try {
        console.log('Sending message:', { room: selectedChat.id, content: message.trim() });
        const res = await chatAPI.sendMessage({ room: selectedChat.id, content: message.trim() });
        console.log('Message API response:', res.data);
        const msg = res.data;
        setMessages(prev => [
          ...prev,
          {
            id: msg.id,
            sender: msg.sender_info?.name || '',
            senderRole: msg.sender_info?.role || '',
            content: msg.content,
            timestamp: msg.created_at,
            isRead: msg.is_read,
          },
        ]);
      setMessage('');
        // Optionally update chat list last message
      setChats(prev =>
        prev.map(chat =>
          chat.id === selectedChat.id
              ? { ...chat, lastMessage: msg.content, lastMessageTime: msg.created_at }
            : chat
        )
      );
      } catch (err) {
        setError('Failed to send message');
      }
    }
  };

  const handleKeyPress = (event: React.KeyboardEvent) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      handleSendMessage();
    }
  };

  const handleChatSelect = (chat: ChatSession) => {
    setSelectedChat(chat);
    // Optionally, mark messages as read via API here
  };

  // Start or open chat with selected school admin or super admin
  const handleStartChat = async (option: any) => {
    setSearchTerm('');
    setSearchResults([]);
    setLoadingChats(true);
    setError(null);
    try {
      let room: any = null;
      // Find if a room already exists
      const res = await chatAPI.getChatRooms();
      const rooms = (res.data.results || res.data || []);
      room = rooms.find((r: any) =>
        r.room_type === 'admin' &&
        r.participants_info.some((p: any) => p.role.toLowerCase() === 'school admin' && p.name === option.admin_name)
    );
      if (!room) {
        // Create new room
        let payload;
        if (!option.admin_id || !currentUser?.id) {
          setError('Could not find school admin or current user ID');
          setLoadingChats(false);
          return;
        }
        payload = {
          name: option.name,
          room_type: 'admin',
          participants: [currentUser.id, option.admin_id],
        };
        const createRes = await chatAPI.createChatRoom(payload);
        room = createRes.data;
      }
      // Add to chat list and select
      setChats(prev => {
        const exists = prev.find(c => c.id === room.id);
        if (exists) return prev;
        return [
          {
            id: room.id,
            school: room.name,
            admin: room.participants_info.find((p: any) => p.role.toLowerCase() === 'school admin')?.name || '',
            lastMessage: room.last_message?.content || '',
            lastMessageTime: room.last_message?.created_at || '',
            unreadCount: room.unread_count || 0,
            isActive: room.is_active,
          },
          ...prev,
        ];
      });
      setSelectedChat({
        id: room.id,
        school: room.name,
        admin: room.participants_info.find((p: any) => p.role.toLowerCase() === 'school admin')?.name || '',
        lastMessage: room.last_message?.content || '',
        lastMessageTime: room.last_message?.created_at || '',
        unreadCount: room.unread_count || 0,
        isActive: room.is_active,
      });
    } catch (err) {
      setError('Failed to start chat');
    } finally {
      setLoadingChats(false);
    }
  };

  // Search handler for chat participants
  const handleSearch = async (searchTerm: string) => {
    setSearchTerm(searchTerm);
    setLoadingChats(true);
    setError(null);
    try {
      let results = [];
      const res = await schoolsAPI.searchSchools(searchTerm);
      results = res.data.results || res.data || [];
      setSearchResults(results);
    } catch (err) {
      setError('Failed to search.');
    } finally {
      setLoadingChats(false);
    }
  };

  return (
    <Box sx={{ p: 3, height: 'calc(100vh - 100px)' }}>
      <Typography variant="h4" gutterBottom>
        <Chat sx={{ mr: 1, verticalAlign: 'middle' }} />
        System Chat
      </Typography>
      <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
        Chat with school administrators and provide support
      </Typography>
      {/* Search Bar */}
      <Autocomplete
        freeSolo
        options={searchResults}
        getOptionLabel={option => option.name || ''}
        loading={loadingChats}
        onInputChange={(_, value) => {
          setSearchTerm(value);
          if (value.trim()) {
            handleSearch(value);
          } else {
            setSearchResults([]);
          }
        }}
        onChange={(_, value) => value && handleStartChat(value)}
        renderInput={params => (
          <TextField
            {...params}
            label={'Search Schools'}
            variant="outlined"
            size="small"
            sx={{ mb: 2, width: 300 }}
            InputProps={{
              ...params.InputProps,
              endAdornment: (
                <>
                  {loadingChats ? <CircularProgress color="inherit" size={20} /> : null}
                  {params.InputProps.endAdornment}
                </>
              ),
            }}
          />
        )}
      />
      <Box sx={{ display: 'flex', height: 'calc(100vh - 200px)', gap: 2 }}>
        {/* Chat List */}
        <Card sx={{ width: 300, flexShrink: 0 }}>
          <CardContent sx={{ p: 0 }}>
            <Box sx={{ p: 2, borderBottom: 1, borderColor: 'divider' }}>
              <Typography variant="h6">Active Chats</Typography>
            </Box>
            <List sx={{ p: 0 }}>
              {chats.map((chat) => (
                <ListItemButton
                  key={chat.id}
                  selected={selectedChat?.id === chat.id}
                  onClick={() => handleChatSelect(chat)}
                  sx={{
                    borderBottom: 1,
                    borderColor: 'divider',
                    '&.Mui-selected': {
                      backgroundColor: 'primary.light',
                    },
                  }}
                >
                  <ListItemAvatar>
                    <Badge
                      badgeContent={chat.unreadCount}
                      color="error"
                      invisible={chat.unreadCount === 0}
                    >
                      <Avatar>
                        <Business />
                      </Avatar>
                    </Badge>
                  </ListItemAvatar>
                  <ListItemText
                    primary={
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <Typography variant="subtitle2" noWrap>
                          {chat.school}
                        </Typography>
                        <Chip
                          label={chat.isActive ? 'Online' : 'Offline'}
                          color={chat.isActive ? 'success' : 'default'}
                          size="small"
                        />
                      </Box>
                    }
                    secondary={
                      <Box>
                        <Typography variant="body2" color="text.secondary" noWrap>
                          {chat.admin}
                        </Typography>
                        <Typography variant="caption" color="text.secondary" noWrap>
                          {chat.lastMessage}
                        </Typography>
                        <Typography variant="caption" display="block" color="text.secondary">
                          {new Date(chat.lastMessageTime).toLocaleTimeString()}
                        </Typography>
                      </Box>
                    }
                  />
                </ListItemButton>
              ))}
            </List>
          </CardContent>
        </Card>

        {/* Chat Messages */}
        <Card sx={{ flexGrow: 1, display: 'flex', flexDirection: 'column' }}>
          {selectedChat ? (
            <>
              {/* Chat Header */}
              <Box sx={{ p: 2, borderBottom: 1, borderColor: 'divider' }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Box>
                    <Typography variant="h6">{selectedChat.school}</Typography>
                    <Typography variant="body2" color="text.secondary">
                      {selectedChat.admin} • School Administrator
                    </Typography>
                  </Box>
                  <IconButton>
                    <MoreVert />
                  </IconButton>
                </Box>
              </Box>

              {/* Messages */}
              <Box sx={{ flexGrow: 1, overflow: 'auto', p: 2 }}>
                <List>
                  {messages.map((msg) => (
                    <ListItem
                      key={msg.id}
                      sx={{
                        flexDirection: 'column',
                        alignItems: msg.sender === 'System Administrator' ? 'flex-end' : 'flex-start',
                        p: 0,
                        mb: 1,
                      }}
                    >
                      <Box
                        sx={{
                          display: 'flex',
                          alignItems: 'flex-start',
                          gap: 1,
                          maxWidth: '70%',
                          flexDirection: msg.sender === 'System Administrator' ? 'row-reverse' : 'row',
                        }}
                      >
                        <Avatar sx={{ width: 32, height: 32 }}>
                          {msg.sender === 'System Administrator' ? <Person /> : <Business />}
                        </Avatar>
                        <Paper
                          sx={{
                            p: 1.5,
                            backgroundColor: msg.sender === 'System Administrator' ? 'primary.main' : 'grey.100',
                            color: msg.sender === 'System Administrator' ? 'white' : 'text.primary',
                            borderRadius: 2,
                          }}
                        >
                          <Typography variant="body2" sx={{ mb: 0.5 }}>
                            {msg.content}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">{msg.senderRole}</Typography>
                          <Typography variant="caption" sx={{ opacity: 0.7 }}>
                            {new Date(msg.timestamp).toLocaleTimeString()}
                          </Typography>
                        </Paper>
                      </Box>
                    </ListItem>
                  ))}
                  <div ref={messagesEndRef} />
                </List>
              </Box>

              {/* Message Input */}
              <Box sx={{ p: 2, borderTop: 1, borderColor: 'divider' }}>
                <Box sx={{ display: 'flex', gap: 1 }}>
                  <TextField
                    fullWidth
                    multiline
                    maxRows={4}
                    placeholder="Type your message..."
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    onKeyPress={handleKeyPress}
                    variant="outlined"
                    size="small"
                  />
                  <Button
                    variant="contained"
                    onClick={handleSendMessage}
                    disabled={!message.trim()}
                    sx={{ minWidth: 'auto', px: 2 }}
                  >
                    <Send />
                  </Button>
                </Box>
              </Box>
            </>
          ) : (
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
              <Typography variant="h6" color="text.secondary">
                Select a chat to start messaging
              </Typography>
            </Box>
          )}
        </Card>
      </Box>
    </Box>
  );
};

export default SystemChat; 