import React, { useEffect, useMemo, useState } from "react";
import { AlertTriangle, Bell, Clock, Loader2, Mail, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import {
  useGetNotificationSettingsQuery,
  useUpdateNotificationMasterSettingsMutation,
  useUpdateNotificationTypeSettingMutation,
} from "../../Services/apis/notificationsApi";
import { Badge } from "../../components/ui/badge";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../../components/ui/select";
import { Skeleton } from "../../components/ui/skeleton";
import { Switch } from "../../components/ui/switch";
import { cn } from "../../lib/utils";

const PRESET_DAYS = [1, 2, 3, 5, 7];

const validateInterval = (value) => {
  const numeric = Number(value);
  if (!Number.isInteger(numeric)) return "Enter a whole number of days";
  if (numeric < 1) return "Remind at least once every day";
  if (numeric > 30) return "Remind at least once every 30 days";
  return "";
};

const SettingRow = ({ icon: Icon, label, description, children }) => (
  <div className="flex flex-col gap-3 border-b border-slate-100 py-4 last:border-b-0 sm:flex-row sm:items-center sm:justify-between">
    <div className="flex items-start gap-3">
      <div className="rounded-md bg-slate-100 p-2 text-slate-600">
        <Icon className="h-4 w-4" />
      </div>
      <div>
        <p className="font-medium text-slate-900">{label}</p>
        <p className="text-sm text-slate-500">{description}</p>
      </div>
    </div>
    {children}
  </div>
);

const EmailKillSwitchConfirm = ({ confirming, emailEnabled, onConfirm, onCancel, saving }) => {
  if (emailEnabled && !confirming) return null;

  return (
    <div className="mt-3 rounded-lg border border-amber-200 bg-amber-50 p-4">
      <div className="flex items-start gap-3">
        <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-amber-600" />
        <div className="min-w-0 flex-1">
          <h3 className="font-semibold text-amber-900">Turning off email stops more than reminders</h3>
          <p className="mt-2 text-sm text-amber-900">
            Users who have not signed in before will not be able to receive an invitation while this is off.
          </p>
          <div className="mt-4 grid gap-3 md:grid-cols-2">
            <div>
              <p className="text-sm font-medium text-amber-900">Will stop sending</p>
              <p className="mt-1 text-sm text-amber-800">
                Approval reminders · Rejection and send-back mails · New user invitations · Password reset links
              </p>
            </div>
            <div>
              <p className="flex items-center gap-2 text-sm font-medium text-emerald-900">
                <ShieldCheck className="h-4 w-4" />
                Will keep sending
              </p>
              <p className="mt-1 text-sm text-emerald-800">One-time passwords (OTP)</p>
            </div>
          </div>
          {confirming && (
            <div className="mt-4 flex flex-wrap gap-2">
              <Button type="button" onClick={onConfirm} disabled={saving} className="bg-amber-600 hover:bg-amber-700">
                {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Turn off all email
              </Button>
              <Button type="button" variant="outline" onClick={onCancel} disabled={saving}>
                Keep email on
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

const IntervalPicker = ({ type, disabled, onChange }) => {
  const [value, setValue] = useState(String(type.intervalDays ?? 3));
  const [error, setError] = useState("");

  useEffect(() => {
    setValue(String(type.intervalDays ?? 3));
    setError("");
  }, [type.intervalDays]);

  useEffect(() => {
    if (disabled || !type.emailEnabled) return undefined;
    const validation = validateInterval(value);
    setError(validation);
    if (validation) return undefined;

    const numeric = Number(value);
    if (numeric === type.intervalDays) return undefined;

    const timer = window.setTimeout(() => {
      onChange({ emailEnabled: type.emailEnabled, intervalDays: numeric });
    }, 500);

    return () => window.clearTimeout(timer);
  }, [disabled, onChange, type.emailEnabled, type.intervalDays, value]);

  if (!type.emailEnabled) return null;

  const numericValue = Number(value);

  return (
    <div className="mt-3 flex flex-col gap-2">
      <div className="flex flex-wrap items-center gap-2 text-sm">
        <span className="text-slate-600">Remind every</span>
        {PRESET_DAYS.map((day) => (
          <Button
            key={day}
            type="button"
            variant="outline"
            size="sm"
            disabled={disabled}
            onClick={() => {
              setValue(String(day));
              setError("");
              onChange({ emailEnabled: true, intervalDays: day });
            }}
            className={cn(
              numericValue === day
                ? "border-violet-600 bg-violet-50 text-violet-700 hover:bg-violet-50"
                : "border-slate-200 bg-white text-slate-600 hover:border-slate-300",
            )}
          >
            {day === 1 ? "Day" : `${day} days`}
          </Button>
        ))}
        <span className="text-slate-300">|</span>
        <Input
          value={value}
          disabled={disabled}
          onChange={(event) => setValue(event.target.value)}
          className="h-9 w-20"
          inputMode="numeric"
        />
        <span className="text-slate-500">days (1-30)</span>
      </div>
      {error && <p className="text-sm text-red-600">{error}</p>}
    </div>
  );
};

const NotificationSettings = () => {
  const { data, isLoading, isError, refetch } = useGetNotificationSettingsQuery(undefined, {
    refetchOnFocus: true,
  });
  const [updateMaster, { isLoading: savingMaster }] = useUpdateNotificationMasterSettingsMutation();
  const [updateType] = useUpdateNotificationTypeSettingMutation();
  const [confirmEmailOff, setConfirmEmailOff] = useState(false);

  const master = data?.master || {};
  const types = useMemo(() => (Array.isArray(data?.types) ? data.types : []), [data?.types]);

  const saveMaster = async (patch) => {
    try {
      await updateMaster({ ...master, ...patch }).unwrap();
      setConfirmEmailOff(false);
    } catch {
      toast.error("Couldn't save that change.");
    }
  };

  const saveType = async (type, patch) => {
    try {
      await updateType({
        typeId: type.typeId,
        emailEnabled: patch.emailEnabled,
        intervalDays: patch.intervalDays ?? type.intervalDays,
      }).unwrap();
    } catch {
      toast.error("Couldn't save that change.");
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-5">
        <Skeleton className="h-12 w-80" />
        <Skeleton className="h-52 w-full" />
        <Skeleton className="h-72 w-full" />
      </div>
    );
  }

  if (isError) {
    return (
      <div className="rounded-lg border border-slate-200 bg-white p-8 text-center">
        <h1 className="text-xl font-semibold text-slate-900">Couldn't load notification settings</h1>
        <p className="mt-1 text-sm text-slate-500">Check your connection and try again.</p>
        <Button type="button" variant="outline" className="mt-4" onClick={refetch}>
          Retry
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6" data-testid="notification-settings-page">
      <div>
        <h2 className="text-xl font-semibold font-['Manrope'] text-slate-900">Notifications</h2>
        <p className="mt-1 text-sm text-slate-500">Manage organisation-wide notification controls.</p>
      </div>

      <section className="rounded-lg border border-slate-200 bg-white p-5">
        <div>
          <h2 className="text-lg font-semibold text-slate-900">Master controls</h2>
          <p className="text-sm text-slate-500">
            These apply to every user in your organisation. Email and in-app are controlled separately.
          </p>
        </div>
        <div className="mt-2">
          <SettingRow
            icon={Mail}
            label="Email notifications"
            description="Turning this off stops every email Optifii sends, except one-time passwords."
          >
            <Switch
              checked={master.emailEnabled !== false && !confirmEmailOff}
              disabled={savingMaster}
              onCheckedChange={(checked) => {
                if (checked) saveMaster({ emailEnabled: true });
                else setConfirmEmailOff(true);
              }}
            />
          </SettingRow>
          <EmailKillSwitchConfirm
            confirming={confirmEmailOff}
            emailEnabled={master.emailEnabled !== false}
            saving={savingMaster}
            onConfirm={() => saveMaster({ emailEnabled: false })}
            onCancel={() => setConfirmEmailOff(false)}
          />
          <SettingRow
            icon={Bell}
            label="In-app notifications"
            description="Controls the notification centre in the portal. Not affected by the email switch."
          >
            <Switch
              checked={master.inAppEnabled !== false}
              disabled={savingMaster}
              onCheckedChange={(checked) => saveMaster({ inAppEnabled: checked })}
            />
          </SettingRow>
        </div>
      </section>

      <section className={cn("rounded-lg border border-slate-200 bg-white p-5", master.emailEnabled === false && "opacity-60")}>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">Reminder emails</h2>
            <p className="text-sm text-slate-500">
              Each reminder mails a person one summary of everything waiting on them. Items are never mailed one by one.
            </p>
          </div>
          {master.emailEnabled === false && (
            <Badge className="w-fit bg-slate-100 text-slate-500 hover:bg-slate-100">Email is off</Badge>
          )}
        </div>

        <div className="mt-5 flex flex-col gap-2 border-b border-slate-100 pb-5 sm:max-w-xs">
          <label className="flex items-center gap-2 text-sm font-medium text-slate-900">
            <Clock className="h-4 w-4" />
            Send at
          </label>
          <Select
            value={String(master.sendHour ?? 10)}
            disabled={master.emailEnabled === false || savingMaster}
            onValueChange={(value) => saveMaster({ sendHour: Number(value) })}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {Array.from({ length: 24 }).map((_, hour) => (
                <SelectItem key={hour} value={String(hour)}>
                  {String(hour).padStart(2, "0")}:00 Asia/Kolkata (IST)
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="divide-y divide-slate-100">
          {types.length === 0 ? (
            <div className="py-8 text-sm text-slate-500">No reminder types are available.</div>
          ) : (
            types.map((type) => {
              const disabled = master.emailEnabled === false;
              return (
                <div key={type.typeId} className="py-5">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="font-medium text-slate-900">{type.label}</h3>
                        {!type.inUse && (
                          <Badge variant="outline" className="border-slate-200 bg-slate-50 text-slate-500">
                            Not in use
                          </Badge>
                        )}
                      </div>
                      <p className="mt-1 text-sm text-slate-500">{type.description}</p>
                    </div>
                    <Switch
                      checked={Boolean(type.emailEnabled)}
                      disabled={disabled}
                      onCheckedChange={(checked) =>
                        saveType(type, {
                          emailEnabled: checked,
                          intervalDays: type.intervalDays,
                        })
                      }
                    />
                  </div>
                  <IntervalPicker
                    type={type}
                    disabled={disabled}
                    onChange={(patch) => saveType(type, patch)}
                  />
                </div>
              );
            })
          )}
        </div>
      </section>
    </div>
  );
};

export default NotificationSettings;
