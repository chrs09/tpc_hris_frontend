import { Card, CardContent } from "../components/ui/card/Card";
import { Button } from "../components/ui/button/Button";
import { Input } from "../components/ui/input/Input";
import { Label } from "../components/ui/label/Label";
import TytanLogo from "../assets/logo/tytan-logo.jpg";
import { userLogin } from "../api/login-api";
import { useState } from "react";
import { useNavigate } from "react-router-dom";

export default function Login({ setIsAuthenticated }) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [loading, setLoading] = useState(false);

  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setErrorMessage("");

    try {
      const result = await userLogin(username, password);

      if (result?.access_token) {
        // Store token
        localStorage.setItem("access_token", result.access_token);
        localStorage.setItem("token_type", result.token_type);

        // Update global auth state
        setIsAuthenticated(true);

        // Redirect properly
        navigate("/dashboard", { replace: true });
      } else {
        setErrorMessage("Invalid username or password");
      }
    } catch {
      setErrorMessage("Invalid username or password");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#023047] p-4">
      <Card className="w-full max-w-md shadow-xl rounded-2xl">
        {/* Logo */}
        <div className="flex justify-center m-6 space-x-3 items-center">
          {TytanLogo ? (
            <img
              src={TytanLogo}
              alt="Tytan Logo"
              className="w-16 h-16 object-contain"
            />
          ) : (
            "T"
          )}
          <p className="font-mono font-extrabold uppercase text-[18px] md:text-[20px] text-center">
            Tytan Prime Corporation
          </p>
        </div>

        <CardContent>
          <form className="space-y-5" onSubmit={handleLogin}>
            {/* Username */}
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

            {/* Password */}
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
              />
            </div>

            {/* Forgot password */}
            <div className="flex justify-end">
              <button
                type="button"
                className="text-sm text-primary hover:underline"
              >
                Forgot password?
              </button>
            </div>

            {/* Submit Button */}
            <Button
              type="submit"
              className="w-full rounded-xl"
              size="lg"
              disabled={loading}
            >
              {loading ? "Logging in..." : "Login"}
            </Button>

            {/* Error message OUTSIDE button */}
            {errorMessage && (
              <p className="text-sm text-red-500 text-center">
                {errorMessage}
              </p>
            )}
          </form>

          {/* Footer */}
          <p className="mt-6 text-center text-sm text-muted-foreground">
            Create account for user{" "}
            <span className="text-primary hover:underline cursor-pointer font-bold underline">
              Click Here
            </span>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}