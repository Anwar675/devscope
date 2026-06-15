"use client";
import { authClient } from "@/lib/auth-client";
import { LogOut, ShieldCheck, User } from "lucide-react";
import multiavatar from "@multiavatar/multiavatar";
import Link from "next/link";
import { useEffect, useState } from "react";

type AuthSession = Awaited<ReturnType<typeof authClient.getSession>>["data"];

export const UserStatus = () => {
  const [session, setSession] = useState<AuthSession>(null);
  const [isPending, setIsPending] = useState(true);
  const [isUserPanelOpen, setIsUserPanelOpen] = useState(false);

  useEffect(() => {
    let isMounted = true;

    async function loadSession() {
      try {
        const { data } = await authClient.getSession();

        if (isMounted) {
          setSession(data ?? null);
        }
      } catch {
        if (isMounted) {
          setSession(null);
        }
      } finally {
        if (isMounted) {
          setIsPending(false);
        }
      }
    }

    void loadSession();

    return () => {
      isMounted = false;
    };
  }, []);

  const userName = session?.user.name ?? "User";
  const userEmail = session?.user.email ?? "";
  const avatarSeed =
    session?.user.id ?? session?.user.email ?? session?.user.name ?? "guest";

  const avatarSvg = multiavatar(avatarSeed);

  const handleSignOut = async () => {
    await authClient.signOut();
    setSession(null);
    setIsUserPanelOpen(false);
  };
  return (
    <>
      {isPending ? (
        <div className="h-10 w-10 rounded-full bg-dev-surface/10 animate-pulse" />
      ) : (
        <div className="relative">
          <button
            type="button"
            onClick={() => setIsUserPanelOpen((value) => !value)}
            className={`flex h-10 w-10 items-center justify-center rounded-full border transition-all ${
              session?.user
                ? "border-dev-border bg-dev text-dev-text hover:bg-dev-accent-hover"
                : "border-dev-border bg-dev-surface/10 text-dev-text-muted hover:bg-dev-surface/20 hover:text-dev-text"
            }`}
            aria-label="Open user status"
            aria-expanded={isUserPanelOpen}
          >
            {session?.user ? (
              <div
                className="h-8 w-8 overflow-hidden rounded-full"
                dangerouslySetInnerHTML={{
                  __html: avatarSvg,
                }}
              />
            ) : (
              <User className="h-4 w-4" />
            )}
          </button>

          {isUserPanelOpen && (
            <div className="absolute right-0 top-14 w-72 rounded-xl border border-dev-border bg-dev-nav p-4 shadow-2xl backdrop-blur-xl">
              <div className="mb-4 flex items-center gap-3">
                <div className="h-11 w-11 overflow-hidden rounded-full">
                  {session?.user ? (
                    <div
                      dangerouslySetInnerHTML={{
                        __html: avatarSvg,
                      }}
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center rounded-full bg-dev">
                      <User className="h-5 w-5" />
                    </div>
                  )}
                </div>
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-dev-text">
                    {session?.user ? userName : "Guest"}
                  </p>
                  <p className="truncate text-xs text-dev-text-muted">
                    {session?.user ? userEmail : "Not signed in"}
                  </p>
                </div>
              </div>

              <div className="rounded-lg border border-dev-border bg-dev-surface/10 p-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-sm text-dev-text">
                    <ShieldCheck className="h-4 w-4 text-dev-accent" />
                    Status
                  </div>
                  <span
                    className={`rounded-full px-2 py-1 text-xs ${
                      session?.user
                        ? "bg-green-500/20 text-green-300"
                        : "bg-dev-surface/20 text-dev-text-muted"
                    }`}
                  >
                    {session?.user ? "Active" : "Guest"}
                  </span>
                </div>
              </div>

              {session?.user ? (
                <button
                  type="button"
                  onClick={handleSignOut}
                  className="mt-3 flex w-full items-center justify-center gap-2 rounded-lg border border-dev-border bg-dev-surface/10 px-4 py-2 text-sm font-medium text-dev-text transition-all hover:bg-dev-surface/20"
                >
                  <LogOut className="h-4 w-4" />
                  Sign Out
                </button>
              ) : (
                <Link
                  href="/sign-in"
                  onClick={() => setIsUserPanelOpen(false)}
                  className="mt-3 flex w-full items-center justify-center gap-2 rounded-lg border border-dev-border bg-dev-surface/10 px-4 py-2 text-sm font-medium text-dev-text transition-all hover:bg-dev-surface/20"
                >
                  <User className="h-4 w-4" />
                  Sign In
                </Link>
              )}
            </div>
          )}
        </div>
      )}
    </>
  );
};
