import React from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import AppRoutes from './router'
import ToastProvider from './components/ui/ToastProvider'
import './App.css'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
})

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <div className="h-full w-full">
        <AppRoutes />
        <ToastProvider />
      </div>
    </QueryClientProvider>
  )
}
