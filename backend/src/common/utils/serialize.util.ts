/**
 * Converts BigInt fields to numbers for JSON serialization.
 * Prisma uses BigInt for fileSize — JSON.stringify can't handle it natively.
 */
export function serializeFile(file: {
  id: string;
  roomId: string;
  filePath: string;
  fileName: string;
  fileSize: bigint;
  mimeType: string;
  uploadedById: string;
  expiresAt: Date | null;
  keepSessions: number;
  usedSessions: number;
  createdAt: Date;
}): Record<string, unknown> {
  return {
    id: file.id,
    roomId: file.roomId,
    filePath: file.filePath,
    fileName: file.fileName,
    fileSize: Number(file.fileSize),
    mimeType: file.mimeType,
    uploadedById: file.uploadedById,
    expiresAt: file.expiresAt,
    keepSessions: file.keepSessions,
    usedSessions: file.usedSessions,
    createdAt: file.createdAt,
  };
}
