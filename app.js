/* ============================================================
   MADRASATUL MIFTAHUL ILMI
   app.js — Core Application Engine
   ============================================================ */

(() => {
  "use strict";

  const CONFIG = window.MIFTAH_CONFIG || {};

  /* ==========================================================
     APP STATE
     ========================================================== */

  const STATE = {
    user: null,
    profile: null,
    role: null,
    currentPage: "home",
    sidebarOpen: false,
    loading: false,

    tap: {
      admin: { count: 0, last: 0, timer: null },
      teacher: { count: 0, last: 0, timer: null }
    },

    registration: {
      data: {},
      photo: null,
      photoFile: null,
      agreements: {
        rules: false,
        truth: false
      }
    },

    chat: {
      iframe: "",
      enabled: false,
      limit: 10
    }
  };

  /* ==========================================================
     HELPERS
     ========================================================== */

  const $ = (selector, root = document) =>
    root.querySelector(selector);

  const $$ = (selector, root = document) =>
    [...root.querySelectorAll(selector)];

  const escapeHTML = (value = "") =>
    String(value)
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");

  const money = (amount) =>
    new Intl.NumberFormat("en-NG", {
      style: "currency",
      currency: "NGN",
      maximumFractionDigits: 0
    }).format(Number(amount || 0));

  const today = () =>
    new Date().toISOString().slice(0, 10);

  const randomString = (length = 8) => {
    const chars =
      "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789";

    let output = "";

    if (window.crypto?.getRandomValues) {
      const buffer = new Uint32Array(length);
      crypto.getRandomValues(buffer);

      for (let i = 0; i < length; i++) {
        output += chars[buffer[i] % chars.length];
      }
    } else {
      for (let i = 0; i < length; i++) {
        output += chars[Math.floor(Math.random() * chars.length)];
      }
    }

    return output;
  };

  const notify = (message, type = "info") => {
    let box = $("#miftah-toast");

    if (!box) {
      box = document.createElement("div");
      box.id = "miftah-toast";
      box.className = "miftah-toast-container";
      document.body.appendChild(box);
    }

    const item = document.createElement("div");
    item.className = `miftah-toast ${type}`;
    item.textContent = message;

    box.appendChild(item);

    setTimeout(() => {
      item.classList.add("hide");
      setTimeout(() => item.remove(), 300);
    }, 3500);
  };

  const setLoading = (state, text = "Ana aiki...") => {
    STATE.loading = state;

    let loader = $("#miftah-loader");

    if (!loader) {
      loader = document.createElement("div");
      loader.id = "miftah-loader";
      loader.innerHTML = `
        <div class="miftah-loader-box">
          <div class="miftah-spinner"></div>
          <div class="miftah-loader-text"></div>
        </div>
      `;
      document.body.appendChild(loader);
    }

    $(".miftah-loader-text", loader).textContent = text;
    loader.classList.toggle("show", state);
  };

  const modal = ({
    title = "",
    body = "",
    actions = []
  }) => {
    let root = $("#miftah-modal-root");

    if (!root) {
      root = document.createElement("div");
      root.id = "miftah-modal-root";
      document.body.appendChild(root);
    }

    root.innerHTML = `
      <div class="miftah-modal-backdrop">
        <div class="miftah-modal">
          <div class="miftah-modal-header">
            <h3>${escapeHTML(title)}</h3>
            <button class="modal-close" type="button">×</button>
          </div>

          <div class="miftah-modal-body">
            ${body}
          </div>

          <div class="miftah-modal-actions">
            ${actions
              .map(
                (a) => `
                  <button
                    type="button"
                    class="${a.class || "btn btn-primary"}"
                    data-modal-action="${escapeHTML(a.id)}"
                  >
                    ${escapeHTML(a.label)}
                  </button>
                `
              )
              .join("")}
          </div>
        </div>
      </div>
    `;

    root.classList.add("show");

    $(".modal-close", root)?.addEventListener("click", closeModal);

    return root;
  };

  const closeModal = () => {
    $("#miftah-modal-root")?.classList.remove("show");
  };

  const whatsappURL = (message) => {
    return `https://wa.me/2347056845435?text=${encodeURIComponent(
      message
    )}`;
  };

  /* ==========================================================
     SUPABASE
     ========================================================== */

  let supabaseClient = null;

  const initSupabase = () => {
    if (!window.supabase) {
      console.warn(
        "Supabase library ba a samu ba. Sanya Supabase CDN a index.html."
      );
      return null;
    }

    if (
      !CONFIG.supabase?.url ||
      !CONFIG.supabase?.anonKey ||
      CONFIG.supabase.url === "YOUR_SUPABASE_URL" ||
      CONFIG.supabase.anonKey === "YOUR_SUPABASE_ANON_KEY"
    ) {
      console.warn(
        "Miftah: Supabase credentials ba su saita ba tukuna."
      );
      return null;
    }

    try {
      supabaseClient = window.supabase.createClient(
        CONFIG.supabase.url,
        CONFIG.supabase.anonKey,
        {
          auth: {
            persistSession: true,
            autoRefreshToken: true,
            detectSessionInUrl: true
          }
        }
      );

      return supabaseClient;
    } catch (error) {
      console.error(error);
      return null;
    }
  };

  const db = () => supabaseClient;

  /* ==========================================================
     SETTINGS
     ========================================================== */

  const DEFAULT_SETTINGS = {
    registration_fee: 1000,
    monthly_fee: 500,

    school_name_ar:
      "مدرسة مفتاح العلم والدراسات الإسلامية",

    school_name_en:
      "MADRASATUL MIFTAHUL ILMI WADDURASATUL ISLAMIYYA",

    school_name_hausa:
      "Makarantar Miftahul Ilmi da Karatun Addinin Musulunci",

    location:
      "HOTORO, KANO, NIGERIA",

    whatsapp:
      "07056845435",

    general_information:
      "Barka da zuwa MADRASATUL MIFTAHUL ILMI WADDURASATUL ISLAMIYYA.",

    about_us:
      "Makarantar dare ce da aka kafa domin koyar da ilimin Musulunci, tarbiyya, ladabi da kyawawan dabi'u.",

    bot_enabled: false,
    bot_iframe: "",

    student_chat_limit: 10,
    teacher_chat_limit: 10,
    cashier_chat_limit: 10,
    admin_chat_limit: 0,

    teacher_access_enabled: true,
    admin_access_enabled: true
  };

  let SETTINGS = { ...DEFAULT_SETTINGS };

  const loadSettings = async () => {
    if (!db()) return SETTINGS;

    try {
      const { data, error } = await db()
        .from("school_settings")
        .select("*");

      if (error) throw error;

      if (Array.isArray(data)) {
        for (const row of data) {
          if (row.key) {
            SETTINGS[row.key] = row.value;
          }
        }
      }
    } catch (error) {
      console.warn("Settings:", error.message);
    }

    return SETTINGS;
  };

  const getSetting = (key, fallback = "") =>
    SETTINGS[key] ?? fallback;

  /* ==========================================================
     AUTH
     ========================================================== */

  const getSession = async () => {
    if (!db()) return null;

    try {
      const {
        data: { session }
      } = await db().auth.getSession();

      return session;
    } catch {
      return null;
    }
  };

  const getCurrentUser = async () => {
    if (!db()) return null;

    try {
      const {
        data: { user }
      } = await db().auth.getUser();

      return user || null;
    } catch {
      return null;
    }
  };

  const loadProfile = async (userId) => {
    if (!db() || !userId) return null;

    try {
      const { data, error } = await db()
        .from("profiles")
        .select("*")
        .eq("id", userId)
        .maybeSingle();

      if (error) throw error;

      STATE.profile = data;
      STATE.role = data?.role || null;

      return data;
    } catch (error) {
      console.warn("Profile:", error.message);
      return null;
    }
  };

  const refreshAuth = async () => {
    const user = await getCurrentUser();

    STATE.user = user;

    if (user) {
      await loadProfile(user.id);
    } else {
      STATE.profile = null;
      STATE.role = null;
    }

    return user;
  };

  const loginWithEmail = async (email, password) => {
    if (!db()) {
      notify(
        "Da farko ka saita Supabase credentials a config.js.",
        "error"
      );
      return false;
    }

    setLoading(true, "Ana tabbatar da login...");

    try {
      const { data, error } = await db().auth.signInWithPassword({
        email,
        password
      });

      if (error) throw error;

      STATE.user = data.user;

      await loadProfile(data.user.id);

      return true;
    } catch (error) {
      notify(
        "Login bai yi nasara ba. Ka duba bayanan ka.",
        "error"
      );

      console.error(error);
      return false;
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    if (db()) {
      await db().auth.signOut();
    }

    STATE.user = null;
    STATE.profile = null;
    STATE.role = null;

    location.hash = "#/home";
    renderRoute();
  };

  /* ==========================================================
     HIDDEN 8-TAP GATES
     ========================================================== */

  const registerHiddenGate = (element, type) => {
    if (!element) return;

    element.addEventListener("click", (event) => {
      const now = Date.now();
      const gate = STATE.tap[type];

      if (now - gate.last > 2200) {
        gate.count = 0;
      }

      gate.count++;
      gate.last = now;

      clearTimeout(gate.timer);

      gate.timer = setTimeout(() => {
        gate.count = 0;
      }, 2200);

      if (gate.count >= 8) {
        gate.count = 0;

        if (type === "admin") {
          openGate("admin");
        }

        if (type === "teacher") {
          openGate("teacher");
        }
      }
    });
  };

  const openGate = (type) => {
    const isAdmin = type === "admin";

    const root = modal({
      title: isAdmin
        ? "Admin Access"
        : "Teacher Access",

      body: `
        <div class="miftah-pin-gate">
          <p>
            ${
              isAdmin
                ? "Shigar da Admin Access PIN."
                : "Shigar da Teacher Access PIN."
            }
          </p>

          <input
            id="gate-pin"
            class="form-control"
            type="password"
            inputmode="numeric"
            autocomplete="one-time-code"
            maxlength="12"
            placeholder="PIN"
          />

          <div id="gate-error" class="form-error"></div>
        </div>
      `,

      actions: [
        {
          id: "cancel",
          label: "CANCEL",
          class: "btn btn-secondary"
        },
        {
          id: "continue",
          label: "CONTINUE",
          class: "btn btn-primary"
        }
      ]
    });

    $('[data-modal-action="cancel"]', root)?.addEventListener(
      "click",
      closeModal
    );

    $('[data-modal-action="continue"]', root)?.addEventListener(
      "click",
      async () => {
        const pin = $("#gate-pin", root)?.value.trim();

        const valid = await verifyAccessPIN(
          type,
          pin
        );

        if (!valid) {
          $("#gate-error", root).textContent =
            "PIN ba daidai ba. Ka sake gwadawa.";

          return;
        }

        closeModal();

        location.hash =
          isAdmin
            ? "#/admin/login"
            : "#/teacher/login";

        renderRoute();
      }
    );

    $("#gate-pin", root)?.focus();
  };

  const verifyAccessPIN = async (type, pin) => {
    if (!pin) return false;

    if (!db()) {
      notify(
        "Supabase bai haɗu ba. Ba za a iya tabbatar da PIN ba.",
        "error"
      );
      return false;
    }

    try {
      const { data, error } = await db()
        .rpc("verify_access_pin", {
          p_gate_type: type,
          p_pin: pin
        });

      if (error) throw error;

      return data === true;
    } catch (error) {
      console.error("PIN verification:", error);

      /*
       * Ba za mu saka secret PIN a frontend ba.
       * Verification zai kasance a Supabase.
       */

      return false;
    }
  };

  /* ==========================================================
     STUDENT ID
     ========================================================== */

  const generateStudentID = () => {
    return (
      "Mif" +
      randomString(5) +
      randomString(2) +
      Date.now().toString().slice(-3)
    );
  };

  /* ==========================================================
     CONFIRMATION CODE
     ========================================================== */

  const generateConfirmationCode = (classNumber) => {
    return (
      "CLS" +
      String(classNumber) +
      randomString(8).toUpperCase()
    );
  };

  const validateConfirmationCode = async (
    code,
    classId,
    registrationId
  ) => {
    if (!db()) return false;

    try {
      /*
       * RPC ya fi kyau saboda code ɗin yana zama
       * atomic:
       *
       * check
       * validate
       * mark used
       *
       * ba za a iya amfani da shi sau biyu lokaci guda ba.
       */

      const { data, error } = await db().rpc(
        "redeem_confirmation_code",
        {
          p_code: code.trim().toUpperCase(),
          p_class_id: classId,
          p_registration_id: registrationId
        }
      );

      if (error) throw error;

      return data === true;
    } catch (error) {
      console.error(error);

      notify(
        "Confirmation Code bai yi aiki ba.",
        "error"
      );

      return false;
    }
  };

  /* ==========================================================
     REGISTRATION PHOTO
     ========================================================== */

  const createPhotoPreview = (file, imgElement) => {
    if (!file || !imgElement) return;

    const reader = new FileReader();

    reader.onload = () => {
      imgElement.src = reader.result;
      imgElement.classList.add("has-image");
    };

    reader.readAsDataURL(file);
  };

  const compressImage = (
    file,
    maxWidth = 800,
    quality = 0.72
  ) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();

      reader.onload = (event) => {
        const image = new Image();

        image.onload = () => {
          let width = image.width;
          let height = image.height;

          if (width > maxWidth) {
            const ratio = maxWidth / width;

            width = maxWidth;
            height = Math.round(height * ratio);
          }

          const canvas =
            document.createElement("canvas");

          canvas.width = width;
          canvas.height = height;

          const context =
            canvas.getContext("2d");

          context.drawImage(
            image,
            0,
            0,
            width,
            height
          );

          canvas.toBlob(
            (blob) => {
              if (!blob) {
                reject(
                  new Error(
                    "Image compression failed"
                  )
                );
                return;
              }

              resolve(
                new File(
                  [blob],
                  "student-photo.webp",
                  {
                    type: "image/webp"
                  }
                )
              );
            },
            "image/webp",
            quality
          );
        };

        image.onerror = reject;
        image.src = event.target.result;
      };

      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  };

  const uploadStudentPhoto = async (
    file,
    studentId
  ) => {
    if (!db() || !file) return null;

    try {
      const compressed =
        await compressImage(file);

      const path =
        `${studentId}/${crypto.randomUUID()}.webp`;

      const { error } = await db()
        .storage
        .from("student-photos")
        .upload(path, compressed, {
          contentType: "image/webp",
          upsert: false,
          cacheControl: "31536000"
        });

      if (error) throw error;

      return path;
    } catch (error) {
      console.error(error);

      notify(
        "An samu matsala wajen adana hoton.",
        "error"
      );

      return null;
    }
  };

  /* ==========================================================
     CAMERA
     ========================================================== */

  let cameraStream = null;
  let cameraFacing = "user";

  const openCamera = async () => {
    const video = $("#camera-video");

    if (!video) return;

    try {
      if (cameraStream) {
        cameraStream
          .getTracks()
          .forEach((track) => track.stop());
      }

      cameraStream =
        await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: cameraFacing
          },
          audio: false
        });

      video.srcObject = cameraStream;
      await video.play();
    } catch (error) {
      notify(
        "Ba a iya buɗe camera ba. Ka duba permission.",
        "error"
      );
    }
  };

  const switchCamera = async () => {
    cameraFacing =
      cameraFacing === "user"
        ? "environment"
        : "user";

    await openCamera();
  };

  const captureCameraPhoto = () => {
    const video = $("#camera-video");

    if (!video || !video.videoWidth) {
      notify(
        "Camera bai shirya ba.",
        "error"
      );
      return null;
    }

    const canvas =
      document.createElement("canvas");

    const width = Math.min(
      video.videoWidth,
      800
    );

    const ratio =
      width / video.videoWidth;

    canvas.width = width;
    canvas.height =
      video.videoHeight * ratio;

    const ctx =
      canvas.getContext("2d");

    ctx.drawImage(
      video,
      0,
      0,
      canvas.width,
      canvas.height
    );

    return new Promise((resolve) => {
      canvas.toBlob(
        (blob) => {
          const file =
            new File(
              [blob],
              "camera-photo.webp",
              {
                type: "image/webp"
              }
            );

          resolve(file);
        },
        "image/webp",
        0.72
      );
    });
  };

  /* ==========================================================
     REGISTRATION STATE
     ========================================================== */

  const resetRegistration = () => {
    STATE.registration = {
      data: {},
      photo: null,
      photoFile: null,
      agreements: {
        rules: false,
        truth: false
      }
    };
  };

  const collectRegistrationForm = (form) => {
    const data = {};

    new FormData(form).forEach((value, key) => {
      data[key] = value;
    });

    return data;
  };

  const buildWhatsAppRegistrationMessage = () => {
    const data = STATE.registration.data;

    return `
Assalamu Alaikum.

Na gama cike registration form na MADRASATUL MIFTAHUL ILMI WADDURASATUL ISLAMIYYA.

Ina bukatar Confirmation Code domin kammala registration.

Ga bayanan da na cika:

Suna: ${data.full_name || ""}
Sunan Uba: ${data.father_name || ""}
Sunan Uwa: ${data.mother_name || ""}
Jinsi: ${data.gender || ""}
Class: ${data.class_id || ""}
Shekarar haihuwa: ${data.date_of_birth || ""}
Phone: ${data.phone || ""}
Parent/Guardian Phone: ${data.guardian_phone || ""}
Address: ${data.address || ""}

Na gode.

Jazakallahu Khairan.
    `.trim();
  };

  /* ==========================================================
     STUDENT REGISTRATION SUBMISSION
     ========================================================== */

  const submitRegistration = async () => {
    const data = STATE.registration.data;

    if (!STATE.registration.photoFile) {
      notify(
        "Dole ne ka saka hoton dalibi.",
        "error"
      );
      return false;
    }

    if (!STATE.registration.agreements.rules ||
        !STATE.registration.agreements.truth) {
      notify(
        "Dole ne ka amince da dokokin makaranta.",
        "error"
      );
      return false;
    }

    if (!db()) {
      notify(
        "Supabase bai haɗu ba.",
        "error"
      );
      return false;
    }

    setLoading(true, "Ana ajiye registration...");

    try {
      const studentID =
        generateStudentID();

      const { data: registration, error } =
        await db()
          .from("registrations")
          .insert({
            student_id: studentID,
            full_name: data.full_name,
            father_name: data.father_name,
            mother_name: data.mother_name,
            gender: data.gender,
            date_of_birth:
              data.date_of_birth || null,
            phone: data.phone,
            guardian_phone:
              data.guardian_phone,
            address: data.address,
            previous_school:
              data.previous_school,
            class_id: data.class_id,
            session_year:
              data.session_year ||
              new Date().getFullYear(),
            status: "pending_confirmation"
          })
          .select()
          .single();

      if (error) throw error;

      const photoPath =
        await uploadStudentPhoto(
          STATE.registration.photoFile,
          studentID
        );

      if (photoPath) {
        await db()
          .from("registrations")
          .update({
            photo_path: photoPath
          })
          .eq("id", registration.id);
      }

      STATE.registration.data.registration_id =
        registration.id;

      STATE.registration.data.student_id =
        studentID;

      location.hash =
        "#/register/verification";

      renderRoute();

      return true;
    } catch (error) {
      console.error(error);

      notify(
        "An samu matsala wajen registration.",
        "error"
      );

      return false;
    } finally {
      setLoading(false);
    }
  };

  /* ==========================================================
     PASSWORD CHANGE
     ========================================================== */

  const changePassword = async (
    newPassword
  ) => {
    if (!db()) return false;

    if (
      newPassword.length < 6 ||
      newPassword.length > 10
    ) {
      notify(
        "Password dole ya kasance 6 zuwa 10 characters.",
        "error"
      );

      return false;
    }

    try {
      const { error } =
        await db().auth.updateUser({
          password: newPassword
        });

      if (error) throw error;

      if (STATE.user?.id) {
        await db()
          .from("profiles")
          .update({
            must_change_password: false
          })
          .eq("id", STATE.user.id);
      }

      notify(
        "Password ya canza successfully.",
        "success"
      );

      return true;
    } catch (error) {
      console.error(error);

      notify(
        "Ba a iya canza password ba.",
        "error"
      );

      return false;
    }
  };

  /* ==========================================================
     NOTIFICATIONS
     ========================================================== */

  const getNotifications = async () => {
    if (!db() || !STATE.user) return [];

    try {
      const { data, error } =
        await db()
          .from("notifications")
          .select("*")
          .order("created_at", {
            ascending: false
          })
          .limit(50);

      if (error) throw error;

      return data || [];
    } catch {
      return [];
    }
  };

  const sendNotification = async ({
    title,
    message,
    targetType = "global",
    targetId = null
  }) => {
    if (!db() || !STATE.user) {
      return false;
    }

    try {
      const { error } =
        await db()
          .from("notifications")
          .insert({
            title,
            message,
            target_type: targetType,
            target_id: targetId,
            created_by: STATE.user.id
          });

      if (error) throw error;

      notify(
        "An aika notification.",
        "success"
      );

      return true;
    } catch (error) {
      console.error(error);

      notify(
        "Ba a iya aika notification ba.",
        "error"
      );

      return false;
    }
  };

  /* ==========================================================
     CHAT / BOT
     ========================================================== */

  const getChatLimitForRole = (role) => {
    const map = {
      STUDENT: "student_chat_limit",
      TEACHER: "teacher_chat_limit",
      CASHIER: "cashier_chat_limit",
      ADMIN: "admin_chat_limit"
    };

    return Number(
      getSetting(
        map[role] || "student_chat_limit",
        10
      )
    );
  };

  const loadBotSettings = () => {
    STATE.chat.iframe =
      getSetting("bot_iframe", "");

    STATE.chat.enabled =
      Boolean(getSetting("bot_enabled", false));

    STATE.chat.limit =
      getChatLimitForRole(
        STATE.role || "STUDENT"
      );
  };

  const renderBot = () => {
    if (!STATE.user) return;

    loadBotSettings();

    if (!STATE.chat.enabled ||
        !STATE.chat.iframe) {
      return;
    }

    let button = $("#miftah-bot-button");

    if (!button) {
      button = document.createElement("button");

      button.id =
        "miftah-bot-button";

      button.className =
        "miftah-floating-bot";

      button.innerHTML = "💬";

      document.body.appendChild(button);
    }

    button.onclick = () => {
      openBotChat();
    };
  };

  const openBotChat = async () => {
    if (!STATE.user) return;

    const allowed =
      await checkChatLimit();

    if (!allowed) return;

    modal({
      title: "Live Chat",
      body: `
        <div class="miftah-chat-frame">
          ${STATE.chat.iframe}
        </div>
      `,
      actions: [
        {
          id: "close",
          label: "CLOSE",
          class: "btn btn-secondary"
        }
      ]
    });

    $(
      '[data-modal-action="close"]'
    )?.addEventListener(
      "click",
      closeModal
    );
  };

  const checkChatLimit = async () => {
    if (!db()) return false;

    try {
      const { data, error } =
        await db().rpc(
          "check_chat_limit",
          {
            p_user_id:
              STATE.user.id,
            p_role:
              STATE.role,
            p_limit:
              STATE.chat.limit
          }
        );

      if (error) throw error;

      if (!data?.allowed) {
        notify(
          "Ka kai chat limit na yau. Ka sake gwadawa bayan awa 24.",
          "error"
        );

        return false;
      }

      return true;
    } catch (error) {
      console.error(error);

      /*
       * Idan RPC bai shirya ba tukuna,
       * ba za mu kirkiri fake chat counter a frontend ba.
       */

      return false;
    }
  };

  /* ==========================================================
     SIDEBAR
     ========================================================== */

  const closeSidebarOnMobile = () => {
    if (window.innerWidth <= 900) {
      document.body.classList.remove(
        "sidebar-open"
      );
      STATE.sidebarOpen = false;
    }
  };

  const toggleSidebar = () => {
    STATE.sidebarOpen =
      !STATE.sidebarOpen;

    document.body.classList.toggle(
      "sidebar-open",
      STATE.sidebarOpen
    );
  };

  /* ==========================================================
     ROUTER
     ========================================================== */

  const normalizePath = () => {
    let hash =
      location.hash.replace(/^#/, "");

    if (!hash) hash = "/home";

    if (!hash.startsWith("/")) {
      hash = "/" + hash;
    }

    return hash;
  };

  const navigate = (path) => {
    location.hash = path;
  };

  const renderRoute = async () => {
    const path = normalizePath();

    STATE.currentPage = path;

    closeSidebarOnMobile();

    const app =
      $("#app") ||
      $("#app-root") ||
      $("#main-app");

    if (!app) {
      console.warn(
        "Ba a samu #app ba a index.html."
      );
      return;
    }

    if (
      path.startsWith("/student/") ||
      path.startsWith("/teacher/") ||
      path.startsWith("/admin/")
    ) {
      await refreshAuth();
    }

    switch (path) {

      case "/":
      case "/welcome":
        renderWelcome(app);
        break;

      case "/home":
        renderHome(app);
        break;

      case "/rules":
        await renderRules(app);
        break;

      case "/register":
        await renderRegistrationAgreement(app);
        break;

      case "/register/form":
        renderRegistrationForm(app);
        break;

      case "/register/verification":
        renderVerification(app);
        break;

      case "/login":
        renderStudentLogin(app);
        break;

      case "/student/dashboard":
        await guardRole(
          app,
          "STUDENT",
          renderStudentDashboard
        );
        break;

      case "/about":
        await renderAbout(app);
        break;

      case "/information":
        await renderInformation(app);
        break;

      case "/admin/login":
        renderAdminLogin(app);
        break;

      case "/admin/dashboard":
        await guardRole(
          app,
          "ADMIN",
          renderAdminDashboard
        );
        break;

      case "/teacher/login":
        renderTeacherLogin(app);
        break;

      case "/teacher/dashboard":
        await guardRole(
          app,
          "TEACHER",
          renderTeacherDashboard
        );
        break;

      case "/cashier/dashboard":
        await guardRole(
          app,
          "CASHIER",
          renderCashierDashboard
        );
        break;

      default:
        renderHome(app);
    }

    renderBot();
  };

  const guardRole = async (
    app,
    role,
    renderer
  ) => {
    const user =
      await refreshAuth();

    if (!user) {
      navigate(
        role === "ADMIN"
          ? "/admin/login"
          : role === "TEACHER"
          ? "/teacher/login"
          : "/login"
      );

      return;
    }

    if (STATE.role !== role) {
      notify(
        "Ba ka da izinin shiga wannan bangaren.",
        "error"
      );

      navigate("/home");
      return;
    }

    await renderer(app);
  };

  /* ==========================================================
     PUBLIC LAYOUT
     ========================================================== */

  const publicShell = ({
    title = "",
    content = ""
  }) => `
    <div class="miftah-app">

      <aside class="miftah-sidebar">

        <div class="sidebar-brand">
          <img
            src="${CONFIG.logo || "assets/logo.webp"}"
            alt="Miftahul Ilmi"
          />

          <div>
            <strong>Miftahul Ilmi</strong>
            <small>Kano, Nigeria</small>
          </div>
        </div>

        <nav class="sidebar-nav">

          <a href="#/home" data-route>
            Home
          </a>

          <a href="#/register" data-route>
            Registration / Forms
          </a>

          <a href="#/rules" data-route>
            Our Rules
          </a>

          <a href="#/login" data-route>
            Student Login
          </a>

          <a href="#/about" data-route>
            About Us
          </a>

          <a href="#/information" data-route>
            General Information
          </a>

          <a href="#/home#contact" data-route>
            School Contact
          </a>

        </nav>
      </aside>

      <div class="miftah-main">

        <header class="miftah-header">

          <button
            class="sidebar-toggle"
            id="sidebar-toggle"
            type="button"
          >
            ☰
          </button>

          <div class="header-title">
            ${escapeHTML(title)}
          </div>

        </header>

        <main class="miftah-content">
          ${content}
        </main>

      </div>

    </div>
  `;

  /* ==========================================================
     WELCOME
     ========================================================== */

  const renderWelcome = (app) => {
    app.innerHTML = `
      <div class="welcome-page">

        <div class="welcome-card">

          <div
            class="welcome-arabic"
            id="admin-gate-name"
          >
            ${escapeHTML(
              getSetting(
                "school_name_ar",
                CONFIG.school?.arabicName || ""
              )
            )}
          </div>

          <div
            class="welcome-english"
            id="teacher-gate-name"
          >
            ${escapeHTML(
              getSetting(
                "school_name_en",
                CONFIG.school?.englishName || ""
              )
            )}
          </div>

          <div class="welcome-hausa">
            ${escapeHTML(
              getSetting(
                "school_name_hausa",
                CONFIG.school?.hausaName || ""
              )
            )}
          </div>

          <p>
            ${escapeHTML(
              getSetting(
                "location",
                CONFIG.school?.location || ""
              )
            )}
          </p>

          <div class="welcome-message">
            Barka da zuwa makarantar dare ta Musulunci,
            wadda aka sadaukar domin koyar da ilimi,
            tarbiyya, ladabi, da kyawawan halaye.
          </div>

          <button
            class="btn btn-primary btn-large"
            data-action="visit"
          >
            VISIT WEBSITE
          </button>

        </div>

      </div>
    `;

    registerHiddenGate(
      $("#admin-gate-name"),
      "admin"
    );

    registerHiddenGate(
      $("#teacher-gate-name"),
      "teacher"
    );

    $(
      '[data-action="visit"]'
    )?.addEventListener(
      "click",
      () => navigate("/home")
    );
  };

  /* ==========================================================
     HOME
     ========================================================== */

  const renderHome = (app) => {
    app.innerHTML = publicShell({
      title: "Home",

      content: `
        <section class="hero-section">

          <span class="eyebrow">
            NIGHT ISLAMIC SCHOOL
          </span>

          <h1>
            ${escapeHTML(
              getSetting(
                "school_name_en",
                CONFIG.school?.englishName || ""
              )
            )}
          </h1>

          <div class="arabic-heading">
            ${escapeHTML(
              getSetting(
                "school_name_ar",
                CONFIG.school?.arabicName || ""
              )
            )}
          </div>

          <p>
            Makarantar dare domin zurfafa ilimin
            Musulunci, tarbiyya, ladabi da
            kyawawan dabi'u.
          </p>

          <div class="hero-actions">

            <a
              href="#/register"
              class="btn btn-primary"
            >
              REGISTER NOW
            </a>

            <a
              href="#/login"
              class="btn btn-secondary"
            >
              STUDENT LOGIN
            </a>

          </div>

        </section>

        <section class="stats-grid">

          ${[1, 2, 3, 4, 5]
            .map(
              (n) => `
                <div class="stat-card">
                  <span>CLASS</span>
                  <strong>${n}</strong>
                  <small>Night Islamic Studies</small>
                </div>
              `
            )
            .join("")}

        </section>

        <section class="fee-section">

          <div class="section-heading">
            <span class="eyebrow">
              SCHOOL FEES
            </span>

            <h2>
              Registration & Monthly Fees
            </h2>
          </div>

          <div class="cards-grid">

            <div class="info-card">
              <span>Registration Fee</span>
              <strong>
                ${money(
                  getSetting(
                    "registration_fee",
                    1000
                  )
                )}
              </strong>
            </div>

            <div class="info-card">
              <span>Monthly Fee</span>
              <strong>
                ${money(
                  getSetting(
                    "monthly_fee",
                    500
                  )
                )}
              </strong>
            </div>

          </div>

        </section>

        <section class="info-card large">

          <h2>General Information</h2>

          <p>
            ${escapeHTML(
              getSetting(
                "general_information",
                ""
              )
            )}
          </p>

        </section>

        <section
          class="contact-section"
          id="contact"
        >

          <h2>School Contact</h2>

          <p>
            ${escapeHTML(
              getSetting(
                "location",
                ""
              )
            )}
          </p>

          <a
            class="btn btn-success"
            href="${whatsappURL(
              "Assalamu Alaikum. Ina son karin bayani game da Miftahul Ilmi."
            )}"
            target="_blank"
            rel="noopener"
          >
            CONTACT VIA WHATSAPP
          </a>

        </section>
      `
    });

    bindSidebar();
  };

  /* ==========================================================
     RULES
     ========================================================== */

  const FALLBACK_RULES = [
    "Dole ne kowane ɗalibi ya mutunta Allah, malamai, shugabanni da sauran ɗalibai.",
    "Dole ne ɗalibi ya kasance mai gaskiya, amana, ladabi da kyawawan ɗabi'u a makaranta da wajen makaranta.",
    "Ba a yarda da zagi, cin mutunci, faɗa, barazana ko duk wani hali da zai cutar da wani ɗalibi ba.",
    "Dole ne ɗalibi ya halarci makaranta a kan lokaci kuma ya guji yawan zuwa a makare.",
    "Dole ne ɗalibi ya halarci darussa akai-akai.",
    "Dole ne ɗalibi ya kiyaye tsaftar jikinsa, tufafinsa da muhallin makaranta.",
    "Ba a yarda ɗalibi ya lalata, sata ko amfani da kayan makaranta ba tare da izini ba.",
    "Dole ne ɗalibi ya kasance cikin sutura mai kyau, ta kamala kuma wadda ta dace da koyarwar Musulunci.",
    "Ba a yarda da amfani da waya ko wani abu da zai raba hankalin ɗalibi da karatu ba sai da izinin malami ko shugabanci.",
    "Dole ne ɗalibi ya girmama tsarin aji, umarnin malami da sauran dokokin makaranta.",
    "Ba a yarda ɗalibi ya shiga jarabawa ko wani aiki na makaranta da yaudara ko rashin gaskiya ba.",
    "Dole ne ɗalibi ya biya dukkan kuɗaɗen makaranta a kan lokaci.",
    "Ba a yarda ɗalibi ya yi amfani da account na wani ɗalibi ko ya ba wani damar amfani da account ɗinsa ba.",
    "Idan ɗalibi yana da wata matsala, koke ko buƙatar gyaran bayanansa, dole ne ya bi tsarin request da makaranta ta tanada.",
    "Duk ɗalibin da ya karya dokokin makaranta zai iya fuskantar matakin ladabtarwa da ya dace da girman laifin."
  ];

  const loadRules = async () => {
    if (!db()) return FALLBACK_RULES;

    try {
      const { data, error } =
        await db()
          .from("school_rules")
          .select("*")
          .order("rule_number");

      if (error) throw error;

      if (data?.length) {
        return data.map(
          (r) => r.rule_text
        );
      }
    } catch {}

    return FALLBACK_RULES;
  };

  const renderRules = async (app) => {
    const rules = await loadRules();

    app.innerHTML = publicShell({
      title: "Our Rules",

      content: `
        <section class="page-heading">

          <span class="eyebrow">
            OUR RULES
          </span>

          <h1>
            DOKOKIN MAKARANTA
          </h1>

        </section>

        <div class="rules-list">

          ${rules
            .map(
              (rule, index) => `
                <article class="rule-card">

                  <div class="rule-number">
                    ${index + 1}
                  </div>

                  <p>
                    ${escapeHTML(rule)}
                  </p>

                </article>
              `
            )
            .join("")}

        </div>
      `
    });

    bindSidebar();
  };

  /* ==========================================================
     REGISTRATION AGREEMENT
     ========================================================== */

  const renderRegistrationAgreement =
    async (app) => {

      const rules =
        await loadRules();

      STATE.registration.agreements = {
        rules: false,
        truth: false
      };

      app.innerHTML = publicShell({
        title: "Registration Agreement",

        content: `
          <section class="page-heading">

            <span class="eyebrow">
              REGISTRATION
            </span>

            <h1>
              Karanta Dokokin Makaranta
            </h1>

            <p>
              Kafin ka ci gaba, dole ne ka karanta
              kuma ka amince da dokokin makaranta.
            </p>

          </section>

          <div class="rules-list">

            ${rules
              .map(
                (rule, index) => `
                  <article class="rule-card">
                    <div class="rule-number">
                      ${index + 1}
                    </div>
                    <p>
                      ${escapeHTML(rule)}
                    </p>
                  </article>
                `
              )
              .join("")}

          </div>

          <div class="agreement-box">

            <label>
              <input
                type="checkbox"
                id="agree-rules"
              />

              Na karanta kuma na amince da
              dukkan dokokin makaranta.
            </label>

            <label>
              <input
                type="checkbox"
                id="agree-truth"
              />

              Na tabbatar cewa bayanan da zan bayar
              gaskiya ne kuma na amince da tsarin makaranta.
            </label>

          </div>

          <div class="form-actions">

            <button
              class="btn btn-secondary"
              data-action="cancel-register"
            >
              CANCEL
            </button>

            <button
              class="btn btn-primary"
              id="registration-next"
              disabled
            >
              NEXT
            </button>

          </div>
        `
      });

      bindSidebar();

      const rulesBox =
        $("#agree-rules");

      const truthBox =
        $("#agree-truth");

      const next =
        $("#registration-next");

      const updateAgreement = () => {

        STATE.registration.agreements.rules =
          rulesBox.checked;

        STATE.registration.agreements.truth =
          truthBox.checked;

        next.disabled =
          !(
            rulesBox.checked &&
            truthBox.checked
          );
      };

      rulesBox?.addEventListener(
        "change",
        updateAgreement
      );

      truthBox?.addEventListener(
        "change",
        updateAgreement
      );

      next?.addEventListener(
        "click",
        () => navigate("/register/form")
      );

      $(
        '[data-action="
