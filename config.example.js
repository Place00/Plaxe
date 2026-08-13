/*
 * ============================================================
 * MADRASATUL MIFTAHUL ILMI WADDURASATUL ISLAMIYYA
 * Configuration Template
 * ============================================================
 *
 * IMPORTANT:
 * Wannan file template ne kawai.
 *
 * KADA KA SAKA:
 * - Supabase service_role key
 * - Admin password
 * - Teacher password
 * - Database secret
 * - Private API key
 *
 * A frontend, Supabase ANON/PUBLISHABLE key kawai ake amfani da shi.
 *
 * Bayan ka samu credentials ɗinka, ka iya:
 *
 * 1. Copy wannan file
 * 2. Rename shi zuwa:
 *
 *    config.js
 *
 * 3. Cika values ɗin.
 *
 * ============================================================
 */

window.MIFTAH_CONFIG = {

  /*
   * ----------------------------------------------------------
   * SUPABASE
   * ----------------------------------------------------------
   */

  supabase: {

    // Misali:
    // https://xxxxxxxxxxxxxxxx.supabase.co

    url: "YOUR_SUPABASE_URL",

    /*
     * Wannan ya kasance:
     * Supabase Publishable key / anon key
     *
     * Kada ka saka service_role key a nan.
     */

    anonKey: "YOUR_SUPABASE_ANON_KEY"
  },


  /*
   * ----------------------------------------------------------
   * SCHOOL INFORMATION
   * ----------------------------------------------------------
   */

  school: {

    arabicName:
      "مدرسة مفتاح العلم والدراسات الإسلامية",

    englishName:
      "MADRASATUL MIFTAHUL ILMI WADDURASATUL ISLAMIYYA",

    hausaName:
      "Makarantar Miftahul Ilmi da Karatun Addinin Musulunci",

    location:
      "HOTORO, KANO, NIGERIA",

    whatsapp:
      "2347056845435",

    phone:
      "07056845435"
  },


  /*
   * ----------------------------------------------------------
   * DEFAULT VALUES
   * ----------------------------------------------------------
   *
   * NOTE:
   * Wadannan DEFAULT values ne kawai.
   *
   * Ainihin fees, chat limits, PINs da sauran settings
   * za su kasance database-controlled daga baya.
   */

  defaults: {

    registrationFee: 1000,

    monthlyFee: 500,

    studentDefaultPassword:
      "12345abc",

    studentMinPasswordLength: 6,

    studentMaxPasswordLength: 10,

    roleDefaultPasswordLength: 6
  },


  /*
   * ----------------------------------------------------------
   * SECURITY
   * ----------------------------------------------------------
   *
   * Kada a saka actual Admin PIN ko Teacher PIN a wannan file.
   *
   * Za mu yi tsarin:
   *
   * Welcome
   *    ↓
   * Hidden 8 taps
   *    ↓
   * PIN Gate
   *    ↓
   * Supabase-backed verification
   *    ↓
   * Email/Phone + Password
   *    ↓
   * Dashboard
   *
   * Admin zai iya canza PIN daga Security/Settings.
   */

  security: {

    hiddenTapCount: 8,

    tapResetTimeMs: 2200,

    enableAdminGesture: true,

    enableTeacherGesture: true
  },


  /*
   * ----------------------------------------------------------
   * CHAT / BOT
   * ----------------------------------------------------------
   *
   * Ba za mu saka iframe ko bot code kai tsaye a nan ba.
   *
   * Admin Dashboard zai sami:
   *
   * Bot / Live Chat Settings
   *
   * Admin zai iya:
   * - saka iframe code
   * - canza iframe code
   * - enable/disable bot
   * - saita Student limit
   * - saita Teacher limit
   * - saita Cashier limit
   * - saita sauran Role limits
   *
   * Bayan saving, zai fara aiki automatically.
   */

  chat: {

    defaultStudentLimit: 10,

    defaultTeacherLimit: 10,

    defaultCashierLimit: 10,

    defaultAdminLimit: 0,

    resetAfterHours: 24
  },


  /*
   * ----------------------------------------------------------
   * APPLICATION
   * ----------------------------------------------------------
   */

  app: {

    name:
      "Miftahul Ilmi School Management System",

    version:
      "1.0.0",

    environment:
      "development",

    /*
     * Wannan yana taimakawa wajen debug yayin da kake
     * gwadawa a Acode.
     *
     * Production daga baya:
     *
     * environment: "production"
     */

    debug: true
  }

};


/*
 * ============================================================
 * SAFETY CHECK
 * ============================================================
 *
 * Idan mutum ya manta ya saka Supabase credentials,
 * application zai nuna error mai fahimta maimakon
 * ya yi crashing ba tare da bayani ba.
 * ============================================================
 */

(function validateMiftahConfig() {

  const cfg = window.MIFTAH_CONFIG;

  if (!cfg) {
    console.error(
      "MIFTAH_CONFIG bai samu ba."
    );
    return;
  }

  if (
    !cfg.supabase.url ||
    cfg.supabase.url === "YOUR_SUPABASE_URL"
  ) {
    console.warn(
      "MIFTAH: Supabase URL bai saita ba tukuna."
    );
  }

  if (
    !cfg.supabase.anonKey ||
    cfg.supabase.anonKey === "YOUR_SUPABASE_ANON_KEY"
  ) {
    console.warn(
      "MIFTAH: Supabase Publishable/Anon Key bai saita ba tukuna."
    );
  }

})();
