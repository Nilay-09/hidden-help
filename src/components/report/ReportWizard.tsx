"use client";

import { useState } from "react";
import { ReportForm } from "./ReportForm";
import { ReportSubmitted } from "./ReportFormCompleted";

interface ReportResult {
  message: string;
  reportId: string;
  success: boolean;
}

export function ReportWizard() {
  const [currentStep, setCurrentStep] = useState(1);
  const [reportData, setReportData] = useState<ReportResult | null>(null);

  const handleStepComplete = async (data: ReportResult) => {
    setReportData({ ...reportData, ...data });

    if (currentStep === 4) {
      return;
    }

    setCurrentStep((prev) => prev + 1);
  };
  console.log(reportData,"ttttttttttttttt")

  return (
    <div className="rounded-2xl bg-zinc-900 p-8">
      {currentStep === 1 && <ReportForm onComplete={handleStepComplete} />}
      {currentStep === 2 && (
        <ReportSubmitted data={reportData?.reportId} onComplete={handleStepComplete} />
      )}
    </div>
  );
}