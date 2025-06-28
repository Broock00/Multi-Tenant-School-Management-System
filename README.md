# Multi-Tenant School Management Platform

A comprehensive school management system built with Django (backend) and React (frontend) that supports multiple schools with role-based access control, subscription management, and real-time notifications.

## 🚀 Features

### Core Features
- **Multi-tenant Architecture**: Support for multiple schools with isolated data
- **Role-based Access Control**: Super Admin, School Admin, Teacher, Student, Parent, Secretary roles
- **Subscription Management**: Plan-based subscriptions with expiry tracking
- **Real-time Notifications**: Announcements and system notifications
- **Student Management**: Enrollment, profiles, parent relationships
- **Class Management**: Classes, assignments, submissions
- **Exam Management**: Exam creation, scheduling, and results
- **Fee Management**: Fee collection, scholarships, reminders
- **Chat System**: Real-time messaging between users
- **Analytics Dashboard**: Comprehensive reporting and analytics

### Technical Features
- **Django REST API**: Robust backend with JWT authentication
- **React Frontend**: Modern UI with Material-UI components
- **WebSocket Support**: Real-time communication
- **File Upload**: Support for documents and images
- **Export Functionality**: Excel and PDF reports
- **Email Notifications**: Automated email alerts
- **Database**: PostgreSQL with tenant isolation

## 🛠️ Technology Stack

### Backend
- **Django 4.2.23**: Web framework
- **Django REST Framework 3.14.0**: API framework
- **Django Tenants 3.5.0**: Multi-tenancy support
- **Django Channels 4.0.0**: WebSocket support
- **Celery 5.3.4**: Background task processing
- **Redis 5.0.1**: Caching and message broker
- **PostgreSQL**: Database (with psycopg2-binary)
- **JWT Authentication**: Secure API access

### Frontend
- **React 19.1.0**: UI library
- **TypeScript 4.9.5**: Type safety
- **Material-UI 7.1.2**: Component library
- **React Router 7.6.2**: Navigation
- **Axios 1.10.0**: HTTP client
- **React Scripts 5.0.1**: Build tools

## 📋 Prerequisites

- Python 3.8+
- Node.js 16+
- PostgreSQL 12+
- Redis 6+
- Git

## 🚀 Installation

### 1. Clone the Repository
```bash
git clone <repository-url>
cd Multi-Tenant-School-Management-Platform
```

### 2. Backend Setup

#### Create Virtual Environment
```bash
python -m venv venv
# On Windows
venv\Scripts\activate
# On macOS/Linux
source venv/bin/activate
```

#### Install Dependencies
```bash
pip install -r requirements.txt
```

#### Database Setup
1. Create PostgreSQL database
2. Update database settings in `school_management/settings.py`
3. Run migrations:
```bash
python manage.py migrate
```

#### Create Superuser
```bash
python manage.py createsuperuser
```

#### Setup Demo Data (Optional)
```bash
python manage.py setup_demo_user
python manage.py setup_test_data
```

### 3. Frontend Setup

#### Navigate to Frontend Directory
```bash
cd frontend
```

#### Install Dependencies
```bash
npm install
```

#### Start Development Server
```bash
npm start
```

## 🏃‍♂️ Running the Application

### Backend Development Server
```bash
# From project root
python manage.py runserver
```
Backend will be available at `http://localhost:8000`

### Frontend Development Server
```bash
# From frontend directory
npm start
```
Frontend will be available at `http://localhost:3000`

### Redis Server (Required for WebSockets and Celery)
```bash
redis-server
```

### Celery Worker (Optional - for background tasks)
```bash
celery -A school_management worker -l info
```

## 📁 Project Structure

```
Multi-Tenant School Management Platform/
├── core/                   # Core functionality and shared models
├── schools/               # School and subscription management
├── users/                 # User management and authentication
├── students/              # Student and parent management
├── classes/               # Class and assignment management
├── exams/                 # Exam management
├── fees/                  # Fee management
├── notifications/         # Notifications and announcements
├── chat/                  # Real-time chat system
├── frontend/              # React frontend application
├── school_management/     # Django project settings
├── static/                # Static files
├── requirements.txt       # Python dependencies
└── manage.py             # Django management script
```

## 🔐 User Roles and Permissions

### Super Admin
- Manage all schools and users
- Create system-wide announcements
- Access to all features across all schools

### School Admin
- Manage school-specific data
- Create school announcements
- Manage teachers, students, and classes
- Access to school analytics

### Teacher
- Manage assigned classes
- Create assignments and exams
- Grade submissions
- Communicate with students and parents

### Student
- View assigned classes and assignments
- Submit assignments
- View grades and exam results
- Access school announcements

### Parent
- View child's academic progress
- Access fee information
- Receive notifications about child

### Secretary
- Manage administrative tasks
- Handle fee collection
- Generate reports

## 🔧 Configuration

### Environment Variables
Create a `.env` file in the project root:

```env
DEBUG=True
SECRET_KEY=your-secret-key
DATABASE_URL=postgresql://user:password@localhost:5432/dbname
REDIS_URL=redis://localhost:6379/0
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_HOST_USER=your-email@gmail.com
EMAIL_HOST_PASSWORD=your-app-password
```

### Database Configuration
Update `school_management/settings.py` with your database credentials.

## 📚 API Documentation

The API documentation is available at:
- Swagger UI: `http://localhost:8000/swagger/`
- ReDoc: `http://localhost:8000/redoc/`

## 🧪 Testing

### Backend Tests
```bash
python manage.py test
```

### Frontend Tests
```bash
cd frontend
npm test
```

## 📦 Deployment

### Production Build
```bash
# Frontend
cd frontend
npm run build

# Backend
python manage.py collectstatic
python manage.py migrate
```

### Docker (Optional)
Docker configuration can be added for containerized deployment.

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests for new functionality
5. Submit a pull request

## 📄 License

This project is licensed under the MIT License.

## 🆘 Support

For support and questions:
- Create an issue in the repository
- Contact the development team

## 🔄 Version History

- **v1.0.0**: Initial release with core features
- Multi-tenant architecture
- Role-based access control
- Subscription management
- Real-time notifications
- Student and class management
- Fee management system
- Chat functionality
- Analytics dashboard

---

**Note**: This is a comprehensive school management platform designed for educational institutions. Make sure to configure it according to your specific requirements and security policies. 