"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase-client";
import type { User } from "@supabase/supabase-js";
import { AuthStatus } from "@/components/auth-status";
import { User as UserIcon, Users, UserSearch } from "lucide-react";

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
            an easy and simple way of managing your kin list
          </p>
        </div>

        <div className="flex justify-center items-center gap-4">
          <Link
            href={user ? "/profile" : "#"}
            onClick={(e) => {
              if (!user) {
                e.preventDefault();
              }
            }}
            className={`flex flex-col items-center gap-2 p-4 transition-all duration-300 ${
              user
                ? "text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 cursor-pointer hover:scale-110"
                : "text-gray-400 cursor-not-allowed opacity-50"
            }`}
          >
            <UserIcon className="h-12 w-12" />
            <span className="text-sm font-medium tracking-wide">My profile</span>
          </Link>
          <div className="h-16 w-px bg-gray-300 dark:bg-gray-700"></div>
          <Link
            href="/characters"
            className="flex flex-col items-center gap-2 p-4 text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 transition-all duration-300 cursor-pointer hover:scale-110"
          >
            <Users className="h-12 w-12" />
            <span className="text-sm font-medium tracking-wide">Characters</span>
          </Link>
          <div className="h-16 w-px bg-gray-300 dark:bg-gray-700"></div>
          <button
            disabled
            className="flex flex-col items-center gap-2 p-4 text-gray-400 dark:text-gray-600 cursor-not-allowed opacity-50 transition-all duration-300"
            title="Search users"
          >
            <UserSearch className="h-12 w-12" />
            <span className="text-sm font-medium tracking-wide">Search users</span>
          </button>
        </div>
      </div>
    </main>
  );
}
