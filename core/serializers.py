from rest_framework import serializers
from .models import SystemSettings

class SystemSettingsSerializer(serializers.ModelSerializer):
    latest_backup_file = serializers.SerializerMethodField(read_only=True)

    class Meta:
        model = SystemSettings
        fields = '__all__'
        read_only_fields = ['latest_backup_file']
        extra_kwargs = {field: {'required': False} for field in fields if field != 'latest_backup_file'}

    def get_latest_backup_file(self, obj):
        return obj.get_latest_backup_file() 