import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { useLazyRefreshSessionQuery } from "../Services/apiSlice";
import { useAuth } from "../contexts/AuthContext";

const IDLE_TIMEOUT_MS = 15 * 60 * 1000;
const PING_INTERVAL_MS = 5 * 60 * 1000;

const SessionTimeout = ({ children }) => {
  const navigate = useNavigate();
  const { token, logout } = useAuth();
  const [isInitializing, setIsInitializing] = useState(true);
  const lastActivityRef = useRef(Date.now());
  const lastPingRef = useRef(Date.now());
  const sessionVersionRef = useRef(0);
  const [triggerPing] = useLazyRefreshSessionQuery();
  const logoutInProgressRef = useRef(false);

  const handleLogout = useCallback(() => {
    if (logoutInProgressRef.current) return;
    logoutInProgressRef.current = true;

    logout();

    navigate("/login", { replace: true });
    toast.error("Session Expired", {
      description: "You have been logged out due to inactivity.",
      duration: 5000,
    });
  }, [logout, navigate]);

  const pingSession = useCallback(async (versionAtCall = sessionVersionRef.current) => {
    try {
      await triggerPing().unwrap();
    } catch (error) {
      // Ignore stale responses from previous sessions.
      if (versionAtCall !== sessionVersionRef.current) return;

      // Only auth failures should force logout.
      if ([401, 403].includes(error?.status)) {
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
      pingSession(sessionVersionRef.current);
    }
  }, [pingSession]);

  useEffect(() => {
    if (!token) {
      logoutInProgressRef.current = false;
      setIsInitializing(false);
      return;
    }

    setIsInitializing(true);
    logoutInProgressRef.current = false;
    sessionVersionRef.current += 1;
    lastActivityRef.current = Date.now();
    lastPingRef.current = Date.now();

    const activeVersion = sessionVersionRef.current;
    pingSession(activeVersion).finally(() => {
      // Ignore stale completion from older sessions.
      if (activeVersion !== sessionVersionRef.current) return;
      lastPingRef.current = Date.now();
      setIsInitializing(false);
    });
  }, [token, pingSession]);

  useEffect(() => {
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
  }, [token, handleLogout, updateActivity]);

  if (isInitializing) {
    return null;
  }

  return <>{children}</>;
};

export default SessionTimeout;
