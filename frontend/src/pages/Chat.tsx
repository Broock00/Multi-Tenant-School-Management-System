import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  List,
  ListItemButton,
  ListItemText,
  ListItemAvatar,
  Avatar,
  TextField,
  Button,
  CircularProgress,
  Alert,
  Tabs,
  Tab,
  Divider,
  Fab,
  Tooltip,
  Chip,
  Menu,
  MenuItem,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  IconButton,
  Checkbox,
  FormControlLabel,
} from '@mui/material';
import {
  Send,
  Chat as ChatIcon,
  Person,
  Business,
  MoreVert,
  Group,
  School,
  Class,
  Add,
  Search,
  FilterList,
  Delete,
  DeleteForever,
  ClearAll,
  CheckBox,
  CheckBoxOutlineBlank,
  Image,
  VideoFile,
  Audiotrack,
  PictureAsPdf,
  Description,
  TableChart,
  Slideshow,
  AttachFile,
  Reply,
  Forward,
  Download,
  FileUpload,
} from '@mui/icons-material';
import { chatAPI } from '../services/api';
import { useAuth, User } from '../contexts/AuthContext';

interface Message {
  id: number;
  content: string;
  sender: string;
  timestamp: string;
  sender_info?: {
    id: number;
    name: string;
    role: string;
    profile_picture?: string;
  };
  reply_to?: {
    id: number;
    content: string;
    sender_name: string;
  };
  forwarded_from?: {
    id: number;
    content: string;
    sender_name: string;
    room_name: string;
  };
  file?: {
    id: number;
    name: string;
    size: number;
    type: string;
    url: string;
  };
  is_own?: boolean;
  senderName?: string;
}

interface ChatRoom {
  id: number;
  name: string;
  room_type: string;
  participants_info: Array<{
    id: number;
    name: string;
    role: string;
    profile_picture?: string;
  }>;
  last_message?: {
    content: string;
    created_at: string;
  };
  unread_count: number;
  is_active: boolean;
}

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props;

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`chat-tabpanel-${index}`}
      aria-labelledby={`chat-tab-${index}`}
      {...other}
    >
      {value === index && <Box sx={{ p: 3 }}>{children}</Box>}
    </div>
  );
}

const Chat: React.FC = () => {
  // Suppress ResizeObserver errors
  useEffect(() => {
    const originalError = console.error;
    const originalWarn = console.warn;
    
    console.error = (...args) => {
      if (args[0]?.includes?.('ResizeObserver loop completed with undelivered notifications')) {
        return; // Suppress this specific error
      }
      originalError.apply(console, args);
    };
    
    console.warn = (...args) => {
      if (args[0]?.includes?.('ResizeObserver loop completed with undelivered notifications')) {
        return; // Suppress this specific warning
      }
      originalWarn.apply(console, args);
    };
    
    return () => {
      console.error = originalError;
      console.warn = originalWarn;
    };
  }, []);
  const [selectedRoom, setSelectedRoom] = useState<ChatRoom | null>(null);
  const [message, setMessage] = useState('');
  const [chatRooms, setChatRooms] = useState<ChatRoom[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [loadingChats, setLoadingChats] = useState(false);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  
  // Delete functionality state
  const [selectedMessages, setSelectedMessages] = useState<number[]>([]);
  const [isSelectionMode, setIsSelectionMode] = useState(false);
  const [messageMenuAnchor, setMessageMenuAnchor] = useState<null | HTMLElement>(null);
  const [selectedMessageForMenu, setSelectedMessageForMenu] = useState<Message | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleteForEveryone, setDeleteForEveryone] = useState(false);
  const [deleteAllDialogOpen, setDeleteAllDialogOpen] = useState(false);
  const [singleDeleteDialogOpen, setSingleDeleteDialogOpen] = useState(false);
  const [messageToDelete, setMessageToDelete] = useState<Message | null>(null);
  
  // Reply and Forward state
  const [replyToMessage, setReplyToMessage] = useState<Message | null>(null);
  const [forwardMessage, setForwardMessage] = useState<Message | null>(null);
  const [forwardDialogOpen, setForwardDialogOpen] = useState(false);
  const [forwardToRoom, setForwardToRoom] = useState<ChatRoom | null>(null);
  
  // File sharing state
  const [fileInputRef] = useState(() => React.createRef<HTMLInputElement>());
  const [uploadingFile, setUploadingFile] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  
  const [tabValue, setTabValue] = useState(0);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { user: currentUser } = useAuth();

  // Helper function to get user's full name
  const getUserFullName = useCallback((user: User) => {
    return `${user.first_name} ${user.last_name}`.trim();
  }, []);

  // Get allowed room types based on user role
  const getAllowedRoomTypes = useCallback(() => {
    if (!currentUser) return [];
    
    switch (currentUser.role) {
      case 'super_admin':
        return ['admin']; // Super admin only sees admin rooms (handled in SystemChat)
      case 'school_admin':
        return ['admin', 'general', 'staff', 'class']; // Can chat with super admin, staff, teachers, students
      case 'teacher':
        return ['class', 'staff', 'general']; // Can chat with students, staff, general
      case 'student':
        return ['class', 'general']; // Can chat with teachers, general
      case 'parent':
        return ['parent_teacher', 'general']; // Can chat with teachers, general
      case 'secretary':
        return ['staff', 'general']; // Can chat with staff, general
      default:
        return ['general'];
    }
  }, [currentUser]);

  // Fetch chat rooms based on user role
  const fetchChats = useCallback(async () => {
    setLoadingChats(true);
    setError(null);
    
    try {
      const response = await chatAPI.getChatRooms();
      const rooms = response.data.results || response.data || [];
      
      // Filter rooms based on user role
      let filteredRooms = rooms;
      
      if (currentUser?.role === 'school_admin') {
        // For school admins, show:
        // 1. System admin rooms (where they participate)
        // 2. One-on-one rooms with other school admins, secretaries, teachers
        const systemAdminRooms = rooms.filter((room: any) => 
          room.room_type === 'system_school_admin' && 
          room.participants_info?.some((p: any) => p.id === currentUser.id)
        );
        
        const oneOnOneRooms = rooms.filter((room: any) => 
          (room.room_type === 'school_admin_to_admin' || 
           room.room_type === 'school_admin_to_secretary' ||
           room.room_type === 'school_admin_to_teacher') &&
          room.participants_info?.some((p: any) => p.id === currentUser.id)
        );
        
        const generalRooms = rooms.filter((room: any) => 
          room.room_type === 'general_staff' || room.room_type === 'general'
        );
        
        filteredRooms = [...systemAdminRooms, ...oneOnOneRooms, ...generalRooms];
        
      } else if (currentUser?.role === 'secretary') {
        // For secretaries, show:
        // 1. One-on-one rooms with school admins and teachers
        const oneOnOneRooms = rooms.filter((room: any) => 
          (room.room_type === 'school_admin_to_secretary' ||
           room.room_type === 'secretary_to_teacher') &&
          room.participants_info?.some((p: any) => p.id === currentUser.id)
        );
        
        const generalRooms = rooms.filter((room: any) => 
          room.room_type === 'general_staff' || room.room_type === 'general'
        );
        
        filteredRooms = [...oneOnOneRooms, ...generalRooms];
        
      } else if (currentUser?.role === 'teacher') {
        // For teachers, show:
        // 1. One-on-one rooms with school admins and secretaries
        const oneOnOneRooms = rooms.filter((room: any) => 
          (room.room_type === 'school_admin_to_teacher' ||
           room.room_type === 'secretary_to_teacher') &&
          room.participants_info?.some((p: any) => p.id === currentUser.id)
        );
        
        const generalRooms = rooms.filter((room: any) => 
          room.room_type === 'general_staff' || room.room_type === 'general'
        );
        
        filteredRooms = [...oneOnOneRooms, ...generalRooms];
        
      } else if (currentUser?.role === 'super_admin') {
        // Super admins should use SystemChat component, but if they access this, show all rooms
        filteredRooms = rooms;
      } else {
        // For other roles, show general rooms only
        filteredRooms = rooms.filter((room: any) => 
          room.room_type === 'general' || room.room_type === 'general_staff'
        );
      }
      
      setChatRooms(filteredRooms);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to load chat rooms');
    } finally {
      setLoadingChats(false);
    }
  }, [currentUser?.role, currentUser?.id]);

  // Fetch messages for selected room
  const fetchMessages = useCallback(async () => {
    if (!selectedRoom) return;
    
    console.log('🔍 Chat.tsx - Starting fetchMessages for room:', selectedRoom.id);
    setLoadingMessages(true);
    try {
      // Fetch all messages with pagination to get all messages
      let allMessages: any[] = [];
      let currentPage = 1;
      let hasNextPage = true;
      
      while (hasNextPage) {
        const response = await chatAPI.getMessages({ 
          room: selectedRoom.id,
          page: currentPage,
          page_size: 1000
        });
        
        console.log(`🔍 Chat.tsx - API Response for page ${currentPage}:`, response);
        
        const messages = response.data.results || response.data || [];
        allMessages = [...allMessages, ...messages];
        
        // Check if there's a next page
        hasNextPage = !!response.data.next;
        currentPage++;
        
        console.log(`🔍 Chat.tsx - Fetched ${messages.length} messages from page ${currentPage - 1}, total so far: ${allMessages.length}`);
      }
      
      console.log('🔍 Chat.tsx - Total messages fetched:', allMessages.length);
      
      // Handle the correct API response structure
      const messages = allMessages;
      console.log('🔍 Chat.tsx - Raw messages from API:', messages);
      console.log('🔍 Chat.tsx - Sample message sender_info:', messages[0]?.sender_info);
      
      // Map API response to frontend format
      const mappedMessages = messages.map((msg: any) => {
        // Construct proper sender name
        let senderName = 'Unknown';
        if (msg.sender_info?.name) {
          senderName = msg.sender_info.name;
        } else if (msg.sender_info?.first_name && msg.sender_info?.last_name) {
          senderName = `${msg.sender_info.first_name} ${msg.sender_info.last_name}`;
        } else if (msg.sender_info?.username) {
          senderName = msg.sender_info.username;
        } else if (msg.sender) {
          // If sender is a number (user ID), try to get name from participants
          const isNumeric = !isNaN(msg.sender);
          if (isNumeric) {
            senderName = `User ${msg.sender}`;
          } else {
            senderName = msg.sender;
          }
        }
        
        return {
          id: msg.id,
          content: msg.content,
          sender: senderName,
          timestamp: msg.created_at,
          sender_info: msg.sender_info
        };
      });
      
      console.log('🔍 Chat.tsx - Mapped messages:', mappedMessages);
      
      // Sort messages by timestamp (oldest first for proper chat display)
      const sortedMessages = mappedMessages.sort((a: any, b: any) => 
        new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
      );
      
      console.log('🔍 Chat.tsx - Sorted messages:', sortedMessages);
      console.log('🔍 Chat.tsx - Messages count:', sortedMessages.length);
      
      setMessages(sortedMessages);
    } catch (err: any) {
      console.error('❌ Chat.tsx - Error fetching messages:', err);
      setError(err.response?.data?.message || 'Failed to load messages');
    } finally {
      setLoadingMessages(false);
    }
  }, [selectedRoom]);

  // Send message
  const sendMessage = useCallback(async (content: string) => {
    if (!selectedRoom || !content.trim()) return;
    
    console.log('🔍 Chat.tsx - Starting sendMessage:', { roomId: selectedRoom.id, content });
    try {
      const messageData: any = {
        room: selectedRoom.id,
        content: content.trim()
      };
      
      // Add reply data if replying to a message
      if (replyToMessage) {
        messageData.reply_to_id = replyToMessage.id;
      }
      
      const response = await chatAPI.sendMessage(messageData);
      
      console.log('🔍 Chat.tsx - Send message API response:', response);
      
      // Add new message to the beginning of the list with proper structure
      const newMessage = {
        id: response.data.id,
        content: response.data.content,
        sender: response.data.sender_info?.name || 
                (response.data.sender_info?.first_name && response.data.sender_info?.last_name ? 
                 `${response.data.sender_info.first_name} ${response.data.sender_info.last_name}` : 
                 response.data.sender_info?.username || 
                 (response.data.sender && !isNaN(response.data.sender) ? `User ${response.data.sender}` : response.data.sender) || 
                 'Unknown'),
        timestamp: response.data.created_at,
        sender_info: response.data.sender_info
      };
      
      console.log('🔍 Chat.tsx - New message object:', newMessage);
      
      // Immediately add to messages state (add to end for proper chat flow)
      setMessages(prev => {
        const updatedMessages = [...prev, newMessage];
        console.log('🔍 Chat.tsx - Updated messages array:', updatedMessages);
        return updatedMessages;
      });
      
      // Clear the input and reply state
      setMessage('');
      setReplyToMessage(null);
      
      // Refresh chat rooms to update order (room with new message moves to top)
      // This will trigger the useEffect that reloads and sorts chat rooms
      setChatRooms(prev => {
        const updatedRooms = prev.map(room => 
          room.id === selectedRoom.id 
            ? { ...room, last_message: { content: content.trim(), created_at: new Date().toISOString() } }
            : room
        );
        return updatedRooms.sort((a: any, b: any) => {
          const aTime = a.last_message?.created_at ? new Date(a.last_message.created_at).getTime() : 0;
          const bTime = b.last_message?.created_at ? new Date(b.last_message.created_at).getTime() : 0;
          return bTime - aTime; // Most recent first
        });
      });
    } catch (err: any) {
      console.error('❌ Chat.tsx - Error sending message:', err);
      setError(err.response?.data?.message || 'Failed to send message');
    }
  }, [selectedRoom]);

  // Delete message functions
  const deleteMessage = useCallback(async (messageId: number, deleteForEveryone: boolean = false) => {
    try {
      await chatAPI.deleteMessage(messageId, deleteForEveryone);
      // Remove message from state
      setMessages(prev => prev.filter(msg => msg.id !== messageId));
      setError(null);
    } catch (err: any) {
      console.error('❌ Chat.tsx - Error deleting message:', err);
      setError(err.response?.data?.message || 'Failed to delete message');
    }
  }, []);

  const deleteSelectedMessages = useCallback(async () => {
    if (selectedMessages.length === 0) return;
    
    try {
      await chatAPI.deleteSelectedMessages(selectedMessages, deleteForEveryone);
      // Remove selected messages from state
      setMessages(prev => prev.filter(msg => !selectedMessages.includes(msg.id)));
      setSelectedMessages([]);
      setIsSelectionMode(false);
      setDeleteDialogOpen(false);
      setError(null);
    } catch (err: any) {
      console.error('❌ Chat.tsx - Error deleting selected messages:', err);
      setError(err.response?.data?.message || 'Failed to delete selected messages');
    }
  }, [selectedMessages, deleteForEveryone]);

  const deleteAllMessages = useCallback(async () => {
    if (!selectedRoom) return;
    
    try {
      await chatAPI.deleteAllMessages(selectedRoom.id);
      setMessages([]);
      setDeleteAllDialogOpen(false);
      setError(null);
    } catch (err: any) {
      console.error('❌ Chat.tsx - Error deleting all messages:', err);
      setError(err.response?.data?.message || 'Failed to delete all messages');
    }
  }, [selectedRoom]);

  // Message selection handlers
  const handleMessageSelect = useCallback((messageId: number) => {
    setSelectedMessages(prev => 
      prev.includes(messageId) 
        ? prev.filter(id => id !== messageId)
        : [...prev, messageId]
    );
  }, []);

  const handleMessageMenuOpen = useCallback((event: React.MouseEvent<HTMLElement>, message: Message) => {
    setMessageMenuAnchor(event.currentTarget);
    setSelectedMessageForMenu(message);
  }, []);

  const handleMessageMenuClose = useCallback(() => {
    setMessageMenuAnchor(null);
    setSelectedMessageForMenu(null);
  }, []);

  const handleDeleteMessage = useCallback((message: Message, deleteForEveryone: boolean = false) => {
    setMessageToDelete(message);
    setDeleteForEveryone(deleteForEveryone);
    setSingleDeleteDialogOpen(true);
    handleMessageMenuClose();
  }, [handleMessageMenuClose]);

  const confirmDeleteMessage = useCallback(() => {
    if (messageToDelete) {
      deleteMessage(messageToDelete.id, deleteForEveryone);
      setSingleDeleteDialogOpen(false);
      setMessageToDelete(null);
    }
  }, [messageToDelete, deleteForEveryone, deleteMessage]);

  // Reply and Forward functions
  const handleReply = useCallback(async (message: Message) => {
    setReplyToMessage(message);
    handleMessageMenuClose();
  }, [handleMessageMenuClose]);

  const handleForward = useCallback((message: Message) => {
    setForwardMessage(message);
    setForwardDialogOpen(true);
    handleMessageMenuClose();
  }, [handleMessageMenuClose]);

  const sendReply = useCallback(async (replyContent: string) => {
    if (!replyToMessage || !selectedRoom) return;
    
    try {
      await chatAPI.replyToMessage({
        room_id: selectedRoom.id,
        reply_to_id: replyToMessage.id,
        content: replyContent
      });
      setReplyToMessage(null);
      fetchMessages();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to send reply');
    }
  }, [replyToMessage, selectedRoom, fetchMessages]);

  const sendForward = useCallback(async () => {
    if (!forwardMessage || !forwardToRoom) return;
    
    try {
      await chatAPI.forwardMessage({
        message_id: forwardMessage.id,
        target_room_id: forwardToRoom.id
      });
      setForwardMessage(null);
      setForwardToRoom(null);
      setForwardDialogOpen(false);
      fetchMessages();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to forward message');
    }
  }, [forwardMessage, forwardToRoom, fetchMessages]);

  // File handling functions
  const handleFileSelect = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    console.log('🔍 Chat.tsx - File selected:', file);
    if (file) {
      setSelectedFile(file);
      console.log('🔍 Chat.tsx - File set in state:', file.name, file.size, file.type);
    }
  }, []);

  const uploadFile = useCallback(async () => {
    if (!selectedFile || !selectedRoom) return;
    
    setUploadingFile(true);
    try {
      // Upload the file - this already creates a message
      const uploadResponse = await chatAPI.uploadFile(selectedFile, selectedRoom.id);
      console.log('🔍 Chat.tsx - File upload response:', uploadResponse);
      
      // The backend already creates the message, so we just need to add it to our state
      const newMessage = {
        id: uploadResponse.data.id,
        content: uploadResponse.data.content,
        sender: uploadResponse.data.sender_info?.name || 
                (uploadResponse.data.sender_info?.first_name && uploadResponse.data.sender_info?.last_name ? 
                 `${uploadResponse.data.sender_info.first_name} ${uploadResponse.data.sender_info.last_name}` : 
                 uploadResponse.data.sender_info?.username || 
                 (uploadResponse.data.sender && !isNaN(uploadResponse.data.sender) ? `User ${uploadResponse.data.sender}` : uploadResponse.data.sender) || 
                 'Unknown'),
        timestamp: uploadResponse.data.created_at,
        sender_info: uploadResponse.data.sender_info,
        file: {
          id: uploadResponse.data.id,
          name: selectedFile.name,
          size: selectedFile.size,
          type: selectedFile.type,
          url: uploadResponse.data.attachment || ''
        }
      };
      
      console.log('🔍 Chat.tsx - New file message object:', newMessage);
      
      // Immediately add to messages state
      setMessages(prev => {
        const updatedMessages = [...prev, newMessage];
        console.log('🔍 Chat.tsx - Updated messages array with file:', updatedMessages);
        return updatedMessages;
      });
      
      // Clear the file input and reply state
      setSelectedFile(null);
      setReplyToMessage(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
      
      // Refresh chat rooms to update order
      setChatRooms(prev => {
        const updatedRooms = prev.map(room => 
          room.id === selectedRoom.id 
            ? { ...room, last_message: { content: `📎 ${selectedFile.name}`, created_at: new Date().toISOString() } }
            : room
        );
        return updatedRooms.sort((a: any, b: any) => {
          const aTime = a.last_message?.created_at ? new Date(a.last_message.created_at).getTime() : 0;
          const bTime = b.last_message?.created_at ? new Date(b.last_message.created_at).getTime() : 0;
          return bTime - aTime; // Most recent first
        });
      });
    } catch (err: any) {
      console.error('❌ Chat.tsx - Error uploading file:', err);
      setError(err.response?.data?.message || 'Failed to upload file');
    } finally {
      setUploadingFile(false);
    }
  }, [selectedFile, selectedRoom, replyToMessage]);

  const downloadFile = useCallback(async (messageId: number, fileName: string) => {
    try {
      const response = await chatAPI.downloadFile(messageId);
      
      // Create blob from response data
      const blob = new Blob([response.data], { 
        type: response.headers['content-type'] || 'application/octet-stream' 
      });
      
      // Create download link
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', fileName);
      link.style.display = 'none';
      
      // Trigger download
      document.body.appendChild(link);
      link.click();
      
      // Cleanup
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (err: any) {
      console.error('Download error:', err);
      setError(err.response?.data?.message || 'Failed to download file');
    }
  }, []);

  // Add error handling for ResizeObserver
  useEffect(() => {
    const originalError = console.error;
    console.error = (...args) => {
      if (args[0]?.includes?.('ResizeObserver loop completed with undelivered notifications')) {
        return; // Suppress ResizeObserver errors
      }
      originalError.apply(console, args);
    };

    return () => {
      console.error = originalError;
    };
  }, []);

  // Load chat rooms on component mount
  useEffect(() => {
    const loadChats = async () => {
      setLoadingChats(true);
      try {
        const response = await chatAPI.getChatRooms();
        const rooms = response.data.results || response.data || [];
        
        // Filter rooms based on user role
        let filteredRooms = [];
        
        if (currentUser?.role === 'school_admin') {
          const systemAdminRooms = rooms.filter((room: any) => 
            room.room_type === 'system_school_admin' && 
            room.participants_info?.some((p: any) => p.id === currentUser.id)
          );
          const oneOnOneRooms = rooms.filter((room: any) => 
            (room.room_type === 'school_admin_to_admin' || 
             room.room_type === 'school_admin_to_secretary' ||
             room.room_type === 'school_admin_to_teacher') &&
            room.participants_info?.some((p: any) => p.id === currentUser.id)
          );
          const generalRooms = rooms.filter((room: any) => 
            room.room_type === 'general_staff' || room.room_type === 'general'
          );
          filteredRooms = [...systemAdminRooms, ...oneOnOneRooms, ...generalRooms];
        } else if (currentUser?.role === 'secretary') {
          const oneOnOneRooms = rooms.filter((room: any) => 
            (room.room_type === 'school_admin_to_secretary' ||
             room.room_type === 'secretary_to_teacher') &&
            room.participants_info?.some((p: any) => p.id === currentUser.id)
          );
          const generalRooms = rooms.filter((room: any) => 
            room.room_type === 'general_staff' || room.room_type === 'general'
          );
          filteredRooms = [...oneOnOneRooms, ...generalRooms];
        } else if (currentUser?.role === 'teacher') {
          const oneOnOneRooms = rooms.filter((room: any) => 
            (room.room_type === 'school_admin_to_teacher' ||
             room.room_type === 'secretary_to_teacher') &&
            room.participants_info?.some((p: any) => p.id === currentUser.id)
          );
          const generalRooms = rooms.filter((room: any) => 
            room.room_type === 'general_staff' || room.room_type === 'general'
          );
          filteredRooms = [...oneOnOneRooms, ...generalRooms];
        } else if (currentUser?.role === 'super_admin') {
          filteredRooms = rooms;
        } else {
          filteredRooms = rooms.filter((room: any) => 
            room.room_type === 'general' || room.room_type === 'general_staff'
          );
        }
        
        // Sort rooms by last message timestamp (most recent first)
        const sortedRooms = filteredRooms.sort((a: any, b: any) => {
          const aTime = a.last_message?.created_at ? new Date(a.last_message.created_at).getTime() : 0;
          const bTime = b.last_message?.created_at ? new Date(b.last_message.created_at).getTime() : 0;
          return bTime - aTime; // Most recent first
        });
        
        setChatRooms(sortedRooms);
      } catch (err: any) {
        setError(err.response?.data?.message || 'Failed to load chat rooms');
      } finally {
        setLoadingChats(false);
      }
    };
    
    if (currentUser) {
      loadChats();
    }
  }, [currentUser?.role, currentUser?.id]);

  // Refresh chat rooms periodically to keep them sorted
  useEffect(() => {
    const interval = setInterval(() => {
      if (currentUser) {
        // Reload chat rooms to get updated last_message timestamps
        const loadChats = async () => {
          try {
            const response = await chatAPI.getChatRooms();
            const rooms = response.data.results || response.data || [];
            
            // Filter rooms based on user role (same logic as before)
            let filteredRooms = [];
            
            if (currentUser?.role === 'school_admin') {
              const systemAdminRooms = rooms.filter((room: any) => 
                room.room_type === 'system_school_admin' && 
                room.participants_info?.some((p: any) => p.id === currentUser.id)
              );
              const oneOnOneRooms = rooms.filter((room: any) => 
                (room.room_type === 'school_admin_to_admin' || 
                 room.room_type === 'school_admin_to_secretary' ||
                 room.room_type === 'school_admin_to_teacher') &&
                room.participants_info?.some((p: any) => p.id === currentUser.id)
              );
              const generalRooms = rooms.filter((room: any) => 
                room.room_type === 'general_staff' || room.room_type === 'general'
              );
              filteredRooms = [...systemAdminRooms, ...oneOnOneRooms, ...generalRooms];
            } else if (currentUser?.role === 'secretary') {
              const oneOnOneRooms = rooms.filter((room: any) => 
                (room.room_type === 'school_admin_to_secretary' ||
                 room.room_type === 'secretary_to_teacher') &&
                room.participants_info?.some((p: any) => p.id === currentUser.id)
              );
              const generalRooms = rooms.filter((room: any) => 
                room.room_type === 'general_staff' || room.room_type === 'general'
              );
              filteredRooms = [...oneOnOneRooms, ...generalRooms];
            } else if (currentUser?.role === 'teacher') {
              const oneOnOneRooms = rooms.filter((room: any) => 
                (room.room_type === 'school_admin_to_teacher' ||
                 room.room_type === 'secretary_to_teacher') &&
                room.participants_info?.some((p: any) => p.id === currentUser.id)
              );
              const generalRooms = rooms.filter((room: any) => 
                room.room_type === 'general_staff' || room.room_type === 'general'
              );
              filteredRooms = [...oneOnOneRooms, ...generalRooms];
            } else if (currentUser?.role === 'super_admin') {
              filteredRooms = rooms;
            } else {
              filteredRooms = rooms.filter((room: any) => 
                room.room_type === 'general' || room.room_type === 'general_staff'
              );
            }
            
            // Sort rooms by last message timestamp (most recent first)
            const sortedRooms = filteredRooms.sort((a: any, b: any) => {
              const aTime = a.last_message?.created_at ? new Date(a.last_message.created_at).getTime() : 0;
              const bTime = b.last_message?.created_at ? new Date(b.last_message.created_at).getTime() : 0;
              return bTime - aTime; // Most recent first
            });
            
            setChatRooms(sortedRooms);
          } catch (err: any) {
            console.error('Error refreshing chat rooms:', err);
          }
        };
        
        loadChats();
      }
    }, 30000); // Refresh every 30 seconds instead of 10

    return () => clearInterval(interval);
  }, [currentUser?.role, currentUser?.id]);

  // Load messages when selected room changes
  useEffect(() => {
    if (selectedRoom) {
      fetchMessages();
      // Mark room as read when selected
      chatAPI.markRoomAsRead(selectedRoom.id)
        .then(() => {
          // Refresh chat rooms to update unread counts
          fetchChats();
        })
        .catch(err => {
          console.error('❌ Chat.tsx - Error marking room as read:', err);
        });
    }
  }, [selectedRoom, fetchMessages, fetchChats]);

  // Scroll to bottom when messages change
  useEffect(() => {
    if (messagesEndRef.current) {
      // Add a small delay to prevent ResizeObserver errors
      const timeoutId = setTimeout(() => {
        try {
          messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
        } catch (error) {
          // Fallback to instant scroll if smooth scroll fails
          messagesEndRef.current?.scrollIntoView();
        }
      }, 100);
      
      return () => clearTimeout(timeoutId);
    }
  }, [messages]);

  // Handle sending message
  const handleSendMessage = useCallback(async () => {
    console.log('🔍 Chat.tsx - handleSendMessage called:', { 
      hasMessage: !!message.trim(), 
      hasFile: !!selectedFile, 
      hasRoom: !!selectedRoom,
      message: message,
      fileName: selectedFile?.name
    });
    
    if ((!message.trim() && !selectedFile) || !selectedRoom) return;

    try {
      if (selectedFile) {
        console.log('🔍 Chat.tsx - Uploading file:', selectedFile.name);
        await uploadFile();
      } else {
        console.log('🔍 Chat.tsx - Sending text message:', message);
        await sendMessage(message);
      }
    } catch (err) {
      console.error('❌ Chat.tsx - Error in handleSendMessage:', err);
      setError('Failed to send message');
    }
  }, [message, selectedFile, selectedRoom, sendMessage, uploadFile]);

  // Handle key press
  const handleKeyPress = useCallback((event: React.KeyboardEvent) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      handleSendMessage();
    }
  }, [handleSendMessage]);

  // Handle chat selection
  const handleChatSelect = useCallback((chat: ChatRoom) => {
    setSelectedRoom(chat);
  }, []);

  // Handle tab change
  const handleTabChange = useCallback((event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
  }, []);

  // Get room type icon
  const getRoomTypeIcon = useCallback((roomType: string) => {
    switch (roomType) {
      case 'class':
        return <Class />;
      case 'staff':
        return <Group />;
      case 'admin':
        return <Business />;
      case 'parent_teacher':
        return <Person />;
      default:
        return <ChatIcon />;
    }
  }, []);

  // Get room type label
  const getRoomTypeLabel = useCallback((roomType: string) => {
    switch (roomType) {
      case 'class':
        return 'Class';
      case 'staff':
        return 'Staff';
      case 'admin':
        return 'Admin';
      case 'parent_teacher':
        return 'Parent-Teacher';
      case 'general':
        return 'General';
      default:
        return roomType;
    }
  }, []);

  // Format time to show only hour and minute
  const formatTime = useCallback((timestamp: string) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });
  }, []);

  // Detect and format links in text
  const formatMessageContent = useCallback((content: string) => {
    if (!content) return '';
    const urlRegex = /(https?:\/\/[^\s]+)/g;
    const parts = content.split(urlRegex);
    
    return parts.map((part, index) => {
      if (urlRegex.test(part)) {
        return (
          <a
            key={index}
            href={part}
            target="_blank"
            rel="noopener noreferrer"
            style={{ 
              color: '#2196f3', 
              textDecoration: 'underline',
              fontWeight: 'bold',
              backgroundColor: 'rgba(33, 150, 243, 0.1)',
              padding: '1px 3px',
              borderRadius: '3px'
            }}
          >
            {part}
          </a>
        );
      }
      return part;
    });
  }, []);

  // Format file size
  const formatFileSize = useCallback((bytes: number) => {
    if (!bytes || bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }, []);

  // Get file icon based on type
  const getFileIcon = useCallback((fileType: string | undefined) => {
    if (!fileType) return <AttachFile />;
    if (fileType.startsWith('image/')) return <Image />;
    if (fileType.startsWith('video/')) return <VideoFile />;
    if (fileType.startsWith('audio/')) return <Audiotrack />;
    if (fileType.includes('pdf')) return <PictureAsPdf />;
    if (fileType.includes('word') || fileType.includes('document')) return <Description />;
    if (fileType.includes('excel') || fileType.includes('spreadsheet')) return <TableChart />;
    if (fileType.includes('powerpoint') || fileType.includes('presentation')) return <Slideshow />;
    return <AttachFile />;
  }, []);

  // Check if message is from current user
  const isOwnMessage = useCallback((message: Message) => {
    if (!currentUser) return false;
    
    // The most reliable way to check ownership is by comparing user IDs
    return message.sender_info?.id === currentUser.id;
  }, [currentUser]);

  // Get display name for room
  const getRoomDisplayName = useCallback((room: any) => {
    if (room.room_type === 'system_school_admin') {
      // For school admins, show "Support". For system admins, show school name
      if (currentUser?.role === 'school_admin') {
        return 'Support';
      } else {
        // Extract school name from "System ↔ School Name"
        const schoolName = room.name.replace('System ↔ ', '');
        return schoolName;
      }
    } else if (room.room_type === 'school_admin_to_admin' || 
               room.room_type === 'school_admin_to_secretary' ||
               room.room_type === 'school_admin_to_teacher' ||
               room.room_type === 'secretary_to_teacher') {
      // For one-on-one rooms, show only the other participant's name
      const participants = room.participants_info || [];
      const otherParticipant = participants.find((p: any) => p.id !== currentUser?.id);
      return otherParticipant?.name || room.name;
    }
    return room.name;
  }, [currentUser?.id, currentUser?.role]);

  // Get room icon based on room type and participant role
  const getRoomIcon = useCallback((room: any) => {
    if (room.room_type === 'system_school_admin') {
      return '🏫'; // School building icon
    } else if (room.room_type === 'general_staff') {
      return '👥'; // Group icon
    } else if (room.room_type === 'general') {
      return '💬'; // General chat icon
    } else {
      // For one-on-one rooms, show icon based on other participant's role
      const participants = room.participants_info || [];
      const otherParticipant = participants.find((p: any) => p.id !== currentUser?.id);
      
      if (otherParticipant) {
        switch (otherParticipant.role) {
          case 'super_admin':
            return '👑'; // Crown for super admin
          case 'school_admin':
            return '👨‍💼'; // Business person for school admin
          case 'secretary':
            return '📋'; // Clipboard for secretary
          case 'teacher':
            return '👨‍🏫'; // Teacher for teacher
          case 'student':
            return '👨‍🎓'; // Student for student
          default:
            return '👤'; // Default person icon
        }
      }
      return '👤'; // Default person icon
    }
  }, [currentUser?.id]);

  // Filter rooms based on tab and search
  const filteredRooms = chatRooms.filter(room => {
    if (tabValue === 0) return true; // All rooms
    const roomTypeMap: { [key: number]: string } = {
      0: 'all',
      1: 'class',
      2: 'staff',
      3: 'admin',
      4: 'general'
    };
    const currentTabType = roomTypeMap[tabValue as keyof typeof roomTypeMap];
    return currentTabType === 'all' || room.room_type === currentTabType;
  }).filter(room => 
    room.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    room.participants_info.some(p => 
      p.name.toLowerCase().includes(searchTerm.toLowerCase())
    )
  );

  // Memoize messages to prevent unnecessary re-renders
  const memoizedMessages = useMemo(() => {
    return messages.map((msg, index) => {
      const isOwn = isOwnMessage(msg);
      
      // Determine sender name with special handling for different chat types
      let senderName = msg.sender || msg.sender_info?.name || 'Unknown';
      
      // Handle system admin messages in system_school_admin rooms
      if (currentUser?.role === 'school_admin' && 
          selectedRoom?.room_type === 'system_school_admin' && 
          msg.sender_info?.role === 'super_admin' && 
          !isOwn) {
        senderName = 'Support';
      }
      
      // Handle school admin messages in system_school_admin rooms (for system admin view)
      if (currentUser?.role === 'super_admin' && 
          selectedRoom?.room_type === 'system_school_admin' && 
          msg.sender_info?.role === 'school_admin' && 
          !isOwn) {
        // Show the actual school admin name, not "Support"
        // Try to get the name from participants list if sender_info.name is empty
        if (!msg.sender_info?.name && selectedRoom?.participants_info) {
          const participant = selectedRoom.participants_info.find(p => p.id === msg.sender_info?.id);
          senderName = participant?.name || msg.sender_info?.name || msg.sender || 'School Admin';
          console.log('🔍 Chat.tsx - Found participant name:', { 
            participantId: msg.sender_info?.id, 
            participantName: participant?.name,
            finalSenderName: senderName 
          });
        } else {
          senderName = msg.sender_info?.name || msg.sender || 'School Admin';
        }
      }
      
      return {
        ...msg,
        isOwn,
        senderName,
        key: msg.id
      };
    });
  }, [messages, isOwnMessage, currentUser?.role, selectedRoom?.room_type]);

  if (!currentUser) {
    return (
      <Box sx={{ p: 3 }}>
        <Typography variant="h6" color="error">
          Please log in to access chat.
        </Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3, height: 'calc(100vh - 100px)' }}>
      <Typography variant="h4" gutterBottom>
        <ChatIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
        Chat
      </Typography>
      <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
        Connect with your colleagues and students
      </Typography>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      <Box sx={{ display: 'flex', height: 'calc(100vh - 200px)', gap: 2 }}>
        {/* Chat List */}
        <Card sx={{ width: 350, flexShrink: 0 }}>
          <CardContent sx={{ p: 0 }}>
            {/* Room Type Tabs */}
            <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
              <Tabs 
                value={tabValue} 
                onChange={handleTabChange}
                variant="scrollable"
                scrollButtons="auto"
              >
                <Tab label="All" />
                <Tab label="Classes" />
                <Tab label="Staff" />
                <Tab label="Admin" />
                <Tab label="General" />
              </Tabs>
            </Box>

            {/* Search Bar */}
            <Box sx={{ p: 2, borderBottom: 1, borderColor: 'divider' }}>
              <TextField
                fullWidth
                size="small"
                placeholder="Search chats..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                InputProps={{
                  startAdornment: <Search sx={{ mr: 1, color: 'text.secondary' }} />,
                }}
              />
            </Box>

            {/* Chat Rooms List */}
            <List sx={{ p: 0, maxHeight: 'calc(100vh - 350px)', overflow: 'auto' }}>
              {loadingChats ? (
                <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
                  <CircularProgress />
                </Box>
              ) : filteredRooms.length === 0 ? (
                <Box sx={{ p: 3, textAlign: 'center' }}>
                  <Typography variant="body2" color="text.secondary">
                    No chat rooms available
                  </Typography>
                </Box>
              ) : (
                filteredRooms.map((room) => (
                  <ListItemButton
                    key={room.id}
                    selected={selectedRoom?.id === room.id}
                    onClick={() => setSelectedRoom(room)}
                    sx={{
                      borderBottom: 1,
                      borderColor: 'divider',
                      '&.Mui-selected': {
                        backgroundColor: 'primary.light',
                      },
                    }}
                  >
                    <ListItemAvatar>
                      <Avatar sx={{ bgcolor: 'primary.main' }}>
                        {getRoomIcon(room)}
                      </Avatar>
                    </ListItemAvatar>
                    <ListItemText
                      primary={
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <Typography variant="subtitle1" noWrap>
                            {getRoomDisplayName(room)}
                          </Typography>
                          {room.unread_count > 0 && (
                            <Chip
                              label={room.unread_count}
                              size="small"
                              color="error"
                              sx={{ minWidth: 20, height: 20 }}
                            />
                          )}
                        </Box>
                      }
                      secondary={
                        <Typography variant="body2" color="text.secondary" noWrap>
                          {room.last_message?.content || 'No messages yet'}
                        </Typography>
                      }
                    />
                  </ListItemButton>
                ))
              )}
            </List>
          </CardContent>
        </Card>

        {/* Chat Messages */}
        <Card sx={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
          {selectedRoom ? (
            <>
              {/* Chat Header */}
              <Box sx={{ p: 2, borderBottom: 1, borderColor: 'divider' }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Box>
                    <Typography variant="h6">
                      {getRoomDisplayName(selectedRoom)}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      {selectedRoom.participants_info?.length || 0} participants
                    </Typography>
                  </Box>
                  <Box sx={{ display: 'flex', gap: 1 }}>
                    {isSelectionMode ? (
                      <>
                        <Button
                          size="small"
                          variant="outlined"
                          onClick={() => {
                            setIsSelectionMode(false);
                            setSelectedMessages([]);
                          }}
                        >
                          Cancel Selection
                        </Button>
                        <Button
                          size="small"
                          variant="contained"
                          color="error"
                          disabled={selectedMessages.length === 0}
                          onClick={() => setDeleteDialogOpen(true)}
                        >
                          Delete Selected ({selectedMessages.length})
                        </Button>
                      </>
                    ) : (
                      <>
                        <Button
                          size="small"
                          variant="outlined"
                          startIcon={<CheckBox />}
                          onClick={() => setIsSelectionMode(true)}
                        >
                          Select Messages
                        </Button>
                        <Button
                          size="small"
                          color="error"
                          onClick={() => setDeleteAllDialogOpen(true)}
                        >
                          <ClearAll sx={{ mr: 0.5 }} />
                          Clear All
                        </Button>
                      </>
                    )}
                  </Box>
                </Box>
              </Box>

              {/* Selection Mode Banner */}
              {isSelectionMode && (
                <Box sx={{ 
                  p: 1, 
                  backgroundColor: 'primary.main', 
                  color: 'white',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between'
                }}>
                  <Typography variant="body2">
                    Selection Mode - {selectedMessages.length} message{selectedMessages.length !== 1 ? 's' : ''} selected
                  </Typography>
                  <Button
                    size="small"
                    variant="outlined"
                    sx={{ color: 'white', borderColor: 'white' }}
                    onClick={() => {
                      setIsSelectionMode(false);
                      setSelectedMessages([]);
                    }}
                  >
                    Cancel
                  </Button>
                </Box>
              )}

              {/* Messages Area */}
              <Box sx={{ flex: 1, overflow: 'auto', p: 2, minHeight: '400px' }}>
                {/* Debug Information */}
                <Box sx={{ mb: 2, p: 1, bgcolor: 'grey.100', borderRadius: 1 }}>
                  <Typography variant="caption" color="text.secondary">
                    <strong>Debug Info:</strong> Room ID: {selectedRoom?.id} | Messages Count: {messages.length} | Loading: {loadingMessages ? 'Yes' : 'No'}
                  </Typography>
                  <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.5 }}>
                    <strong>Messages Data:</strong> {JSON.stringify(messages.slice(0, 2), null, 2)}
                  </Typography>
                </Box>
                
                {loadingMessages ? (
                  <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
                    <CircularProgress />
                  </Box>
                ) : messages.length === 0 ? (
                  <Box sx={{ textAlign: 'center', p: 3 }}>
                    <Typography variant="body2" color="text.secondary">
                      No messages yet. Start the conversation!
                    </Typography>
                    {/* Debug info */}
                    <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
                      Debug: selectedRoom={selectedRoom?.id}, messages.length={messages.length}
                    </Typography>
                  </Box>
                ) : (
                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                    {/* Debug info */}
                    <Typography variant="caption" color="text.secondary" sx={{ mb: 1, display: 'block' }}>
                      Debug: Showing {messages.length} messages for room {selectedRoom?.id}
                    </Typography>
                    <Typography variant="caption" color="text.secondary" sx={{ mb: 1, display: 'block' }}>
                      Debug: Memoized messages count: {memoizedMessages.length}
                    </Typography>
                    {memoizedMessages.map((msg) => {
                      console.log('🔍 Chat.tsx - Rendering message:', msg);
                      return (
                        <Box
                          key={msg.id}
                          sx={{
                            display: 'flex',
                            justifyContent: msg.isOwn ? 'flex-end' : 'flex-start',
                            mb: 1,
                            border: isSelectionMode ? '2px solid #1976d2' : '1px solid #e0e0e0',
                            borderRadius: 1,
                            p: 1,
                            position: 'relative',
                            backgroundColor: isSelectionMode && selectedMessages.includes(msg.id) ? 'rgba(25, 118, 210, 0.1)' : 'transparent',
                            '&:hover .message-actions': {
                              opacity: 1,
                            },
                          }}
                        >
                          {/* Selection checkbox */}
                          {isSelectionMode && (
                            <Checkbox
                              checked={selectedMessages.includes(msg.id)}
                              onChange={() => handleMessageSelect(msg.id)}
                              sx={{ 
                                position: 'absolute', 
                                left: 8, 
                                top: 8, 
                                zIndex: 1,
                                '&.Mui-checked': {
                                  color: '#1976d2',
                                },
                              }}
                            />
                          )}
                          
                          {/* Message actions menu */}
                          {msg.isOwn && !isSelectionMode && (
                            <IconButton
                              size="small"
                              onClick={(e) => handleMessageMenuOpen(e, msg)}
                              sx={{
                                position: 'absolute',
                                right: msg.isOwn ? 8 : 'auto',
                                left: msg.isOwn ? 'auto' : 8,
                                top: 8,
                                opacity: 0,
                                transition: 'opacity 0.2s',
                                '&:hover': { opacity: 1 },
                              }}
                              className="message-actions"
                            >
                              <MoreVert fontSize="small" />
                            </IconButton>
                          )}
                          <Box
                            sx={{
                              display: 'flex',
                              flexDirection: 'column',
                              maxWidth: '70%',
                              alignItems: msg.isOwn ? 'flex-end' : 'flex-start',
                            }}
                          >
                            <Box
                              sx={{
                                display: 'flex',
                                alignItems: 'flex-end',
                                gap: 1,
                                flexDirection: msg.isOwn ? 'row-reverse' : 'row',
                              }}
                            >
                              {!msg.isOwn && (
                                <Avatar sx={{ width: 32, height: 32, bgcolor: 'grey.300' }}>
                                  <Person />
                                </Avatar>
                              )}
                              <Box
                                sx={{
                                  p: 1.5,
                                  backgroundColor: msg.isOwn ? 'primary.main' : 'grey.100',
                                  color: msg.isOwn ? 'white' : 'text.primary',
                                  borderRadius: 2,
                                  maxWidth: '100%',
                                  minWidth: '100px',
                                }}
                              >
                                {!msg.isOwn && (
                                  <Typography variant="caption" sx={{ display: 'block', mb: 0.5, fontWeight: 'bold' }}>
                                    {msg.senderName}
                                  </Typography>
                                )}
                                
                                {/* Reply to message */}
                                {msg.reply_to && (
                                  <Box sx={{ 
                                    mb: 1, 
                                    p: 1, 
                                    backgroundColor: msg.isOwn ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)',
                                    borderRadius: 1,
                                    borderLeft: 3,
                                    borderColor: 'primary.main'
                                  }}>
                                    <Typography variant="caption" sx={{ fontWeight: 'bold', display: 'block' }}>
                                      Reply to {msg.reply_to.sender_name}
                                    </Typography>
                                    <Typography variant="body2" sx={{ fontSize: '0.875rem' }}>
                                      {msg.reply_to.content}
                                    </Typography>
                                  </Box>
                                )}
                                
                                {/* Forwarded message */}
                                {msg.forwarded_from && (
                                  <Box sx={{ 
                                    mb: 1, 
                                    p: 1, 
                                    backgroundColor: msg.isOwn ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)',
                                    borderRadius: 1,
                                    borderLeft: 3,
                                    borderColor: 'secondary.main'
                                  }}>
                                    <Typography variant="caption" sx={{ fontWeight: 'bold', display: 'block' }}>
                                      Forwarded from {msg.forwarded_from.sender_name} in {msg.forwarded_from.room_name}
                                    </Typography>
                                    <Typography variant="body2" sx={{ fontSize: '0.875rem' }}>
                                      {msg.forwarded_from.content}
                                    </Typography>
                                  </Box>
                                )}
                                
                                {/* File attachment */}
                                {msg.file && (
                                  <Tooltip title="Click to download file" arrow>
                                    <Box 
                                      sx={{ 
                                        mb: 1, 
                                        p: 1, 
                                        backgroundColor: msg.isOwn ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)',
                                        borderRadius: 1,
                                        border: 1,
                                        borderColor: 'divider',
                                        cursor: 'pointer',
                                        '&:hover': {
                                          backgroundColor: msg.isOwn ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.1)',
                                        }
                                      }}
                                      onClick={() => downloadFile(msg.id, msg.file!.name)}
                                    >
                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                      {getFileIcon(msg.file.type)}
                                      <Box sx={{ flex: 1 }}>
                                        <Typography variant="body2" sx={{ fontWeight: 'bold' }}>
                                          {msg.file.name}
                                        </Typography>
                                        <Typography variant="caption" color="text.secondary">
                                          {formatFileSize(msg.file.size)}
                                        </Typography>
                                      </Box>
                                      <Download fontSize="small" color="action" />
                                    </Box>
                                  </Box>
                                  </Tooltip>
                                )}
                                
                                {/* Message content with link detection */}
                                <Typography variant="body2">
                                  {formatMessageContent(msg.content || '')}
                                </Typography>
                                
                                <Typography 
                                  variant="caption" 
                                  sx={{ 
                                    color: msg.isOwn ? 'rgba(255,255,255,0.7)' : 'text.secondary',
                                    fontSize: '0.75rem',
                                    mt: 0.5,
                                    display: 'block'
                                  }}
                                >
                                  {formatTime(msg.timestamp)}
                                </Typography>
                              </Box>
                              {msg.isOwn && (
                                <Avatar sx={{ width: 32, height: 32, bgcolor: 'primary.main' }}>
                                  <Person />
                                </Avatar>
                              )}
                            </Box>
                          </Box>
                        </Box>
                      );
                    })}
                    <div ref={messagesEndRef} />
                  </Box>
                )}
              </Box>

              {/* Message Input */}
              <Box sx={{ p: 2, borderTop: 1, borderColor: 'divider' }}>
                {/* Reply to message */}
                {replyToMessage && (
                  <Box sx={{ 
                    mb: 2, 
                    p: 1, 
                    backgroundColor: 'primary.light', 
                    borderRadius: 1,
                    borderLeft: 3,
                    borderColor: 'primary.main'
                  }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <Typography variant="caption" sx={{ fontWeight: 'bold' }}>
                        Reply to {replyToMessage.senderName || replyToMessage.sender}
                      </Typography>
                      <IconButton size="small" onClick={() => setReplyToMessage(null)}>
                        <Delete fontSize="small" />
                      </IconButton>
                    </Box>
                    <Typography variant="body2" sx={{ fontSize: '0.875rem', mt: 0.5 }}>
                      {replyToMessage.content}
                    </Typography>
                  </Box>
                )}
                
                {/* File upload preview */}
                {selectedFile && (
                  <Box sx={{ 
                    mb: 2, 
                    p: 1, 
                    backgroundColor: 'grey.100', 
                    borderRadius: 1,
                    border: 1,
                    borderColor: 'divider'
                  }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      {getFileIcon(selectedFile.type)}
                      <Box sx={{ flex: 1 }}>
                        <Typography variant="body2" sx={{ fontWeight: 'bold' }}>
                          {selectedFile.name}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {formatFileSize(selectedFile.size)}
                        </Typography>
                      </Box>
                      <IconButton size="small" onClick={() => setSelectedFile(null)}>
                        <Delete fontSize="small" />
                      </IconButton>
                    </Box>
                  </Box>
                )}
                
                <Box sx={{ display: 'flex', gap: 1, alignItems: 'flex-end' }}>
                  {/* File upload button */}
                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleFileSelect}
                    style={{ display: 'none' }}
                    accept="*/*"
                  />
                  <IconButton
                    onClick={() => fileInputRef.current?.click()}
                    disabled={uploadingFile}
                  >
                    <FileUpload />
                  </IconButton>
                  
                  <TextField
                    fullWidth
                    multiline
                    maxRows={4}
                    placeholder={replyToMessage ? `Reply to ${replyToMessage.senderName || replyToMessage.sender}...` : "Type a message..."}
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    onKeyPress={handleKeyPress}
                    sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
                  />
                  
                  <Button
                    variant="contained"
                    onClick={handleSendMessage}
                    disabled={(!message.trim() && !selectedFile) || uploadingFile}
                    sx={{ minWidth: 'auto', px: 2 }}
                  >
                    {uploadingFile ? <CircularProgress size={20} /> : <Send />}
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

      {/* Message Actions Menu */}
      <Menu
        anchorEl={messageMenuAnchor}
        open={Boolean(messageMenuAnchor)}
        onClose={handleMessageMenuClose}
      >
        <MenuItem onClick={() => handleReply(selectedMessageForMenu!)}>
          <Reply sx={{ mr: 1 }} />
          Reply
        </MenuItem>
        <MenuItem onClick={() => handleForward(selectedMessageForMenu!)}>
          <Forward sx={{ mr: 1 }} />
          Forward
        </MenuItem>
        <MenuItem onClick={() => handleDeleteMessage(selectedMessageForMenu!, false)}>
          <Delete sx={{ mr: 1 }} />
          Delete for me
        </MenuItem>
        <MenuItem onClick={() => handleDeleteMessage(selectedMessageForMenu!, true)}>
          <DeleteForever sx={{ mr: 1 }} />
          Delete for everyone
        </MenuItem>
      </Menu>

      {/* Delete Selected Messages Dialog */}
      <Dialog open={deleteDialogOpen} onClose={() => setDeleteDialogOpen(false)}>
        <DialogTitle>Delete Selected Messages</DialogTitle>
        <DialogContent>
          <Typography>
            Are you sure you want to delete {selectedMessages.length} selected message{selectedMessages.length !== 1 ? 's' : ''}?
          </Typography>
          <FormControlLabel
            control={
              <Checkbox
                checked={deleteForEveryone}
                onChange={(e) => setDeleteForEveryone(e.target.checked)}
              />
            }
            label="Delete for everyone"
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteDialogOpen(false)}>Cancel</Button>
          <Button onClick={deleteSelectedMessages} color="error">
            Delete
          </Button>
        </DialogActions>
      </Dialog>

      {/* Delete All Messages Dialog */}
      <Dialog open={deleteAllDialogOpen} onClose={() => setDeleteAllDialogOpen(false)}>
        <DialogTitle>Delete All Messages</DialogTitle>
        <DialogContent>
          <Typography>
            Are you sure you want to delete all messages in this chat? This action cannot be undone.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteAllDialogOpen(false)}>Cancel</Button>
          <Button onClick={deleteAllMessages} color="error">
            Delete All
          </Button>
        </DialogActions>
      </Dialog>

      {/* Single Message Delete Confirmation Dialog */}
      <Dialog open={singleDeleteDialogOpen} onClose={() => setSingleDeleteDialogOpen(false)}>
        <DialogTitle>Delete Message</DialogTitle>
        <DialogContent>
          <Typography>
            Are you sure you want to delete this message?
            {deleteForEveryone ? ' This will delete the message for everyone.' : ' This will only delete the message for you.'}
          </Typography>
          {messageToDelete && (
            <Box sx={{ mt: 2, p: 2, backgroundColor: 'grey.100', borderRadius: 1 }}>
              <Typography variant="body2" color="text.secondary">
                "{messageToDelete.content}"
              </Typography>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setSingleDeleteDialogOpen(false)}>Cancel</Button>
          <Button onClick={confirmDeleteMessage} color="error">
            Delete
          </Button>
        </DialogActions>
      </Dialog>

      {/* Forward Message Dialog */}
      <Dialog open={forwardDialogOpen} onClose={() => setForwardDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Forward Message</DialogTitle>
        <DialogContent>
          <Typography variant="body2" sx={{ mb: 2 }}>
            Select a chat room to forward the message to:
          </Typography>
          <List>
            {chatRooms
              .filter(room => room.id !== selectedRoom?.id)
              .map((room) => (
                <ListItemButton
                  key={room.id}
                  selected={forwardToRoom?.id === room.id}
                  onClick={() => setForwardToRoom(room)}
                >
                  <ListItemAvatar>
                    <Avatar sx={{ bgcolor: 'primary.main' }}>
                      {getRoomIcon(room)}
                    </Avatar>
                  </ListItemAvatar>
                  <ListItemText
                    primary={getRoomDisplayName(room)}
                    secondary={`${room.participants_info?.length || 0} participants`}
                  />
                </ListItemButton>
              ))}
          </List>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setForwardDialogOpen(false)}>Cancel</Button>
          <Button 
            onClick={sendForward} 
            disabled={!forwardToRoom}
            variant="contained"
          >
            Forward
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default Chat; 