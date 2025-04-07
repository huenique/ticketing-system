import { Navigate,Route, Routes } from "react-router-dom";

import { DashboardLayout } from "./components/dashboard-layout";
import Logout from "./pages/Logout";
import NotFound from "./pages/NotFound";
import Settings from "./pages/Settings";
import Tickets from "./pages/Tickets";
import Users from "./pages/Users";

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
  );
}

export default App;
