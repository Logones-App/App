import { Alert, AlertDescription } from "@/components/ui/alert";

interface ErrorAlertProps {
  errorMsg: string | null;
}

export function ErrorAlert({ errorMsg }: ErrorAlertProps) {
  if (!errorMsg) return null;

  return (
    <Alert variant="destructive">
      <AlertDescription>{errorMsg}</AlertDescription>
    </Alert>
  );
}
