import { Navigate, Route, Routes } from 'react-router-dom';
import { ProtectedRoute } from './components/ProtectedRoute';
import { useAuth } from './contexts/AuthContext';
import { AdminClassesPage } from './pages/AdminClassesPage';
import { AdminStudentsPage } from './pages/AdminStudentsPage';
import { AdminUsersPage } from './pages/AdminUsersPage';
import { AdminYearPage } from './pages/AdminYearPage';
import { AttendancePage } from './pages/AttendancePage';
import { LoginPage } from './pages/LoginPage';
import { TeacherClassPage } from './pages/TeacherClassPage';
import { TeacherHomePage } from './pages/TeacherHomePage';

function HomeRedirect(){const{user}=useAuth();return <Navigate to={user?.role==='ADMIN'?'/admin/classes':user?'/teacher':'/login'} replace/>}
export default function App(){return <Routes><Route path="/login" element={<LoginPage/>}/><Route element={<ProtectedRoute role="TEACHER"/>}><Route path="/teacher" element={<TeacherHomePage/>}/><Route path="/teacher/classes/:classId" element={<TeacherClassPage/>}/><Route path="/teacher/classes/:classId/attendance" element={<AttendancePage/>}/></Route><Route element={<ProtectedRoute role="ADMIN"/>}><Route path="/admin/classes" element={<AdminClassesPage/>}/><Route path="/admin/students" element={<AdminStudentsPage/>}/><Route path="/admin/users" element={<AdminUsersPage/>}/><Route path="/admin/year" element={<AdminYearPage/>}/></Route><Route path="*" element={<HomeRedirect/>}/></Routes>}
