import { useEffect, useMemo, useState } from "react";
import { Loader2, Mail, Save, Users } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useGetCorporateEmployeesQuery } from "@/Services/apis/corporateApi";
import { useUpdateClientWalletSettingsMutation } from "@/Services/apis/creditsApi";
import { toCreditDecimalString } from "@/utils/creditMath";

const splitEmails = (value = "") =>
  String(value || "")
    .split(",")
    .map((email) => email.trim())
    .filter(Boolean);

const joinEmails = (emails = []) => Array.from(new Set(emails.filter(Boolean))).join(", ");

const getRecipientId = (recipient = {}) =>
  String(recipient.id ?? recipient.empId ?? recipient.email ?? "").trim();

const getInitialSelectedRecipientIds = (wallet = {}) => {
  if (Array.isArray(wallet.lowBalanceAlertRecipientIds)) {
    return wallet.lowBalanceAlertRecipientIds.map(String);
  }

  const configuredEmails = new Set(splitEmails(wallet.lowBalanceAlertEmails).map((email) => email.toLowerCase()));
  return (wallet.lowBalanceAlertRecipients || [])
    .filter((recipient) => configuredEmails.has(String(recipient.email || "").toLowerCase()))
    .map(getRecipientId)
    .filter(Boolean);
};

const getAdditionalAlertEmails = (wallet = {}, selectedIds = [], recipients = []) => {
  const selectedEmailSet = new Set(
    [
      ...(wallet.lowBalanceAlertRecipients || []).map((recipient) => recipient?.email),
      ...recipients
        .filter((recipient) => selectedIds.includes(recipient.id))
        .map((recipient) => recipient.email),
    ]
      .map((email) => String(email || "").trim().toLowerCase())
      .filter(Boolean),
  );

  return joinEmails(
    splitEmails(wallet.lowBalanceAlertEmails).filter(
      (email) => !selectedEmailSet.has(email.toLowerCase()),
    ),
  );
};

const CreditSettingsPanel = ({ wallet, canManage = false, onSaved }) => {
  const [threshold, setThreshold] = useState("0");
  const [manualEmails, setManualEmails] = useState("");
  const [selectedRecipientIds, setSelectedRecipientIds] = useState([]);
  const [updateWalletSettings, { isLoading: isSaving }] =
    useUpdateClientWalletSettingsMutation();
  const { data: employeesResponse, isFetching: isLoadingRecipients } =
    useGetCorporateEmployeesQuery({
      type: "EMPLOYEES",
      limit: 200,
      offset: 0,
      programType: "VENDOR_PAYMENTS",
    });

  const recipients = useMemo(() => {
    const rows = Array.isArray(employeesResponse?.data) ? employeesResponse.data : [];
    return rows
      .filter((user) => user?.email)
      .map((user) => ({
        id: getRecipientId(user),
        name: user.name || user.email,
        email: user.email,
        role: user.role || user.department || "",
      }))
      .filter((user) => user.id);
  }, [employeesResponse]);

  useEffect(() => {
    const selectedIds = getInitialSelectedRecipientIds(wallet);
    setThreshold(wallet?.lowBalanceThreshold || "0");
    setSelectedRecipientIds(selectedIds);
    setManualEmails(getAdditionalAlertEmails(wallet, selectedIds, recipients));
  }, [wallet, recipients]);

  const selectedRecipients = recipients.filter((recipient) =>
    selectedRecipientIds.includes(recipient.id),
  );

  const toggleRecipient = (recipientId) => {
    setSelectedRecipientIds((current) =>
      current.includes(recipientId)
        ? current.filter((id) => id !== recipientId)
        : [...current, recipientId],
    );
  };

  const handleSave = async () => {
    if (!canManage) {
      toast.error("You do not have permission to manage billing settings");
      return;
    }

    const selectedEmails = selectedRecipients.map((recipient) => recipient.email);
    const allEmails = joinEmails([...splitEmails(manualEmails), ...selectedEmails]);
    const thresholdValue = Number(threshold);

    if (Number.isNaN(thresholdValue) || thresholdValue < 0) {
      toast.error("Low-balance threshold must be 0 or higher");
      return;
    }

    try {
      await updateWalletSettings({
        lowBalanceThreshold: toCreditDecimalString(thresholdValue),
        lowBalanceAlertEmails: allEmails,
        lowBalanceAlertRecipientIds: selectedRecipientIds,
        lowBalanceAlertRecipients: selectedRecipients.map((recipient) => ({
          id: recipient.id,
          name: recipient.name,
          email: recipient.email,
        })),
      }).unwrap();
      toast.success("Billing alert settings saved");
      onSaved?.();
    } catch (error) {
      toast.error(error?.data?.detail || "Failed to save billing alert settings");
    }
  };

  return (
    <Card data-testid="credit-settings-panel">
      <CardHeader>
        <div className="flex items-start justify-between gap-4">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Mail className="h-5 w-5 text-primary" />
              Billing alerts
            </CardTitle>
            <p className="mt-1 text-sm text-muted-foreground">
              Configure low-balance alerts and choose who receives token wallet emails.
            </p>
          </div>
          {selectedRecipients.length > 0 && (
            <Badge variant="secondary">{selectedRecipients.length} recipients</Badge>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid gap-4 md:grid-cols-[240px_1fr]">
          <div className="space-y-2">
            <Label htmlFor="low-balance-threshold">Low-balance threshold</Label>
            <Input
              id="low-balance-threshold"
              type="number"
              min="0"
              step="0.01"
              value={threshold}
              disabled={!canManage}
              onChange={(event) => setThreshold(event.target.value)}
              data-testid="low-balance-threshold-input"
            />
            <p className="text-xs text-muted-foreground">Set 0 to disable threshold alerts.</p>
          </div>
          <div className="space-y-2">
            <Label htmlFor="manual-alert-emails">Additional email recipients</Label>
            <Input
              id="manual-alert-emails"
              value={manualEmails}
              disabled={!canManage}
              onChange={(event) => setManualEmails(event.target.value)}
              placeholder="finance@example.com, owner@example.com"
              data-testid="manual-alert-emails-input"
            />
            <p className="text-xs text-muted-foreground">
              Use commas for external recipients or shared finance inboxes.
            </p>
          </div>
        </div>

        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <Users className="h-4 w-4 text-muted-foreground" />
            <Label>Corporate users</Label>
          </div>
          {isLoadingRecipients ? (
            <div className="rounded-md border border-dashed p-4 text-sm text-muted-foreground">
              Loading users...
            </div>
          ) : recipients.length === 0 ? (
            <div className="rounded-md border border-dashed p-4 text-sm text-muted-foreground">
              No corporate users with email addresses were found.
            </div>
          ) : (
            <div className="grid gap-2 md:grid-cols-2">
              {recipients.map((recipient) => (
                <label
                  key={recipient.id}
                  className="flex cursor-pointer items-start gap-3 rounded-md border p-3 transition-colors hover:bg-muted/50"
                >
                  <Checkbox
                    checked={selectedRecipientIds.includes(recipient.id)}
                    disabled={!canManage}
                    onCheckedChange={() => toggleRecipient(recipient.id)}
                    data-testid={`alert-recipient-${recipient.id}`}
                  />
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-medium">{recipient.name}</span>
                    <span className="block truncate text-xs text-muted-foreground">
                      {recipient.email}
                    </span>
                    {recipient.role && (
                      <span className="mt-1 inline-flex text-xs text-muted-foreground">
                        {recipient.role}
                      </span>
                    )}
                  </span>
                </label>
              ))}
            </div>
          )}
        </div>

        <div className="flex items-center justify-between gap-4 border-t pt-4">
          {!canManage && (
            <p className="text-sm text-muted-foreground">
              You can view billing alerts, but need Manage Billing Settings access to change them.
            </p>
          )}
          <Button
            onClick={handleSave}
            disabled={isSaving || !canManage}
            data-testid="save-credit-settings-btn"
            className="ml-auto"
          >
            {isSaving ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save className="mr-2 h-4 w-4" />
                Save billing alerts
              </>
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default CreditSettingsPanel;
