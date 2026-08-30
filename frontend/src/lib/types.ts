export type Role = 'ADMIN' | 'TEACHER';
export type User = { id: string; name: string; email: string; role: Role; isActive?: boolean };
export type AcademicYear = { id: string; name: string; status: 'ACTIVE' | 'CLOSED' };
export type ClassRoom = { id: string; name: string; formLevel: number; isActive: boolean };
export type Student = { id: string; studentCode: string; fullName: string; icMasked: string | null; status: string; classRoom?: ClassRoom | null; nfcUid?: string | null };
