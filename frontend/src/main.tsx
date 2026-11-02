import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import App from './App'
import { Dashboard } from './pages/Dashboard'
import { LoginPage } from './pages/auth/LoginPage'
import { RegisterPage } from './pages/auth/RegisterPage'
import { ProjectsList } from './pages/projects/ProjectsList'
import { ProjectCreate } from './pages/projects/ProjectCreate'
import { ProjectDetail } from './pages/projects/ProjectDetail'
import { InsightsPage } from './pages/InsightsPage'
import { HandoversPage } from './pages/HandoversPage'
import { SourcesPage } from './pages/sources/SourcesPage'
import { SettingsPage } from './pages/SettingsPage'
import { Header } from './components/Header'
import { Sidebar } from './components/Sidebar'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/projects" element={<ProjectsList />} />
        <Route path="/projects/create" element={<ProjectCreate />} />
        <Route path="/projects/:projectId" element={<ProjectDetail />} />
        <Route path="/insights" element={<InsightsPage />} />
        <Route path="/handovers" element={<HandoversPage />} />
        <Route path="/sources" element={<SourcesPage />} />
        <Route path="/settings" element={<SettingsPage />} />
        <Route path="*" element={<Dashboard />} />
      </Routes>
    </BrowserRouter>
  </React.StrictMode>,
)
