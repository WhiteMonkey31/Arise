import React from 'react'
import AppRoutes from './router'
import ToastProvider from './components/ui/ToastProvider'
import './App.css'

export default function App(){
  return (
    <div className="app-root">
      <AppRoutes />
      <ToastProvider />
    </div>
  )
}
