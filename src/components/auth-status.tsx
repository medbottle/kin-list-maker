"use client";

import { useEffect, useState, useMemo } from "react";
import { createClient } from "@/lib/supabase-client";
import type { User } from "@supabase/supabase-js";
import { AuthModal } from "./auth-modal";
import { LogOut, LogIn } from "lucide-react";

export function AuthStatus() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const supabase = useMemo(() => createClient(), []);

  useEffect(() => {
    // Check current session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      setLoading(false);
    });

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, [supabase]);

  async function handleLogout() {
    await supabase.auth.signOut();
    window.location.href = "/";
  }

  if (loading) {
    return <p className="text-sm text-gray-500 dark:text-gray-400">Loading...</p>;
  }

  if (user) {
    return (
      <>
        <div className="flex items-center gap-4">
          <p className="text-sm text-green-600 dark:text-green-400">
            Logged in as <span className="text-white">{user.user_metadata?.display_name || user.email}</span>
          </p>
          <button
            onClick={handleLogout}
            className="bg-red-600 text-white p-2 rounded-md transition-colors hover:bg-red-700 hover:scale-110"
            title="Logout"
          >
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      </>
    );
  }

  return (
    <>
      <div className="flex items-center gap-4">
        <p className="text-sm text-gray-500 dark:text-gray-400">Not logged in</p>
        <button
          onClick={() => setIsModalOpen(true)}
          className="bg-green-600 text-white p-2 rounded-md transition-colors hover:bg-green-700 hover:scale-110"
          title="Login"
        >
          <LogIn className="h-4 w-4" />
        </button>
      </div>
      <AuthModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        initialMode="login"
      />
    </>
  );
}

