import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";

export class UnauthorizedError extends Error {
  constructor(message = "Unauthorized") {
    super(message);
    this.name = "UnauthorizedError";
  }
}

export class ForbiddenError extends Error {
  constructor(message = "Forbidden") {
    super(message);
    this.name = "ForbiddenError";
  }
}

export interface AuthedUser {
  id: string;
  email: string;
  role: "USER" | "ADMIN";
}

/** Throws UnauthorizedError if there is no valid session. Call this first
 * in every API route handler that touches user or project data. */
export async function requireUser(): Promise<AuthedUser> {
  const session = await getServerSession(authOptions);
  const user = session?.user as { id?: string; email?: string; role?: string } | undefined;
  if (!user?.id || !user.email) {
    throw new UnauthorizedError();
  }
  return { id: user.id, email: user.email, role: (user.role as "USER" | "ADMIN") ?? "USER" };
}

export async function requireAdmin(): Promise<AuthedUser> {
  const user = await requireUser();
  if (user.role !== "ADMIN") {
    throw new ForbiddenError("Admin access required");
  }
  return user;
}

/**
 * Loads a project and throws ForbiddenError unless `user` owns it.
 * This is the single choke point that implements "the user sees only
 * their own projects" from the spec's Database section — every route that
 * touches a project MUST go through this instead of querying by id alone.
 */
export async function requireOwnedProject(user: AuthedUser, projectId: string) {
  const project = await prisma.project.findUnique({ where: { id: projectId } });
  if (!project) {
    throw new ForbiddenError("Project not found");
  }
  if (project.ownerId !== user.id && user.role !== "ADMIN") {
    throw new ForbiddenError("You do not have access to this project");
  }
  return project;
}
