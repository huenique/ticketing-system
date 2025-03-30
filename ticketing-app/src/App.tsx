import { Routes, Route } from "react-router-dom"
import { DashboardLayout } from "./components/dashboard-layout"
import Dashboard from "./pages/Dashboard"
import Tickets from "./pages/Tickets"
import Users from "./pages/Users"
import Settings from "./pages/Settings"
import Logout from "./pages/Logout"
import NotFound from "./pages/NotFound"

function App() {
  return (
    <Routes>
      <Route 
        path="/" 
        element={
          <DashboardLayout>
            <Dashboard />
          </DashboardLayout>
        } 
      />
      <Route 
        path="/tickets" 
        element={
          <DashboardLayout>
            <Tickets />
          </DashboardLayout>
        } 
      />
      <Route 
        path="/users" 
        element={
          <DashboardLayout>
            <Users />
          </DashboardLayout>
        } 
      />
      <Route 
        path="/settings" 
        element={
          <DashboardLayout>
            <Settings />
          </DashboardLayout>
        } 
      />
      <Route path="/logout" element={<Logout />} />
      <Route path="*" element={<NotFound />} />
    </Routes>
  )
}

// Dashboard card component for displaying statistics
interface DashboardCardProps {
  title: string
  value: string
  description: string
}

function DashboardCard({ title, value, description }: DashboardCardProps) {
  return (
    <div className="rounded-lg border bg-white p-6 shadow-sm">
      <h3 className="text-sm font-medium text-neutral-500">{title}</h3>
      <p className="mt-2 text-3xl font-bold">{value}</p>
      <p className="mt-1 text-xs text-neutral-500">{description}</p>
    </div>
  )
}

// Activity item component for recent activity section
interface ActivityItemProps {
  title: string
  description: string
  timestamp: string
}

function ActivityItem({ title, description, timestamp }: ActivityItemProps) {
  return (
    <div className="flex items-start space-x-4 rounded-md border border-transparent px-2 py-3 hover:bg-neutral-50">
      <div className="flex-1 space-y-1">
        <p className="font-medium">{title}</p>
        <p className="text-sm text-neutral-500">{description}</p>
      </div>
      <div className="text-sm text-neutral-500">{timestamp}</div>
    </div>
  )
}

export default App
