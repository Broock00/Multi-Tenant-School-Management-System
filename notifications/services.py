import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from django.conf import settings
from django.core.mail import send_mail
from django.template.loader import render_to_string
import logging
from core.models import SystemSettings

logger = logging.getLogger(__name__)

class EmailService:
    """Service for sending email notifications"""
    
    @staticmethod
    def send_subscription_notification(action, subscription, school):
        """
        Send email notification for subscription events
        
        Args:
            action (str): The action performed (created, updated, cancelled, expiring, expired)
            subscription (dict): Subscription details
            school (dict): School details including principal_email
        """
        if not SystemSettings.email_enabled():
            logger.info(f"Email notification skipped for {school.get('principal_email')} (email notifications are OFF)")
            return False
        try:
            subject = f"Subscription {action.title()} - {school.get('name', 'School')}"
            
            # Create email content
            context = {
                'action': action,
                'subscription': subscription,
                'school': school,
                'subject': subject,
            }
            
            # Render email template
            html_content = render_to_string('notifications/subscription_email.html', context)
            text_content = render_to_string('notifications/subscription_email.txt', context)
            
            # Send email
            send_mail(
                subject=subject,
                message=text_content,
                from_email=settings.DEFAULT_FROM_EMAIL,
                recipient_list=[school.get('principal_email')],
                html_message=html_content,
                fail_silently=False,
            )
            
            logger.info(f"Email notification sent to {school.get('principal_email')} for subscription {action}")
            return True
            
        except Exception as e:
            logger.error(f"Failed to send email notification: {str(e)}")
            return False
    
    @staticmethod
    def send_subscription_expiry_warning(subscription, school, days_remaining):
        """
        Send warning email for expiring subscriptions
        
        Args:
            subscription (dict): Subscription details
            school (dict): School details
            days_remaining (int): Days until expiration
        """
        if not SystemSettings.email_enabled():
            logger.info(f"Expiry warning skipped for {school.get('principal_email')} (email notifications are OFF)")
            return False
        try:
            subject = f"Subscription Expiring Soon - {school.get('name', 'School')}"
            
            context = {
                'action': 'expiring',
                'subscription': subscription,
                'school': school,
                'days_remaining': days_remaining,
                'subject': subject,
            }
            
            html_content = render_to_string('notifications/subscription_expiry_warning.html', context)
            text_content = render_to_string('notifications/subscription_expiry_warning.txt', context)
            
            send_mail(
                subject=subject,
                message=text_content,
                from_email=settings.DEFAULT_FROM_EMAIL,
                recipient_list=[school.get('principal_email')],
                html_message=html_content,
                fail_silently=False,
            )
            
            logger.info(f"Expiry warning sent to {school.get('principal_email')} - {days_remaining} days remaining")
            return True
            
        except Exception as e:
            logger.error(f"Failed to send expiry warning: {str(e)}")
            return False
    
    @staticmethod
    def send_subscription_expired_notification(subscription, school):
        """
        Send notification for expired subscriptions
        
        Args:
            subscription (dict): Subscription details
            school (dict): School details
        """
        if not SystemSettings.email_enabled():
            logger.info(f"Expired notification skipped for {school.get('principal_email')} (email notifications are OFF)")
            return False
        try:
            subject = f"Subscription Expired - {school.get('name', 'School')}"
            
            context = {
                'action': 'expired',
                'subscription': subscription,
                'school': school,
                'subject': subject,
            }
            
            html_content = render_to_string('notifications/subscription_expired.html', context)
            text_content = render_to_string('notifications/subscription_expired.txt', context)
            
            send_mail(
                subject=subject,
                message=text_content,
                from_email=settings.DEFAULT_FROM_EMAIL,
                recipient_list=[school.get('principal_email')],
                html_message=html_content,
                fail_silently=False,
            )
            
            logger.info(f"Expired notification sent to {school.get('principal_email')}")
            return True
            
        except Exception as e:
            logger.error(f"Failed to send expired notification: {str(e)}")
            return False 