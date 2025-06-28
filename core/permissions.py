from rest_framework.permissions import BasePermission, SAFE_METHODS
from datetime import date

class SubscriptionAccessPermission(BasePermission):
    """
    - Allow full access if subscription is active.
    - Allow read-only for 7 days after expiry.
    - Block all access after 7 days (including login/logout).
    """
    def has_permission(self, request, view):
        user = request.user
        if not user.is_authenticated or not hasattr(user, 'school') or not user.school:
            return True  # Allow non-school users (e.g., super admin, system users)
        subscription = user.school.current_subscription
        today = date.today()
        if subscription and subscription.end_date >= today:
            return True  # Active subscription
        if subscription and subscription.end_date < today:
            days_since_expiry = (today - subscription.end_date).days
            if days_since_expiry <= 7:
                # Allow only read-only methods
                return request.method in SAFE_METHODS
            else:
                # Block all access
                return False
        return False  # No subscription, block access 