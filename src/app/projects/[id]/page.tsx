import { getServerSession } from "next-auth";
import { redirect, notFound } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { listStudyAreasForProject } from "@/lib/gis/studyArea";
import { MapExplorerPanel } from "@/components/MapExplorerPanel";

export default async function ProjectPage({ params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  const userId = (session?.user as { id?: string; role?: string } | undefined)?.id;
  const role = (session?.user as { role?: string } | undefined)?.role;
  if (!userId) {
    redirect("/login");
  }

  const project = await prisma.project.findUnique({ where: { id: params.id } });
  if (!project) {
    notFound();
  }
  if (project.ownerId !== userId && role !== "ADMIN") {
    // Deliberately identical to "not found" rather than "403" so a user
    // cannot use this route to probe which project ids exist.
    notFound();
  }

  const studyAreas = await listStudyAreasForProject(project.id);

  return (
    <MapExplorerPanel
      projectId={project.id}
      projectName={project.name}
      studyAreas={studyAreas.map((sa) => ({
        id: sa.id,
        name: sa.name,
        areaKm2: sa.areaKm2,
        centerLat: sa.centerLat,
        centerLng: sa.centerLng,
        sourceType: sa.sourceType,
        createdAt: sa.createdAt.toISOString()
      }))}
    />
  );
}
