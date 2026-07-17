import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { formatDistanceToNow } from "date-fns";
import {
  Bell,
  CheckCheck,
  ChevronRight,
  CircleDot,
  Inbox,
  Loader2,
  RefreshCw,
} from "lucide-react";
import { toast } from "sonner";
import {
  useGetNotificationInboxQuery,
  useGetNotificationSettingsQuery,
  useGetUnreadNotificationCountQuery,
  useMarkAllNotificationsReadMutation,
  useMarkNotificationReadMutation,
} from "../../Services/apis/notificationsApi";
import { Badge } from "../../components/ui/badge";
import { Button } from "../../components/ui/button";
import { Skeleton } from "../../components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger } from "../../components/ui/tabs";
import { cn } from "../../lib/utils";

const PAGE_SIZE = 20;
const FILTERS = {
  ACTIONABLE: "ACTIONABLE",
  ALL: "ALL",
};

const getNotificationKind = (notification) => notification?.kind ?? notification?.type ?? "INFORMATIONAL";

const getNotificationReadState = (notification) =>
  Boolean(notification?.isRead ?? notification?.read ?? notification?.read_at);

const getNotificationTitle = (notification) =>
  notification?.title ||
  notification?.subject ||
  `${notification?.entityRef || notification?.entity_ref || "Notification"} update`;

const getNotificationBody = (notification) => notification?.body || notification?.message || null;

const getNotificationDeepLink = (notification) =>
  notification?.deepLink || notification?.deep_link || notification?.link || "";

const getNotificationCreatedAt = (notification) =>
  notification?.createdAt || notification?.created_at || notification?.createdOn || notification?.created_on;

const getNotificationId = (notification, index = 0) =>
  notification?.id ||
  notification?.notificationId ||
  notification?.notification_id ||
  `${getNotificationCreatedAt(notification) || "notification"}-${index}`;

const relativeTime = (value) => {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return formatDistanceToNow(date, { addSuffix: true });
};

const getPageContent = (pageData) => {
  if (Array.isArray(pageData)) return pageData;
  if (Array.isArray(pageData?.content)) return pageData.content;
  if (Array.isArray(pageData?.data)) return pageData.data;
  return [];
};

const getUnreadCount = (data) => Number(data?.count ?? data?.unreadCount ?? 0);

const KindBadge = ({ kind }) => {
  const actionable = kind === "ACTIONABLE";
  return (
    <Badge
      variant="outline"
      className={cn(
        "rounded px-2 py-0.5 text-xs font-medium",
        actionable
          ? "border-amber-200 bg-amber-100 text-amber-800"
          : "border-slate-200 bg-slate-100 text-slate-600",
      )}
    >
      {actionable ? "Needs you" : "Update"}
    </Badge>
  );
};

const NotificationSkeleton = () => (
  <div className="overflow-hidden rounded-lg border border-slate-200 bg-white">
    {Array.from({ length: 5 }).map((_, index) => (
      <div key={index} className="flex min-h-[88px] items-start gap-3 border-b border-slate-100 px-5 py-3.5 last:border-0">
        <Skeleton className="mt-1 h-3 w-3 rounded-full" />
        <div className="min-w-0 flex-1 space-y-2">
          <div className="flex gap-2">
            <Skeleton className="h-5 w-20" />
            <Skeleton className="h-4 w-24" />
          </div>
          <Skeleton className="h-4 w-3/4" />
          <Skeleton className="h-3 w-1/2" />
        </div>
      </div>
    ))}
  </div>
);

const EmptyState = ({ filter }) => {
  const actionable = filter === FILTERS.ACTIONABLE;
  return (
    <div className="flex min-h-[280px] flex-col items-center justify-center rounded-lg border border-dashed border-slate-200 bg-white px-6 text-center">
      <Inbox className="h-10 w-10 text-slate-300" />
      <h2 className="mt-4 text-lg font-semibold text-slate-900">
        {actionable ? "Nothing needs you" : "No notifications"}
      </h2>
      <p className="mt-1 max-w-sm text-sm text-slate-500">
        {actionable
          ? "Approvals will appear here the moment they reach you."
          : "Activity from the last 90 days shows up here."}
      </p>
    </div>
  );
};

const ErrorState = ({ onRetry }) => (
  <div className="flex min-h-[280px] flex-col items-center justify-center rounded-lg border border-slate-200 bg-white px-6 text-center">
    <Bell className="h-10 w-10 text-slate-300" />
    <h2 className="mt-4 text-lg font-semibold text-slate-900">Couldn't load notifications</h2>
    <p className="mt-1 text-sm text-slate-500">Check your connection and try again.</p>
    <Button type="button" variant="outline" className="mt-4" onClick={onRetry}>
      <RefreshCw className="mr-2 h-4 w-4" />
      Retry
    </Button>
  </div>
);

const OffState = () => (
  <div className="flex min-h-[320px] flex-col items-center justify-center rounded-lg border border-slate-200 bg-white px-6 text-center">
    <Bell className="h-10 w-10 text-slate-300" />
    <h2 className="mt-4 text-lg font-semibold text-slate-900">In-app notifications are off</h2>
    <p className="mt-1 max-w-md text-sm text-slate-500">
      Your admin has switched off the notification centre for this organisation.
    </p>
  </div>
);

const NotificationRow = ({ notification, onOpen, rowKey }) => {
  const kind = getNotificationKind(notification);
  const isRead = getNotificationReadState(notification);
  const body = getNotificationBody(notification);
  const createdAt = relativeTime(getNotificationCreatedAt(notification));

  return (
    <button
      type="button"
      onClick={() => onOpen(notification)}
      className={cn(
        "flex min-h-[88px] w-full items-start gap-3 border-b border-slate-100 px-5 py-3.5 text-left transition-colors last:border-b-0 hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500 focus-visible:ring-inset",
        !isRead && "bg-violet-50",
      )}
      data-testid={`notification-row-${rowKey}`}
    >
      <div className="mt-1 shrink-0">
        {!isRead && <CircleDot className="h-3 w-3 text-violet-600" />}
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <KindBadge kind={kind} />
          {createdAt && <span className="text-xs text-slate-400">{createdAt}</span>}
        </div>
        <p
          className={cn(
            "mt-1 truncate text-sm",
            isRead ? "text-slate-600" : "font-medium text-slate-900",
          )}
        >
          {getNotificationTitle(notification)}
        </p>
        {body && <p className="mt-0.5 truncate text-xs text-slate-500">{body}</p>}
      </div>
      <ChevronRight className="mt-1 h-4 w-4 shrink-0 text-slate-300" />
    </button>
  );
};

const Notifications = () => {
  const navigate = useNavigate();
  const [filter, setFilter] = useState(FILTERS.ACTIONABLE);
  const [page, setPage] = useState(0);
  const {
    data: settings,
    isError: settingsError,
  } = useGetNotificationSettingsQuery(undefined, {
    refetchOnFocus: true,
  });
  const inAppEnabled = settingsError ? true : settings?.master?.inAppEnabled !== false;
  const {
    data: unreadData,
  } = useGetUnreadNotificationCountQuery(undefined, {
    skip: !inAppEnabled,
    pollingInterval: 60000,
    refetchOnFocus: true,
  });
  const {
    data: inboxPage,
    isLoading,
    isFetching,
    isError,
    refetch,
  } = useGetNotificationInboxQuery(
    { filter, page, size: PAGE_SIZE },
    {
      skip: !inAppEnabled,
      refetchOnFocus: true,
      refetchOnMountOrArgChange: true,
    },
  );
  const [markRead] = useMarkNotificationReadMutation();
  const [markAllRead, { isLoading: markingAllRead }] = useMarkAllNotificationsReadMutation();

  const notifications = useMemo(() => getPageContent(inboxPage), [inboxPage]);
  const unreadCount = getUnreadCount(unreadData);
  const totalElements = Number(inboxPage?.totalElements ?? inboxPage?.total ?? notifications.length);
  const totalPages = Math.max(1, Number(inboxPage?.totalPages ?? 1));
  const canLoadPrevious = page > 0;
  const canLoadNext = page + 1 < totalPages;

  useEffect(() => {
    setPage(0);
  }, [filter]);

  const handleOpenNotification = (notification) => {
    if (!notification?.id) return;
    markRead(notification.id);
    const deepLink = getNotificationDeepLink(notification);
    if (deepLink) {
      navigate(deepLink);
    }
  };

  const handleMarkAllRead = async () => {
    try {
      await markAllRead().unwrap();
    } catch {
      toast.error("Couldn't save that change.");
    }
  };

  const handleRetry = () => {
    refetch();
  };

  const showListRefreshing = isFetching && !isLoading;

  return (
    <main className="space-y-6" data-testid="notifications-page">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-4xl md:text-5xl font-bold font-['Manrope'] text-primary">Notifications</h1>
          <p className="mt-2 text-sm text-muted-foreground">Notifications are kept for 90 days.</p>
        </div>
        <Button
          type="button"
          onClick={handleMarkAllRead}
          disabled={!inAppEnabled || unreadCount === 0 || markingAllRead}
          className="w-full sm:w-auto"
        >
          {markingAllRead ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <CheckCheck className="mr-2 h-4 w-4" />
          )}
          Mark all read
        </Button>
      </div>

      <div className="rounded-lg border border-border bg-card p-4 shadow-sm">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <Tabs value={filter} onValueChange={setFilter}>
            <TabsList>
              <TabsTrigger value={FILTERS.ACTIONABLE} className="data-[state=active]:bg-slate-900 data-[state=active]:text-white">
                Needs you
                {unreadCount > 0 && (
                  <span className="ml-2 rounded-full bg-rose-500 px-2 py-0.5 text-xs font-semibold text-white">
                    {unreadCount > 99 ? "99+" : unreadCount}
                  </span>
                )}
              </TabsTrigger>
              <TabsTrigger value={FILTERS.ALL} className="data-[state=active]:bg-slate-900 data-[state=active]:text-white">
                All
              </TabsTrigger>
            </TabsList>
          </Tabs>
          <div className="min-h-5 text-sm text-muted-foreground">
            {inAppEnabled && !isLoading && !isError
              ? `${totalElements} ${totalElements === 1 ? "notification" : "notifications"}`
              : null}
            {showListRefreshing ? " · Refreshing" : ""}
          </div>
        </div>
      </div>

      {!inAppEnabled ? (
        <OffState />
      ) : isLoading ? (
        <NotificationSkeleton />
      ) : isError ? (
        <ErrorState onRetry={handleRetry} />
      ) : notifications.length === 0 ? (
        <EmptyState filter={filter} />
      ) : (
        <>
          <div className="overflow-hidden rounded-lg border border-border bg-card shadow-sm" aria-live="polite">
            {notifications.map((notification, index) => {
              const rowKey = getNotificationId(notification, index);
              return (
                <NotificationRow
                  key={rowKey}
                  rowKey={rowKey}
                  notification={notification}
                  onOpen={handleOpenNotification}
                />
              );
            })}
          </div>

          <div className="flex flex-col items-center justify-between gap-3 rounded-lg border border-border bg-card px-4 py-3 shadow-sm sm:flex-row">
            <p className="text-sm text-muted-foreground">
              Page {page + 1} of {totalPages}
            </p>
            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setPage((current) => Math.max(0, current - 1))}
                disabled={!canLoadPrevious || isFetching}
              >
                Previous
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => setPage((current) => current + 1)}
                disabled={!canLoadNext || isFetching}
              >
                {isFetching ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                Next
              </Button>
            </div>
          </div>
        </>
      )}
    </main>
  );
};

export default Notifications;
