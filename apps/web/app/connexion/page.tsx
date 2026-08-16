import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft, Info } from "lucide-react";
import { LoginButtons } from "@/components/auth/login-buttons";
import { KitchuLogo } from "@/components/kitchu/kitchu-logo";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { buttonVariants } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { authProviderAvailability } from "@/lib/auth";
import { getOptionalUser } from "@/lib/auth-user";

export default async function LoginPage() {
  const viewer = await getOptionalUser();
  if (viewer) redirect("/recipes");

  const hasProvider = authProviderAvailability.google || authProviderAvailability.apple;

  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-4 py-12">
      <div className="flex w-full max-w-md flex-col gap-6">
        <div className="flex justify-center">
          <KitchuLogo />
        </div>
        <Card>
          <CardHeader>
            <CardTitle className="text-xl">Votre cuisine, rien qu’à vous</CardTitle>
            <CardDescription>
              Connectez-vous pour retrouver votre panier, vos stocks, vos prix et vos références produit.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            {hasProvider ? (
              <LoginButtons {...authProviderAvailability} />
            ) : (
              <Alert>
                <Info />
                <AlertTitle>Connexion non configurée</AlertTitle>
                <AlertDescription>
                  Ajoutez les identifiants OAuth Google ou Apple dans l’environnement du serveur.
                </AlertDescription>
              </Alert>
            )}
            <Link href="/recipes" className={buttonVariants({ variant: "ghost" })}>
              <ArrowLeft data-icon="inline-start" />
              Continuer sans compte
            </Link>
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
