import type { Metadata } from "next";

import { QuestionBank } from "@/components/app/question-bank";
import { TrackView } from "@/components/analytics/track-view";

export const metadata: Metadata = { title: "Question Bank" };

export default function QuestionsPage() {
  return (
    <>
      <TrackView event={{ name: "page_viewed", props: { path: "/app/questions" } }} />
      <QuestionBank />
    </>
  );
}
