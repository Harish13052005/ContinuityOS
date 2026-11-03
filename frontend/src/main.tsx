import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import App from './App'
import { AuthProvider } from './lib/auth'
import { Dashboard } from './pages/Dashboard'
import { LoginPage } from './pages/auth/LoginPage'
import { RegisterPage } from './pages/auth/RegisterPage'
import { ProjectsList } from './pages/projects/ProjectsList'
import { ProjectCreate } from './pages/projects/ProjectCreate'
import { ProjectDetail } from './pages/projects/ProjectDetail'
import { InsightsPage } from './pages/InsightsPage'
import { ReviewPage } from './pages/ReviewPage'
import { SourcesHubPage } from './pages/SourcesHubPage'
import { HandoversPage } from './pages/HandoversPage'
import { HandoverDetailPage } from './pages/handovers/HandoverDetailPage'
import { SourcesPage } from './pages/sources/SourcesPage'
import { SettingsPage } from './pages/SettingsPage'
import './index.css'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route element={<App />}>
            <Route path="/" element={<Dashboard />} />
            <Route path="/projects" element={<ProjectsList />} />
            <Route path="/projects/create" element={<ProjectCreate />} />
            <Route path="/projects/:projectId" element={<ProjectDetail />} />
            <Route path="/projects/:projectId/sources" element={<SourcesPage />} />
            <Route path="/sources" element={<SourcesHubPage />} />
            <Route path="/knowledge" element={<InsightsPage />} />
            <Route path="/insights" element={<Navigate to="/knowledge" replace />} />
            <Route path="/review" element={<ReviewPage />} />
            <Route path="/handovers" element={<HandoversPage />} />
            <Route path="/handovers/:handoverId" element={<HandoverDetailPage />} />
            <Route path="/settings" element={<SettingsPage />} />
          </Route>
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  </React.StrictMode>,
)
