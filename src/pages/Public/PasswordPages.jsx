import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { CheckCircle2, Eye, EyeOff, MailCheck } from "lucide-react";
import { Card, CardContent } from "../../components/ui/card/Card";
import { Button } from "../../components/ui/button/Button";
import { Input } from "../../components/ui/input/Input";
import { Label } from "../../components/ui/label/Label";
import ThemeToggle from "../../components/ui/ThemeToggle";
import TytanLogo from "../../assets/logo/tytan-logo.jpg";
import {
  checkPasswordResetLink,
  requestPasswordReset,
  resetPasswordWithLink,
} from "../../api/login-api";

// Same frame as the login page.
function AuthFrame({ subtitle, children }) {
  return (
    <div className="relative flex min-h-screen items-center justify-center bg-background p-4">
      <ThemeToggle className="absolute right-4 top-4" />
      <Card className="w-full max-w-md rounded-2xl shadow-xl">
        <div className="flex flex-col items-center gap-3 pt-6 text-center">
          <img src={TytanLogo} alt="Tytan Logo" className="h-16 w-16 rounded-xl object-contain" />
          <div>
            <p className="text-lg font-bold uppercase tracking-wide text-fg">
              Tytan Prime Corporation
            </p>
            <p className="mt-1 text-sm text-fg-muted">{subtitle}</p>
          </div>
        </div>
        <CardContent>{children}</CardContent>
      </Card>
    </div>
  );
}

const BackToLogin = () => (
  <p className="text-center text-sm">
    <Link to="/login" className="text-primary hover:underline">
      Back to login
    </Link>
  </p>
);

// "Forgot password?" -- username or email; a reset link is emailed.
export function ForgotPasswordPage() {
  const [identifier, setIdentifier] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");

  const submit = async (e) => {
    e.preventDefault();
    if (!identifier.trim()) {
      setError("Enter your username or email.");
      return;
    }
    try {
      setLoading(true);
      setError("");
      await requestPasswordReset(identifier.trim());
      setSent(true);
    } catch (err) {
      setError(err.response?.data?.detail || "Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthFrame subtitle="Reset your password">
      {sent ? (
        <div className="space-y-5 text-center">
          <MailCheck size={44} className="mx-auto text-emerald-500" />
          <p className="text-sm text-fg">
            If that account exists and has an email on file, we&apos;ve sent a link to reset
            the password. Check your inbox (and spam folder).
          </p>
          <p className="text-xs text-fg-subtle">The link expires in 1 hour.</p>
          <BackToLogin />
        </div>
      ) : (
        <form className="space-y-5" onSubmit={submit}>
          <p className="text-sm text-fg-muted">
            Enter your username or the email on your account. We&apos;ll email you a link to
            set a new password.
          </p>
          <div className="space-y-2">
            <Label htmlFor="identifier">Username or email</Label>
            <Input
              id="identifier"
              type="text"
              autoComplete="username"
              value={identifier}
              onChange={(e) => setIdentifier(e.target.value)}
              placeholder="e.g. delacruz or juan@email.com"
            />
          </div>
          {error && <p className="text-sm text-danger">{error}</p>}
          <Button type="submit" className="w-full" size="lg" disabled={loading}>
            {loading ? "Sending..." : "Send reset link"}
          </Button>
          <BackToLogin />
        </form>
      )}
    </AuthFrame>
  );
}

// From the emailed link: /reset-password?token=...
export function ResetPasswordPage() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token") || "";
  const [checking, setChecking] = useState(true);
  const [username, setUsername] = useState(null);
  const [linkError, setLinkError] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [show, setShow] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);

  useEffect(() => {
    if (!token) {
      setLinkError("This reset link is missing its code. Request a new one.");
      setChecking(false);
      return;
    }
    checkPasswordResetLink(token)
      .then((data) => setUsername(data.username))
      .catch((err) =>
        setLinkError(
          err.response?.data?.detail ||
            "This reset link is invalid or has expired. Request a new one.",
        ),
      )
      .finally(() => setChecking(false));
  }, [token]);

  const submit = async (e) => {
    e.preventDefault();
    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }
    if (password !== confirm) {
      setError("The passwords don't match.");
      return;
    }
    try {
      setSaving(true);
      setError("");
      await resetPasswordWithLink(token, password);
      setDone(true);
    } catch (err) {
      setError(err.response?.data?.detail || "Couldn't change the password. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <AuthFrame subtitle="Set a new password">
      {checking ? (
        <p className="py-6 text-center text-sm text-fg-muted">Checking your link...</p>
      ) : linkError ? (
        <div className="space-y-5 text-center">
          <p className="text-sm text-danger">{linkError}</p>
          <p className="text-sm">
            <Link to="/forgot-password" className="text-primary hover:underline">
              Request a new reset link
            </Link>
          </p>
          <BackToLogin />
        </div>
      ) : done ? (
        <div className="space-y-5 text-center">
          <CheckCircle2 size={44} className="mx-auto text-emerald-500" />
          <p className="text-sm text-fg">
            Your password has been changed. You can now log in with your new password
            {username ? (
              <>
                {" "}as <strong>{username}</strong>
              </>
            ) : null}
            .
          </p>
          <Link to="/login">
            <Button className="w-full" size="lg">
              Go to login
            </Button>
          </Link>
        </div>
      ) : (
        <form className="space-y-5" onSubmit={submit}>
          <p className="text-sm text-fg-muted">
            Setting a new password for <strong className="text-fg">{username}</strong>.
          </p>
          <div className="space-y-2">
            <Label htmlFor="new-password">New password</Label>
            <div className="relative">
              <Input
                id="new-password"
                type={show ? "text" : "password"}
                autoComplete="new-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="At least 8 characters"
                className="pr-10"
              />
              <button
                type="button"
                onClick={() => setShow((v) => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-fg-subtle hover:text-fg"
                aria-label={show ? "Hide password" : "Show password"}
              >
                {show ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="confirm-password">Confirm new password</Label>
            <Input
              id="confirm-password"
              type={show ? "text" : "password"}
              autoComplete="new-password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
            />
          </div>
          {error && <p className="text-sm text-danger">{error}</p>}
          <Button type="submit" className="w-full" size="lg" disabled={saving}>
            {saving ? "Saving..." : "Change password"}
          </Button>
          <BackToLogin />
        </form>
      )}
    </AuthFrame>
  );
}
