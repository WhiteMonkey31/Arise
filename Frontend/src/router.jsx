import React from 'react'
import { Routes, Route, BrowserRouter, Navigate } from 'react-router'
import AppLayout from './components/layout/AppLayout'
import AuthLayout from './components/layout/AuthLayout'
import WorkspaceLayout from './components/layout/WorkspaceLayout'
import AuthGuard from './components/layout/AuthGuard'

import LandingPage from './pages/LandingPage'
import Dashboard from './pages/Dashboard'
import Analytics from './pages/Analytics'
import CapabilityLibrary from './pages/CapabilityLibrary'
import Portfolio from './pages/Portfolio'
import Login from './pages/auth/Login'
import Register from './pages/auth/Register'
import WorkspaceOverview from './pages/workspace/WorkspaceOverview'
import CompliancePage from './pages/workspace/CompliancePage'
import ProposalPage from './pages/workspace/ProposalPage'
import UploadRFP from './pages/workspace/UploadRFP'
import WinScorePage from './pages/workspace/WinScorePage'

export default function AppRoutes(){
  return (
    <BrowserRouter>
      <Routes>
        {/* Public Routes */}
        <Route path="/" element={<LandingPage />} />
        <Route path="/login" element={<AuthLayout><Login/></AuthLayout>} />
        <Route path="/register" element={<AuthLayout><Register/></AuthLayout>} />

        {/* Protected App Routes */}
        <Route element={<AuthGuard><AppLayout/></AuthGuard>}>
          <Route path="/dashboard" element={<Dashboard/>} />
          <Route path="/analytics" element={<Analytics/>} />
          <Route path="/capabilities" element={<CapabilityLibrary/>} />
          <Route path="/portfolio" element={<Portfolio/>} />

          <Route path="/workspace/:workspaceId" element={<WorkspaceLayout/>}>
            <Route index element={<WorkspaceOverview/>} />
            <Route path="overview" element={<WorkspaceOverview/>} />
            <Route path="compliance" element={<CompliancePage/>} />
            <Route path="proposal" element={<ProposalPage/>} />
            <Route path="upload" element={<UploadRFP/>} />
            <Route path="winscore" element={<WinScorePage/>} />
          </Route>
        </Route>

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}
