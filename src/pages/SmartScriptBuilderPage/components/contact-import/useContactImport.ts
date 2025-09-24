import { useCallback, useState } from "react";
import type { ExtendedSmartScriptStep } from "../../../../types/loopScript";
import { ContactImportManager } from "./ContactImportManager";

export const useContactImport = (
  steps: ExtendedSmartScriptStep[],
  setSteps: React.Dispatch<React.SetStateAction<ExtendedSmartScriptStep[]>>
) => {
  const [showContactWorkflowSelector, setShowContactWorkflowSelector] =
    useState(false);

  const handleCreateContactImport = useCallback(
    (currentDeviceId: string) => {
      setSteps((prev) =>
        ContactImportManager.createContactImportSteps(currentDeviceId, prev)
      );
      // 与原逻辑一致的提示在Manager内部或此处都可
    },
    [setSteps]
  );

  const handleContactWorkflowStepsGenerated = useCallback(
    (generatedSteps: ExtendedSmartScriptStep[]) => {
      setSteps((prev) =>
        ContactImportManager.handleWorkflowGenerated(generatedSteps, prev)
      );
      setShowContactWorkflowSelector(false);
    },
    [setSteps]
  );

  return {
    showContactWorkflowSelector,
    setShowContactWorkflowSelector,
    handleCreateContactImport,
    handleContactWorkflowStepsGenerated,
  };
};
