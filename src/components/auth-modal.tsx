"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase-client";
import { generateUserNumber } from "@/lib/user-number";

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialMode?: "login" | "signup";
}

export function AuthModal({ isOpen, onClose, initialMode = "login" }: AuthModalProps) {
  const [mode, setMode] = useState<"login" | "signup">(initialMode);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const supabase = createClient();

  if (!isOpen) return null;

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      if (mode === "login") {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });

        if (error) {
          setError(error.message);
        } else {
          onClose();
          window.location.reload();
        }
      } else {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: {
              display_name: displayName.trim() || null,
            },
          },
        });

        if (error) {
          setError(error.message);
        } else if (data.user) {
          const userNumber = generateUserNumber(data.user.id);
          
          let location = null;
          let countryCode = null;
          try {
            const geoResponse = await fetch("/api/geolocation");
            const geoData = await geoResponse.json();
            if (geoData.country) {
              location = geoData.country;
              countryCode = geoData.countryCode;
            }
          } catch (error) {
            console.error("Error fetching location:", error);
          }
          
          const { error: updateError } = await supabase.auth.updateUser({
            data: {
              display_name: displayName.trim() || null,
              user_number: userNumber,
              location: location,
              country_code: countryCode,
            },
          });

          if (updateError) {
            console.error("Failed to update user metadata:", updateError);
            setError("Account created but failed to save profile information. Please try updating your profile after logging in.");
          } else {
            setError(null);
            alert("Account created! Please log in.");
          }
          
          setMode("login");
          setEmail("");
          setPassword("");
          setDisplayName("");
        }
      }
    } catch {
      setError("An unexpected error occurred");
    } finally {
      setLoading(false);
    }
  }

  function handleClose() {
    setEmail("");
    setPassword("");
    setDisplayName("");
    setError(null);
    setMode(initialMode);
    onClose();
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50"
      onClick={handleClose}
    >
      <div
        className="bg-white dark:bg-gray-800 rounded-lg shadow-xl p-8 max-w-md w-full mx-4"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
            {mode === "login" ? "Login" : "Sign Up"}
          </h2>
          <button
            onClick={handleClose}
            className="text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 text-2xl"
          >
            ×
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="bg-red-100 dark:bg-red-900 border border-red-400 text-red-700 dark:text-red-300 px-4 py-3 rounded">
              {error}
            </div>
          )}

          <div>
            <input
              className="border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white p-3 w-full rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              disabled={loading}
            />
          </div>

          {mode === "signup" && (
            <div>
              <input
                className="border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white p-3 w-full rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Display Name (optional)"
                type="text"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                disabled={loading}
              />
            </div>
          )}

          <div>
            <input
              className="border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white p-3 w-full rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              disabled={loading}
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className={`w-full px-4 py-2 rounded-md text-white font-medium ${
              mode === "login"
                ? "bg-blue-600 hover:bg-blue-700"
                : "bg-green-600 hover:bg-green-700"
            } disabled:opacity-50 disabled:cursor-not-allowed`}
          >
            {loading
              ? "Loading..."
              : mode === "login"
              ? "Login"
              : "Create Account"}
          </button>
        </form>

        <div className="mt-4 text-center">
          <button
            onClick={() => {
              setMode(mode === "login" ? "signup" : "login");
              setError(null);
              setDisplayName("");
            }}
            className="text-blue-600 dark:text-blue-400 hover:underline text-sm"
          >
            {mode === "login"
              ? "Need an account? Sign up"
              : "Already have an account? Login"}
          </button>
        </div>
      </div>
    </div>
  );
}

