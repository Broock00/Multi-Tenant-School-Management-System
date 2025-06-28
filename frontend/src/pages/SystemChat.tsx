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
} from '@mui/material';
import {
  Send,
  Chat,
  Person,
  Business,
  MoreVert,
} from '@mui/icons-material';

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
  const [chats, setChats] = useState<ChatSession[]>([
    {
      id: 1,
      school: 'Springfield High School',
      admin: 'John Smith',
      lastMessage: 'We need help with the new analytics feature',
      lastMessageTime: '2025-06-22T15:30:00Z',
      unreadCount: 2,
      isActive: true,
    },
    {
      id: 2,
      school: 'Riverside Academy',
      admin: 'Sarah Johnson',
      lastMessage: 'Thank you for the quick response',
      lastMessageTime: '2025-06-22T14:15:00Z',
      unreadCount: 0,
      isActive: false,
    },
    {
      id: 3,
      school: 'Central Elementary',
      admin: 'Mike Wilson',
      lastMessage: 'When will the maintenance be completed?',
      lastMessageTime: '2025-06-22T12:45:00Z',
      unreadCount: 1,
      isActive: true,
    },
  ]);

  const [messages, setMessages] = useState<Message[]>([
    {
      id: 1,
      sender: 'John Smith',
      senderRole: 'School Admin',
      content: 'Hello, we need help with the new analytics feature. It seems to be showing incorrect data.',
      timestamp: '2025-06-22T15:25:00Z',
      isRead: true,
    },
    {
      id: 2,
      sender: 'System Administrator',
      senderRole: 'Super Admin',
      content: 'Hello John! I can help you with that. Can you please provide more details about what specific data seems incorrect?',
      timestamp: '2025-06-22T15:26:00Z',
      isRead: true,
    },
    {
      id: 3,
      sender: 'John Smith',
      senderRole: 'School Admin',
      content: 'The student attendance reports are showing numbers that don\'t match our records. We have 250 students but it shows 280.',
      timestamp: '2025-06-22T15:30:00Z',
      isRead: false,
    },
  ]);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSendMessage = () => {
    if (message.trim() && selectedChat) {
      const newMessage: Message = {
        id: messages.length + 1,
        sender: 'System Administrator',
        senderRole: 'Super Admin',
        content: message.trim(),
        timestamp: new Date().toISOString(),
        isRead: false,
      };
      setMessages(prev => [...prev, newMessage]);
      setMessage('');

      // Update chat list
      setChats(prev =>
        prev.map(chat =>
          chat.id === selectedChat.id
            ? {
                ...chat,
                lastMessage: message.trim(),
                lastMessageTime: new Date().toISOString(),
                unreadCount: 0,
              }
            : chat
        )
      );
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
    // Mark messages as read
    setMessages(prev =>
      prev.map(msg => ({ ...msg, isRead: true }))
    );
    // Update chat unread count
    setChats(prev =>
      prev.map(c =>
        c.id === chat.id
          ? { ...c, unreadCount: 0 }
          : c
      )
    );
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