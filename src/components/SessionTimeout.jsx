import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { useLazyRefreshSessionQuery } from "../Services/apiSlice";

const IDLE_TIMEOUT_MS = 15 * 60 * 1000;
const PING_INTERVAL_MS = 5 * 60 * 1000;

const SessionTimeout = ({ children }) => {
  const navigate = useNavigate();
  const [isInitializing, setIsInitializing] = useState(true);
  const lastActivityRef = useRef(Date.now());
  const lastPingRef = useRef(Date.now());
  const [triggerPing] = useLazyRefreshSessionQuery();

  const handleLogout = useCallback(() => {
    sessionStorage.removeItem("token");
    sessionStorage.removeItem("user");

    navigate("/login");
    toast.error("Session Expired", {
      description: "You have been logged out due to inactivity.",
      duration: 5000,
    });
  }, [navigate]);

  const pingSession = useCallback(async () => {
    try {
      await triggerPing().unwrap();
    } catch (error) {
      if ([401, 403, 405, 500].includes(error?.status)) {
        handleLogout();
      } else {
        console.error("Session ping failed:", error);
      }
    }
  }, [triggerPing, handleLogout]);

  const updateActivity = useCallback(() => {
    const now = Date.now();
    lastActivityRef.current = now;

    if (now - lastPingRef.current > PING_INTERVAL_MS) {
      lastPingRef.current = now;
      pingSession();
    }
  }, [pingSession]);

  useEffect(() => {
    const token = sessionStorage.getItem("token");
    if (!token) {
      setIsInitializing(false);
      return;
    }

    pingSession().finally(() => {
      lastPingRef.current = Date.now();
      setIsInitializing(false);
    });
  }, [pingSession]);

  useEffect(() => {
    const token = sessionStorage.getItem("token");
    if (!token) return;

    const events = [
      "mousemove",
      "mousedown",
      "click",
      "scroll",
      "keypress",
      "touchstart",
    ];

    let timeout;
    const activityHandler = () => {
      if (!timeout) {
        timeout = setTimeout(() => {
          updateActivity();
          timeout = null;
        }, 1000);
      }
    };

    events.forEach((event) => {
      window.addEventListener(event, activityHandler);
    });

    const intervalId = setInterval(() => {
      const now = Date.now();
      if (now - lastActivityRef.current > IDLE_TIMEOUT_MS) {
        handleLogout();
      }
    }, 60 * 1000);

    return () => {
      events.forEach((event) => {
        window.removeEventListener(event, activityHandler);
      });
      clearInterval(intervalId);
      if (timeout) clearTimeout(timeout);
    };
  }, [handleLogout, updateActivity]);

  if (isInitializing) {
    return null;
  }

  return <>{children}</>;
};

export default SessionTimeout;
