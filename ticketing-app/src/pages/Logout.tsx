import { useEffect } from "react";
import { Navigate } from "react-router-dom";

import useUserStore from "@/stores/userStore";

export default function Logout() {
  const { logout } = useUserStore();

  useEffect(() => {
    logout();
  }, [logout]);

  return <Navigate to="/login" replace />;
}
