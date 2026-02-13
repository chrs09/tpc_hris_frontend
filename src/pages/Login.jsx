
  import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "../components/ui/card/Card"
  import { Button } from "../components/ui/button/Button"
  import { Input } from "../components/ui/input/Input"
  import { Label } from "../components/ui/label/Label"
  import TytanLogo from "../assets/logo/tytan-logo.jpg"
  import { userLogin } from "../api/login-api"
  import { useState } from "react"
  import { useNavigate } from "react-router-dom";

  export default function Login() {
    // Handle form submission
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
          setLoading(false);
          if (result) {
            localStorage.setItem("access_token", result.access_token);
            localStorage.setItem("token_type", result.token_type);

            // redirect
            navigate("/dashboard");

          } else {
            setErrorMessage("Invalid username or password");
          }
      }
      catch {
        setErrorMessage("Invalid username or password");
      }
    };


    return (
      // <div className="h-screen flex items-center justify-center bg-gradient-to-br from-green-100 to-green-900 overflow-hidden">
      <div className="h-screen flex items-center justify-center bg-gradient-to-r from-green-50 via-green-300 to-green-500 overflow-hidden">
        
        <Card className="w-full max-w-md shadow-xl rounded-2xl">
          {/* Logo */}
          <div className="flex justify-center m-6 space-x-3">
            { TytanLogo ? <img src={TytanLogo} alt="Tytan Logo" className="h-full w-[80px]" /> : "T" }
            <div className="">
              <p className="font-mono font-extrabold mt-7 uppercase text-[20px]">Tytan Prime Corporation</p>
            </div>
          </div>
          {/* <CardHeader className="text-center space-y-2">
            <CardTitle className="text-lg">Welcome Back</CardTitle>
            <CardDescription className="text-md text-muted-foreground">
              Sign in to your account
            </CardDescription>
          </CardHeader> */}

          <CardContent>
            <form className="space-y-5" onSubmit={handleLogin}>
              {/* Email */}
              <div className="space-y-2">
                <Label htmlFor="username">Username</Label>
                <Input
                  className="w-full"
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
                  className="w-full"
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

              {/* Submit */}
              <Button className="w-full rounded-xl" size="lg" disabled={loading} onClick={handleLogin}>
                { loading ? "Logging in..." : "Login" }
                { errorMessage && <p className="text-sm text-red-500 mt-2">{errorMessage}</p> }
              </Button>
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
    )
  }