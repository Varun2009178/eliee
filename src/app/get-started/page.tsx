"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "@/lib/auth-client";

export default function GetStartedPage() {
  const router = useRouter();
  const { data: session, isPending } = useSession();

  useEffect(() => {
    if (!isPending) {
      if (session) {
        // If already logged in, go to app
        router.push("/app");
      } else {
        // If not logged in, go to auth in sign-up mode
        router.push("/auth?mode=signup");
      }
    }
  }, [session, isPending, router]);

  return (
    <div className="min-h-screen bg-[#f5f3ef] flex items-center justify-center">
      <div className="flex flex-col items-center gap-4">
        <div className="w-6 h-6 border-2 border-black/10 border-t-black/40 rounded-full animate-spin" />
        <p className="text-sm text-black/40">Redirecting...</p>
      </div>
    </div>
  );
}
