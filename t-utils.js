// ==UserScript==
// @name         T. Utilities - Utils
// @description  Common utilities and localStorage helpers for T. Utilities
// ==/UserScript==

const LOCAL_STORAGE_KEY = "t-utilities-settings-" + game_data.world;

// New constants for alert-specific locks
const CAPTCHA_ALERT_LOCK_KEY = 't-utilities-lock-captcha-alert';
const INCOMING_ALERT_LOCK_KEY = 't-utilities-lock-incoming-alert';
const ALERT_LOCK_GRANULARITY = 500; // milliseconds - A very short TTL/granularity for the alert-sending lock



/**
 * DATA STRUCTURES
 */


const TROOP_ICONS = {
    spear: 'https://dspt.innogamescdn.com/asset/340473d2/graphic/unit/unit_spear.webp',
    sword: 'https://dspt.innogamescdn.com/asset/340473d2/graphic/unit/unit_sword.webp',
    axe: 'https://dspt.innogamescdn.com/asset/340473d2/graphic/unit/unit_axe.webp',
    spy: 'https://dspt.innogamescdn.com/asset/340473d2/graphic/unit/unit_spy.webp',
    light: 'https://dspt.innogamescdn.com/asset/340473d2/graphic/unit/unit_light.webp',
    heavy: 'https://dspt.innogamescdn.com/asset/340473d2/graphic/unit/unit_heavy.webp',
    ram: 'https://dspt.innogamescdn.com/asset/340473d2/graphic/unit/unit_ram.webp',
    catapult: 'https://dspt.innogamescdn.com/asset/340473d2/graphic/unit/unit_catapult.webp'
};

const alertSettings = {
    captcha: {
        enabled: true,
        whatsappEnabled: false,
        discordWebhookEnabled: false,
        discordDMEnabled: false,
        alertCooldown: 60,
        lastAlertTime: 0
    },
    incoming: {
        enabled: true,
        whatsappEnabled: false,
        discordWebhookEnabled: false,
        discordDMEnabled: false,
        alertCooldown: 15,
        lastAlertTime: 0
    },
    whatsappEnabled: false,
    discordWebhookEnabled: false,
    discordDMEnabled: false,
    phoneNumber: "",
    apiKey: "",
    webHook: "",
    discordUserId: "",
    checkerRefresh: 10,
    incomingAttacks: 0
};

const defaultTroopTemplate = {
    name: "Default",
    troops: {
        spear: 35,
        sword: 0,
        axe: 0,
        arc: 0,
        spy: 20,
        light: 0,
        harc: 0,
        heavy: 0,
        ram: 0,
        catapult: 5
    }
}

const attackSettings = {
    enabled: false,
    attackTime: 1200,
    switchTime: 3000,
    attackDelay: 500,
    switchDelay: 200,
    attackPerVillage: 1,
    attacksPerSource: 1,
    maxRetriesPerVillage: 1,
    sendFulls: true,
    checkDate: false,
    minDate: "2025-16-13T16:00",
    maxDate: new Date().toISOString(),
    selectedTemplate: defaultTroopTemplate,
    userTemplates: [defaultTroopTemplate],
    coords: "500|500"
}

const attackerSettings = {
    attackIndex: 0,
    currentIndexAttempt: 0,
    retryCount: 0
}

const attackLog = {
    time: new Date().toISOString(),
    from: "123|456",
    to: "234|678",
    success: true,
    description: "description"
};

const builderSettings = {
    enabled: false,
    builderDelay: 1200,
    builderRandomizerDelay: 500,
    switchDelay: 3000,
    switchRandomizerDelay: 200,
    userVillageTemplates: [],
    defaultTemplate: null,
    villageTemplates: new Map()
}

const recruiterSettings = {
    enabled: false,
    recruiterDelay: 1200,
    recruiterRandomizerDelay: 500,
    switchDelay: 3000,
    switchRandomizerDelay: 200,
    villageTemplates: new Map()
}

const defaultSettings = {
    alertSettings,
    attackSettings,
    attackerSettings,
    builderSettings,
    recruiterSettings,
    attackLogs: []
};


(() => {


    /**
     * UTILITIES
     */

    // Functions to manage localStorage settings

    //Global Settings
    function getSettings() {
        try {
            const raw = localStorage.getItem(LOCAL_STORAGE_KEY);
            if (!raw) return { ...defaultSettings };
            const parsed = JSON.parse(raw);
            // Ensure missing default props are restored
            Object.entries(defaultSettings).forEach(([key, value]) => {
                if (!(key in parsed)) parsed[key] = value;
            });
            return parsed;
        } catch (e) {
            return { ...defaultSettings };
        }
    }

    function saveSettings(data) {
        localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(data));
    }

    //Alert Settings
    function getAlertSettings() {
        return getSettings().alertSettings;
    }

    function setAlertSettings(updatedAlertSettings) {
        let tempSettings = getSettings();
        tempSettings.alertSettings = updatedAlertSettings;

        try {
            localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(tempSettings));
        }
        catch (err) {
            localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(defaultSettings));
            UI.ErrorMessage('Failed to update settings, resetting to default');
            return defaultSettings
        }
    }

    //Attack Settings
    function getAttackSettings() {
        return getSettings().attackSettings;
    }

    function setAttackSettings(updatedAttackSettings) {
        let tempSettings = getSettings();
        tempSettings.attackSettings = updatedAttackSettings;

        try {
            localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(tempSettings));
        }
        catch (err) {
            localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(defaultSettings));
            UI.ErrorMessage('Failed to update settings, resetting to default');
            return defaultSettings
        }
    }

    //Attacker Settings
    function getAttackerSettings() {
        return getSettings().attackerSettings;
    }

    function setAttackerSettings(updatedAttackerSettings) {
        let tempSettings = getSettings();
        tempSettings.attackerSettings = updatedAttackerSettings;

        try {
            localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(tempSettings));
        }
        catch (err) {
            localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(defaultSettings));
            UI.ErrorMessage('Failed to update settings, resetting to default');
            return defaultSettings
        }
    }

    //Attack Logs
    function getAttackLogs() {
        return getSettings().attackLogs || [];
    }

    function setAttackLogs(updatedAttackLogs) {
        let tempSettings = getSettings();
        tempSettings.attackLogs = updatedAttackLogs;

        try {
            localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(tempSettings));
        }
        catch (err) {
            localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(defaultSettings));
            UI.ErrorMessage('Failed to update settings, resetting to default');
            return defaultSettings;
        }
    }

    //Builder Settings
    function getBuilderSettings() {
        return getSettings().builderSettings;
    }

    function setBuilderSettings(updatedBuilderSettings) {
        let tempSettings = getSettings();
        tempSettings.builderSettings = updatedBuilderSettings;

        try {
            localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(tempSettings));
        }
        catch (err) {
            localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(defaultSettings));
            UI.ErrorMessage('Failed to update settings, resetting to default');
            return defaultSettings;
        }
    }

    //Recruiter Settings
    function getRecruiterSettings() {
        return getSettings().recruiterSettings;
    }

    function setRecruiterSettings(updatedRecruiterSettings) {
        let tempSettings = getSettings();
        tempSettings.recruiterSettings = updatedRecruiterSettings;

        try {
            localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(tempSettings));
        }
        catch (err) {
            localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(defaultSettings));
            UI.ErrorMessage('Failed to update settings, resetting to default');
            return defaultSettings;
        }
    }

    // Utility for introducing a delay
    function sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    // Generates a random delay around a base value
    function delay(base, range) {
        return Math.floor(Math.random() * (range * 2 + 1)) + (base - range);
    }

    // Utility to parse dates
    function parseISOLocal(s) {
        var b = s.split(/\D/);
        return new Date(b[0], b[1] - 1, b[2], b[3], b[4]);
    }

    function parseDate(date) {
        return parseISOLocal(date).toISOString().split('.')[0];
    }

    function parseSettingsDate(date) {
        return parseISOLocal(date);
    }

    function parseDateDependingOnFormat(serverDateText, serverTimeText) {
        let s = serverDateText.split("/");

        if (s[0].length === 4) {
            return new Date(serverDateText + " " + serverTimeText);
        }
        return new Date(`${s[2]}/${s[1]}/${s[0]} ${serverTimeText}`);
    }

    function switchVillage() {
        let attackSettings = getSettings().attackSettings;
        setTimeout(function () {
            $("#village_switch_right").get(0).click();
        }, delay(attackSettings.switchTime, attackSettings.switchDelay));
    }

    /**
 * Alert Concurrency Lock Functions (NEW/MODIFIED)
 */

    /**
     * Attempts to acquire a short-lived lock for sending a specific type of alert.
     * This helps prevent multiple tabs from sending the *same* alert simultaneously.
     * @param {string} lockKey - The unique key for the alert lock (e.g., CAPTCHA_ALERT_LOCK_KEY).
     * @returns {boolean} True if the lock was successfully acquired by this tab, false otherwise.
     */
    function acquireAlertLock(lockKey) {
        const now = Date.now();
        // Read the current lock timestamp from localStorage
        const currentLockTime = parseInt(localStorage.getItem(lockKey) || '0', 10);

        // If the current lock is still "active" (within its granularity window),
        // another tab likely holds or is trying to acquire it.
        if (now - currentLockTime < ALERT_LOCK_GRANULARITY) {
            return false;
        }

        // Attempt to acquire the lock by writing our timestamp
        try {
            localStorage.setItem(lockKey, now.toString());
            // Immediately re-read to verify that our write was successful and not immediately overwritten
            // This is a simple form of optimistic locking
            const verifyLockTime = parseInt(localStorage.getItem(lockKey) || '0', 10);
            return verifyLockTime === now; // True if this tab's timestamp is still the latest
        } catch (e) {
            console.error(`Error acquiring alert lock ${lockKey}:`, e);
            return false;
        }
    }

    /**
     * Releases a previously acquired alert-sending lock.
     * @param {string} lockKey - The unique key for the alert lock.
     */
    function releaseAlertLock(lockKey) {
        localStorage.removeItem(lockKey); // Simple removal or set to 0
    }


    window.TUtils.Utils = {

        //Utils
        switchVillage,

        //Getters
        getSettings,
        getAlertSettings,
        getAttackSettings,
        getAttackerSettings,
        getAttackLogs,
        getBuilderSettings,
        getRecruiterSettings,

        //Setters
        saveSettings,
        setAlertSettings,
        setAttackSettings,
        setAttackerSettings,
        setAttackLogs,
        setBuilderSettings,
        setRecruiterSettings,

        //Delay Sleep
        sleep,
        delay,

        //Dates
        parseDate,
        parseSettingsDate,
        parseDateDependingOnFormat,

        //Locks
        acquireAlertLock,   // Expose new lock functions
        releaseAlertLock
    }
})();