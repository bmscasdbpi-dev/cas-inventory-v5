"use client";

import { useState, useEffect } from "react";
import { auth, googleProvider } from "@/lib/firebase";
import { signInWithPopup, signInWithEmailAndPassword, onAuthStateChanged } from "firebase/auth";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const [isEmailLoading, setIsEmailLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [loginMethod, setLoginMethod] = useState<"options" | "email">("options");
  const [isCheckingSession, setIsCheckingSession] = useState(true); 
  
  const router = useRouter();

  // --- Session Check ---
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        router.push("/dashboard");
      } else {
        setIsCheckingSession(false);
      }
    });
    return () => unsubscribe();
  }, [router]);

  // --- Instant Reset via Window Focus ---
  useEffect(() => {
    const handleFocus = () => {
      // If the user clicks back to this tab, they are done with the popup
      if (isGoogleLoading) {
        setTimeout(() => setIsGoogleLoading(false), 300);
      }
    };

    window.addEventListener("focus", handleFocus);
    return () => window.removeEventListener("focus", handleFocus);
  }, [isGoogleLoading]);

  // --- Email/Password Logic ---
  async function handleEmailLogin(e: React.FormEvent) {
    e.preventDefault();
    if (isEmailLoading) return; // Prevent double-submit

    setIsEmailLoading(true);
    setErrorMessage(null);

    try {
      await signInWithEmailAndPassword(auth, email, password);
    } catch (error: any) {
      if (error.code === 'auth/invalid-credential' || error.code === 'auth/user-not-found' || error.code === 'auth/wrong-password') {
        setErrorMessage("Invalid email or password.");
      } else {
        setErrorMessage("An unexpected error occurred.");
      }
    } finally {
      setIsEmailLoading(false);
    }
  }

  // --- Google Popup Logic ---
  async function handleGoogleLogin() {
    if (isGoogleLoading) return; // Prevent double-triggering popup

    setErrorMessage(null);
    setIsGoogleLoading(true);

    try {
      await signInWithPopup(auth, googleProvider);
    } catch (error: any) {
      // Hide logs for intentional user cancellations
      const isCancelled = error.code === 'auth/popup-closed-by-user' || 
                          error.code === 'auth/cancelled-popup-request';
      
      if (!isCancelled) {
        console.error("Google Auth Error:", error.code);
        if (error.code === 'auth/admin-restricted-operation') {
          setErrorMessage("Access Denied: Account not registered.");
        } else {
          setErrorMessage("Failed to connect to Google.");
        }
      } else {
        console.log("Login popup closed/cancelled.");
      }
    } finally {
      setIsGoogleLoading(false);
    } 
  }

  const isInteractionDisabled = isGoogleLoading || isEmailLoading;

  if (isCheckingSession) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="w-12 h-12 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="relative overflow-hidden min-h-screen flex items-center justify-center bg-slate-50 text-slate-800 p-4 sm:p-6">
      
      {/* Background Decor */}
      <div className="absolute top-0 -left-4 w-72 h-72 bg-indigo-200 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-blob pointer-events-none"></div>
      <div className="absolute bottom-0 -right-4 w-72 h-72 bg-blue-200 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-blob animation-delay-2000 pointer-events-none"></div>

      <div className="relative z-10 bg-white/70 backdrop-blur-xl border border-white p-8 sm:p-10 rounded-3xl shadow-[0_20px_50px_rgba(0,0,0,0.05)] w-full max-w-md transition-all duration-300 text-center">
        <div className="mb-8">
          <h1 className="text-3xl font-extrabold tracking-tight text-slate-900 mb-2">Inventory System</h1>
          <p className="text-slate-500 text-sm">
            {loginMethod === "options" ? "Choose your login method" : "Sign in with your email"}
          </p>
        </div>

        {errorMessage && (
          <div className="mb-6 bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-xl text-sm font-medium animate-in fade-in slide-in-from-top-2 text-left flex items-start gap-2">
            <svg className="w-5 h-5 shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
            <span>{errorMessage}</span>
          </div>
        )}

        <div className="space-y-4">
          {loginMethod === "options" ? (
            /* BUTTON OPTIONS */
            <div className="space-y-3 animate-in fade-in zoom-in-95 duration-300">
              <button
                type="button"
                onClick={() => setLoginMethod("email")}
                disabled={isInteractionDisabled}
                className="w-full bg-slate-900 text-white py-4 rounded-xl font-bold transition-all hover:bg-slate-800 flex items-center justify-center gap-3 active:scale-[0.98] cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>
                Login with Email
              </button>

              <button
                type="button"
                onClick={handleGoogleLogin}
                disabled={isInteractionDisabled}
                className="w-full bg-white border border-slate-200 text-slate-700 py-4 rounded-xl font-bold transition-all hover:bg-slate-50 hover:shadow-md flex items-center justify-center gap-3 active:scale-[0.98] cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" alt="Google" className="w-5 h-5" />
                {isGoogleLoading ? "Connecting..." : "Continue with Google"}
              </button>
            </div>
          ) : (
            /* EMAIL FORM */
            <div className="animate-in fade-in slide-in-from-right-4 duration-300">
              <form onSubmit={handleEmailLogin} className="space-y-4 text-left">
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 ml-1">Email Address</label>
                  <input 
                    type="email" required value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    disabled={isInteractionDisabled}
                    className="w-full px-4 py-3.5 rounded-xl border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 text-sm"
                    placeholder="admin@company.com"
                  />
                </div>
                
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 ml-1">Password</label>
                  <div className="relative">
                    <input 
                      type={showPassword ? "text" : "password"} required value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      disabled={isInteractionDisabled}
                      className="w-full pl-4 pr-12 py-3.5 rounded-xl border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 text-sm"
                      placeholder="••••••••"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute inset-y-0 right-0 pr-4 flex items-center text-slate-400 hover:text-indigo-600 cursor-pointer"
                    >
                      {showPassword ? (
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3.98 8.223A10.477 10.477 0 0 0 1.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.451 10.451 0 0 1 12 4.5c4.756 0 8.773 3.162 10.065 7.498a10.522 10.522 0 0 1-4.293 5.774M6.228 6.228 3 3m3.228 3.228 3.65 3.65m7.894 7.894L21 21m-3.228-3.228-3.65-3.65m0 0a3 3 0 1 0-4.243-4.243m4.242 4.242L9.88 9.88" /></svg>
                      ) : (
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M2.036 12.322a1.012 1.012 0 0 1 0-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178Z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" /></svg>
                      )}
                    </button>
                  </div>
                </div>
                
                <button
                  type="submit"
                  disabled={isInteractionDisabled}
                  className="w-full bg-slate-900 text-white py-3.5 rounded-xl font-bold transition-all hover:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed active:scale-[0.98] cursor-pointer"
                >
                  {isEmailLoading ? "Authenticating..." : "Sign In"}
                </button>

                <button
                  type="button"
                  onClick={() => { setLoginMethod("options"); setErrorMessage(null); }}
                  className="w-full text-slate-500 text-sm font-medium hover:text-slate-800 transition-colors flex items-center justify-center gap-2 py-2 cursor-pointer"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
                  Back to login options
                </button>
              </form>
            </div>
          )}
        </div>

        <p className="mt-8 text-center text-slate-400 text-xs">&copy; 2026 DBPI-CAS Inventory.</p>
      </div>
    </div>
  );
}