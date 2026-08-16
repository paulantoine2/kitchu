"use client";

import { useState } from "react";
import { LogIn } from "lucide-react";
import { toast } from "sonner";
import { authClient } from "@/lib/auth-client";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";

type Provider = "google" | "apple";

export function LoginButtons({
  google,
  apple,
}: {
  google: boolean;
  apple: boolean;
}) {
  const [pending, setPending] = useState<Provider | null>(null);

  async function signIn(provider: Provider) {
    setPending(provider);
    const result = await authClient.signIn.social({ provider, callbackURL: "/recipes" });
    if (result.error) {
      setPending(null);
      toast.error("La connexion a échoué. Réessayez dans un instant.");
    }
  }

  return (
    <div className="flex flex-col gap-3">
      {google && (
        <Button variant="outline" onClick={() => signIn("google")} disabled={pending !== null}>
          {pending === "google" ? <Spinner data-icon="inline-start" /> : <LogIn data-icon="inline-start" />}
          Continuer avec Google
        </Button>
      )}
      {apple && (
        <Button variant="outline" onClick={() => signIn("apple")} disabled={pending !== null}>
          {pending === "apple" ? <Spinner data-icon="inline-start" /> : <LogIn data-icon="inline-start" />}
          Continuer avec Apple
        </Button>
      )}
    </div>
  );
}
