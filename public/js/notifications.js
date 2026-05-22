/**
 * notifications.js
 * ─────────────────────────────────────────────────────────────
 * Shared notification system for Validify dashboards.
 * Works on: vendor.html, employee.html, department.html
 *
 * HOW TO USE IN EACH HTML FILE:
 *   1. Add the bell button somewhere in your header/navbar:
 *        <div class="notif-wrapper" id="notifWrapper">
 *          <button class="notif-bell" id="notifBell" aria-label="Notifications">
 *            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24"
 *                 fill="none" stroke="currentColor" stroke-width="2"
 *                 stroke-linecap="round" stroke-linejoin="round">
 *              <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
 *              <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
 *            </svg>
 *            <span class="notif-badge" id="notifBadge" style="display:none;">0</span>
 *          </button>
 *          <div class="notif-dropdown hidden" id="notifDropdown">
 *            <div class="notif-header">
 *              <span>Notifications</span>
 *              <button class="notif-mark-all" id="notifMarkAll">Mark all as read</button>
 *            </div>
 *            <ul class="notif-list" id="notifList"></ul>
 *            <div class="notif-empty hidden" id="notifEmpty">No new notifications.</div>
 *          </div>
 *        </div>
 *
 *   2. Add this script tag AFTER your main dashboard JS:
 *        <script src="js/notifications.js"></script>
 *
 *   3. Add the CSS from notifications.css to your page's <head>.
 * ─────────────────────────────────────────────────────────────
 */

(function () {
  "use strict";

  const POLL_INTERVAL_MS = 30_000; // 30 seconds

  let notifPollTimer = null;
  let isDropdownOpen = false;

  // ── DOM references (resolved after DOMContentLoaded) ────────
  let bellBtn      = null;
  let badge        = null;
  let dropdown     = null;
  let list         = null;
  let emptyMsg     = null;
  let markAllBtn   = null;

  // ── Helpers ─────────────────────────────────────────────────

  function escapeHTML(value) {
    return String(value ?? "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  function formatRelativeTime(dateString) {
    if (!dateString) return "";
    const diff = Date.now() - new Date(dateString).getTime();
    const mins  = Math.floor(diff / 60_000);
    const hours = Math.floor(diff / 3_600_000);
    const days  = Math.floor(diff / 86_400_000);

    if (mins  <  1) return "Just now";
    if (mins  < 60) return `${mins}m ago`;
    if (hours < 24) return `${hours}h ago`;
    if (days  <  7) return `${days}d ago`;

    return new Date(dateString).toLocaleDateString("en-US", {
      month: "short", day: "2-digit", year: "numeric"
    });
  }

  // ── Fetch & render ──────────────────────────────────────────

  async function fetchNotifications() {
    try {
      const res = await fetch("/notifications", { credentials: "same-origin" });
      if (!res.ok) return; // silently skip if not logged in yet

      const data = await res.json();
      renderNotifications(data.notifications || []);
    } catch (_err) {
      // Network hiccup — skip silently so it doesn't annoy the user
    }
  }

  function renderNotifications(items) {
    if (!list || !badge || !emptyMsg) return;

    const unread = items.filter((n) => !n.is_read);

    // Update badge
    if (unread.length > 0) {
      badge.textContent = unread.length > 99 ? "99+" : String(unread.length);
      badge.style.display = "flex";
    } else {
      badge.style.display = "none";
    }

    // Render list
    list.innerHTML = "";

    if (items.length === 0) {
      emptyMsg.classList.remove("hidden");
      return;
    }

    emptyMsg.classList.add("hidden");

    items.forEach((notif) => {
      const li = document.createElement("li");
      li.className = `notif-item${notif.is_read ? " notif-read" : " notif-unread"}`;
      li.dataset.id = notif.notification_id;

      li.innerHTML = `
        <div class="notif-dot-wrap">
          ${!notif.is_read ? '<span class="notif-dot"></span>' : ""}
        </div>
        <div class="notif-content">
          <p class="notif-title">${escapeHTML(notif.title)}</p>
          <p class="notif-message">${escapeHTML(notif.message)}</p>
          <span class="notif-time">${formatRelativeTime(notif.created_at)}</span>
        </div>
      `;

      li.addEventListener("click", () => markOneAsRead(notif.notification_id, li));
      list.appendChild(li);
    });
  }

  // ── Mark as read ────────────────────────────────────────────

  async function markOneAsRead(id, liElement) {
    try {
      await fetch(`/notifications/${id}/read`, {
        method: "POST",
        credentials: "same-origin"
      });

      // Update UI immediately without waiting for next poll
      liElement.classList.remove("notif-unread");
      liElement.classList.add("notif-read");
      const dot = liElement.querySelector(".notif-dot");
      if (dot) dot.remove();

      updateBadgeFromDOM();
    } catch (_err) {
      // Fail silently
    }
  }

  async function markAllAsRead() {
    try {
      await fetch("/notifications/read-all", {
        method: "POST",
        credentials: "same-origin"
      });

      // Update UI immediately
      document.querySelectorAll(".notif-item.notif-unread").forEach((li) => {
        li.classList.remove("notif-unread");
        li.classList.add("notif-read");
        const dot = li.querySelector(".notif-dot");
        if (dot) dot.remove();
      });

      updateBadgeFromDOM();
    } catch (_err) {
      // Fail silently
    }
  }

  function updateBadgeFromDOM() {
    if (!badge) return;
    const remaining = document.querySelectorAll(".notif-item.notif-unread").length;

    if (remaining > 0) {
      badge.textContent = remaining > 99 ? "99+" : String(remaining);
      badge.style.display = "flex";
    } else {
      badge.style.display = "none";
    }
  }

  // ── Dropdown toggle ─────────────────────────────────────────

  function openDropdown() {
    if (!dropdown) return;
    isDropdownOpen = true;
    dropdown.classList.remove("hidden");
    bellBtn?.setAttribute("aria-expanded", "true");
  }

  function closeDropdown() {
    if (!dropdown) return;
    isDropdownOpen = false;
    dropdown.classList.add("hidden");
    bellBtn?.setAttribute("aria-expanded", "false");
  }

  function toggleDropdown() {
    if (isDropdownOpen) {
      closeDropdown();
    } else {
      openDropdown();
    }
  }

  // ── Polling ─────────────────────────────────────────────────

  function startPolling() {
    fetchNotifications(); // Immediate first fetch
    notifPollTimer = setInterval(fetchNotifications, POLL_INTERVAL_MS);
  }

  function stopPolling() {
    if (notifPollTimer) {
      clearInterval(notifPollTimer);
      notifPollTimer = null;
    }
  }

  // ── Init ────────────────────────────────────────────────────

  function init() {
    bellBtn    = document.getElementById("notifBell");
    badge      = document.getElementById("notifBadge");
    dropdown   = document.getElementById("notifDropdown");
    list       = document.getElementById("notifList");
    emptyMsg   = document.getElementById("notifEmpty");
    markAllBtn = document.getElementById("notifMarkAll");

    // If bell element doesn't exist on this page, bail out gracefully
    if (!bellBtn) return;

    // Bell click → toggle dropdown
    bellBtn.addEventListener("click", (event) => {
      event.stopPropagation();
      toggleDropdown();
    });

    // Mark all button
    markAllBtn?.addEventListener("click", (event) => {
      event.stopPropagation();
      markAllAsRead();
    });

    // Click outside → close dropdown
    document.addEventListener("click", (event) => {
      const wrapper = document.getElementById("notifWrapper");
      if (wrapper && !wrapper.contains(event.target)) {
        closeDropdown();
      }
    });

    // Start polling
    startPolling();

    // Stop polling when tab is hidden, resume when visible (saves server load)
    document.addEventListener("visibilitychange", () => {
      if (document.hidden) {
        stopPolling();
      } else {
        startPolling();
      }
    });
  }

// UPDATED: Wait for dashboard scripts to finish building the UI
  window.addEventListener('load', () => {
    setTimeout(init, 500); 
  });

  // Expose a manual refresh for other scripts to call if needed
  // e.g. after an action that triggers a notification
  window.validifyRefreshNotifications = fetchNotifications;
})();