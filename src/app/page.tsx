"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase-client";
import type { User } from "@supabase/supabase-js";
import { AuthStatus } from "@/components/auth-status";

export default function Home() {
  const [user, setUser] = useState<User | null>(null);
  const supabase = createClient();

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, [supabase.auth]);

  return (
    <main className="min-h-screen flex flex-col items-center justify-center px-4 py-12 bg-white dark:bg-black relative">
      <div className="fixed top-4 right-4 z-10">
        <AuthStatus />
      </div>

      <div className="max-w-3xl w-full space-y-8">
        <div className="text-center space-y-6">
          <h1 className="text-6xl md:text-7xl font-light text-gray-900 dark:text-white tracking-tight">
            Kin List Maker
          </h1>

          <p className="text-xl md:text-2xl text-gray-500 dark:text-gray-400 font-light max-w-xl mx-auto">
            an easy and simple way of showcasing your kin list
          </p>
        </div>

        <div className="flex justify-center gap-4">
          <Link
            href={user ? "/profile" : "#"}
            onClick={(e) => {
              if (!user) {
                e.preventDefault();
              }
            }}
            className={`px-4 py-2 rounded-md ${
              user
                ? "bg-blue-600 text-white hover:bg-blue-700"
                : "bg-gray-400 text-gray-200 cursor-not-allowed opacity-50"
            }`}
          >
            My profile
          </Link>
          <Link
            href="/characters"
            className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700"
          >
            Characters
          </Link>
        </div>
      </div>
    </main>
  );
}
