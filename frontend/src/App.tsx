import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { ProtectedRoute } from './components/ProtectedRoute';
import Layout from './components/Layout/Layout';
import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';
import PatientsPage from './pages/PatientsPage';
import DoctorsPage from './pages/DoctorsPage';
import SuppliersPage from './pages/SuppliersPage';
import MaterialsPage from './pages/MaterialsPage';
import ProceduresPage from './pages/ProceduresPage';
import WorkflowPage from './pages/WorkflowPage';
import WorkflowDetailPage from './pages/WorkflowDetailPage';
import UsersPage from './pages/UsersPage';
import AuditPage from './pages/AuditPage';
import ReportsPage from './pages/ReportsPage';
import PatientFilesPage from './pages/PatientFilesPage';

export default function App() {
  return (
    <BrowserRouter basename="/SGP">
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route
            path="/"
            element={
              <ProtectedRoute>
                <Layout />
              </ProtectedRoute>
            }
          >
            <Route index element={<Navigate to="/dashboard" replace />} />
            <Route path="dashboard" element={<DashboardPage />} />
            <Route path="patients" element={<PatientsPage />} />
            <Route path="patients/:patientId/files" element={<PatientFilesPage />} />
            <Route path="doctors" element={<DoctorsPage />} />
            <Route path="suppliers" element={<SuppliersPage />} />
            <Route path="materials" element={<MaterialsPage />} />
            <Route path="procedures" element={<ProceduresPage />} />
            <Route path="workflows" element={<WorkflowPage />} />
            <Route path="workflows/:id" element={<WorkflowDetailPage />} />
            <Route path="users" element={<UsersPage />} />
            <Route path="audit" element={<AuditPage />} />
            <Route path="reports" element={<ReportsPage />} />
            {/* /files redirects to patients so user can pick a patient */}
            <Route path="files" element={<Navigate to="/patients" replace />} />
          </Route>
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}
