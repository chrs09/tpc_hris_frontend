import { Card, CardContent } from "../components/ui/card/Card";
import { Button } from "../components/ui/button/Button";
import { Input } from "../components/ui/input/Input";
import { Label } from "../components/ui/label/Label";
import ThemeToggle from "../components/ui/ThemeToggle";
import TytanLogo from "../assets/logo/tytan-logo.jpg";
import { userLogin } from "../api/login-api";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Eye, EyeOff } from "lucide-react";

export default function Login({ setIsAuthenticated }) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setErrorMessage("");

    try {
      const result = await userLogin(username.trim(), password);

      localStorage.setItem("access_token", result.access_token);
      localStorage.setItem("refresh_token", result.refresh_token);
      localStorage.setItem("role", result.role || "");
      localStorage.setItem("user_id", result.user_id || "");
      localStorage.setItem("username", result.username || "");
      localStorage.setItem("expires_at", result.expires_at || "");
      localStorage.setItem(
        "refresh_expires_at",
        result.refresh_expires_at || "",
      );
      localStorage.setItem(
        "must_change_password",
        result.must_change_password ? "true" : "false",
      );

      setIsAuthenticated(true);

      if (result.must_change_password === true) {
        navigate("/change-password", { replace: true });
      } else {
        navigate("/dashboard", { replace: true });
      }
    } catch (error) {
      if (error.response?.status === 401) {
        setErrorMessage("Invalid username or password");
      } else if (error.response?.status === 403) {
        setErrorMessage("Your account is inactive.");
      } else {
        setErrorMessage("Server error. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative flex min-h-screen items-center justify-center bg-background p-4">
      <ThemeToggle className="absolute right-4 top-4" />

      <Card className="w-full max-w-md rounded-2xl shadow-xl">
        <div className="flex flex-col items-center gap-3 pt-6 text-center">
          {TytanLogo ? (
            <img
              src={TytanLogo}
              alt="Tytan Logo"
              className="h-16 w-16 rounded-xl object-contain"
            />
          ) : (
            "T"
          )}
          <div>
            <p className="text-lg font-bold uppercase tracking-wide text-fg">
              Tytan Prime Corporation
            </p>
            <p className="mt-1 text-sm text-fg-muted">
              Sign in to your HRIS account
            </p>
          </div>
        </div>

        <CardContent>
          <form className="space-y-5" onSubmit={handleLogin}>
            <div className="space-y-2">
              <Label htmlFor="username">Username</Label>
              <Input
                id="username"
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Enter your username"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>

              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  className="pr-10"
                />

                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-fg-subtle hover:text-fg"
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            <div className="flex justify-end">
              <button
                type="button"
                className="text-sm text-primary hover:underline"
              >
                Forgot password?
              </button>
            </div>

            <Button type="submit" className="w-full" size="lg" disabled={loading}>
              {loading ? "Logging in..." : "Login"}
            </Button>

            {errorMessage && (
              <p className="text-center text-sm text-danger">{errorMessage}</p>
            )}
          </form>

          <div className="mt-4">
            <p className="mb-2 text-center text-sm text-fg-muted">Or</p>

            <Button
              type="button"
              variant="outline"
              className="w-full"
              size="lg"
              onClick={() => navigate("/attendance-kiosk")}
            >
              Go to Attendance Kiosk
            </Button>
          </div>

          <p className="mt-6 text-center text-sm text-fg-muted">
            Create account for user{" "}
            <span className="cursor-pointer font-bold text-primary underline hover:no-underline">
              Click Here
            </span>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
