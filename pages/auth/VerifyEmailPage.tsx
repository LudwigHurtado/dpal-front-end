import React, { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { AuthPageShell } from "./AuthPageShell";
import { verifyEmailRequest } from "../../auth/authApi";

export default function VerifyEmailPage() {
  const [search] = useSearchParams();
  const token = search.get("token") || "";

  const [status, setStatus] = useState<"idle" | "loading" | "ok" | "err">("idle");
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (!token) {
      setStatus("err");
      setMessage("Missing verification token.");
      return;
    }
    let cancelled = false;
    (async () => {
      setStatus("loading");
      try {
        const data = await verifyEmailRequest(token);
        if (!cancelled) {
          setStatus("ok");
          setMessage(typeof data.message === "string" ? data.message : "Email verified.");
        }
      } catch (e: unknown) {
        if (!cancelled) {
          setStatus("err");
          setMessage(e instanceof Error ? e.message : "Verification failed.");
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [token]);

  return (
    <AuthPageShell title="Email verification" subtitle="Confirming your address unlocks full platform access.">
      {status === "loading" ? (
        <p className="text-sm text-[var(--dpal-text-muted)]">Verifying…</p>
      ) : status === "ok" ? (
        <p className="text-sm text-emerald-300">{message}</p>
      ) : (
        <p className="text-sm text-rose-200">{message}</p>
      )}
      <p className="mt-6 text-center text-sm text-[var(--dpal-text-muted)]">
        <Link className="text-blue-400 hover:underline" to="/account">
          Account home
        </Link>{" "}
        ·{" "}
        <Link className="text-blue-400 hover:underline" to="/login">
          Sign in
        </Link>
      </p>
    </AuthPageShell>
  );
}
