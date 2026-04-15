import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { ThemeProvider } from './contexts/ThemeContext';
import { NotificationProvider } from './contexts/NotificationContext';
import { Layout } from './components/layout/Layout';
import { ProtectedRoute } from './components/layout/ProtectedRoute';

// Pages
import { LoginPage } from './pages/LoginPage';
import { DashboardPage } from './pages/DashboardPage';
import { BeneficiairesPage } from './pages/BeneficiairesPage';
import { AddBeneficiairePage } from './pages/AddBeneficiairePage';
import { EditBeneficiairePage } from './pages/EditBeneficiairePage';
import { ImportPage } from './pages/ImportPage';
import { PendingActionsPage } from './pages/PendingActionsPage';
import { UsersPage } from './pages/UsersPage';
import { AuditLogPage } from './pages/AuditLogPage';
import { ProfilePage } from './pages/ProfilePage';
import { MyRequestsPage } from './pages/MyRequestsPage';
import { NotFoundPage } from './pages/NotFoundPage';

export default function App() {
  return (
    <ThemeProvider>
      <NotificationProvider>
        <AuthProvider>
          <Router>
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
                <Route index element={<DashboardPage />} />
                <Route path="beneficiaires" element={<BeneficiairesPage />} />
                <Route path="beneficiaires/add" element={<AddBeneficiairePage />} />
                <Route path="beneficiaires/edit/:id" element={<EditBeneficiairePage />} />
                <Route path="import" element={<ImportPage />} />
                <Route path="profile" element={<ProfilePage />} />
                <Route path="requests" element={<MyRequestsPage />} />
                
                {/* Admin only routes */}
                <Route
                  path="pending"
                  element={
                    <ProtectedRoute requireAdmin>
                      <PendingActionsPage />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="users"
                  element={
                    <ProtectedRoute requireAdmin>
                      <UsersPage />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="audit"
                  element={
                    <ProtectedRoute requireAdmin>
                      <AuditLogPage />
                    </ProtectedRoute>
                  }
                />
                
                <Route path="*" element={<NotFoundPage />} />
              </Route>
            </Routes>
          </Router>
        </AuthProvider>
      </NotificationProvider>
    </ThemeProvider>
  );
}
