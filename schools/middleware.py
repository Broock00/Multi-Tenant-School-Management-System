from django.utils.deprecation import MiddlewareMixin
from django.utils import timezone
from django.http import JsonResponse
from schools.models import School, Subscription
from users.models import User

class SubscriptionEnforcementMiddleware(MiddlewareMixin):
    """
    Enforce read-only or lockout for users based on their school's subscription status.
    - Read-only for 7 days after expiration.
    - Full lockout after 7 days.
    - Super admins are exempt.
    """
    def process_view(self, request, view_func, view_args, view_kwargs):
        user = getattr(request, 'user', None)
        if not user or not user.is_authenticated:
            return None
        if getattr(user, 'role', None) == User.UserRole.SUPER_ADMIN:
            return None  # Super admins are always allowed
        school = getattr(user, 'school', None)
        if not school:
            return None
        subscription = school.current_subscription
        if not subscription:
            return None
        today = timezone.now().date()
        # DEBUG LOGGING
        print(f"[SUBSCRIPTION DEBUG] user={user.username}, role={getattr(user, 'role', None)}, school={school.name}, subscription_status={subscription.status}, end_date={subscription.end_date}, today={today}")
        if subscription.status == Subscription.Status.EXPIRED:
            days_since_expiry = (today - subscription.end_date).days
            print(f"[SUBSCRIPTION DEBUG] days_since_expiry={days_since_expiry}")
            if days_since_expiry <= 7:
                # Read-only mode: only allow safe methods
                if request.method not in ('GET', 'HEAD', 'OPTIONS'):
                    print(f"[SUBSCRIPTION DEBUG] Blocking unsafe method {request.method} in read-only mode.")
                    return JsonResponse({'detail': 'Your subscription has expired. You are in read-only mode for 7 days.'}, status=403)
            else:
                print(f"[SUBSCRIPTION DEBUG] Blocking all access: lockout mode.")
                # Lockout: block all access
                return JsonResponse({'detail': 'Your subscription expired more than 7 days ago. Please renew to regain access.'}, status=403)
        elif subscription.status == Subscription.Status.CANCELLED:
            print(f"[SUBSCRIPTION DEBUG] Blocking access: subscription is {subscription.status}.")
            return JsonResponse({'detail': f'Your subscription is {subscription.status}. Please contact support.'}, status=403)
        elif subscription.status == Subscription.Status.PENDING:
            print(f"[SUBSCRIPTION DEBUG] Blocking access: subscription is pending.")
            # Optionally block or restrict pending subscriptions
            return JsonResponse({'detail': 'Your subscription is pending. Please wait for activation.'}, status=403)
        return None 