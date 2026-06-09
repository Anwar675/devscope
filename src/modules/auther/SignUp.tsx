"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";
import { motion } from "motion/react";
import {
  AlertCircle,
  ArrowRight,
  Brain,
  CheckCircle2,
  Eye,
  EyeOff,
  Lock,
  Mail,
  User,
  Zap,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { authClient } from "@/lib/auth-client";

const particles = [
  { left: "8%", top: "18%", delay: 0 },
  { left: "18%", top: "76%", delay: 1.4 },
  { left: "28%", top: "34%", delay: 2.6 },
  { left: "42%", top: "88%", delay: 0.8 },
  { left: "54%", top: "22%", delay: 3.2 },
  { left: "66%", top: "62%", delay: 1.9 },
  { left: "78%", top: "14%", delay: 2.8 },
  { left: "88%", top: "74%", delay: 0.5 },
];

const features = [
  { icon: Zap, text: "Free Forever" },
  { icon: Brain, text: "AI-Powered" },
  { icon: CheckCircle2, text: "No Credit Card" },
];

const AuthBackground = () => (
  <>
    <motion.div
      className="absolute top-1/4 left-1/4 w-96 h-96 bg-dev-accent/20 rounded-full blur-3xl"
      animate={{ scale: [1, 1.2, 1], opacity: [0.3, 0.5, 0.3] }}
      transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
    />
    <motion.div
      className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-dev-purple/20 rounded-full blur-3xl"
      animate={{ scale: [1.2, 1, 1.2], opacity: [0.5, 0.3, 0.5] }}
      transition={{ duration: 10, repeat: Infinity, ease: "easeInOut" }}
    />
    <div className="absolute inset-0 bg-dev-grid" />
    {particles.map((particle, index) => (
      <motion.div
        key={index}
        className="absolute w-1 h-1 bg-dev-accent/30 rounded-full"
        style={{ left: particle.left, top: particle.top }}
        animate={{ y: [0, -36, 0], opacity: [0, 1, 0] }}
        transition={{
          duration: 10 + index,
          delay: particle.delay,
          repeat: Infinity,
          ease: "linear",
        }}
      />
    ))}
  </>
);

type SocialProvider = "google" | "github";

export const SignUpPage = () => {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [agreeToTerms, setAgreeToTerms] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setErrorMessage("");

    if (password !== confirmPassword) {
      setErrorMessage("Passwords do not match.");
      return;
    }

    if (!agreeToTerms) {
      setErrorMessage("Please agree to the terms before creating an account.");
      return;
    }

    setIsLoading(true);

    const { error } = await authClient.signUp.email({
      name,
      email,
      password,
      callbackURL: "/",
    });

    setIsLoading(false);

    if (error) {
      setErrorMessage(error.message || "Sign up failed. Please try again.");
      return;
    }

    router.push("/");
    router.refresh();
  };

  const handleSocialSignUp = async (provider: SocialProvider) => {
    setErrorMessage("");
    setIsLoading(true);

    const { error } = await authClient.signIn.social({
      provider,
      callbackURL: "/",
    });

    setIsLoading(false);

    if (error) {
      setErrorMessage(error.message || "Social sign up failed.");
    }
  };

  return (
    <div className="min-h-screen bg-linear-to-br from-dev-bg via-dev-bg-mid to-dev-bg flex items-center justify-center p-6 relative overflow-hidden">
      <AuthBackground />

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="relative z-10 w-full max-w-md"
      >
        <div className="bg-dev-surface/5 backdrop-blur-xl border border-dev-border rounded-3xl p-8 shadow-2xl">
          <div className="text-center mb-8">
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.2 }}
              className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-linear-to-br from-dev to-dev-purple mb-4 shadow-lg shadow-dev-accent/50"
            >
              <Brain className="w-9 h-9 text-dev-text" />
            </motion.div>
            <h1 className="text-3xl font-bold text-dev-text mb-2">
              Create Account
            </h1>
            <p className="text-dev-text-muted/70">
              Start your DevScope AI journey
            </p>
          </div>

          <form className="space-y-4" onSubmit={handleSubmit}>
            <div>
              <label className="block text-dev-text-muted text-sm font-medium mb-2">
                Full Name
              </label>
              <div className="relative">
                <User className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-dev-accent" />
                <input
                  type="text"
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  placeholder="John Doe"
                  required
                  className="w-full pl-12 pr-4 py-3 bg-dev-surface/10 border border-dev-border-strong rounded-xl text-dev-text placeholder-dev-accent-muted/50 focus:outline-none focus:ring-2 focus:ring-dev-accent focus:border-transparent transition-all"
                />
              </div>
            </div>

            <div>
              <label className="block text-dev-text-muted text-sm font-medium mb-2">
                Email Address
              </label>
              <div className="relative">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-dev-accent" />
                <input
                  type="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  placeholder="you@example.com"
                  required
                  className="w-full pl-12 pr-4 py-3 bg-dev-surface/10 border border-dev-border-strong rounded-xl text-dev-text placeholder-dev-accent-muted/50 focus:outline-none focus:ring-2 focus:ring-dev-accent focus:border-transparent transition-all"
                />
              </div>
            </div>

            <div>
              <label className="block text-dev-text-muted text-sm font-medium mb-2">
                Password
              </label>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-dev-accent" />
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  placeholder="Create a strong password"
                  required
                  minLength={8}
                  className="w-full pl-12 pr-12 py-3 bg-dev-surface/10 border border-dev-border-strong rounded-xl text-dev-text placeholder-dev-accent-muted/50 focus:outline-none focus:ring-2 focus:ring-dev-accent focus:border-transparent transition-all"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() => setShowPassword((value) => !value)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-dev-accent hover:text-dev-accent-muted hover:bg-dev-surface/10 transition-colors"
                >
                  {showPassword ? (
                    <EyeOff className="w-5 h-5" />
                  ) : (
                    <Eye className="w-5 h-5" />
                  )}
                </Button>
              </div>
            </div>

            <div>
              <label className="block text-dev-text-muted text-sm font-medium mb-2">
                Confirm Password
              </label>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-dev-accent" />
                <input
                  type={showConfirmPassword ? "text" : "password"}
                  value={confirmPassword}
                  onChange={(event) => setConfirmPassword(event.target.value)}
                  placeholder="Re-enter your password"
                  required
                  minLength={8}
                  className="w-full pl-12 pr-12 py-3 bg-dev-surface/10 border border-dev-border-strong rounded-xl text-dev-text placeholder-dev-accent-muted/50 focus:outline-none focus:ring-2 focus:ring-dev-accent focus:border-transparent transition-all"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() => setShowConfirmPassword((value) => !value)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-dev-accent hover:text-dev-accent-muted hover:bg-dev-surface/10 transition-colors"
                >
                  {showConfirmPassword ? (
                    <EyeOff className="w-5 h-5" />
                  ) : (
                    <Eye className="w-5 h-5" />
                  )}
                </Button>
              </div>
            </div>

            <label className="flex items-start gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={agreeToTerms}
                onChange={(event) => setAgreeToTerms(event.target.checked)}
                className="mt-0.5 w-4 h-4 rounded border-dev-border-strong bg-dev-surface/10 text-dev-accent focus:ring-2 focus:ring-dev-accent focus:ring-offset-0"
              />
              <span className="text-dev-text-muted text-sm">
                I agree to the{" "}
                <a href="#" className="text-dev-accent hover:text-dev-accent-muted">
                  Terms of Service
                </a>{" "}
                and{" "}
                <a href="#" className="text-dev-accent hover:text-dev-accent-muted">
                  Privacy Policy
                </a>
              </span>
            </label>

            {errorMessage && (
              <p className="flex items-center gap-2 text-sm text-dev-danger">
                <AlertCircle className="w-4 h-4" />
                {errorMessage}
              </p>
            )}

            <Button
              type="submit"
              disabled={isLoading}
              className="w-full rounded-xl font-semibold flex items-center justify-center gap-2 transition-all bg-linear-to-r from-dev to-dev-purple hover:from-dev-accent-hover hover:to-dev-purple-hover text-dev-text shadow-lg shadow-dev-accent/50 hover:scale-105"
            >
              {isLoading ? "Creating Account..." : "Create Account"}
              <ArrowRight className="w-5 h-5" />
            </Button>
          </form>

          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-dev-border" />
            </div>
            <div className="relative flex justify-center">
              <span className="px-4 bg-dev-bg text-dev-text-muted/70 text-sm">
                Or sign up with
              </span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 mb-6">
            <Button
              type="button"
              disabled={isLoading}
              onClick={() => handleSocialSignUp("google")}
              className="py-3 px-4 bg-dev-surface/10 hover:bg-dev-surface/20 border border-dev-border-strong rounded-xl text-dev-text flex items-center justify-center gap-2 transition-all"
            >
              Google
            </Button>
            <Button
              type="button"
              disabled={isLoading}
              onClick={() => handleSocialSignUp("github")}
              className="py-3 px-4 bg-dev-surface/10 hover:bg-dev-surface/20 border border-dev-border-strong rounded-xl text-dev-text flex items-center justify-center gap-2 transition-all"
            >
              GitHub
            </Button>
          </div>

          <p className="text-center text-dev-text-muted/70 text-sm">
            Already have an account?{" "}
            <Link
              href="/sign-in"
              className="text-dev-accent hover:text-dev-accent-muted font-medium transition-colors"
            >
              Sign in
            </Link>
          </p>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="mt-8 grid grid-cols-3 gap-4"
        >
          {features.map((feature, index) => (
            <div
              key={index}
              className="p-3 bg-dev-surface/5 backdrop-blur-lg border border-dev-border rounded-xl text-center"
            >
              <feature.icon className="w-5 h-5 text-dev-accent mx-auto mb-1" />
              <span className="text-xs text-dev-text-muted/70">
                {feature.text}
              </span>
            </div>
          ))}
        </motion.div>
      </motion.div>
    </div>
  );
};
