// src/hooks/useAutoLogout.ts
import { useEffect } from "react";
import { useDispatch } from "react-redux";
import { useNavigate } from "react-router-dom";
import { logout } from "../store/slices/authSlice";
import { loginPath } from "../routes/route";

/**
 * Custom auto-logout hook for your app.
 *
 * How it works:
 * - Reads an expiry timestamp from sessionStorage: "msal.tokenExpiry"
 *   (you should set this when you obtain/refresh the token).
 * - If the current time is past the expiry → logs the user out immediately.
 * - If not yet expired → schedules a timeout to log out at the expiry time.
 * - On user activity (mousemove, keydown, scroll, etc.), it re-checks the expiry,
 *   so if you silently refresh tokens and update "msal.tokenExpiry", the timer adjusts.
 */
export const useAutoLogout = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | undefined;

    const performLogout = () => {
      //    (your authSlice.logout should reset token, user, etc.)
      dispatch(logout() as any);

      // 3) Navigate to login page
      navigate(loginPath, { replace: true });
    };

    const checkExpiry = () => {
      const expiryStr = sessionStorage.getItem("msal.tokenExpiry");
      if (!expiryStr) return;

      const expiryTime = parseInt(expiryStr, 10);
      if (Number.isNaN(expiryTime)) return;

      const now = Date.now();
      const timeout = expiryTime - now;

      if (timeout <= 0) {
        // Token already expired
        performLogout();
      } else {
        // Token still valid → schedule logout at expiry
        if (timer) clearTimeout(timer);
        timer = setTimeout(performLogout, timeout);
      }
    };

    // Run immediately when the hook mounts
    checkExpiry();

    // Re-check expiry on user activity so we pick up new expiry times
    const events: (keyof WindowEventMap)[] = [
      "mousemove",
      "mousedown",
      "keydown",
      "scroll",
      "touchstart",
    ];

    events.forEach((event) => {
      window.addEventListener(event, checkExpiry);
    });

    return () => {
      if (timer) clearTimeout(timer);
      events.forEach((event) => {
        window.removeEventListener(event, checkExpiry);
      });
    };
    // Only depend on dispatch and navigate. Do not include stale variables.
  }, [dispatch, navigate]);
};
