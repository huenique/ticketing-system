import { Routes, Route, Navigate } from "react-router-dom"
import { DashboardLayout } from "./components/dashboard-layout"
import Tickets from "./pages/Tickets"
import Users from "./pages/Users"
import Settings from "./pages/Settings"
import Logout from "./pages/Logout"
import NotFound from "./pages/NotFound"

function App() {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/tickets" replace />} />
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

export default App
