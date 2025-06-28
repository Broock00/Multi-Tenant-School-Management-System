from django.utils.deprecation import MiddlewareMixin
from django.http import JsonResponse
from core.models import SystemSettings

class MaintenanceModeMiddleware(MiddlewareMixin):
    def process_request(self, request):
        settings = SystemSettings.get_solo()
        allowed_paths = [
            '/api/v1/auth/login',
            '/api/v1/auth/login/',
            '/admin/login',
            '/admin/login/',
            '/api/v1/auth/token/refresh',
            '/api/v1/auth/token/refresh/',
            '/api/v1/auth/users/profile',
            '/api/v1/auth/users/profile/',
            '/api/v1/core/system-settings/',
            '/static/',
            '/media/',
        ]
        bypass_usernames = settings.get_bypass_usernames()
        user_is_bypass = (
            request.user.is_authenticated and (
                request.user.is_superuser or
                request.user.username in bypass_usernames or
                (hasattr(request.user, 'email') and request.user.email in bypass_usernames)
            )
        )
        if settings.maintenance_mode:
            if user_is_bypass:
                return None
            if not any(request.path.startswith(path) for path in allowed_paths):
                return JsonResponse({
                    'detail': 'The system is currently under maintenance. Please try again later.'
                }, status=503)
        return None


class SessionTimeoutMiddleware(MiddlewareMixin):
    def process_request(self, request):
        if request.user.is_authenticated:
            settings = SystemSettings.get_solo()
            timeout = settings.session_timeout * 60  # minutes to seconds
            request.session.set_expiry(timeout)
        return None