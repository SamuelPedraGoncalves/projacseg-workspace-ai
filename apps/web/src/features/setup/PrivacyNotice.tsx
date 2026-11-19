import { Button, Dialog, DialogContent } from "@projacseg/ui";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { SETUP_STATUS_KEY, useSetupApi, useSetupStatus } from "./setup-api";

/** Aviso curto de privacidade, mostrado uma vez a quem não é administrador. */
export function PrivacyNotice() {
  const api = useSetupApi();
  const status = useSetupStatus();
  const client = useQueryClient();
  const pending = Boolean(api && status.data?.step === "done" && status.data.privacyNoticePending);
  const notice = useQuery({
    queryKey: ["setup", "privacy-notice"],
    queryFn: () => api!.privacyNotice(),
    enabled: pending,
  });
  const seen = useMutation({
    mutationFn: () => api!.markPrivacyNoticeSeen(),
    onSuccess: () => client.invalidateQueries({ queryKey: SETUP_STATUS_KEY }),
  });

  if (!pending || !notice.data) return null;
  return (
    <Dialog open onOpenChange={(open) => (open ? undefined : seen.mutate())}>
      <DialogContent title={notice.data.title} closeLabel="Fechar aviso">
        {notice.data.body.split("\n\n").map((paragraph) => (
          <p key={paragraph} className="mb-3 text-sm leading-relaxed">
            {paragraph}
          </p>
        ))}
        <div className="mt-5 flex justify-end">
          <Button disabled={seen.isPending} onClick={() => seen.mutate()}>
            Entendi
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
