"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { signIn, signUp, useSession } from "@/lib/auth-client";
import { motion } from "framer-motion";
import { ArrowLeft, Loader2, Mail, Lock, User } from "lucide-react";
import Link from "next/link";

export default function AuthPage() {
  const searchParams = useSearchParams();
  const [isSignUp, setIsSignUp] = useState(searchParams.get("mode") === "signup");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  const { data: session, isPending } = useSession();

  // Redirect if already logged in
  useEffect(() => {
    if (!isPending && session) {
      router.push("/app");
    }
  }, [session, isPending, router]);

  // Show loading while checking session or if already logged in
  if (isPending || session) {
    return (
      <div className="min-h-screen bg-[#f5f3ef] flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-6 h-6 border-2 border-black/10 border-t-black/40 rounded-full animate-spin" />
          <p className="text-sm text-black/40">Loading...</p>
        </div>
      </div>
    );
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      if (isSignUp) {
        const { error } = await signUp.email({
          email,
          password,
          name: name || email.split("@")[0],
          callbackURL: "/app",
        });
        if (error) {
          setError(error.message || "Sign up failed");
        } else {
          router.push("/app");
        }
      } else {
        const { error } = await signIn.email({
          email,
          password,
          callbackURL: "/app",
        });
        if (error) {
          setError(error.message || "Sign in failed");
        } else {
          router.push("/app");
        }
      }
    } catch (err: any) {
      setError(err.message || "Something went wrong");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#f5f3ef] flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-md flex flex-col items-center">
        {/* Back to home */}
        <div className="w-full max-w-sm mb-8">
          <Link 
            href="/" 
            className="inline-flex items-center gap-2 text-black/40 hover:text-black transition-colors text-sm"
          >
            <ArrowLeft size={16} />
            Back to home
          </Link>
        </div>

        {/* Logo */}
        <Link href="/" className="flex items-center gap-3 mb-8">
          <img 
            src="/eliee_logo.jpg" 
            alt="Eliee" 
            className="w-10 h-10 rounded-xl object-cover shadow-sm" 
          />
          <span className="font-semibold text-2xl tracking-tight text-black/80">Eliee</span>
        </Link>

        {/* Auth Card */}
        <motion.div 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-sm bg-white rounded-2xl border border-black/[0.06] shadow-xl overflow-hidden"
        >
          <div className="p-8">
            <h1 className="text-3xl font-medium text-center text-black/80 mb-3" style={{ fontFamily: 'Georgia, serif', fontStyle: 'italic' }}>
              {isSignUp ? "Create an account" : "Welcome back"}
            </h1>
            <p className="text-sm text-black/40 text-center mb-8">
              {isSignUp 
                ? "Start thinking clearly with Eliee" 
                : "Sign in to continue to Eliee"
              }
            </p>

            <form onSubmit={handleSubmit} className="space-y-4">
              {isSignUp && (
                <div className="space-y-2">
                  <label className="text-sm font-medium text-black/60">Name</label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-black/30" />
                    <input
                      type="text"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="Your name"
                      className="w-full pl-10 pr-4 py-3 bg-[#fafafa] border border-black/10 rounded-xl text-black/80 placeholder:text-black/30 focus:outline-none focus:border-black/20 focus:bg-white transition-all"
                    />
                  </div>
                </div>
              )}

              <div className="space-y-2">
                <label className="text-sm font-medium text-black/60">Email</label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-black/30" />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@example.com"
                    required
                    className="w-full pl-10 pr-4 py-3 bg-[#fafafa] border border-black/10 rounded-xl text-black/80 placeholder:text-black/30 focus:outline-none focus:border-black/20 focus:bg-white transition-all"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-black/60">Password</label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-black/30" />
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    required
                    minLength={8}
                    className="w-full pl-10 pr-4 py-3 bg-[#fafafa] border border-black/10 rounded-xl text-black/80 placeholder:text-black/30 focus:outline-none focus:border-black/20 focus:bg-white transition-all"
                  />
                </div>
              </div>

              {error && (
                <div className="p-3 rounded-lg bg-rose-50 border border-rose-100 text-rose-600 text-sm text-center">
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-3.5 bg-black text-white rounded-xl font-semibold text-sm uppercase tracking-wide hover:bg-black/80 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>{isSignUp ? "Creating account..." : "Signing in..."}</span>
                  </>
                ) : (
                  <span>{isSignUp ? "Create Account" : "Sign In"}</span>
                )}
              </button>
            </form>

            <div className="mt-6 text-center">
              <button
                onClick={() => {
                  setIsSignUp(!isSignUp);
                  setError(null);
                }}
                className="text-sm text-black/50 hover:text-black transition-colors"
              >
                {isSignUp 
                  ? "Already have an account? Sign in" 
                  : "Don't have an account? Sign up"
                }
              </button>
            </div>
          </div>
        </motion.div>

        {/* Footer */}
        <div className="mt-8 flex flex-col items-center gap-4">
          <p className="text-center text-xs text-black/30 max-w-sm">
            By signing in, you agree to our{" "}
            <Link href="/terms" className="underline hover:text-black transition-colors">Terms of Service</Link> and{" "}
            <Link href="/privacy" className="underline hover:text-black transition-colors">Privacy Policy</Link>.
          </p>
          <span className="text-[10px] font-medium uppercase tracking-widest text-black/15">
            Powered by Better Auth
          </span>
        </div>
      </div>
    </div>
  );
}

