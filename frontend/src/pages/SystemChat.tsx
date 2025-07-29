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
  IconButton,
  Divider,
  Alert,
  CircularProgress,
  Chip,
  Badge,
  Menu,
  MenuItem,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Checkbox,
  FormControlLabel,
} from '@mui/material';
import {
  Send,
  Search,
  Chat as ChatIcon,
  Person,
  AdminPanelSettings,
  School,
  Delete,
  DeleteForever,
  ClearAll,
  MoreVert,
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
  CheckBox,
} from '@mui/icons-material';
import { useAuth } from '../contexts/AuthContext';
import { chatAPI } from '../services/api';

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
  is_global_admin_room: boolean;
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

const SystemChat: React.FC = () => {
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
  const [roomMessages, setRoomMessages] = useState<{ [roomId: number]: Message[] }>({});
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

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { user: currentUser } = useAuth();

  // Fetch chat rooms (comprehensive system admin view)
  const fetchChats = useCallback(async () => {
      setLoadingChats(true);
      setError(null);
    
    try {
      const response = await chatAPI.getChatRooms();
      const rooms = response.data.results || response.data || [];
      
      // Filter rooms for super admin - show only system_school_admin rooms for System Chat
      const systemAdminRooms = rooms.filter((room: any) => 
        room.room_type === 'system_school_admin'
      );
      
      // Sort rooms by last message timestamp (most recent first)
      const sortedRooms = systemAdminRooms.sort((a: any, b: any) => {
        const aTime = a.last_message?.created_at ? new Date(a.last_message.created_at).getTime() : 0;
        const bTime = b.last_message?.created_at ? new Date(b.last_message.created_at).getTime() : 0;
        return bTime - aTime; // Most recent first
      });
      
      if (sortedRooms.length > 0) {
        setChatRooms(sortedRooms);
        // Auto-select the first room if no room is selected
        if (!selectedRoom) {
          setSelectedRoom(sortedRooms[0]);
        }
      } else {
        setChatRooms([]);
        setError('No system admin rooms found. Please contact system administrator.');
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to load chat rooms');
      } finally {
        setLoadingChats(false);
      }
  }, [selectedRoom]);

  // Get display name for room
  const getRoomDisplayName = useCallback((room: any) => {
    if (room.room_type === 'system_school_admin') {
      // Extract school name from "System ↔ School Name"
      const schoolName = room.name.replace('System ↔ ', '');
      return schoolName;
    }
    return room.name;
  }, []);

  // Get room icon based on room type
  const getRoomIcon = useCallback((room: any) => {
    if (room.room_type === 'system_school_admin') {
      return '🏫'; // School building icon
    } else if (room.room_type === 'general_staff') {
      return '👥'; // Group icon
    } else if (room.room_type === 'admin') {
      return '⚙️'; // Settings icon
    }
    return '💬'; // Default chat icon
  }, []);

    // Fetch messages for selected room
  const fetchMessages = useCallback(async () => {
    if (!selectedRoom) return;
    
    console.log('🔍 SystemChat - Starting fetchMessages for room:', selectedRoom.id);
    console.log('🔍 SystemChat - Room details:', {
      id: selectedRoom.id,
      name: selectedRoom.name,
      type: selectedRoom.room_type,
      participants: selectedRoom.participants_info
    });
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
        
        console.log(`🔍 SystemChat - API Response for page ${currentPage}:`, response);
        console.log('🔍 SystemChat - Response data structure:', {
          hasResults: !!response.data.results,
          hasData: !!response.data,
          resultsLength: response.data.results?.length,
          dataLength: Array.isArray(response.data) ? response.data.length : 'not array',
          hasNext: !!response.data.next,
          currentPage
        });
        
        const messages = response.data.results || response.data || [];
        allMessages = [...allMessages, ...messages];
        
        // Check if there's a next page
        hasNextPage = !!response.data.next;
        currentPage++;
        
        console.log(`🔍 SystemChat - Fetched ${messages.length} messages from page ${currentPage - 1}, total so far: ${allMessages.length}`);
      }
      
      console.log('🔍 SystemChat - Total messages fetched:', allMessages.length);
      
      // Handle the correct API response structure
      const messages = allMessages;
      console.log('🔍 SystemChat - Raw messages from API:', messages);
      console.log('🔍 SystemChat - Sample message sender_info:', messages[0]?.sender_info);
      
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
      
      console.log('🔍 SystemChat - Mapped messages:', mappedMessages);
      
      // Sort messages by timestamp (oldest first for proper chat display)
      const sortedMessages = mappedMessages.sort((a: any, b: any) => 
        new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
      );
      
      console.log('🔍 SystemChat - Sorted messages:', sortedMessages);
      console.log('🔍 SystemChat - Messages count:', sortedMessages.length);
      
      // Preserve any local messages that might not be in the server response yet
      setRoomMessages(prev => {
        const currentRoomMessages = prev[selectedRoom.id] || [];
        
        // Find any local messages that are not in the server response
        const localMessages = currentRoomMessages.filter(localMsg => 
          !sortedMessages.some((serverMsg: any) => serverMsg.id === localMsg.id)
        );
        
        // Combine server messages with local messages
        const combinedMessages = [...sortedMessages, ...localMessages];
        
        // Sort by timestamp
        const finalMessages = combinedMessages.sort((a: any, b: any) => 
          new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
        );
        
        console.log('🔍 SystemChat - Combined messages for room', selectedRoom.id, ':', finalMessages);
        
        return {
          ...prev,
          [selectedRoom.id]: finalMessages
        };
      });
    } catch (err: any) {
      console.error('❌ SystemChat - Error fetching messages:', err);
      setError(err.response?.data?.message || 'Failed to load messages');
      } finally {
        setLoadingMessages(false);
      }
  }, [selectedRoom]);

  // Send message
  const sendMessage = useCallback(async (content: string) => {
    if (!selectedRoom || !content.trim()) return;
    
    console.log('🔍 SystemChat - Starting sendMessage:', { 
      roomId: selectedRoom.id, 
      roomName: selectedRoom.name,
      roomType: selectedRoom.room_type,
      content 
    });
    try {
      const response = await chatAPI.sendMessage({
        room: selectedRoom.id,
        content: content.trim()
      });
      
      console.log('🔍 SystemChat - Send message API response:', response);
      console.log('🔍 SystemChat - Response data:', response.data);
      
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
      
      console.log('🔍 SystemChat - New message object:', newMessage);
      console.log('🔍 SystemChat - Current messages for room', selectedRoom.id, 'before adding:', roomMessages[selectedRoom.id]?.length || 0);
      
      // Immediately add to room-specific messages state
      setRoomMessages(prev => {
        const currentRoomMessages = prev[selectedRoom.id] || [];
        const updatedMessages = [...currentRoomMessages, newMessage];
        console.log('🔍 SystemChat - Updated messages for room', selectedRoom.id, ':', updatedMessages);
        console.log('🔍 SystemChat - New message added successfully to room', selectedRoom.id);
        
        return {
          ...prev,
          [selectedRoom.id]: updatedMessages
        };
      });
      
      // Clear the input
      setMessage('');
      
      // Refresh chat rooms to update order (room with new message moves to top)
      fetchChats();
    } catch (err: any) {
      console.error('❌ SystemChat - Error sending message:', err);
      setError(err.response?.data?.message || 'Failed to send message');
    }
  }, [selectedRoom, fetchChats, fetchMessages]);

  // Delete message functions
  const deleteMessage = useCallback(async (messageId: number, deleteForEveryone: boolean = false) => {
    try {
      await chatAPI.deleteMessage(messageId, deleteForEveryone);
      // Remove message from state
      setRoomMessages(prev => {
        const updated = { ...prev };
        Object.keys(updated).forEach(roomId => {
          updated[parseInt(roomId)] = updated[parseInt(roomId)].filter((msg: any) => msg.id !== messageId);
        });
        return updated;
      });
      setError(null);
    } catch (err: any) {
      console.error('❌ SystemChat - Error deleting message:', err);
      setError(err.response?.data?.message || 'Failed to delete message');
    }
  }, []);

  const deleteSelectedMessages = useCallback(async () => {
    if (selectedMessages.length === 0) return;
    
    try {
      await chatAPI.deleteSelectedMessages(selectedMessages, deleteForEveryone);
      // Remove selected messages from state
      setRoomMessages(prev => {
        const updated = { ...prev };
        Object.keys(updated).forEach(roomId => {
          updated[parseInt(roomId)] = updated[parseInt(roomId)].filter((msg: any) => !selectedMessages.includes(msg.id));
        });
        return updated;
      });
      setSelectedMessages([]);
      setIsSelectionMode(false);
      setDeleteDialogOpen(false);
      setError(null);
    } catch (err: any) {
      console.error('❌ SystemChat - Error deleting selected messages:', err);
      setError(err.response?.data?.message || 'Failed to delete selected messages');
    }
  }, [selectedMessages, deleteForEveryone]);

  const deleteAllMessages = useCallback(async () => {
    if (!selectedRoom) return;
    
    try {
      await chatAPI.deleteAllMessages(selectedRoom.id);
      setRoomMessages(prev => ({
        ...prev,
        [selectedRoom.id]: []
      }));
      setDeleteAllDialogOpen(false);
      setError(null);
    } catch (err: any) {
      console.error('❌ SystemChat - Error deleting all messages:', err);
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

  // File download function
  const downloadFile = useCallback(async (fileId: number, fileName: string) => {
    try {
      const response = await chatAPI.downloadFile(fileId);
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', fileName);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to download file');
    }
  }, []);

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
    console.log('🔍 SystemChat - File selected:', file);
    if (file) {
      setSelectedFile(file);
      console.log('🔍 SystemChat - File set in state:', file.name, file.size, file.type);
    }
  }, []);

  const uploadFile = useCallback(async () => {
    if (!selectedFile || !selectedRoom) return;
    
    setUploadingFile(true);
    try {
      // Upload the file first
      const uploadResponse = await chatAPI.uploadFile(selectedFile, selectedRoom.id);
      console.log('🔍 SystemChat - File upload response:', uploadResponse);
      
      // Send the file as a message
      const messageData: any = {
        room: selectedRoom.id,
        content: `📎 ${selectedFile.name}`,
        file_id: uploadResponse.data.id // Include the uploaded file ID
      };
      
      // Add reply data if replying to a message
      if (replyToMessage) {
        messageData.reply_to_id = replyToMessage.id;
      }
      
      const messageResponse = await chatAPI.sendMessage(messageData);
      console.log('🔍 SystemChat - File message response:', messageResponse);
      
      // Add new message to the room messages state
      const newMessage = {
        id: messageResponse.data.id,
        content: messageResponse.data.content,
        sender: messageResponse.data.sender_info?.name || 
                (messageResponse.data.sender_info?.first_name && messageResponse.data.sender_info?.last_name ? 
                 `${messageResponse.data.sender_info.first_name} ${messageResponse.data.sender_info.last_name}` : 
                 messageResponse.data.sender_info?.username || 
                 (messageResponse.data.sender && !isNaN(messageResponse.data.sender) ? `User ${messageResponse.data.sender}` : messageResponse.data.sender) || 
                 'Unknown'),
        timestamp: messageResponse.data.created_at,
        sender_info: messageResponse.data.sender_info,
        file: uploadResponse.data // Include file information
      };
      
      console.log('🔍 SystemChat - New file message object:', newMessage);
      
      // Immediately add to room messages state
      setRoomMessages(prev => {
        const currentRoomMessages = prev[selectedRoom.id] || [];
        const updatedMessages = [...currentRoomMessages, newMessage];
        console.log('🔍 SystemChat - Updated room messages with file:', updatedMessages);
        return {
          ...prev,
          [selectedRoom.id]: updatedMessages
        };
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
      console.error('❌ SystemChat - Error uploading file:', err);
      setError(err.response?.data?.message || 'Failed to upload file');
    } finally {
      setUploadingFile(false);
    }
  }, [selectedFile, selectedRoom, replyToMessage]);

  // Handle sending message
  const handleSendMessage = useCallback(async () => {
    console.log('🔍 SystemChat - handleSendMessage called:', { 
      hasMessage: !!message.trim(), 
      hasFile: !!selectedFile, 
      hasRoom: !!selectedRoom,
      message: message,
      fileName: selectedFile?.name
    });
    
    if ((!message.trim() && !selectedFile) || !selectedRoom) return;

    try {
      if (selectedFile) {
        console.log('🔍 SystemChat - Uploading file:', selectedFile.name);
        await uploadFile();
      } else {
        console.log('🔍 SystemChat - Sending text message:', message);
        await sendMessage(message);
      }
    } catch (err) {
      console.error('❌ SystemChat - Error in handleSendMessage:', err);
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

  // Handle room selection
  const handleRoomSelect = useCallback((room: ChatRoom) => {
    setSelectedRoom(room);
  }, []);

  // Get user full name
  const getUserFullName = useCallback((user: any) => {
    if (user?.first_name && user?.last_name) {
      return `${user.first_name} ${user.last_name}`.trim();
    }
    return user?.username || user?.id;
  }, []);

  // Check if message is from current user
  const isOwnMessage = useCallback((message: Message) => {
    if (!currentUser) return false;
    
    // The most reliable way to check ownership is by comparing user IDs
    return message.sender_info?.id === currentUser.id;
  }, [currentUser]);

  // Format time for display
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
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }, []);

  // Get file icon based on type
  const getFileIcon = useCallback((fileType: string) => {
    if (fileType.startsWith('image/')) return <Image />;
    if (fileType.startsWith('video/')) return <VideoFile />;
    if (fileType.startsWith('audio/')) return <Audiotrack />;
    if (fileType.includes('pdf')) return <PictureAsPdf />;
    if (fileType.includes('word') || fileType.includes('document')) return <Description />;
    if (fileType.includes('excel') || fileType.includes('spreadsheet')) return <TableChart />;
    if (fileType.includes('powerpoint') || fileType.includes('presentation')) return <Slideshow />;
    return <AttachFile />;
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
    fetchChats();
  }, [fetchChats]);

  // Load messages when room is selected
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
          console.error('❌ SystemChat - Error marking room as read:', err);
        });
    }
  }, [selectedRoom, fetchMessages, fetchChats]);

  // Refresh chat rooms periodically to keep them sorted
  useEffect(() => {
    const interval = setInterval(() => {
      if (currentUser) {
        fetchChats();
      }
    }, 30000); // Refresh every 30 seconds instead of 10

    return () => clearInterval(interval);
  }, [currentUser, fetchChats]);

  // Get current room messages
  const currentRoomMessages = roomMessages[selectedRoom?.id || 0] || [];
  
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
  }, [currentRoomMessages]);
  
  // Memoize messages to prevent unnecessary re-renders
  const memoizedMessages = useMemo(() => {
    console.log('🔍 SystemChat - Processing messages for room', selectedRoom?.id, ':', currentRoomMessages.length);
    console.log('🔍 SystemChat - Current user:', currentUser);
    console.log('🔍 SystemChat - Raw messages:', currentRoomMessages);
    
          const processedMessages = currentRoomMessages.map((msg, index) => {
      const isOwn = isOwnMessage(msg);
      console.log('🔍 SystemChat - Processing message:', { 
        msgId: msg.id, 
        senderId: msg.sender_info?.id, 
        currentUserId: currentUser?.id,
        isOwn,
        senderRole: msg.sender_info?.role,
        roomType: selectedRoom?.room_type,
        content: msg.content
      });
      
      // Determine sender name with special handling for different chat types
      let senderName = msg.sender || msg.sender_info?.name || 'Unknown';
      
      // Handle system admin messages in system_school_admin rooms (for system admin view)
      if (currentUser?.role === 'super_admin' && 
          selectedRoom?.room_type === 'system_school_admin' && 
          (msg.sender_info?.role === 'super_admin' || msg.sender_info?.role === 'Super Admin')) {
        senderName = 'Support';
      }
      
      // Handle school admin messages in system_school_admin rooms (for system admin view)
      if (currentUser?.role === 'super_admin' && 
          selectedRoom?.room_type === 'system_school_admin' && 
          (msg.sender_info?.role === 'school_admin' || msg.sender_info?.role === 'School Admin') && 
          !isOwn) {
        // Show the actual school admin name
        // Try to get the name from participants list if sender_info.name is empty
        if (!msg.sender_info?.name && selectedRoom?.participants_info) {
          const participant = selectedRoom.participants_info.find(p => p.id === msg.sender_info?.id);
          senderName = participant?.name || msg.sender_info?.name || msg.sender || 'School Admin';
          console.log('🔍 SystemChat.tsx - Found participant name:', { 
            participantId: msg.sender_info?.id, 
            participantName: participant?.name,
            finalSenderName: senderName 
          });
        } else {
          senderName = msg.sender_info?.name || msg.sender || 'School Admin';
        }
      }
      
      const processedMsg = {
        ...msg,
        isOwn,
        senderName,
        key: msg.id
      };
      
      console.log('🔍 SystemChat - Processed message:', processedMsg);
      return processedMsg;
    });
    
    console.log('🔍 SystemChat - Final processed messages:', processedMessages);
    return processedMessages;
  }, [currentRoomMessages, isOwnMessage, currentUser?.role, selectedRoom?.room_type]);

  if (!currentUser) {
    return (
      <Box sx={{ p: 3 }}>
        <Typography variant="h6" color="error">
          Please log in to access system chat.
        </Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3, height: 'calc(100vh - 100px)' }}>
      <Typography variant="h4" gutterBottom>
        <ChatIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
        System Chat
      </Typography>
      <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
        Global communication room for all System Administrators and School Administrators
      </Typography>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      <Box sx={{ display: 'flex', height: 'calc(100vh - 200px)', gap: 2 }}>
        {/* Chat Rooms List */}
        <Card sx={{ width: 350, flexShrink: 0 }}>
          <CardContent sx={{ p: 0 }}>
            {/* Search Bar */}
            <Box sx={{ p: 2, borderBottom: 1, borderColor: 'divider' }}>
              <TextField
                fullWidth
                size="small"
                placeholder="Search participants..."
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
              ) : chatRooms.length === 0 ? (
                <Box sx={{ p: 3, textAlign: 'center' }}>
                  <Typography variant="body2" color="text.secondary">
                    No global admin room available
                  </Typography>
                </Box>
                              ) : (
                  chatRooms.map((room: any) => (
                <ListItemButton
                      key={room.id}
                      selected={selectedRoom?.id === room.id}
                      onClick={() => setSelectedRoom(room)}
                  sx={{
                        borderRadius: 1,
                        mb: 1,
                    '&.Mui-selected': {
                      backgroundColor: 'primary.light',
                          '&:hover': {
                            backgroundColor: 'primary.light',
                          },
                    },
                  }}
                >
                  <ListItemAvatar>
                          <Avatar sx={{ bgcolor: 'primary.main' }}>
                            <Typography variant="h6">{getRoomIcon(room)}</Typography>
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

        {/* Chat Area */}
        <Card sx={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
          {selectedRoom ? (
            <>
              {/* Chat Header */}
              <Box sx={{ p: 2, borderBottom: 1, borderColor: 'divider' }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                    <Avatar sx={{ bgcolor: 'primary.main' }}>
                      <AdminPanelSettings />
                    </Avatar>
                    <Box>
                      <Typography variant="h6">{getRoomDisplayName(selectedRoom)}</Typography>
                      <Typography variant="body2" color="text.secondary">
                        {selectedRoom.participants_info?.length || 0} participants
                      </Typography>
                    </Box>
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
                
                {/* Participants List */}
                <Box sx={{ mt: 2 }}>
                  <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                    Participants:
                  </Typography>
                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                    {selectedRoom.participants_info?.map((participant) => {
                      // Show "Support" for super_admin participants in system_school_admin rooms
                      let displayName = participant.name;
                      if (currentUser?.role === 'school_admin' && 
                          selectedRoom?.room_type === 'system_school_admin' && 
                          participant.role === 'super_admin') {
                        displayName = 'Support';
                      }
                      
                      return (
                        <Chip
                          key={participant.id}
                          label={displayName}
                          size="small"
                          variant="outlined"
                          icon={<Person />}
                          sx={{ fontSize: '0.75rem' }}
                        />
                      );
                    })}
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
                    <strong>Debug Info:</strong> Room ID: {selectedRoom?.id} | Messages Count: {currentRoomMessages.length} | Loading: {loadingMessages ? 'Yes' : 'No'}
                  </Typography>
                  <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.5 }}>
                    <strong>Messages Data:</strong> {JSON.stringify(currentRoomMessages.slice(0, 2), null, 2)}
                  </Typography>
                </Box>
                
                {loadingMessages ? (
                  <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
                    <CircularProgress />
                  </Box>
                ) : currentRoomMessages.length === 0 ? (
                  <Box sx={{ textAlign: 'center', p: 3 }}>
                    <Typography variant="body2" color="text.secondary">
                      No messages yet. Start the conversation!
                    </Typography>
                    {/* Debug info */}
                    <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
                      Debug: selectedRoom={selectedRoom?.id}, messages.length={currentRoomMessages.length}
                    </Typography>
                  </Box>
                ) : (
                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                    {/* Debug info */}
                    <Typography variant="caption" color="text.secondary" sx={{ mb: 1, display: 'block' }}>
                      Debug: Showing {currentRoomMessages.length} messages for room {selectedRoom?.id}
                    </Typography>
                    <Typography variant="caption" color="text.secondary" sx={{ mb: 1, display: 'block' }}>
                      Debug: Memoized messages count: {memoizedMessages.length}
                    </Typography>
                    <Typography variant="caption" color="text.secondary" sx={{ mb: 1, display: 'block' }}>
                      Debug: Selected Room - ID: {selectedRoom?.id}, Type: {selectedRoom?.room_type}, Name: {selectedRoom?.name}
                    </Typography>
                    <Typography variant="caption" color="text.secondary" sx={{ mb: 1, display: 'block' }}>
                      Debug: Current User - ID: {currentUser?.id}, Role: {currentUser?.role}
                    </Typography>
                    <Typography variant="caption" color="text.secondary" sx={{ mb: 1, display: 'block' }}>
                      Debug: Current User - ID: {currentUser?.id}, Role: {currentUser?.role}
                    </Typography>
                    
                    {/* Show raw messages if processed messages are empty */}
                    {memoizedMessages.length === 0 && currentRoomMessages.length > 0 && (
                      <Box sx={{ p: 2, backgroundColor: 'yellow', borderRadius: 1, mb: 2 }}>
                        <Typography variant="body2" color="error">
                          ⚠️ WARNING: Raw messages exist ({currentRoomMessages.length}) but processed messages are empty!
                        </Typography>
                        <Typography variant="caption">
                          Raw messages: {JSON.stringify(currentRoomMessages.slice(0, 2))}
                        </Typography>
                      </Box>
                    )}
                    
                    {/* Show raw messages in basic format if processed messages are empty */}
                    {memoizedMessages.length === 0 && currentRoomMessages.length > 0 && (
                      <Box sx={{ p: 2, backgroundColor: 'lightblue', borderRadius: 1, mb: 2 }}>
                        <Typography variant="body2" color="primary">
                          🔧 TEMPORARY: Showing raw messages due to processing issue
                        </Typography>
                        {currentRoomMessages.map((msg, index) => (
                          <Box key={index} sx={{ 
                            p: 1, 
                            mb: 1, 
                            border: '1px solid #ccc', 
                            borderRadius: 1,
                            backgroundColor: 'white'
                          }}>
                            <Typography variant="caption" color="text.secondary">
                              {msg.sender_info?.name || msg.sender || 'Unknown'} ({msg.sender_info?.role || 'No Role'})
                            </Typography>
                            <Typography variant="body2">
                              {msg.content}
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                              {new Date(msg.timestamp).toLocaleTimeString()}
                            </Typography>
                          </Box>
                        ))}
                      </Box>
                    )}
                    

                    
                    {memoizedMessages.map((msg) => {
                      console.log('🔍 SystemChat - Rendering message:', msg);
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
                                      {formatMessageContent(msg.reply_to.content)}
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
                                      {formatMessageContent(msg.forwarded_from.content)}
                                    </Typography>
                                  </Box>
                                )}
                                
                                {/* File attachment */}
                                {msg.file && (
                                  <Box sx={{ 
                                    mb: 1, 
                                    p: 1, 
                                    backgroundColor: msg.isOwn ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)',
                                    borderRadius: 1,
                                    border: 1,
                                    borderColor: 'divider'
                                  }}>
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
                                      <IconButton
                                        size="small"
                                        onClick={() => downloadFile(msg.file!.id, msg.file!.name)}
                                      >
                                        <Download fontSize="small" />
                                      </IconButton>
                                    </Box>
                                  </Box>
                                )}
                                
                                {/* Message content with link detection */}
                                <Typography variant="body2">
                                  {formatMessageContent(msg.content)}
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
                    placeholder={replyToMessage ? `Reply to ${replyToMessage.senderName || replyToMessage.sender}...` : "Type your message..."}
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    onKeyPress={handleKeyPress}
                    size="small"
                  />
                  
                  <IconButton
                    color="primary"
                    onClick={handleSendMessage}
                    disabled={(!message.trim() && !selectedFile) || uploadingFile}
                  >
                    {uploadingFile ? <CircularProgress size={20} /> : <Send />}
                  </IconButton>
                </Box>
              </Box>
            </>
          ) : (
            <Box sx={{ p: 3, textAlign: 'center' }}>
              <Typography variant="body2" color="text.secondary">
                Select a chat room to start messaging
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

export default SystemChat; 