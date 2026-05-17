import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { getDefaultAuthenticatedPath, needsProfileOnboarding } from "@/lib/permissions";
import { isEntryPortalSlug } from "@/lib/entry-portals";

type AuthenticatedHomePageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

export default async function AuthenticatedHomePage({ searchParams }: AuthenticatedHomePageProps) {
  const session = await auth();

  if (!session) {
    redirect("/admin/login");
  }

  const params = searchParams ? await searchParams : undefined;
  const portalValue = typeof params?.portal === "string" ? params.portal : null;

  if (needsProfileOnboarding(session) && isEntryPortalSlug(portalValue)) {
    redirect(`/app/boas-vindas?portal=${portalValue}`);
  }

  redirect(getDefaultAuthenticatedPath(session));
}
