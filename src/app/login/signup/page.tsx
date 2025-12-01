"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase-client";
import { generateUserNumber } from "@/lib/user-number";

export default function SignupPage() {
  const supabase = createClient();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function signup(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const { data, error: signUpError } = await supabase.auth.signUp({
        email,
        password
      });

      if (signUpError) {
        setError(signUpError.message);
        setLoading(false);
        return;
      }

      if (data.user) {
        // Profile should be created automatically by database trigger
        // But we'll also try to create/update it here as a fallback
        const userNumber = generateUserNumber(data.user.id);
        
        try {
          await supabase
            .from("profiles")
            .upsert({
              id: data.user.id,
              email: data.user.email || "",
              user_number: userNumber,
            }, {
              onConflict: "id",
            });
        } catch (profileError) {
          // Profile creation failed, but user was created
          // This might happen if migrations haven't been run
          console.error("Failed to create profile:", profileError);
          if (profileError instanceof Error && profileError.message.includes("does not exist")) {
            setError("Database setup incomplete. Please contact support or ensure migrations have been run.");
          }
        }
        
        window.location.href = "/login";
      }
    } catch (err) {
      setError("An unexpected error occurred. Please try again.");
      console.error("Signup error:", err);
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="p-8 max-w-md mx-auto space-y-6">
      <h1 className="text-3xl font-bold">Sign Up</h1>

      {error && (
        <div className="bg-red-100 dark:bg-red-900 border border-red-400 text-red-700 dark:text-red-300 px-4 py-3 rounded">
          {error}
        </div>
      )}

      <form onSubmit={signup} className="space-y-4">
        <input
          className="border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white p-2 w-full rounded"
          placeholder="Email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          disabled={loading}
        />

        <input
          className="border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white p-2 w-full rounded"
          placeholder="Password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          disabled={loading}
        />

        <button 
          className="bg-green-600 text-white px-4 py-2 rounded w-full hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
          disabled={loading}
        >
          {loading ? "Creating Account..." : "Create Account"}
        </button>
      </form>

      <a href="/login" className="underline text-blue-700 dark:text-blue-400">
        Already have an account? Login
      </a>
    </main>
  );
}
