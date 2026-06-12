import React from 'react'
import { Outlet } from 'react-router'
import TopBar from './TopBar'
import Sidebar from './Sidebar'

export default function AppLayout() {
  return (
    <div className="min-h-screen flex w-screen overflow-x-hidden bg-(--bg)/55 fade-in">
      {/* Navigation Sidebar */}
      <Sidebar />
      
      {/* Main Workspace Frame */}
      <div className="flex-1 h-screen min-w-0 flex flex-col p-4 md:p-5 relative z-10">
        <TopBar />
        <main className="mt-2 flex-1 items-center justify-between">
          <Outlet />
        </main>
      </div>
    </div>
  )

}