-- CreateTable
CREATE TABLE "ProjectView" (
    "id" TEXT NOT NULL,
    "userId" INTEGER NOT NULL,
    "projectId" TEXT NOT NULL,
    "viewedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ProjectView_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ProjectView_userId_projectId_key" ON "ProjectView"("userId", "projectId");

-- AddForeignKey
ALTER TABLE "ProjectView" ADD CONSTRAINT "ProjectView_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProjectView" ADD CONSTRAINT "ProjectView_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
