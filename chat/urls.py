from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    ChatRoomViewSet, MessageViewSet, NotificationViewSet, BulkMessageViewSet
)

router = DefaultRouter()
router.register(r'rooms', ChatRoomViewSet, basename='chatroom')
router.register(r'messages', MessageViewSet, basename='message')
router.register(r'notifications', NotificationViewSet, basename='notification')
router.register(r'bulk', BulkMessageViewSet, basename='bulkmessage')

urlpatterns = [
    path('', include(router.urls)),
    # File upload endpoint
    path('files/upload/', MessageViewSet.as_view({'post': 'upload_file'}), name='chat-file-upload'),
] 