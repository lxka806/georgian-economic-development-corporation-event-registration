# GEDC Event Registration System

A full-stack event registration and administration platform developed for the **Georgian Economic Development Corporation (GEDC)**.

The platform was built to simplify the event registration process, allowing participants to register, provide their information, select event activities, and receive email verification. It also includes a dedicated admin panel for managing registrations and viewing participant information.

## About the Project

This project was developed for a GEDC business event in Georgia. It provides a centralized system for handling participant registrations and managing event-related information.

The platform consists of two main parts:

- **User Registration:** A public-facing registration platform where participants can submit their information and choose the sessions and activities they want to attend.
- **Admin Panel:** A dedicated administration interface for accessing and reviewing registration data and participant selections.

## Features

### User Platform
- Participant registration form
- Personal and business information collection
- Event and session selection
- Email verification using verification codes
- Registration confirmation
- Form validation and error handling
- Responsive user interface

### Admin Panel
- Dedicated admin authentication
- Admin registration page
- Protected admin routes
- View registered participants
- Access participant information
- Review selected sessions and events
- Centralized registration management

## Technology Stack

| Technology | Purpose |
|---|---|
| React.js | Frontend development |
| Tailwind CSS | Styling and responsive design |
| Node.js | Backend runtime |
| Express.js | REST API |
| MongoDB | Database |
| Mongoose | Database modeling |
| JavaScript | Application logic |
| Nodemailer | Email verification |
| Crypto | Secure verification code generation |

## Project Architecture

The application follows a client-server architecture:

- **Frontend:** React application responsible for the registration interface and admin dashboard.
- **Backend:** Express.js REST API responsible for authentication, registration processing, verification, and data management.
- **Database:** MongoDB stores participant information, event details, sessions, and registration data.
- **Email Service:** Handles registration verification emails.

## Registration Workflow

1. A participant opens the registration page.
2. The participant fills in the required personal and business information.
3. The participant selects available event sessions and activities.
4. The registration information is submitted to the backend.
5. An email verification code is sent to the participant.
6. After successful verification, the registration process is completed.
7. Administrators can access the submitted registration information through the admin panel.

## Security

- Protected administrative routes
- Server-side input validation
- Email verification
- Secure verification code generation
- Request rate limiting for verification endpoints
- Environment-based configuration
- CORS configuration

## Installation and Setup

### Prerequisites

- Node.js
- npm
- MongoDB database

### 1. Clone the repository

```bash
git clone YOUR_REPOSITORY_URL
cd YOUR_PROJECT_FOLDER
```

### 2. Backend Setup

```bash
cd backend
npm install
```

Create a `.env` file in the backend directory:

```env
PORT=5000
MONGO_URI=your_mongodb_connection_string
EMAIL_USER=your_email
EMAIL_PASS=your_email_app_password
```

Add any other environment variables required by your backend configuration.

Start the backend:

```bash
npm run dev
```

### 3. Frontend Setup

Open another terminal:

```bash
cd frontend
npm install
```

Start the frontend:

```bash
npm run dev
```

## Project Purpose

The main goal of this project was to develop a practical event management solution that reduces manual registration work and provides administrators with an organized way to manage participant information.

It combines modern frontend development, REST API architecture, database management, authentication, and email verification into one complete application.

---

**Developed by Luka Ivanishvili**

Full-Stack Developer

[GitHub](https://github.com/lxka806) · [GEDC Facebook](https://www.facebook.com/gedc.ge)
