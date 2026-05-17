import { DefaultSession } from "next-auth";

type MuseuDoMarUserFields = {
  id: string;
  isAdmin: boolean;
  roles: string[];
  primaryRole: string | null;
  permissions: string[];
};

declare module "next-auth" {
  interface Session {
    user: DefaultSession["user"] & MuseuDoMarUserFields;
  }

  interface User extends MuseuDoMarUserFields {
    name?: string | null;
    email?: string | null;
  }
}

declare module "next-auth/jwt" {
  // eslint-disable-next-line @typescript-eslint/no-empty-object-type
  interface JWT extends Partial<MuseuDoMarUserFields> {}
}