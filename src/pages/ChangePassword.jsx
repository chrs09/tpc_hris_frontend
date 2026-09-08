import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "../components/ui/button/Button";
import { changePassword } from "../api/login-api";

const ChangePassword = () => {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const navigate = useNavigate();

  const passwordsMatch =
    password && confirmPassword && password === confirmPassword;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (password !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    try {
      await changePassword(password);

      localStorage.removeItem("must_change_password");

      navigate("/dashboard", {
        replace: true,
        state: { passwordChanged: true },
      });
    } catch (err) {
      setError(err.response?.data?.detail || "Failed to change password");
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4 sm:px-6">
      <div className="w-full max-w-md">
        <form
          onSubmit={handleSubmit}
          className="
            bg-surface
            border
            border-border
            rounded-2xl
            shadow-lg
            p-6
            sm:p-8
            space-y-5
          "
        >
          <h2 className="text-xl sm:text-2xl font-bold text-center text-fg">
            Change Your Password
          </h2>

          {/* New Password */}
          <div className="space-y-2">
            <input
              type={showPassword ? "text" : "password"}
              placeholder="New Password"
              className="
                w-full
                rounded-lg
                border
                border-border
                bg-background
                px-3
                py-2
                text-sm
                text-fg
                focus:outline-none
                focus:ring-2
                focus:ring-primary/30
                sm:text-base
              "
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>

          {/* Confirm Password */}
          <div className="space-y-2">
            <input
              type={showPassword ? "text" : "password"}
              placeholder="Confirm Password"
              className="
                w-full
                rounded-lg
                border
                border-border
                bg-background
                px-3
                py-2
                text-sm
                text-fg
                focus:outline-none
                focus:ring-2
                focus:ring-primary/30
                sm:text-base
              "
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
            />
          </div>

          {/* Show Password Checkbox */}
          <label className="flex items-center gap-2 text-sm text-fg-muted">
            <input
              type="checkbox"
              checked={showPassword}
              onChange={() => setShowPassword(!showPassword)}
              className="accent-primary"
            />
            Show Password
          </label>

          {/* Match Indicator */}
          {confirmPassword && (
            <p
              className={`text-sm ${
                passwordsMatch ? "text-success" : "text-danger"
              }`}
            >
              {passwordsMatch ? "Passwords match ✓" : "Passwords do not match"}
            </p>
          )}

          {error && <p className="text-danger text-sm">{error}</p>}

          {/* Submit Button */}
          <Button type="submit" disabled={!passwordsMatch} className="w-full">
            Update Password
          </Button>
        </form>
      </div>
    </div>
  );
};

export default ChangePassword;
