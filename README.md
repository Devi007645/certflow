# CertFlow - Certificate Tracking Project

CertFlow is a professional credential tracking application designed to help employees manage their certifications and administrators review them. This project has been developed from a basic template into a functional application with a complete authentication flow and database integration.

## 🚀 Key Achievements & Features Implemented

Here is a summary of what has been accomplished in this project:

### 1. Authentication & User Management
- **Supabase Integration**: Connected the application to Supabase for secure user authentication and persistent data storage.
- **Enterprise-Level Email Validation**: Added strict validation rules for email inputs to ensure professional email usage.
- **Password Strength Indicator**: Implemented a visual strength bar that updates in real-time as users type their password.
- **Flow Improvements**: Ensured that login forms are cleared correctly after a successful sign-up and state is managed properly across sessions.

### 2. Role-Based Access Control (RBAC)
- **Role Differentiation**: Created distinct experiences for 'Employees' and 'Administrators'.
- **Restricted Access**: Ensured that employees can only view and manage their own records ("My Records"), while the "Review Center" is strictly reserved for Admins.
- **Dynamic Navigation**: The navigation bar adapts based on the logged-in user's role and is hidden for unauthenticated users.

### 3. Certificate Tracking & Submission
- **Comprehensive Forms**: Users can add certifications with fields for Title, Issuing Organization, Issue Date, and Probable Completion Time.
- **Document Uploads**: Supported optional document uploads (restricted to 5MB and stored as base64 strings).
- **Status Tracking**: Implemented logic to handle different certification statuses, including handling "delayed" status based on completion time.

### 4. UI/UX Enhancements
- **Professional Design**: Used curated color palettes and modern layout practices to create a premium feel.
- **Document Viewer Popup**: Added a modal to preview uploaded certificate documents directly within the application without downloading.
- **Interactive Header**: Connected the "CertFlow" logo to function as a home link and organized the top-right corner with relevant actions (Log out, New Sign up) depending on the auth state.

## 🛠️ Tech Stack
- **Frontend**: React, TypeScript, Vite
- **Styling**: Vanilla CSS (Tailored for a modern, responsive UI)
- **Backend**: Supabase (Database & Authentication)

## 🚦 How to Run the Project

### Prerequisites
- Node.js (v16+ recommended)

### Setup
1. Install dependencies:
   ```bash
   npm install
   ```
2. Run the development server:
   ```bash
   npm run dev
   ```

The application will be available at the local address provided by Vite (usually `http://localhost:5173`).
