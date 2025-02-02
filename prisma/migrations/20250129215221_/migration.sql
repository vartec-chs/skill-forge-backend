/*
  Warnings:

  - You are about to drop the `File` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `Group` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `RefreshToken` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `Solution` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `Specialty` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `Student` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `Subject` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `Task` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `Teacher` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `User` table. If the table is not empty, all the data it contains will be lost.

*/
-- CreateEnum
CREATE TYPE "GradeBase" AS ENUM ('NINE', 'ELEVEN');

-- DropForeignKey
ALTER TABLE "File" DROP CONSTRAINT "File_taskId_fkey";

-- DropForeignKey
ALTER TABLE "Group" DROP CONSTRAINT "Group_specialtyId_fkey";

-- DropForeignKey
ALTER TABLE "Group" DROP CONSTRAINT "Group_teacherId_fkey";

-- DropForeignKey
ALTER TABLE "RefreshToken" DROP CONSTRAINT "RefreshToken_userId_fkey";

-- DropForeignKey
ALTER TABLE "Solution" DROP CONSTRAINT "Solution_mainFileId_fkey";

-- DropForeignKey
ALTER TABLE "Solution" DROP CONSTRAINT "Solution_studentId_fkey";

-- DropForeignKey
ALTER TABLE "Solution" DROP CONSTRAINT "Solution_taskId_fkey";

-- DropForeignKey
ALTER TABLE "Student" DROP CONSTRAINT "Student_groupId_fkey";

-- DropForeignKey
ALTER TABLE "Student" DROP CONSTRAINT "Student_userId_fkey";

-- DropForeignKey
ALTER TABLE "Subject" DROP CONSTRAINT "Subject_groupId_fkey";

-- DropForeignKey
ALTER TABLE "Subject" DROP CONSTRAINT "Subject_teacherId_fkey";

-- DropForeignKey
ALTER TABLE "Task" DROP CONSTRAINT "Task_subjectId_fkey";

-- DropForeignKey
ALTER TABLE "Teacher" DROP CONSTRAINT "Teacher_userId_fkey";

-- DropForeignKey
ALTER TABLE "User" DROP CONSTRAINT "User_avatarId_fkey";

-- DropForeignKey
ALTER TABLE "_AdditionalFilesRelation" DROP CONSTRAINT "_AdditionalFilesRelation_A_fkey";

-- DropForeignKey
ALTER TABLE "_AdditionalFilesRelation" DROP CONSTRAINT "_AdditionalFilesRelation_B_fkey";

-- DropTable
DROP TABLE "File";

-- DropTable
DROP TABLE "Group";

-- DropTable
DROP TABLE "RefreshToken";

-- DropTable
DROP TABLE "Solution";

-- DropTable
DROP TABLE "Specialty";

-- DropTable
DROP TABLE "Student";

-- DropTable
DROP TABLE "Subject";

-- DropTable
DROP TABLE "Task";

-- DropTable
DROP TABLE "Teacher";

-- DropTable
DROP TABLE "User";

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "phone" TEXT,
    "password" TEXT NOT NULL,
    "first_name" TEXT NOT NULL,
    "last_name" TEXT NOT NULL,
    "surname" TEXT,
    "date_of_birth" TIMESTAMP(3),
    "gender" "Gender",
    "role" "Role"[] DEFAULT ARRAY['GUEST']::"Role"[],
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "avatar_id" TEXT,
    "teacher_id" TEXT,
    "student_id" TEXT,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "refresh_tokens" (
    "id" TEXT NOT NULL,
    "ip" TEXT NOT NULL,
    "user_agent" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "refresh_tokens_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "teachers" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,

    CONSTRAINT "teachers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "students" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "group_id" TEXT,

    CONSTRAINT "students_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "specialties" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "short_name" TEXT NOT NULL,

    CONSTRAINT "specialties_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "groups" (
    "id" TEXT NOT NULL,
    "number" INTEGER NOT NULL,
    "base_on_grade" "GradeBase" NOT NULL,
    "specialty_id" INTEGER NOT NULL,
    "teacher_id" TEXT,

    CONSTRAINT "groups_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "subjects" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "teacher_id" TEXT,
    "group_id" TEXT,

    CONSTRAINT "subjects_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tasks" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "deadline" TIMESTAMP(3) NOT NULL,
    "subjectId" TEXT NOT NULL,

    CONSTRAINT "tasks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "solutions" (
    "id" TEXT NOT NULL,
    "main_file_id" TEXT NOT NULL,
    "student_id" TEXT NOT NULL,
    "task_id" TEXT NOT NULL,
    "status" "SolutionStatus" NOT NULL DEFAULT 'SUBMITTED',
    "grade" INTEGER,
    "feedback" TEXT,
    "submitted_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "reviewed_at" TIMESTAMP(3),
    "resubmit_deadline" TIMESTAMP(3),

    CONSTRAINT "solutions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "resubmissions" (
    "id" TEXT NOT NULL,
    "originalSolutionId" TEXT NOT NULL,
    "mainFileId" TEXT NOT NULL,
    "status" "SolutionStatus" NOT NULL DEFAULT 'SUBMITTED',
    "grade" INTEGER,
    "feedback" TEXT,
    "submittedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "reviewedAt" TIMESTAMP(3),

    CONSTRAINT "resubmissions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "files" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "extension" TEXT NOT NULL,
    "path" TEXT NOT NULL,
    "uploaded_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "task_id" TEXT,

    CONSTRAINT "files_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "_ResubmittedSolutionAdditionalFiles" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,

    CONSTRAINT "_ResubmittedSolutionAdditionalFiles_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_id_key" ON "users"("id");

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "users_phone_key" ON "users"("phone");

-- CreateIndex
CREATE INDEX "users_email_phone_idx" ON "users"("email", "phone");

-- CreateIndex
CREATE UNIQUE INDEX "refresh_tokens_token_key" ON "refresh_tokens"("token");

-- CreateIndex
CREATE INDEX "refresh_tokens_token_user_id_idx" ON "refresh_tokens"("token", "user_id");

-- CreateIndex
CREATE UNIQUE INDEX "teachers_id_key" ON "teachers"("id");

-- CreateIndex
CREATE UNIQUE INDEX "teachers_user_id_key" ON "teachers"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "students_user_id_key" ON "students"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "specialties_name_key" ON "specialties"("name");

-- CreateIndex
CREATE UNIQUE INDEX "specialties_short_name_key" ON "specialties"("short_name");

-- CreateIndex
CREATE UNIQUE INDEX "resubmissions_id_key" ON "resubmissions"("id");

-- CreateIndex
CREATE UNIQUE INDEX "resubmissions_mainFileId_key" ON "resubmissions"("mainFileId");

-- CreateIndex
CREATE INDEX "_ResubmittedSolutionAdditionalFiles_B_index" ON "_ResubmittedSolutionAdditionalFiles"("B");

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_avatar_id_fkey" FOREIGN KEY ("avatar_id") REFERENCES "files"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "refresh_tokens" ADD CONSTRAINT "refresh_tokens_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "teachers" ADD CONSTRAINT "teachers_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "students" ADD CONSTRAINT "students_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "students" ADD CONSTRAINT "students_group_id_fkey" FOREIGN KEY ("group_id") REFERENCES "groups"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "groups" ADD CONSTRAINT "groups_specialty_id_fkey" FOREIGN KEY ("specialty_id") REFERENCES "specialties"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "groups" ADD CONSTRAINT "groups_teacher_id_fkey" FOREIGN KEY ("teacher_id") REFERENCES "teachers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "subjects" ADD CONSTRAINT "subjects_teacher_id_fkey" FOREIGN KEY ("teacher_id") REFERENCES "teachers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "subjects" ADD CONSTRAINT "subjects_group_id_fkey" FOREIGN KEY ("group_id") REFERENCES "groups"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_subjectId_fkey" FOREIGN KEY ("subjectId") REFERENCES "subjects"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "solutions" ADD CONSTRAINT "solutions_main_file_id_fkey" FOREIGN KEY ("main_file_id") REFERENCES "files"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "solutions" ADD CONSTRAINT "solutions_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "students"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "solutions" ADD CONSTRAINT "solutions_task_id_fkey" FOREIGN KEY ("task_id") REFERENCES "tasks"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "resubmissions" ADD CONSTRAINT "resubmissions_originalSolutionId_fkey" FOREIGN KEY ("originalSolutionId") REFERENCES "solutions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "resubmissions" ADD CONSTRAINT "resubmissions_mainFileId_fkey" FOREIGN KEY ("mainFileId") REFERENCES "files"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "files" ADD CONSTRAINT "files_task_id_fkey" FOREIGN KEY ("task_id") REFERENCES "tasks"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_AdditionalFilesRelation" ADD CONSTRAINT "_AdditionalFilesRelation_A_fkey" FOREIGN KEY ("A") REFERENCES "files"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_AdditionalFilesRelation" ADD CONSTRAINT "_AdditionalFilesRelation_B_fkey" FOREIGN KEY ("B") REFERENCES "solutions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_ResubmittedSolutionAdditionalFiles" ADD CONSTRAINT "_ResubmittedSolutionAdditionalFiles_A_fkey" FOREIGN KEY ("A") REFERENCES "files"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_ResubmittedSolutionAdditionalFiles" ADD CONSTRAINT "_ResubmittedSolutionAdditionalFiles_B_fkey" FOREIGN KEY ("B") REFERENCES "resubmissions"("id") ON DELETE CASCADE ON UPDATE CASCADE;
