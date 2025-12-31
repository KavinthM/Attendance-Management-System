# Smart Alert - Frontend

This is the frontend application for the Smart Alert School Management System.

## Features

- **Student Management**: Add, edit, delete, and view students
- **Attendance Marking**: Mark attendance for different sections
- **Attendance Records**: View and manage all attendance records with filtering
- **Parent Portal**: Read-only view of all attendance records for parents
- **WhatsApp Notifications**: Send notifications to parents for absent/late students

## Getting Started

### Prerequisites

- Node.js (version 14 or higher)
- npm or yarn

### Installation

1. Navigate to the frontend directory:
   ```bash
   cd FRONTEND
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Create a `.env` file in the frontend directory with:
   ```
   REACT_APP_API_BASE_URL=http://localhost:5002
   ```

4. Start the development server:
   ```bash
   npm start
   ```

The application will open at [http://localhost:3000](http://localhost:3000).

## Available Scripts

- `npm start` - Runs the app in development mode
- `npm build` - Builds the app for production
- `npm test` - Launches the test runner
- `npm eject` - Ejects from Create React App (one-way operation)

## Project Structure

```
src/
├── api/
│   └── client.js          # API client for backend communication
├── components/
│   ├── AttendanceRow.jsx  # Component for attendance table rows
│   ├── Layout.jsx         # Main layout wrapper
│   ├── Navbar.jsx         # Navigation component
│   ├── Select.jsx         # Reusable select component
│   └── StudentForm.jsx    # Student form component
├── pages/
│   ├── Attendance.jsx     # Attendance marking page
│   ├── AttendanceRecords.jsx # Records management page
│   ├── ParentView.jsx     # Parent portal page
│   └── Students.jsx       # Student management page
├── utils/
│   └── statusOptions.js   # Attendance status options
├── App.js                 # Main app component
├── index.js               # Entry point
└── index.css              # Additional styles
```

## API Integration

The frontend communicates with the backend API running on port 5002. Make sure the backend server is running before starting the frontend.

## Technologies Used

- React 18
- React Router DOM
- Axios for API calls
- Day.js for date handling
- CSS3 with custom properties
- Font Awesome icons

## Browser Support

- Chrome (latest)
- Firefox (latest)
- Safari (latest)
- Edge (latest)
