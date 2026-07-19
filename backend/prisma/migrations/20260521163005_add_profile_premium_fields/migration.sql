-- AlterTable
ALTER TABLE "Room" ADD COLUMN     "background" TEXT,
ADD COLUMN     "nickname" TEXT,
ADD COLUMN     "premiumUserId" TEXT;

-- AlterTable
ALTER TABLE "RoomMember" ADD COLUMN     "nickname" TEXT;

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "address" TEXT,
ADD COLUMN     "dateOfBirth" TIMESTAMP(3),
ADD COLUMN     "phone" TEXT,
ADD COLUMN     "premiumUntil" TIMESTAMP(3),
ADD COLUMN     "watchCredits" INTEGER NOT NULL DEFAULT 300;
