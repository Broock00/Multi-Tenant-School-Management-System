from django.shortcuts import render
from rest_framework import generics, permissions
from .models import SystemSettings
from .serializers import SystemSettingsSerializer
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAdminUser
from rest_framework.response import Response
from rest_framework import status
from django.http import FileResponse, Http404

# Create your views here.

class SystemSettingsView(generics.RetrieveUpdateAPIView):
    queryset = SystemSettings.objects.all()
    serializer_class = SystemSettingsSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_object(self):
        return SystemSettings.get_solo()

    def put(self, request, *args, **kwargs):
        if not request.user.is_superuser:
            from rest_framework.response import Response
            return Response({'detail': 'Only super admins can update settings.'}, status=403)
        return super().put(request, *args, **kwargs)

    def patch(self, request, *args, **kwargs):
        if not request.user.is_superuser:
            from rest_framework.response import Response
            return Response({'detail': 'Only super admins can update settings.'}, status=403)
        return super().patch(request, *args, **kwargs)

@api_view(['GET'])
@permission_classes([IsAdminUser])
def download_latest_backup(request):
    settings_obj = SystemSettings.get_solo()
    latest_file = settings_obj.get_latest_backup_file()
    if not latest_file:
        return Response({'detail': 'No backup file found.'}, status=status.HTTP_404_NOT_FOUND)
    try:
        return FileResponse(open(latest_file, 'rb'), as_attachment=True)
    except Exception:
        raise Http404('Backup file not found.')
