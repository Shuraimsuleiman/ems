"use client";

import { useEffect } from "react";

export default function CallbackPage() {
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const next = params.get("next") ?? "/accept-invite";
    window.location.href = next;
  }, []);

  return (
    <div className="flex min-h-screen items-center justify-center">
      <p className="text-sm text-muted-foreground">Redirecting...</p>
    </div>
  );
}
