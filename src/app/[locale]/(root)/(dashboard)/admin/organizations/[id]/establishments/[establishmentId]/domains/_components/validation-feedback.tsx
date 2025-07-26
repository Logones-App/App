import { AlertCircle, CheckCircle, Info } from "lucide-react";

interface ValidationFeedbackProps {
  validationError: string | null;
  validationWarnings: string[];
  newDomain: string;
}

export function ValidationFeedback({ validationError, validationWarnings, newDomain }: ValidationFeedbackProps) {
  if (validationError) {
    return (
      <div className="flex items-center gap-2 text-sm text-red-600">
        <AlertCircle className="h-4 w-4" />
        <span>{validationError}</span>
      </div>
    );
  }

  if (validationWarnings.length > 0) {
    return (
      <div className="space-y-1">
        {validationWarnings.map((warning, index) => (
          <div key={index} className="flex items-center gap-2 text-sm text-yellow-600">
            <Info className="h-4 w-4" />
            <span>{warning}</span>
          </div>
        ))}
      </div>
    );
  }

  if (newDomain.trim()) {
    return (
      <div className="flex items-center gap-2 text-sm text-green-600">
        <CheckCircle className="h-4 w-4" />
        <span>Format de domaine valide</span>
      </div>
    );
  }

  return null;
}
