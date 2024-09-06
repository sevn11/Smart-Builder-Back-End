-- CreateTable
CREATE TABLE "template_question_answer" (
    "id" SERIAL NOT NULL,
    "question_id" INTEGER NOT NULL,
    "answerIds" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "answerText" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "template_question_answer_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "template_question_answer_question_id_key" ON "template_question_answer"("question_id");

-- AddForeignKey
ALTER TABLE "template_question_answer" ADD CONSTRAINT "template_question_answer_question_id_fkey" FOREIGN KEY ("question_id") REFERENCES "template_question"("id") ON DELETE CASCADE ON UPDATE CASCADE;
