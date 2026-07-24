import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
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
const DEFAULT_SEND_HOUR = 10;
const DEFAULT_TIMEZONE = "Asia/Kolkata";
const SAVE_ERROR_MESSAGE = "We couldn't save this setting. Your previous configuration has been restored.";

const formatHour = (hour) => {
  const normalizedHour = Number(hour);
  const safeHour = Number.isInteger(normalizedHour) && normalizedHour >= 0 && normalizedHour <= 23
    ? normalizedHour
    : DEFAULT_SEND_HOUR;
  const period = safeHour >= 12 ? "PM" : "AM";
  const displayHour = safeHour % 12 || 12;

  return `${displayHour}:00 ${period}`;
};

const normalizeUtcOffset = (value = "") => {
  const rawValue = String(value);
  if (rawValue === "GMT" || rawValue === "UTC") return "UTC+00:00";

  const match = rawValue.match(/^(?:GMT|UTC)([+-])(\d{1,2})(?::(\d{1,2}))?$/);
  if (!match) return rawValue || "UTC";

  const [, sign, hours, minutes = "00"] = match;
  return `UTC${sign}${hours.padStart(2, "0")}:${minutes.padStart(2, "0")}`;
};

const getUtcOffsetLabel = (timeZone) => {
  try {
    const parts = new Intl.DateTimeFormat("en-US", {
      timeZone,
      timeZoneName: "shortOffset",
      hour: "2-digit",
    }).formatToParts(new Date());
    const offset = parts.find((part) => part.type === "timeZoneName")?.value;

    return offset ? normalizeUtcOffset(offset) : "UTC";
  } catch {
    return "UTC";
  }
};

const getTimezoneDisplay = (timeZone) => {
  const resolvedTimezone = timeZone || DEFAULT_TIMEZONE;
  return `${resolvedTimezone} (${getUtcOffsetLabel(resolvedTimezone)})`;
};

const validateInterval = (value) => {
  const numeric = Number(value);
  if (!Number.isInteger(numeric)) return "Enter a whole number of days.";
  if (numeric < 1) return "The minimum reminder interval is 1 day.";
  if (numeric > 30) return "The maximum reminder interval is 30 days.";
  return "";
};

const buildMasterPayload = (current, patch) => {
  const payload = {
    emailEnabled: patch.emailEnabled ?? current.emailEnabled ?? true,
    inAppEnabled: patch.inAppEnabled ?? current.inAppEnabled ?? true,
    sendHour: patch.sendHour ?? current.sendHour ?? DEFAULT_SEND_HOUR,
    timezone: patch.timezone ?? current.timezone ?? DEFAULT_TIMEZONE,
  };

  if (current.retentionDays != null || patch.retentionDays != null) {
    payload.retentionDays = patch.retentionDays ?? current.retentionDays;
  }

  return payload;
};

const upsertType = (types, typeId, patch) =>
  types.map((type) => (type.typeId === typeId ? { ...type, ...patch } : type));

const SettingRow = ({ icon: Icon, label, description, children, status }) => (
  <div className="flex flex-col gap-3 border-b border-slate-100 py-4 last:border-b-0 sm:flex-row sm:items-center sm:justify-between">
    <div className="flex min-w-0 items-start gap-3">
      <div className="rounded-md bg-slate-100 p-2 text-slate-600">
        <Icon className="h-4 w-4" />
      </div>
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <p className="font-medium text-slate-900">{label}</p>
          {status}
        </div>
        <p className="text-sm text-slate-500">{description}</p>
      </div>
    </div>
    <div className="shrink-0">{children}</div>
  </div>
);

const EmailKillSwitchConfirm = ({ confirming, onConfirm, onCancel, saving }) => {
  if (!confirming) return null;

  return (
    <div className="mt-3 rounded-lg border border-amber-200 bg-amber-50 p-4" role="alert">
      <div className="flex items-start gap-3">
        <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-amber-600" />
        <div className="min-w-0 flex-1">
          <h3 className="font-semibold text-amber-900">Turn off organisation email notifications?</h3>
          <p className="mt-2 text-sm text-amber-900">
            This stops approval reminders, rejection emails, send-back emails, new-user invitations,
            password-reset links, and other non-OTP email notifications.
          </p>
          <div className="mt-4 grid gap-3 md:grid-cols-2">
            <div>
              <p className="text-sm font-medium text-amber-900">Will stop sending</p>
              <p className="mt-1 text-sm text-amber-800">
                Approval reminders, rejection emails, send-back emails, new-user invitations,
                password-reset links, and other non-OTP email.
              </p>
            </div>
            <div>
              <p className="flex items-center gap-2 text-sm font-medium text-emerald-900">
                <ShieldCheck className="h-4 w-4" />
                Will keep sending
              </p>
              <p className="mt-1 text-sm text-emerald-800">One-time passwords (OTP).</p>
            </div>
          </div>
          <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:flex-wrap">
            <Button
              type="button"
              onClick={onConfirm}
              disabled={saving}
              className="bg-amber-600 hover:bg-amber-700"
              aria-busy={saving}
            >
              {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Turn off email notifications
            </Button>
            <Button type="button" variant="outline" onClick={onCancel} disabled={saving}>
              Keep email notifications on
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

const IntervalPicker = ({ type, disabled, saving, onChange }) => {
  const [value, setValue] = useState(String(type.intervalDays ?? 3));
  const [error, setError] = useState("");
  const skipNextDebounceRef = useRef(false);
  const inputId = `notification-interval-${type.typeId}`;
  const errorId = `${inputId}-error`;

  useEffect(() => {
    setValue(String(type.intervalDays ?? 3));
    setError("");
  }, [type.intervalDays]);

  useEffect(() => {
    if (disabled || saving || !type.emailEnabled) return undefined;

    const validation = validateInterval(value);
    setError(validation);
    if (validation) return undefined;

    const numeric = Number(value);
    if (numeric === type.intervalDays) {
      skipNextDebounceRef.current = false;
      return undefined;
    }

    if (skipNextDebounceRef.current) {
      skipNextDebounceRef.current = false;
      return undefined;
    }

    const timer = window.setTimeout(() => {
      onChange({ emailEnabled: type.emailEnabled, intervalDays: numeric });
    }, 500);

    return () => window.clearTimeout(timer);
  }, [disabled, onChange, saving, type.emailEnabled, type.intervalDays, value]);

  if (!type.emailEnabled) return null;

  const numericValue = Number(value);

  return (
    <div className="mt-3 flex flex-col gap-2">
      <div className="flex flex-wrap items-center gap-2 text-sm">
        <label htmlFor={inputId} className="text-slate-600">Remind every</label>
        {PRESET_DAYS.map((day) => (
          <Button
            key={day}
            type="button"
            variant="outline"
            size="sm"
            disabled={disabled || saving}
            onClick={() => {
              if (day === type.intervalDays) return;
              skipNextDebounceRef.current = true;
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
            {day === 1 ? "1 day" : `${day} days`}
          </Button>
        ))}
        <span className="text-slate-300">|</span>
        <Input
          id={inputId}
          value={value}
          disabled={disabled || saving}
          onChange={(event) => setValue(event.target.value)}
          className="h-9 w-20"
          inputMode="numeric"
          aria-invalid={Boolean(error)}
          aria-describedby={error ? errorId : undefined}
        />
        <span className="text-slate-500">days (1-30)</span>
        {saving && <Loader2 className="h-4 w-4 animate-spin text-slate-500" aria-label="Saving reminder interval" />}
      </div>
      {error && <p id={errorId} className="text-sm text-red-600">{error}</p>}
    </div>
  );
};

const NotificationSettings = () => {
  const { data, isLoading, isError, refetch } = useGetNotificationSettingsQuery(undefined, {
    refetchOnFocus: true,
  });
  const [updateMaster] = useUpdateNotificationMasterSettingsMutation();
  const [updateType] = useUpdateNotificationTypeSettingMutation();
  const [confirmEmailOff, setConfirmEmailOff] = useState(false);
  const [localMaster, setLocalMaster] = useState({});
  const [localTypes, setLocalTypes] = useState([]);
  const [savingMasterFields, setSavingMasterFields] = useState(() => new Set());
  const [savingTypeIds, setSavingTypeIds] = useState(() => new Set());

  useEffect(() => {
    setLocalMaster(data?.master || {});
    setLocalTypes(Array.isArray(data?.types) ? data.types : []);
  }, [data?.master, data?.types]);

  const master = localMaster || {};
  const types = useMemo(() => (Array.isArray(localTypes) ? localTypes : []), [localTypes]);
  const emailEnabled = master.emailEnabled !== false;
  const inAppEnabled = master.inAppEnabled !== false;
  const timezone = master.timezone || DEFAULT_TIMEZONE;
  const timezoneDisplay = getTimezoneDisplay(timezone);
  const savingEmail = savingMasterFields.has("emailEnabled");
  const savingInApp = savingMasterFields.has("inAppEnabled");
  const savingSendHour = savingMasterFields.has("sendHour");

  const setMasterFieldSaving = useCallback((field, saving) => {
    setSavingMasterFields((current) => {
      const next = new Set(current);
      if (saving) next.add(field);
      else next.delete(field);
      return next;
    });
  }, []);

  const setTypeSaving = useCallback((typeId, saving) => {
    setSavingTypeIds((current) => {
      const next = new Set(current);
      if (saving) next.add(typeId);
      else next.delete(typeId);
      return next;
    });
  }, []);

  const saveMaster = useCallback(async (patch, { successMessage = "Notification settings updated." } = {}) => {
    const [field] = Object.keys(patch);
    if (field && savingMasterFields.has(field)) return;

    const previousMaster = master;
    const nextMaster = { ...previousMaster, ...patch };

    if (field) setMasterFieldSaving(field, true);
    setLocalMaster(nextMaster);

    try {
      await updateMaster(buildMasterPayload(previousMaster, patch)).unwrap();
      setConfirmEmailOff(false);
      toast.success(successMessage);
    } catch {
      setLocalMaster(previousMaster);
      toast.error(SAVE_ERROR_MESSAGE);
    } finally {
      if (field) setMasterFieldSaving(field, false);
    }
  }, [master, savingMasterFields, setMasterFieldSaving, updateMaster]);

  const saveType = useCallback(async (type, patch) => {
    if (!type?.typeId || savingTypeIds.has(type.typeId)) return;

    const previousTypes = types;
    const nextType = {
      ...type,
      emailEnabled: patch.emailEnabled ?? type.emailEnabled,
      intervalDays: patch.intervalDays ?? type.intervalDays,
    };

    setTypeSaving(type.typeId, true);
    setLocalTypes((current) => upsertType(current, type.typeId, nextType));

    try {
      await updateType({
        typeId: type.typeId,
        emailEnabled: nextType.emailEnabled,
        intervalDays: nextType.intervalDays,
      }).unwrap();
      toast.success(`${type.label || "Reminder"} settings updated.`);
    } catch {
      setLocalTypes(previousTypes);
      toast.error(SAVE_ERROR_MESSAGE);
    } finally {
      setTypeSaving(type.typeId, false);
    }
  }, [savingTypeIds, setTypeSaving, types, updateType]);

  if (isLoading) {
    return (
      <div className="space-y-5" aria-busy="true">
        <Skeleton className="h-12 w-80 max-w-full" />
        <Skeleton className="h-52 w-full" />
        <Skeleton className="h-80 w-full" />
      </div>
    );
  }

  if (isError) {
    return (
      <div className="rounded-lg border border-slate-200 bg-white p-8 text-center">
        <h1 className="text-xl font-semibold text-slate-900">Couldn't load notification settings.</h1>
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
            description="Controls organisation-wide email notifications. One-time passwords continue to be sent when this setting is off."
            status={!emailEnabled ? <Badge className="bg-slate-100 text-slate-600 hover:bg-slate-100">Off</Badge> : null}
          >
            <div className="flex items-center gap-2">
              {savingEmail && <Loader2 className="h-4 w-4 animate-spin text-slate-500" aria-label="Saving email setting" />}
              <Switch
                checked={emailEnabled}
                disabled={savingEmail}
                aria-label="Email notifications"
                onCheckedChange={(checked) => {
                  if (checked) {
                    setConfirmEmailOff(false);
                    saveMaster({ emailEnabled: true });
                  } else {
                    setConfirmEmailOff(true);
                  }
                }}
              />
            </div>
          </SettingRow>
          <EmailKillSwitchConfirm
            confirming={confirmEmailOff}
            saving={savingEmail}
            onConfirm={() => saveMaster({ emailEnabled: false })}
            onCancel={() => setConfirmEmailOff(false)}
          />
          <SettingRow
            icon={Bell}
            label="In-app notifications"
            description="Controls notifications shown in the portal notification centre. This setting is independent of email notifications."
            status={!inAppEnabled ? <Badge className="bg-slate-100 text-slate-600 hover:bg-slate-100">Off</Badge> : null}
          >
            <div className="flex items-center gap-2">
              {savingInApp && <Loader2 className="h-4 w-4 animate-spin text-slate-500" aria-label="Saving in-app setting" />}
              <Switch
                checked={inAppEnabled}
                disabled={savingInApp}
                aria-label="In-app notifications"
                onCheckedChange={(checked) => saveMaster({ inAppEnabled: checked })}
              />
            </div>
          </SettingRow>
        </div>
      </section>

      <section className="rounded-lg border border-slate-200 bg-white p-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">Reminder emails</h2>
            <p className="text-sm text-slate-500">
              Each recipient receives one digest containing all eligible items waiting for their action.
              Items are not sent as separate reminder emails.
            </p>
          </div>
          {!emailEnabled && (
            <Badge className="w-fit bg-amber-100 text-amber-800 hover:bg-amber-100">Email notifications are off</Badge>
          )}
        </div>

        <div className="mt-5 border-b border-slate-100 pb-5">
          <div className="grid gap-4 md:grid-cols-[minmax(180px,260px)_1fr] md:items-end">
            <div className="space-y-2">
              <label htmlFor="notification-send-hour" className="flex items-center gap-2 text-sm font-medium text-slate-900">
                <Clock className="h-4 w-4" />
                Send at
              </label>
              <Select
                value={String(master.sendHour ?? DEFAULT_SEND_HOUR)}
                disabled={!emailEnabled || savingSendHour}
                onValueChange={(value) =>
                  saveMaster(
                    { sendHour: Number(value) },
                    { successMessage: "Reminder schedule updated." },
                  )
                }
              >
                <SelectTrigger id="notification-send-hour" aria-describedby="notification-timezone-note">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Array.from({ length: 24 }).map((_, hour) => (
                    <SelectItem key={hour} value={String(hour)}>
                      {formatHour(hour)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {savingSendHour && (
                <p className="flex items-center gap-2 text-sm text-slate-500" aria-live="polite">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Saving schedule
                </p>
              )}
            </div>
            <div id="notification-timezone-note" className="rounded-md border border-slate-200 bg-slate-50 p-3">
              <p className="text-sm font-medium text-slate-900">Time zone</p>
              <p className="mt-1 text-sm text-slate-600">{timezoneDisplay}</p>
              <p className="mt-1 text-xs text-slate-500">
                Reminder emails are scheduled using your organisation's configured time zone.
              </p>
            </div>
          </div>
        </div>

        <div className="divide-y divide-slate-100">
          {types.length === 0 ? (
            <div className="py-8 text-sm text-slate-500">No reminder types are currently available.</div>
          ) : (
            types.map((type) => {
              const disabled = !emailEnabled;
              const savingType = savingTypeIds.has(type.typeId);
              return (
                <div key={type.typeId} className="py-5">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="font-medium text-slate-900">{type.label}</h3>
                        {!type.inUse && (
                          <Badge variant="outline" className="border-slate-200 bg-slate-50 text-slate-500">
                            Not in use
                          </Badge>
                        )}
                        {!type.emailEnabled && (
                          <Badge variant="outline" className="border-slate-200 bg-white text-slate-500">
                            Email off
                          </Badge>
                        )}
                      </div>
                      <p className="mt-1 text-sm text-slate-500">{type.description}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      {savingType && <Loader2 className="h-4 w-4 animate-spin text-slate-500" aria-label={`Saving ${type.label}`} />}
                      <Switch
                        checked={Boolean(type.emailEnabled)}
                        disabled={disabled || savingType}
                        aria-label={`${type.label} email reminders`}
                        onCheckedChange={(checked) =>
                          saveType(type, {
                            emailEnabled: checked,
                            intervalDays: type.intervalDays,
                          })
                        }
                      />
                    </div>
                  </div>
                  {disabled && (
                    <p className="mt-3 rounded-md bg-amber-50 px-3 py-2 text-sm text-amber-800">
                      Turn email notifications on to edit this reminder.
                    </p>
                  )}
                  <IntervalPicker
                    type={type}
                    disabled={disabled}
                    saving={savingType}
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
