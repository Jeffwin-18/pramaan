import { prisma } from '../db';
import type { RecordInput } from '../rules';

// Loads everything the pure validator needs. Returns null if the course is not in the given institution.
export async function loadValidationContext(institutionId: string, courseId: string, year: string) {
  const course = await prisma.course.findFirst({ where: { id: courseId, institutionId } });
  if (!course) return null;
  const [rows, insts] = await Promise.all([
    prisma.studentRecord.findMany({ select: { id: true, institutionId: true, courseId: true, apaarId: true, fullName: true, dob: true, gender: true, category: true, isNRI: true, isOCI: true, isForeignNational: true, admissionYear: true, admissionType: true, fingerprint: true } }),
    prisma.institution.findMany({ select: { id: true, name: true, city: true } }),
  ]);
  const existing: RecordInput[] = rows;
  const initialCounts = { total: 0, supernumerary: 0, regularByCategory: {} as Record<string, number> };
  for (const r of rows) if (r.courseId === courseId && r.admissionYear === year) {
    initialCounts.total++;
    if (r.admissionType === 'supernumerary') initialCounts.supernumerary++;
    if (r.admissionType === 'regular') initialCounts.regularByCategory[r.category] = (initialCounts.regularByCategory[r.category] ?? 0) + 1;
  }
  return {
    course: { id: course.id, name: course.name, approvedIntake: course.approvedIntake, supernumerarySeats: course.supernumerarySeats, declaredCategorySeats: JSON.parse(course.declaredCategorySeats) as Record<string, number>, level: course.level },
    existing, institutions: new Map<string, { id: string; name: string; city: string }>((insts as { id: string; name: string; city: string }[]).map((i) => [i.id, i])), initialCounts,
  };
}
export const YEARS = ['2024-25', '2025-26', '2026-27'];
