import { Lock, Mail } from "lucide-react";
import { FormEvent, useState } from "react";
import { useNavigate } from "react-router-dom";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import useUserStore from "@/stores/userStore";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const { login, isLoading, error } = useUserStore();
  const navigate = useNavigate();

  const handleLogin = async (e: FormEvent) => {
    e.preventDefault();
    try {
      await login({ email, password });
      navigate("/tickets");
    } catch (error) {
      console.error("Login failed:", error);
    }
  };

  return (
    <div className="flex h-screen w-full items-center justify-center bg-gray-100">
      <Card className="w-full max-w-md border-2 border-gray-300 shadow-lg">
        <CardHeader className="text-center pb-2">
          <CardTitle className="text-3xl font-bold text-gray-900">Ticketing System</CardTitle>
          <CardDescription className="text-base text-gray-700 mt-2">Login to access the system</CardDescription>
        </CardHeader>

        <form onSubmit={handleLogin}>
          <CardContent className="space-y-5">
            {error && (
              <Alert variant="destructive" className="border-2 border-red-400 bg-red-50 text-red-700">
                <AlertDescription className="font-medium">{error}</AlertDescription>
              </Alert>
            )}

            <div className="space-y-2">
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-600">
                  <Mail size={20} />
                </span>
                <Input
                  className="pl-10 h-11 border-2 border-gray-300 focus:border-blue-600 text-gray-900 text-base"
                  type="email"
                  placeholder="Email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  disabled={isLoading}
                />
              </div>
            </div>

            <div className="space-y-2">
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-600">
                  <Lock size={20} />
                </span>
                <Input
                  className="pl-10 h-11 border-2 border-gray-300 focus:border-blue-600 text-gray-900 text-base"
                  type="password"
                  placeholder="Password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  disabled={isLoading}
                />
              </div>
            </div>
          </CardContent>

          <CardFooter>
            <Button className="w-full bg-blue-700 hover:bg-blue-800 text-white font-medium text-base h-11" type="submit" disabled={isLoading}>
              {isLoading ? "Logging in..." : "Login"}
            </Button>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}
