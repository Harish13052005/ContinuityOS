import { Outlet } from 'react-router-dom'
import { Header } from '../components/Header'
import { Sidebar } from '../components/Sidebar'

export const AuthLayout = () => {
  return (
    <div className="min-h-screen bg-slate-50">
      <Header />
      <div className="flex">
        <Sidebar />
        <div className="flex-1 p-6 sm:p-8">
          <Outlet />
        </div>
      </div>
    </div>
  )
}

export const AuthenticatedLayout = () => {
  return (
    <div className="min-h-screen bg-slate-50">
      <Header />
      <div className="flex">
        <Sidebar />
        <div className="flex-1 p-6 sm:p-8">
          <Outlet />
        </div>
      </div>
    </div>
  )
}