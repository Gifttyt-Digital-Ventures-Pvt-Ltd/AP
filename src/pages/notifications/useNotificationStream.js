import { useEffect } from "react";
import { useDispatch } from "react-redux";
import { notificationsApi } from "../../Services/apis/notificationsApi";

const getStreamUrl = () => {
  const backendUrl = import.meta.env.VITE_BACKEND_URL ?? "";
  const streamUrl = new URL(`${backendUrl}/notifications/inbox/live-stream`, window.location.origin);
  const token = sessionStorage.getItem("token");
  if (token) streamUrl.searchParams.set("authToken", token);
  return streamUrl.toString();
};

export function useNotificationStream(enabled = true) {
  const dispatch = useDispatch();

  useEffect(() => {
    if (!enabled || typeof window === "undefined" || typeof window.EventSource === "undefined") {
      return undefined;
    }

    const source = new window.EventSource(getStreamUrl());

    const invalidateInbox = () => {
      dispatch(
        notificationsApi.util.invalidateTags([
          { type: "Notifications", id: "Inbox" },
          { type: "Notifications", id: "UnreadCount" },
        ]),
      );
    };

    const removeDismissed = (event) => {
      let dismissedId = "";
      try {
        dismissedId = JSON.parse(event.data)?.id;
      } catch {
        dismissedId = "";
      }

      if (!dismissedId) {
        invalidateInbox();
        return;
      }

      ["ACTIONABLE", "ALL"].forEach((filter) => {
        dispatch(
          notificationsApi.util.updateQueryData(
            "getNotificationInbox",
            { filter, page: 0, size: 20 },
            (draft) => {
              const index = draft.content?.findIndex((notification) => notification.id === dismissedId);
              if (index >= 0) {
                draft.content.splice(index, 1);
                draft.totalElements = Math.max(0, (draft.totalElements ?? 1) - 1);
              }
            },
          ),
        );
      });

      dispatch(
        notificationsApi.util.invalidateTags([{ type: "Notifications", id: "UnreadCount" }]),
      );
    };

    const updateUnreadCount = (event) => {
      try {
        const count = Number(JSON.parse(event.data)?.count ?? 0);
        dispatch(
          notificationsApi.util.updateQueryData(
            "getUnreadNotificationCount",
            undefined,
            (draft) => {
              draft.count = count;
            },
          ),
        );
      } catch {
        dispatch(
          notificationsApi.util.invalidateTags([{ type: "Notifications", id: "UnreadCount" }]),
        );
      }
    };

    source.addEventListener("notification.created", invalidateInbox);
    source.addEventListener("notification.dismissed", removeDismissed);
    source.addEventListener("notification.unread_count", updateUnreadCount);
    source.onerror = () => {
      source.close();
    };

    return () => {
      source.close();
    };
  }, [dispatch, enabled]);
}
