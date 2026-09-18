import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireUser, UnauthorizedError } from "@/lib/authz";
import { logEvent } from "@/lib/log";

const createProjectSchema = z.object({
  name: z.string().min(1).max(200),
  description: z.string().max(2000).optional()
});

export async function GET() {
  try {
    const user = await requireUser();
    const projects = await prisma.project.findMany({
      where: { ownerId: user.id },
      orderBy: { updatedAt: "desc" },
      include: { _count: { select: { studyAreas: true, analysisJobs: true } } }
    });
    return NextResponse.json({ projects });
  } catch (err) {
    if (err instanceof UnauthorizedError) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    throw err;
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await requireUser();
    const body = await req.json();
    const parsed = createProjectSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
    }

    const project = await prisma.project.create({
      data: {
        ownerId: user.id,
        name: parsed.data.name,
        description: parsed.data.description
      }
    });

    await logEvent("INFO", "projects", `Project "${project.name}" created`, {
      userId: user.id,
      metadata: { projectId: project.id }
    });

    return NextResponse.json({ project }, { status: 201 });
  } catch (err) {
    if (err instanceof UnauthorizedError) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    throw err;
  }
}
