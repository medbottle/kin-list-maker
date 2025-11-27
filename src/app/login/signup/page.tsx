"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase-client";

export default function SignupPage() {
  const supabase = createClient();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  async function signup(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();

    const { error } = await supabase.auth.signUp({
      email,
      password
    });

    if (error) {
      alert(error.message);
    } else {
      alert("Account created! Please log in.");
      window.location.href = "/login";
    }
  }

  return (
    <main className="p-8 max-w-md mx-auto space-y-6">
      <h1 className="text-3xl font-bold">Sign Up</h1>

      <form onSubmit={signup} className="space-y-4">
        <input
          className="border p-2 w-full"
          placeholder="Email"
          type="email"
          onChange={(e) => setEmail(e.target.value)}
        />

        <input
          className="border p-2 w-full"
          placeholder="Password"
          type="password"
          onChange={(e) => setPassword(e.target.value)}
        />

        <button className="bg-green-600 text-white px-4 py-2 rounded w-full">
          Create Account
        </button>
      </form>

      <a href="/login" className="underline text-blue-700">
        Already have an account? Login
      </a>
    </main>
  );
}
