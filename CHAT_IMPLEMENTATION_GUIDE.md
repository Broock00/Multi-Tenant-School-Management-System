# Real-Time Chat Implementation Guide

## 🎯 Overview

This guide explains how to test and use the real-time chat functionality implemented for different user roles (teachers, students, secretaries, etc.) in the School Management Platform.

## 🏗️ Architecture

### Backend Components
- **WebSocket Consumer**: `chat/consumers.py` - Handles real-time messaging
- **API Views**: `chat/views.py` - REST API for chat rooms and messages
- **Models**: `chat/models.py` - Database models for rooms, messages, participants
- **Routing**: `school_management/routing.py` - WebSocket URL routing

### Frontend Components
- **Chat Component**: `frontend/src/pages/Chat.tsx` - Main chat interface
- **System Chat**: `frontend/src/pages/SystemChat.tsx` - Admin-specific chat
- **API Service**: `frontend/src/services/api.ts` - Chat API integration

## 🚀 Quick Start

### 1. Start the Backend Server
```bash
# From project root
python manage.py runserver
```

### 2. Start the Frontend
```bash
# From frontend directory
cd frontend
npm start
```

### 3. Start Redis (Required for WebSockets)
```bash
redis-server
```

## 🧪 Testing the Chat Functionality

### Option 1: Automated Testing Script
```bash
# Install required packages
pip install websocket-client requests

# Run the test script
python test_chat_functionality.py
```

### Option 2: Manual Browser Testing

#### Step 1: Login as Different Users
1. Open your browser and go to `http://localhost:3000`
2. Login as a **System Admin** in one browser/incognito window
3. Login as a **School Admin** in another browser/incognito window
4. Login as a **Teacher** in a third browser/incognito window

#### Step 2: Access Chat Pages
- **System Admin**: Navigate to "System Chat" (for admin-to-admin communication)
- **Other Roles**: Navigate to "Chat" (for general chat rooms)

#### Step 3: Test Real-Time Messaging
1. Select the same chat room in different browsers
2. Send messages from one browser
3. Verify messages appear in real-time in other browsers

## 👥 Role-Based Chat Access

### Available Room Types
- **Class**: Class-specific chat rooms
- **Staff**: Staff-only communication
- **Admin**: Administrative discussions
- **Parent-Teacher**: Parent-teacher communication
- **General**: General purpose chat

### Role Permissions

| Role | Allowed Room Types | Description |
|------|-------------------|-------------|
| Super Admin | admin, general, staff | Full access to all admin rooms |
| School Admin | admin, general, staff, class | Can access admin and class rooms |
| Teacher | class, staff, parent_teacher, general | Can access class and staff rooms |
| Student | class, general | Limited to class and general rooms |
| Parent | parent_teacher, general | Parent-teacher communication only |
| Secretary | staff, general | Staff and general communication |

## 🔧 Chat Features

### Real-Time Messaging
- ✅ WebSocket-based real-time communication
- ✅ Message persistence in database
- ✅ Fallback to REST API if WebSocket fails
- ✅ Message timestamps and sender information

### Room Management
- ✅ Role-based room filtering
- ✅ Tab-based room type organization
- ✅ Search functionality
- ✅ Unread message indicators

### User Interface
- ✅ Modern Material-UI design
- ✅ Responsive layout
- ✅ Message bubbles with sender info
- ✅ Loading states and error handling

## 🛠️ Troubleshooting

### Common Issues

#### 1. WebSocket Connection Failed
**Symptoms**: Messages not appearing in real-time
**Solutions**:
- Ensure Redis is running: `redis-server`
- Check Django server is running: `python manage.py runserver`
- Verify WebSocket URL in browser console

#### 2. No Chat Rooms Available
**Symptoms**: Empty chat room list
**Solutions**:
- Check user permissions and role
- Verify chat rooms exist in database
- Check API authentication

#### 3. Messages Not Sending
**Symptoms**: Send button disabled or messages not appearing
**Solutions**:
- Check user authentication
- Verify room permissions
- Check browser console for errors

### Debug Steps

1. **Check Browser Console**
   ```javascript
   // Open browser console and check for errors
   console.log('WebSocket status:', ws.readyState);
   ```

2. **Verify API Endpoints**
   ```bash
   # Test chat rooms API
   curl -H "Authorization: Bearer YOUR_TOKEN" \
        http://localhost:8000/api/v1/chat/rooms/
   ```

3. **Check WebSocket Connection**
   ```bash
   # Test WebSocket with wscat
   wscat -c "ws://localhost:8000/ws/chat/1/?token=YOUR_TOKEN"
   ```

## 📝 API Endpoints

### Chat Rooms
- `GET /api/v1/chat/rooms/` - List chat rooms
- `POST /api/v1/chat/rooms/` - Create chat room
- `POST /api/v1/chat/rooms/{id}/join/` - Join room
- `POST /api/v1/chat/rooms/{id}/leave/` - Leave room

### Messages
- `GET /api/v1/chat/messages/?room={room_id}` - Get messages
- `POST /api/v1/chat/messages/` - Send message
- `POST /api/v1/chat/messages/{id}/mark_read/` - Mark as read

### WebSocket
- `ws://localhost:8000/ws/chat/{room_id}/?token={token}` - Real-time messaging

## 🔒 Security Features

- **JWT Authentication**: All API calls require valid JWT tokens
- **Role-Based Access**: Users can only access rooms they're authorized for
- **WebSocket Authentication**: WebSocket connections require valid tokens
- **Message Validation**: Messages are validated before saving

## 🎨 Customization

### Adding New Room Types
1. Update `chat/models.py` RoomType choices
2. Update `chat/views.py` filtering logic
3. Update frontend `getAllowedRoomTypes()` function

### Styling Changes
- Modify `frontend/src/pages/Chat.tsx` for UI changes
- Update Material-UI theme in `frontend/src/App.tsx`

## 📊 Monitoring

### Log Files
- Django logs: Check console output
- Frontend logs: Browser console
- WebSocket logs: Django console

### Performance
- Monitor WebSocket connections
- Check message delivery rates
- Monitor database query performance

## 🚀 Production Deployment

### Requirements
- Redis server for WebSocket support
- PostgreSQL for database
- Proper SSL certificates for WSS
- Load balancer configuration

### Environment Variables
```bash
REDIS_HOST=your-redis-host
REDIS_PORT=6379
DEBUG=False
ALLOWED_HOSTS=your-domain.com
```

## 📚 Additional Resources

- [Django Channels Documentation](https://channels.readthedocs.io/)
- [WebSocket API Documentation](https://developer.mozilla.org/en-US/docs/Web/API/WebSocket)
- [Material-UI Components](https://mui.com/components/)

## 🤝 Contributing

To improve the chat functionality:
1. Test thoroughly with different user roles
2. Add new features incrementally
3. Maintain backward compatibility
4. Update documentation for any changes

---

**Happy Chatting! 🎉** 