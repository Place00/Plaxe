/* =========================================================
   MIFTAHUL ILMI - SCHOOL MANAGEMENT SYSTEM
   app.js
   ========================================================= */

(() => {
  "use strict";

  /* =======================================================
     CONFIG
     ======================================================= */

  const APP = {
    name: "MADRASATUL MIFTAHUL ILMI WADDURASATUL ISLAMIYYA",
    arabic: "مدرسة مفتاح العلم والدراسات الإسلامية",
    location: "HOTORO, KANO, NIGERIA",
    whatsapp: "2347056845435",

    routes: {
      welcome: "/",
      home: "/home",
      rules: "/rules",
      register: "/register",
      registerForm: "/register/form",
      verification: "/register/verification",
      login: "/login",
      studentDashboard: "/student/dashboard",
      about: "/about",
      information: "/information",
      adminLogin: "/admin/login",
      adminDashboard: "/admin/dashboard",
      teacherLogin: "/teacher/login",
      teacherDashboard: "/teacher/dashboard",
      cashierLogin: "/cashier/login",
      cashierDashboard: "/cashier/dashboard"
    },

    classes: [
      { id: 1, name: "Class 1", prefix: "CLS1" },
      { id: 2, name: "Class 2", prefix: "CLS2" },
      { id: 3, name: "Class 3", prefix: "CLS3" },
      { id: 4, name: "Class 4", prefix: "CLS4" },
      { id: 5, name: "Class 5", prefix: "CLS5" }
    ],

    defaults: {
      registrationFee: 1000,
      monthlyFee: 500,
      studentPassword: "12345abc",
      chatLimitStudent: 10,
      chatLimitTeacher: 10,
      chatLimitCashier: 10,
      chatLimitAdmin: 0
    },

    storage: {
      registrationDraft: "mif_registration_draft",
      currentUser: "mif_current_user",
      currentRole: "mif_current_role",
      theme: "mif_theme",
      tapState: "mif_tap_state"
    }
  };


  /* =======================================================
     SAFE GLOBAL STATE
     ======================================================= */

  const state = {
    initialized: false,
    user: null,
    role: null,
    registration: null,
    settings: {},
    tap: {
      admin: {
        count: 0,
        lastTap: 0
      },
      teacher: {
        count: 0,
        lastTap: 0
      }
    }
  };


  /* =======================================================
     BASIC HELPERS
     ======================================================= */

  const $ = (selector, root = document) =>
    root.querySelector(selector);

  const $$ = (selector, root = document) =>
    [...root.querySelectorAll(selector)];

  const byId = id => document.getElementById(id);

  const safeText = value =>
    value === null || value === undefined ? "" : String(value);

  const escapeHTML = value => {
    return safeText(value)
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  };

  const debounce = (fn, delay = 300) => {
    let timer;

    return (...args) => {
      clearTimeout(timer);

      timer = setTimeout(() => {
        fn(...args);
      }, delay);
    };
  };

  const throttle = (fn, limit = 300) => {
    let waiting = false;

    return (...args) => {
      if (waiting) return;

      fn(...args);
      waiting = true;

      setTimeout(() => {
        waiting = false;
      }, limit);
    };
  };

  const sleep = ms =>
    new Promise(resolve => setTimeout(resolve, ms));


  /* =======================================================
     MONEY
     ======================================================= */

  function formatMoney(amount) {
    const number = Number(amount || 0);

    return new Intl.NumberFormat("en-NG", {
      style: "currency",
      currency: "NGN",
      maximumFractionDigits: 0
    }).format(number);
  }


  /* =======================================================
     DATE / TIME
     ======================================================= */

  function formatDate(date) {
    if (!date) return "-";

    try {
      return new Intl.DateTimeFormat("en-NG", {
        day: "2-digit",
        month: "short",
        year: "numeric"
      }).format(new Date(date));
    } catch {
      return "-";
    }
  }

  function formatDateTime(date) {
    if (!date) return "-";

    try {
      return new Intl.DateTimeFormat("en-NG", {
        dateStyle: "medium",
        timeStyle: "short"
      }).format(new Date(date));
    } catch {
      return "-";
    }
  }


  /* =======================================================
     RANDOM ID / CODE HELPERS
     ======================================================= */

  function randomString(length = 8) {
    const chars =
      "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789";

    let output = "";

    const values = new Uint32Array(length);
    crypto.getRandomValues(values);

    for (let i = 0; i < length; i++) {
      output += chars[values[i] % chars.length];
    }

    return output;
  }

  function randomStudentId() {
    const middle = randomString(5);
    const randomNumber = String(
      crypto.getRandomValues(new Uint32Array(1))[0] % 1000
    ).padStart(3, "0");

    return `Mif${middle}${randomNumber}`;
  }

  function generateConfirmationCode(classId) {
    const cls = APP.classes.find(item => item.id === Number(classId));

    const prefix = cls ? cls.prefix : "CLS";

    return `${prefix}${randomString(8)}`.toUpperCase();
  }


  /* =======================================================
     VALIDATION
     ======================================================= */

  const validators = {

    required(value) {
      return safeText(value).trim().length > 0;
    },

    phone(value) {
      const cleaned = safeText(value).replace(/\s+/g, "");
      return /^(?:\+234|0)[789]\d{9}$/.test(cleaned);
    },

    email(value) {
      return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(
        safeText(value).trim()
      );
    },

    password(value) {
      const length = safeText(value).length;
      return length >= 6 && length <= 10;
    },

    name(value) {
      return safeText(value).trim().length >= 2;
    }
  };


  /* =======================================================
     TOAST / ALERT SYSTEM
     ======================================================= */

  function createToastContainer() {
    let container = byId("mif-toast-container");

    if (container) return container;

    container = document.createElement("div");

    container.id = "mif-toast-container";
    container.className = "mif-toast-container";
    container.setAttribute("aria-live", "polite");

    document.body.appendChild(container);

    return container;
  }

  function toast(message, type = "info", duration = 3500) {
    const container = createToastContainer();

    const item = document.createElement("div");

    item.className = `mif-toast mif-toast-${type}`;

    item.innerHTML = `
      <div class="mif-toast-icon">
        ${
          type === "success"
            ? "✓"
            : type === "error"
            ? "!"
            : type === "warning"
            ? "!"
            : "i"
        }
      </div>

      <div class="mif-toast-message">
        ${escapeHTML(message)}
      </div>

      <button
        type="button"
        class="mif-toast-close"
        aria-label="Close"
      >×</button>
    `;

    container.appendChild(item);

    const remove = () => {
      item.classList.add("is-removing");

      setTimeout(() => {
        item.remove();
      }, 250);
    };

    $(".mif-toast-close", item)?.addEventListener(
      "click",
      remove
    );

    setTimeout(remove, duration);
  }


  /* =======================================================
     LOADING
     ======================================================= */

  function setLoading(element, loading, text = "Loading...") {
    if (!element) return;

    if (loading) {
      if (!element.dataset.originalText) {
        element.dataset.originalText =
          element.textContent.trim();
      }

      element.disabled = true;

      element.innerHTML = `
        <span class="mif-spinner" aria-hidden="true"></span>
        <span>${escapeHTML(text)}</span>
      `;
    } else {
      element.disabled = false;

      if (element.dataset.originalText) {
        element.textContent =
          element.dataset.originalText;

        delete element.dataset.originalText;
      }
    }
  }


  /* =======================================================
     MODAL
     ======================================================= */

  function createModal({
    title = "",
    content = "",
    actions = [],
    closeOnBackdrop = true
  } = {}) {
    const existing = byId("mif-global-modal");

    if (existing) existing.remove();

    const modal = document.createElement("div");

    modal.id = "mif-global-modal";
    modal.className = "mif-modal-overlay";

    modal.innerHTML = `
      <div class="mif-modal" role="dialog" aria-modal="true">

        <div class="mif-modal-header">
          <h3>${escapeHTML(title)}</h3>

          <button
            type="button"
            class="mif-modal-close"
            aria-label="Close"
          >
            ×
          </button>
        </div>

        <div class="mif-modal-body">
          ${content}
        </div>

        ${
          actions.length
            ? `
              <div class="mif-modal-footer">
                ${actions
                  .map(
                    action => `
                      <button
                        type="button"
                        class="mif-btn ${escapeHTML(
                          action.className || "mif-btn-secondary"
                        )}"
                        data-modal-action="${escapeHTML(
                          action.id || ""
                        )}"
                      >
                        ${escapeHTML(action.label || "OK")}
                      </button>
                    `
                  )
                  .join("")}
              </div>
            `
            : ""
        }

      </div>
    `;

    document.body.appendChild(modal);

    const close = () => modal.remove();

    $(".mif-modal-close", modal)?.addEventListener(
      "click",
      close
    );

    if (closeOnBackdrop) {
      modal.addEventListener("click", event => {
        if (event.target === modal) {
          close();
        }
      });
    }

    actions.forEach(action => {
      const button = $(
        `[data-modal-action="${CSS.escape(action.id || "")}"]`,
        modal
      );

      button?.addEventListener("click", async () => {
        if (typeof action.onClick === "function") {
          await action.onClick(close);
        }
      });
    });

    return {
      element: modal,
      close
    };
  }


  function confirmAction({
    title = "Confirm Action",
    message = "Are you sure?",
    danger = false
  } = {}) {
    return new Promise(resolve => {
      createModal({
        title,
        content: `
          <p class="mif-confirm-message">
            ${escapeHTML(message)}
          </p>
        `,
        actions: [
          {
            id: "cancel",
            label: "Cancel",
            className: "mif-btn-secondary",
            onClick: close => {
              close();
              resolve(false);
            }
          },
          {
            id: "confirm",
            label: "Confirm",
            className: danger
              ? "mif-btn-danger"
              : "mif-btn-primary",
            onClick: close => {
              close();
              resolve(true);
            }
          }
        ]
      });
    });
  }


  /* =======================================================
     ROUTING
     ======================================================= */

  function normalizePath(path) {
    if (!path) return "/";

    let result = path;

    if (!result.startsWith("/")) {
      result = `/${result}`;
    }

    if (
      result.length > 1 &&
      result.endsWith("/")
    ) {
      result = result.slice(0, -1);
    }

    return result;
  }

  function currentPath() {
    return normalizePath(
      window.location.pathname
    );
  }

  function navigate(path, replace = false) {
    const normalized = normalizePath(path);

    if (replace) {
      history.replaceState({}, "", normalized);
    } else {
      history.pushState({}, "", normalized);
    }

    window.dispatchEvent(
      new PopStateEvent("popstate")
    );
  }

  function setupRouting() {
    window.addEventListener(
      "popstate",
      () => {
        renderRoute();
      }
    );

    document.addEventListener("click", event => {
      const link = event.target.closest(
        "[data-route]"
      );

      if (!link) return;

      const target = link.dataset.route;

      if (!target) return;

      event.preventDefault();

      navigate(target);
    });
  }


  /* =======================================================
     AUTH STATE
     ======================================================= */

  function saveLocalSession(user, role) {
    try {
      localStorage.setItem(
        APP.storage.currentUser,
        JSON.stringify(user)
      );

      localStorage.setItem(
        APP.storage.currentRole,
        role
      );
    } catch {
      /* ignore local storage errors */
    }
  }

  function loadLocalSession() {
    try {
      const user = JSON.parse(
        localStorage.getItem(
          APP.storage.currentUser
        ) || "null"
      );

      const role = localStorage.getItem(
        APP.storage.currentRole
      );

      state.user = user;
      state.role = role;

      return {
        user,
        role
      };
    } catch {
      state.user = null;
      state.role = null;

      return {
        user: null,
        role: null
      };
    }
  }

  function clearLocalSession() {
    try {
      localStorage.removeItem(
        APP.storage.currentUser
      );

      localStorage.removeItem(
        APP.storage.currentRole
      );
    } catch {
      /* ignore */
    }

    state.user = null;
    state.role = null;
  }


  /* =======================================================
     SUPABASE CONNECTOR
     ======================================================= */

  function getSupabase() {
    if (
      window.supabaseClient &&
      typeof window.supabaseClient.from === "function"
    ) {
      return window.supabaseClient;
    }

    return null;
  }

  async function supabaseQuery(callback) {
    const client = getSupabase();

    if (!client) {
      throw new Error(
        "Supabase bai haɗu ba. Za mu haɗa configuration a mataki na gaba."
      );
    }

    return callback(client);
  }


  /* =======================================================
     SCHOOL SETTINGS
     ======================================================= */

  async function loadSchoolSettings() {
    try {
      const client = getSupabase();

      if (!client) {
        state.settings = {
          registration_fee:
            APP.defaults.registrationFee,
          monthly_fee:
            APP.defaults.monthlyFee,
          school_name: APP.name,
          arabic_name: APP.arabic
        };

        return state.settings;
      }

      const { data, error } = await client
        .from("school_settings")
        .select("*");

      if (error) throw error;

      const settings = {};

      (data || []).forEach(row => {
        settings[row.key] = row.value;
      });

      state.settings = settings;

      return settings;

    } catch (error) {
      console.error(
        "Settings loading error:",
        error
      );

      state.settings = {
        registration_fee:
          APP.defaults.registrationFee,
        monthly_fee:
          APP.defaults.monthlyFee
      };

      return state.settings;
    }
  }

  function getSetting(key, fallback = "") {
    if (
      state.settings &&
      Object.prototype.hasOwnProperty.call(
        state.settings,
        key
      )
    ) {
      return state.settings[key];
    }

    return fallback;
  }

  function registrationFee() {
    return Number(
      getSetting(
        "registration_fee",
        APP.defaults.registrationFee
      )
    );
  }

  function monthlyFee() {
    return Number(
      getSetting(
        "monthly_fee",
        APP.defaults.monthlyFee
      )
    );
  }


  /* =======================================================
     GLOBAL CONTENT
     ======================================================= */

  async function loadPublicContent() {
    const client = getSupabase();

    if (!client) return;

    try {
      const { data, error } = await client
        .from("school_settings")
        .select("*");

      if (error) throw error;

      const map = {};

      (data || []).forEach(item => {
        map[item.key] = item.value;
      });

      state.settings = {
        ...state.settings,
        ...map
      };

      updateDynamicContent();

    } catch (error) {
      console.error(
        "Public content error:",
        error
      );
    }
  }

  function updateDynamicContent() {
    $$("[data-setting]").forEach(element => {
      const key = element.dataset.setting;

      const value = getSetting(key);

      if (value !== undefined && value !== null) {
        element.textContent = value;
      }
    });

    $$("[data-fee='registration']").forEach(
      element => {
        element.textContent =
          formatMoney(registrationFee());
      }
    );

    $$("[data-fee='monthly']").forEach(
      element => {
        element.textContent =
          formatMoney(monthlyFee());
      }
    );
  }


  /* =======================================================
     MOBILE SIDEBAR
     ======================================================= */

  function setupSidebar() {
    const sidebar = $(
      ".mif-sidebar"
    );

    const toggle = $(
      "[data-sidebar-toggle]"
    );

    const overlay = $(
      ".mif-sidebar-overlay"
    );

    if (!sidebar || !toggle) return;

    const closeSidebar = () => {
      sidebar.classList.remove(
        "is-open"
      );

      overlay?.classList.remove(
        "is-visible"
      );

      document.body.classList.remove(
        "sidebar-open"
      );
    };

    const openSidebar = () => {
      sidebar.classList.add(
        "is-open"
      );

      overlay?.classList.add(
        "is-visible"
      );

      document.body.classList.add(
        "sidebar-open"
      );
    };

    toggle.addEventListener(
      "click",
      () => {
        if (
          sidebar.classList.contains(
            "is-open"
          )
        ) {
          closeSidebar();
        } else {
          openSidebar();
        }
      }
    );

    overlay?.addEventListener(
      "click",
      closeSidebar
    );

    sidebar.addEventListener(
      "click",
      event => {
        const link =
          event.target.closest(
            "[data-route]"
          );

        if (link) {
          closeSidebar();
        }
      }
    );
  }


  /* =======================================================
     SIDEBAR SCROLL / ACTIVE VIEW
     ======================================================= */

  function setupSidebarScrollBehavior() {
    const sidebar = $(
      ".mif-sidebar"
    );

    if (!sidebar) return;

    let lastScrollTop = 0;

    sidebar.addEventListener(
      "scroll",
      () => {
        const current =
          sidebar.scrollTop;

        if (Math.abs(
          current - lastScrollTop
        ) < 8) {
          return;
        }

        lastScrollTop = current;
      },
      { passive: true }
    );

    document.addEventListener(
      "click",
      event => {
        const link =
          event.target.closest(
            ".mif-sidebar [data-route]"
          );

        if (!link) return;

        requestAnimationFrame(() => {
          const active =
            $(".mif-sidebar .active");

          active?.scrollIntoView({
            block: "nearest",
            behavior: "smooth"
          });
        });
      }
    );
  }


  /* =======================================================
     HIDDEN ACCESS GESTURES
     ======================================================= */

  const GESTURE_LIMIT = 8;
  const GESTURE_TIMEOUT = 1600;

  function resetGesture(type) {
    state.tap[type].count = 0;
    state.tap[type].lastTap = 0;
  }

  function processSecretGesture(
    type,
    event
  ) {
    const now = Date.now();

    const gesture =
      state.tap[type];

    if (
      gesture.lastTap &&
      now - gesture.lastTap >
        GESTURE_TIMEOUT
    ) {
      gesture.count = 0;
    }

    gesture.count++;
    gesture.lastTap = now;

    if (
      gesture.count >= GESTURE_LIMIT
    ) {
      resetGesture(type);

      event.preventDefault();

      if (type === "admin") {
        openAdminGate();
      }

      if (type === "teacher") {
        openTeacherGate();
      }

      return true;
    }

    return false;
  }

  function setupSecretAccess() {
    const adminTargets = $$(
      "[data-secret-admin]"
    );

    const teacherTargets = $$(
      "[data-secret-teacher]"
    );

    adminTargets.forEach(element => {
      let timer = null;

      element.addEventListener(
        "click",
        event => {
          processSecretGesture(
            "admin",
            event
          );

          clearTimeout(timer);

          timer = setTimeout(() => {
            resetGesture("admin");
          }, GESTURE_TIMEOUT);
        }
      );
    });

    teacherTargets.forEach(element => {
      let timer = null;

      element.addEventListener(
        "click",
        event => {
          processSecretGesture(
            "teacher",
            event
          );

          clearTimeout(timer);

          timer = setTimeout(() => {
            resetGesture("teacher");
          }, GESTURE_TIMEOUT);
        }
      );
    });
  }


  /* =======================================================
     PIN GATE
     ======================================================= */

  function openAdminGate() {
    openPinGate("admin");
  }

  function openTeacherGate() {
    openPinGate("teacher");
  }

  function openPinGate(type) {
    const isAdmin = type === "admin";

    const title = isAdmin
      ? "Admin Secure Access"
      : "Teacher Secure Access";

    const description = isAdmin
      ? "Shigar da Admin Access PIN domin ci gaba."
      : "Shigar da Teacher Access PIN domin ci gaba.";

    createModal({
      title,
      content: `
        <div class="mif-pin-gate">

          <div class="mif-pin-icon">
            🔐
          </div>

          <p>
            ${escapeHTML(description)}
          </p>

          <form
            id="mif-pin-form"
            autocomplete="off"
          >

            <label>
              Access PIN
            </label>

            <input
              id="mif-access-pin"
              type="password"
              inputmode="numeric"
              autocomplete="off"
              maxlength="12"
              required
              placeholder="••••••"
            />

            <div
              id="mif-pin-error"
              class="mif-form-error"
              hidden
            ></div>

            <button
              type="submit"
              class="mif-btn mif-btn-primary"
            >
              Continue
            </button>

          </form>

        </div>
      `,
      closeOnBackdrop: true
    });

    const form = byId(
      "mif-pin-form"
    );

    const input = byId(
      "mif-access-pin"
    );

    const error = byId(
      "mif-pin-error"
    );

    setTimeout(() => {
      input?.focus();
    }, 100);

    form?.addEventListener(
      "submit",
      async event => {
        event.preventDefault();

        const pin =
          input?.value?.trim();

        if (!pin) {
          error.textContent =
            "Please enter the PIN.";

          error.hidden = false;

          return;
        }

        const button =
          $("button[type='submit']", form);

        setLoading(
          button,
          true,
          "Checking..."
        );

        try {
          const valid =
            await validateAccessPin(
              type,
              pin
            );

          if (!valid) {
            error.textContent =
              "PIN ba daidai ba. Ka sake gwadawa.";

            error.hidden = false;

            setLoading(
              button,
              false
            );

            input.value = "";
            input.focus();

            return;
          }

          document
            .getElementById(
              "mif-global-modal"
            )
            ?.remove();

          if (isAdmin) {
            navigate(
              APP.routes.adminLogin
            );
          } else {
            navigate(
              APP.routes.teacherLogin
            );
          }

        } catch (err) {
          console.error(err);

          error.textContent =
            "An samu matsala wajen tabbatar da PIN.";

          error.hidden = false;

          setLoading(
            button,
            false
          );
        }
      }
    );
  }


  async function validateAccessPin(
    type,
    pin
  ) {
    /*
      IMPORTANT:

      PIN ba zai kasance a frontend
      a production ba.

      Wannan function zai karanta
      hashed/configured PIN daga Supabase
      bayan mun hada supabase.sql.

      A yanzu muna amfani da secure
      configuration hook.
    */

    const client = getSupabase();

    if (!client) {
      /*
        Development fallback kawai.
        Za a cire fallback a production.
      */

      const configured =
        type === "admin"
          ? window.MIFTAHUL_ADMIN_PIN
          : window.MIFTAHUL_TEACHER_PIN;

      if (
        typeof configured === "string" &&
        configured.length > 0
      ) {
        return pin === configured;
      }

      return false;
    }

    try {
      /*
        Production validation should be
        performed through a Supabase RPC /
        Edge Function so the actual secret
        is never returned to browser.
      */

      const { data, error } =
        await client.rpc(
          "verify_access_pin",
          {
            p_access_type: type,
            p_pin: pin
          }
        );

      if (error) {
        console.error(error);
        return false;
      }

      return data === true;

    } catch (error) {
      console.error(
        "PIN validation error:",
        error
      );

      return false;
    }
  }


  /* =======================================================
     REGISTRATION DRAFT
     ======================================================= */

  function saveRegistrationDraft(data) {
    try {
      localStorage.setItem(
        APP.storage.registrationDraft,
        JSON.stringify(data)
      );

      state.registration = data;

    } catch (error) {
      console.error(
        "Unable to save registration draft:",
        error
      );
    }
  }

  function loadRegistrationDraft() {
    try {
      const value =
        localStorage.getItem(
          APP.storage.registrationDraft
        );

      if (!value) return null;

      state.registration =
        JSON.parse(value);

      return state.registration;

    } catch {
      return null;
    }
  }

  function clearRegistrationDraft() {
    try {
      localStorage.removeItem(
        APP.storage.registrationDraft
      );
    } catch {
      /* ignore */
    }

    state.registration = null;
  }


  /* =======================================================
     REGISTRATION RULE AGREEMENT
     ======================================================= */

  function setupRegistrationAgreement() {
    const form = $(
      "#registration-agreement-form"
    );

    if (!form) return;

    const checkboxes = $$(
      "input[type='checkbox'][required]",
      form
    );

    const nextButton = $(
      "[data-registration-next]",
      form
    );

    function updateButton() {
      const accepted =
        checkboxes.length > 0 &&
        checkboxes.every(
          checkbox => checkbox.checked
        );

      if (nextButton) {
        nextButton.disabled =
          !accepted;
      }
    }

    checkboxes.forEach(
      checkbox => {
        checkbox.addEventListener(
          "change",
          updateButton
        );
      }
    );

    updateButton();

    form.addEventListener(
      "submit",
      event => {
        event.preventDefault();

        const accepted =
          checkboxes.every(
            checkbox =>
              checkbox.checked
          );

        if (!accepted) {
          toast(
            "Dole ne ka amince da dukkan dokokin kafin ka ci gaba.",
            "warning"
          );

          return;
        }

        saveRegistrationDraft({
          rulesAccepted: true,
          rulesAcceptedAt:
            new Date().toISOString()
        });

        navigate(
          APP.routes.registerForm
        );
      }
    );
  }


  /* =======================================================
     REGISTRATION FORM
     ======================================================= */

  function setupRegistrationForm() {
    const form = $(
      "#student-registration-form"
    );

    if (!form) return;

    const draft =
      loadRegistrationDraft();

    if (
      !draft ||
      draft.rulesAccepted !== true
    ) {
      navigate(
        APP.routes.register
      );

      return;
    }

    restoreForm(form, draft);

    setupPhotoCapture(form);
    setupRegistrationSteps(form);
    setupRegistrationSubmit(form);
  }


  function restoreForm(form, data) {
    Object.entries(data || {}).forEach(
      ([key, value]) => {
        if (
          [
            "rulesAccepted",
            "rulesAcceptedAt",
            "photoData"
          ].includes(key)
        ) {
          return;
        }

        const field =
          form.elements.namedItem(key);

        if (!field) return;

        if (
          field.type === "checkbox"
        ) {
          field.checked = Boolean(
            value
          );
        } else if (
          field.type !== "file"
        ) {
          field.value =
            value ?? "";
        }
      }
    );

    if (data?.photoData) {
      const preview = $(
        "[data-photo-preview]",
        form
      );

      if (preview) {
        preview.src =
          data.photoData;

        preview.hidden = false;
      }
    }
  }


  /* =======================================================
     REGISTRATION STEPS
     ======================================================= */

  function setupRegistrationSteps(form) {
    const steps = $$(
      "[data-form-step]",
      form
    );

    if (!steps.length) return;

    let current = 0;

    const showStep = index => {
      current = Math.max(
        0,
        Math.min(
          index,
          steps.length - 1
        )
      );

      steps.forEach(
        (step, i) => {
          step.hidden = i !== current;
          step.classList.toggle(
            "active",
            i === current
          );
        }
      );

      $$(
        "[data-step-indicator]",
        form
      ).forEach(
        (indicator, i) => {
          indicator.classList.toggle(
            "active",
            i === current
          );

          indicator.classList.toggle(
            "completed",
            i < current
          );
        }
      );

      $$(
        "[data-step-prev]",
        form
      ).forEach(button => {
        button.disabled =
          current === 0;
      });

      $$(
        "[data-step-next]",
        form
      ).forEach(button => {
        button.hidden =
          current === steps.length - 1;
      });

      $$(
        "[data-step-submit]",
        form
      ).forEach(button => {
        button.hidden =
          current !== steps.length - 1;
      });
    };

    const validateCurrent = () => {
      const step = steps[current];

      if (!step) return true;

      let valid = true;

      $$(
        "input, select, textarea",
        step
      ).forEach(field => {
        if (
          !field.checkValidity()
        ) {
          field.reportValidity();
          valid = false;
        }
      });

      return valid;
    };

    $$(
      "[data-step-next]",
      form
    ).forEach(button => {
      button.addEventListener(
        "click",
        () => {
          if (
            validateCurrent()
          ) {
            showStep(
              current + 1
            );
          }
        }
      );
    });

    $$(
      "[data-step-prev]",
      form
    ).forEach(button => {
      button.addEventListener(
        "click",
        () => {
          showStep(
            current - 1
          );
        }
      );
    });

    showStep(0);
  }


  /* =======================================================
     PHOTO / CAMERA
     ======================================================= */

  function setupPhotoCapture(form) {
    const fileInput = $(
      "[data-photo-input]",
      form
    );

    const preview = $(
      "[data-photo-preview]",
      form
    );

    const camera =
      $("[data-camera]", form);

    const cameraVideo =
      $("[data-camera-video]", form);

    const cameraCanvas =
      $("[data-camera-canvas]", form);

    const captureButton =
      $("[data-camera-capture]", form);

    const switchButton =
      $("[data-camera-switch]", form);

    const cameraContainer =
      $("[data-camera-container]", form);

    let stream = null;
    let facingMode = "user";

    const stopCamera = () => {
      if (!stream) return;

      stream
        .getTracks()
        .forEach(track => track.stop());

      stream = null;

      if (cameraVideo) {
        cameraVideo.srcObject = null;
      }
    };

    const showPreview = src => {
      if (!preview) return;

      preview.src = src;
      preview.hidden = false;

      const existing =
        form.querySelector(
          "[name='photoData']"
        );

      if (existing) {
        existing.value = src;
      } else {
        const hidden =
          document.createElement("input");

        hidden.type = "hidden";
        hidden.name = "photoData";
        hidden.value = src;

        form.appendChild(hidden);
      }

      const draft =
        loadRegistrationDraft() || {};

      saveRegistrationDraft({
        ...draft,
        photoData: src
      });
    };

    fileInput?.addEventListener(
      "change",
      event => {
        const file =
          event.target.files?.[0];

        if (!file) return;

        if (
          !file.type.startsWith("image/")
        ) {
          toast(
            "Da fatan zaɓi hoton dalibi kawai.",
            "error"
          );

          fileInput.value = "";

          return;
        }

        /*
          Resize image before preview/storage.
          Wannan yana rage Supabase Storage usage.
        */

        resizeImage(
          file,
          900,
          900,
          0.78
        )
          .then(showPreview)
          .catch(error => {
            console.error(error);

            toast(
              "An kasa shirya hoton.",
              "error"
            );
          });
      }
    );

    camera?.addEventListener(
      "click",
      async () => {
        if (
          !navigator.mediaDevices?.getUserMedia
        ) {
          toast(
            "Browser ɗinka bai goyi bayan camera ba.",
            "error"
          );

          return;
        }

        try {
          stopCamera();

          stream =
            await navigator.mediaDevices.getUserMedia(
              {
                video: {
                  facingMode
                },
                audio: false
              }
            );

          if (cameraVideo) {
            cameraVideo.srcObject =
              stream;

            cameraVideo.hidden =
              false;

            await cameraVideo.play();
          }

          cameraContainer?.classList.add(
            "is-active"
          );

        } catch (error) {
          console.error(error);

          toast(
            "Ba a samu damar amfani da camera ba.",
            "error"
          );
        }
      }
    );

    captureButton?.addEventListener(
      "click",
      () => {
        if (
          !cameraVideo ||
          !cameraCanvas ||
          !stream
        ) {
          return;
        }

        const width =
          cameraVideo.videoWidth || 900;

        const height =
          cameraVideo.videoHeight || 900;

        const max = 900;

        const scale =
          Math.min(
            1,
            max / Math.max(
              width,
              height
            )
          );

        cameraCanvas.width =
          Math.round(width * scale);

        cameraCanvas.height =
          Math.round(height * scale);

        const context =
          cameraCanvas.getContext(
            "2d"
          );

        context.drawImage(
          cameraVideo,
          0,
          0,
          cameraCanvas.width,
          cameraCanvas.height
        );

        const image =
          cameraCanvas.toDataURL(
            "image/webp",
            0.78
          );

        showPreview(image);

        stopCamera();

        cameraContainer?.classList.remove(
          "is-active"
        );
      }
    );

    switchButton?.addEventListener(
      "click",
      async () => {
        facingMode =
          facingMode === "user"
            ? "environment"
            : "user";

        if (stream) {
          camera.click();
        }
      }
    );

    window.addEventListener(
      "beforeunload",
      stopCamera
    );
  }


  async function resizeImage(
    file,
    maxWidth = 900,
    maxHeight = 900,
    quality = 0.78
  ) {
    const image =
      await fileToImage(file);

    let width =
      image.naturalWidth;

    let height =
      image.naturalHeight;

    const scale =
      Math.min(
        1,
        maxWidth / width,
        maxHeight / height
      );

    width =
      Math.round(width * scale);

    height =
      Math.round(height * scale);

    const canvas =
      document.createElement("canvas");

    canvas.width = width;
    canvas.height = height;

    const ctx =
      canvas.getContext("2d");

    ctx.drawImage(
      image,
      0,
      0,
      width,
      height
    );

    return canvas.toDataURL(
      "image/webp",
      quality
    );
  }

  function fileToImage(file) {
    return new Promise(
      (resolve, reject) => {
        const url =
          URL.createObjectURL(file);

        const image =
          new Image();

        image.onload = () => {
          URL.revokeObjectURL(url);
          resolve(image);
        };

        image.onerror = () => {
          URL.revokeObjectURL(url);
          reject(
            new Error(
              "Unable to read image."
            )
          );
        };

        image.src = url;
      }
    );
  }


  /* =======================================================
     REGISTRATION SUBMISSION
     ======================================================= */

  function collectFormData(form) {
    const formData =
      new FormData(form);

    const object = {};

    for (const [
      key,
      value
    ] of formData.entries()) {
      if (
        value instanceof File
      ) {
        continue;
      }

      object[key] = value;
    }

    return object;
  }

  function validateStudentRegistration(
    data
  ) {
    const required = [
      "full_name",
      "father_name",
      "mother_name",
      "gender",
      "date_of_birth",
      "phone",
      "guardian_phone",
      "address",
      "class_id",
      "registration_year"
    ];

    for (const field of required) {
      if (
        !validators.required(
          data[field]
        )
      ) {
        return {
          valid: false,
          message:
            `A cike ${field.replaceAll(
              "_",
              " "
            )}.`
        };
      }
    }

    if (
      !validators.phone(
        data.phone
      )
    ) {
      return {
        valid: false,
        message:
          "Phone number ba daidai ba ne."
      };
    }

    if (
      !validators.phone(
        data.guardian_phone
      )
    ) {
      return {
        valid: false,
        message:
          "Parent/Guardian phone ba daidai ba ne."
      };
    }

    if (
      !data.photoData
    ) {
      return {
        valid: false,
        message:
          "Hoton dalibi wajibi ne."
      };
    }

    return {
      valid: true
    };
  }


  function setupRegistrationSubmit(
    form
  ) {
    const submit =
      $("[data-step-submit]", form);

    if (!submit) return;

    form.addEventListener(
      "submit",
      async event => {
        event.preventDefault();

        const data =
          collectFormData(form);

        const draft =
          loadRegistrationDraft() || {};

        const combined = {
          ...draft,
          ...data
        };

        const validation =
          validateStudentRegistration(
            combined
          );

        if (!validation.valid) {
          toast(
            validation.message,
            "warning"
          );

          return;
        }

        setLoading(
          submit,
          true,
          "Preparing..."
        );

        try {
          saveRegistrationDraft(
            combined
          );

          /*
            IMPORTANT:
            Ba a kammala registration a nan ba.

            Student zai koma confirmation
            code verification page.

            Database registration record
            za a create a verification step
            na gaba.
          */

          navigate(
            APP.routes.verification
          );

        } catch (error) {
          console.error(error);

          toast(
            "An samu matsala wajen tura registration.",
            "error"
          );

        } finally {
          setLoading(
            submit,
            false
          );
        }
      }
    );
  }


  /* =======================================================
     CONFIRMATION CODE VERIFICATION
     ======================================================= */

  function setupConfirmationVerification() {
    const form = $(
      "#confirmation-code-form"
    );

    if (!form) return;

    const draft =
      loadRegistrationDraft();

    if (
      !draft ||
      !draft.rulesAccepted
    ) {
      navigate(
        APP.routes.register
      );

      return;
    }

    const classId =
      Number(draft.class_id);

    const className =
      getClassName(classId);

    $$(
      "[data-verification-class]"
    ).forEach(
      element => {
        element.textContent =
          className;
      }
    );

    setupWhatsAppRequestButton(
      draft
    );

    form.addEventListener(
      "submit",
      async event => {
        event.preventDefault();

        const input = $(
          "[name='confirmation_code']",
          form
        );

        const button = $(
          "button[type='submit']",
          form
        );

        const code =
          input?.value
            ?.trim()
            .toUpperCase();

        if (!code) {
          toast(
            "Saka Confirmation Code.",
            "warning"
          );

          input?.focus();

          return;
        }

        setLoading(
          button,
          true,
          "Verifying..."
        );

        try {
          const result =
            await verifyConfirmationCode(
              code,
              classId,
              draft
            );

          if (!result.success) {
            toast(
              result.message ||
                "Confirmation Code ba daidai ba ne.",
              "error"
            );

            return;
          }

          clearRegistrationDraft();

          showRegistrationSuccess(
            result.student
          );

        } catch (error) {
          console.error(error);

          toast(
            "An samu matsala wajen verification.",
            "error"
          );

        } finally {
          setLoading(
            button,
            false
          );
        }
      }
    );
  }


  async function verifyConfirmationCode(
    code,
    classId,
    registration
  ) {
    const client = getSupabase();

    if (!client) {
      return {
        success: false,
        message:
          "Supabase bai haɗu ba tukuna."
      };
    }

    /*
      IMPORTANT:

      Verification + mark USED +
      student creation +
      account creation

      DUKA ya kamata su gudana a
      secure transaction/RPC.

      Ba frontend zai yi wannan da kansa ba.

      Za mu gina RPC a supabase.sql.
    */

    const { data, error } =
      await client.rpc(
        "complete_student_registration",
        {
          p_confirmation_code: code,
          p_class_id: classId,
          p_registration: registration
        }
      );

    if (error) {
      console.error(error);

      return {
        success: false,
        message:
          "Ba a iya kammala registration ba."
      };
    }

    if (!data?.success) {
      return {
        success: false,
        message:
          data?.message ||
          "Confirmation Code ba ya aiki."
      };
    }

    return {
      success: true,
      student:
        data.student
    };
  }


  function setupWhatsAppRequestButton(
    registration
  ) {
    const button = $(
      "[data-whatsapp-confirmation]"
    );

    if (!button) return;

    button.addEventListener(
      "click",
      event => {
        event.preventDefault();

        const message =
          buildWhatsAppMessage(
            registration
          );

        const url =
          `https://wa.me/${APP.whatsapp}?text=${encodeURIComponent(
            message
          )}`;

        window.open(
          url,
          "_blank",
          "noopener,noreferrer"
        );
      }
    );
  }


  function buildWhatsAppMessage(
    registration
  ) {
    return [
      "Assalamu Alaikum.",
      "",
      "Na gama cike registration form na MADRASATUL MIFTAHUL ILMI WADDURASATUL ISLAMIYYA.",
      "",
      "Ina bukatar Confirmation Code domin kammala registration.",
      "",
      `Suna: ${
        registration.full_name || "-"
      }`,
      `Class: ${
        getClassName(
          registration.class_id
        )
      }`,
      `Phone: ${
        registration.phone || "-"
      }`,
      `Guardian Phone: ${
        registration.guardian_phone || "-"
      }`,
      "",
      "Jazakallahu Khairan."
    ].join("\n");
  }


  /* =======================================================
     REGISTRATION SUCCESS
     ======================================================= */

  function showRegistrationSuccess(
    student
  ) {
    const content = `
      <div class="mif-success-page">

        <div class="mif-success-icon">
          ✓
        </div>

        <h1>
          REGISTRATION SUCCESSFUL
        </h1>

        <p>
          Alhamdulillah, an kammala
          registration ɗin ɗalibi.
        </p>

        <div class="mif-student-id-card">

          <span>
            Student ID
          </span>

          <strong>
            ${escapeHTML(
              student?.student_id || "-"
            )}
          </strong>

        </div>

        <div class="mif-summary">

          <div>
            <span>Student</span>
            <strong>
              ${escapeHTML(
                student?.full_name || "-"
              )}
            </strong>
          </div>

          <div>
            <span>Class</span>
            <strong>
              ${escapeHTML(
                getClassName(
                  student?.class_id
                )
              )}
            </strong>
          </div>

          <div>
            <span>Status</span>
            <strong>
              Registered
            </strong>
          </div>

        </div>

        <div class="mif-success-note">
          An ƙirƙiri account ɗinka.
          Idan default password yana aiki,
          shiga ka canza shi nan take.
        </div>

        <div class="mif-actions">

          <button
            type="button"
            class="mif-btn mif-btn-secondary"
            data-route="/home"
          >
            BACK
          </button>

          <button
            type="button"
            class="mif-btn mif-btn-primary"
            data-route="/login"
          >
            LOGIN
          </button>

        </div>

      </div>
    `;

    const appRoot =
      getAppRoot();

    appRoot.innerHTML = content;

    window.scrollTo({
      top: 0,
      behavior: "smooth"
    });

    setupPublicInteractions();
  }


  /* =======================================================
     LOGIN
     ======================================================= */

  function setupStudentLogin() {
    const form = $(
      "#student-login-form"
    );

    if (!form) return;

    form.addEventListener(
      "submit",
      async event => {
        event.preventDefault();

        const button = $(
          "button[type='submit']",
          form
        );

        const studentId =
          $("[name='student_id']", form)
            ?.value
            ?.trim();

        const password =
          $("[name='password']", form)
            ?.value;

        if (!studentId || !password) {
          toast(
            "Cike Student ID da Password.",
            "warning"
          );

          return;
        }

        setLoading(
          button,
          true,
          "Signing in..."
        );

        try {
          const result =
            await loginStudent(
              studentId,
              password
            );

          if (!result.success) {
            toast(
              result.message ||
                "Login bai yiwu ba.",
              "error"
            );

            return;
          }

          saveLocalSession(
            result.user,
            "STUDENT"
          );

          navigate(
            APP.routes.studentDashboard
          );

        } catch (error) {
          console.error(error);

          toast(
            "An samu matsala wajen login.",
            "error"
          );

        } finally {
          setLoading(
            button,
            false
          );
        }
      }
    );
  }


  async function loginStudent(
    studentId,
    password
  ) {
    const client = getSupabase();

    if (!client) {
      return {
        success: false,
        message:
          "Supabase bai haɗu ba tukuna."
      };
    }

    /*
      Student authentication will use
      Supabase Auth + student profile mapping.

      We do NOT store plaintext passwords
      in students table.
    */

    const { data, error } =
      await client.rpc(
        "student_login",
        {
          p_student_id:
            studentId,
          p_password:
            password
        }
      );

    if (error) {
      console.error(error);

      return {
        success: false,
        message:
          "Student ID ko password ba daidai ba ne."
      };
    }

    if (!data?.success) {
      return {
        success: false,
        message:
          data?.message ||
          "Login failed."
      };
    }

    return {
      success: true,
      user: data.user
    };
  }


  /* =======================================================
     ADMIN LOGIN
     ======================================================= */

  function setupAdminLogin() {
    const form = $(
      "#admin-login-form"
    );

    if (!form) return;

    form.addEventListener(
      "submit",
      async event => {
        event.preventDefault();

        const email =
          $("[name='email']", form)
            ?.value
            ?.trim();

        const password =
          $("[name='password']", form)
            ?.value;

        const button = $(
          "button[type='submit']",
          form
        );

        if (
          !validators.email(email) ||
          !password
        ) {
          toast(
            "Shigar da email da password.",
            "warning"
          );

          return;
        }

        setLoading(
          button,
          true,
          "Authenticating..."
        );

        try {
          const result =
            await loginWithSupabase(
              email,
              password,
              "ADMIN"
            );

          if (!result.success) {
            toast(
              result.message ||
                "Admin login failed.",
              "error"
            );

            return;
          }

          saveLocalSession(
            result.user,
            "ADMIN"
          );

          navigate(
            APP.routes.adminDashboard
          );

        } catch (error) {
          console.error(error);

          toast(
            "An samu matsala wajen login.",
            "error"
          );

        } finally {
          setLoading(
            button,
            false
          );
        }
      }
    );
  }


  /* =======================================================
     TEACHER LOGIN
     ======================================================= */

  function setupTeacherLogin() {
    const form = $(
      "#teacher-login-form"
    );

    if (!form) return;

    form.addEventListener(
      "submit",
      async event => {
        event.preventDefault();

        const identifier =
          $("[name='identifier']", form)
            ?.value
            ?.trim();

        const password =
          $("[name='password']", form)
            ?.value;

        const button = $(
          "button[type='submit']",
          form
        );

        if (!identifier || !password) {
          toast(
            "Cike Email/Phone da Password.",
            "warning"
          );

          return;
        }

        setLoading(
          button,
          true,
          "Authenticating..."
        );

        try {
          const result =
            await loginTeacher(
              identifier,
              password
            );

          if (!result.success) {
            toast(
              result.message ||
                "Teacher login failed.",
              "error"
            );

            return;
          }

          saveLocalSession(
            result.user,
            "TEACHER"
          );

          navigate(
            APP.routes.teacherDashboard
          );

        } catch (error) {
          console.error(error);

          toast(
            "An samu matsala wajen login.",
            "error"
          );

        } finally {
          setLoading(
            button,
            false
          );
        }
      }
    );
  }


  async function loginTeacher(
    identifier,
    password
  ) {
    const client = getSupabase();

    if (!client) {
      return {
        success: false,
        message:
          "Supabase bai haɗu ba tukuna."
      };
    }

    const { data, error } =
      await client.rpc(
        "teacher_login",
        {
          p_identifier:
            identifier,
          p_password:
            password
        }
      );

    if (error) {
      console.error(error);

      return {
        success: false,
        message:
         
