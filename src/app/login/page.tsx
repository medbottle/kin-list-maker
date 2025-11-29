"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase-client";

export default function LoginPage() {
  const supabase = createClient();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  async function login(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password
    });

    if (error) {
      alert(error.message);
    } else {
      window.location.href = "/dashboard";
    }
  }

  return (
    <main className="p-8 max-w-md mx-auto space-y-6">
      <h1 className="text-3xl font-bold">Login</h1>

      <form onSubmit={login} className="space-y-4">
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

        <button className="bg-blue-600 text-white px-4 py-2 rounded w-full">
          Login
        </button>
      </form>

      <a href="/login/signup" className="underline text-blue-700">
        Need an account? Sign up
      </a>
    </main>
  );
}
