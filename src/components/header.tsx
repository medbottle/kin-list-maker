"use client";

import { useEffect, useState, useMemo } from "react";
import { AuthStatus } from "./auth-status";
import Link from "next/link";
import Image from "next/image";
import { createClient } from "@/lib/supabase-client";
import type { User } from "@supabase/supabase-js";

export function Header() {
  const [user, setUser] = useState<User | null>(null);
  const supabase = useMemo(() => createClient(), []);

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
  }, [supabase]);

  const profilePicture = user?.user_metadata?.profile_picture || null;

  return (
    <header className="w-full bg-white dark:bg-black fixed top-0 left-0 right-0 z-99">
      <div className="w-full px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <Link href="/" className="text-xl font-semibold text-gray-900 dark:text-white hover:text-gray-700 dark:hover:text-gray-300 transition-colors">
            Kin List Maker
          </Link>
          <div className="flex items-center gap-3">
            {user && profilePicture && (
              <Link href="/profile" className="relative w-10 h-10 rounded-full overflow-hidden transition-transform duration-300 hover:scale-110 cursor-pointer">
                <Image
                  src={profilePicture}
                  alt="Profile picture"
                  fill
                  className="object-cover"
                  unoptimized
                  onError={(e) => {
                    e.currentTarget.style.display = "none";
                  }}
                />
              </Link>
            )}
            {user && !profilePicture && (
              <Link href="/profile" className="w-10 h-10 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center transition-transform duration-300 hover:scale-110 cursor-pointer">
                <span className="text-gray-400 text-lg">👤</span>
              </Link>
            )}
            <AuthStatus />
          </div>
        </div>
      </div>
    </header>
  );
}

