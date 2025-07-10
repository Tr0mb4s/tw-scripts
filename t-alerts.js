// ==UserScript==
// @name         T. Utilities - Alerts
// @description  Handles alert logic for Captcha and Incoming Attacks
// ==/UserScript==



// Ensure window.TUtils exists and its sub-objects are initialized
window.TUtils = window.TUtils || {};
window.TUtils.Alert = window.TUtils.Alert || {}; // Ensure TUtils.Alert is an object


(() => {

    /**
     * VARIABLES
     */
    const channel = new BroadcastChannel('alert-sync');
    const CAPTCHA_TRIGGERED = "CAPTCHA_TRIGGERED";
    const INCOMING_TRIGGERED = "INCOMING_TRIGGERED";

    const {
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
    } = window.TUtils.Utils;

    channel.addEventListener('message', event => {
        const alertSettings = getAlertSettings();
        if (event.data.type === "INCOMING_TRIGGERED") {
            alertSettings.incoming.lastAlertTime = event.data.timestamp;
        }
        if (event.data.type === "CAPTCHA_TRIGGERED") {
            alertSettings.captcha.lastAlertTime = event.data.timestamp;
        }
        setAlertSettings(alertSettings);
    });


    /**
     * Captcha Alerting Logic
     */
    async function checkForCaptchaAndAlert() {
        let settings = getAlertSettings()
        if (!settings.captcha.enabled) {
            return;
        }

        const captchaVisible = $('.bot-protection-row:visible').length > 0 || $('#botprotection_quest:visible').length > 0;

        if (settings.captcha.enabled && captchaVisible) {
            if (await shouldSendCaptchaAlert()) {
                sendCaptchaAlert();
            } else {
                const lastAlertTime = settings.captcha.lastAlertTime;
                const timeLeft = Math.ceil((getCaptchaCooldownInterval() - (Date.now() - lastAlertTime)) / 60000);
                console.log(`⏳ Alert skipped. Try again in ${timeLeft} minutes.`);
            }
        }
    }

    async function shouldSendCaptchaAlert() {
        const now = Date.now();
        const alertSettings = getAlertSettings(); // Get fresh settings
        const lastAlertTime = alertSettings.captcha.lastAlertTime;
        const cooldownInterval = getCaptchaCooldownInterval();

        // 1. Initial Cooldown Check: Prevent trying to acquire lock if already in cooldown
        if (now - lastAlertTime < cooldownInterval) {
            return false;
        }

        // 2. Attempt to acquire the alert-sending lock
        // This is the critical step to ensure only one tab proceeds
        if (!acquireAlertLock(window.TUtils.Utils.CAPTCHA_ALERT_LOCK_KEY)) { // Use the exposed constant
            console.log("Another tab is trying to send Captcha alert. Backing off.");
            return false;
        }

        try {
            // 3. Re-check global lastAlertTime after acquiring the lock
            // Another tab might have sent an alert and updated localStorage/broadcasted
            // *during the brief moment* we were trying to acquire the lock.
            const freshAlertSettings = getAlertSettings();
            if (now - freshAlertSettings.captcha.lastAlertTime < cooldownInterval) {
                console.log("Captcha alert already sent by another tab. Respecting cooldown.");
                return false;
            }

            // If we reach here, this tab has the lock AND the global cooldown allows sending.
            // Post message immediately to alert other tabs to update their `lastAlertTime`
            channel.postMessage({ type: CAPTCHA_TRIGGERED, timestamp: now });
            return true; // Proceed to send alert
        } finally {
            // Always release the lock, even if an error occurred
            releaseAlertLock(window.TUtils.Utils.CAPTCHA_ALERT_LOCK_KEY); // Use the exposed constant
        }

    }

    function getCaptchaCooldownInterval() {
        return getAlertSettings().captcha.alertCooldown * 60 * 1000;
    }

    async function sendCaptchaAlert() {
        let tempAlertsettings = getAlertSettings();

        let message = `⚠️⚠️ ACTIVE CAPTCHA ⚠️⚠️\n💻 Account: ${game_data.player.name} \n🗺️ World: ${game_data.world}`;
        const encodedMessage = encodeURIComponent(message);

        if (tempAlertsettings.captcha.whatsappEnabled) {
            triggerWhatsappAlert(message, encodedMessage);
        }

        if (tempAlertsettings.discordUserId) {
            message = message + ` \n🔛 Ping: <@${tempAlertsettings.discordUserId}> `;
        }

        if (tempAlertsettings.captcha.discordWebhookEnabled) {
            triggerDiscordWebhookAlert(message);
        }

        if (tempAlertsettings.captcha.discordDMEnabled) {
            triggerDiscordDMAlert(message);
        }
    }

    /**
     * Check Incoming Logic
     */
    async function checkForIncomingAndAlert() {

        if (!getAlertSettings().incoming.enabled) {
            return;
        }

        const incomingElem = $('#incomings_amount');
        if (incomingElem.length === 0) {
            console.warn('No #incomings_amount element found');
            return;
        }

        let settings = getAlertSettings();
        let previousCount = settings.incomingAttacks;

        const currentCount = parseInt(incomingElem.text().trim(), 10);
        const newIncoming = currentCount - previousCount;

        if (currentCount > previousCount) {
            if (await shouldSendIncomingAlert()) {
                sendIncomingAlert(currentCount, newIncoming);
            } else {
                const lastAlertTime = settings.incoming.lastAlertTime;
                const timeLeft = Math.ceil((getIncomingCooldownInterval() - (Date.now() - lastAlertTime)) / 60000);
                if (timeLeft > 0) {
                    console.log(`⏳ Incoming alert skipped. Cooldown: ${timeLeft} minutes.`);
                } else {
                    console.log(`⏳ Incoming alert skipped. Another tab might be processing.`);
                }
            }

        }

        settings.incomingAttacks = currentCount;
        setAlertSettings(settings);
    }

    function getIncomingCooldownInterval() {
        return getAlertSettings().incoming.alertCooldown * 60 * 1000;
    }

    async function shouldSendIncomingAlert() {
        const now = Date.now();
        const alertSettings = getAlertSettings();
        const lastAlertTime = alertSettings.incoming.lastAlertTime;
        const cooldownInterval = getIncomingCooldownInterval();

        if (now - lastAlertTime < cooldownInterval) {
            return false;
        }

        if (!acquireAlertLock(window.TUtils.Utils.INCOMING_ALERT_LOCK_KEY)) { // Use exposed constant
            console.log("Another tab is trying to send Incoming alert. Backing off.");
            return false;
        }

        try {
            const freshAlertSettings = getAlertSettings();
            if (now - freshAlertSettings.incoming.lastAlertTime < cooldownInterval) {
                console.log("Incoming alert already sent by another tab. Respecting cooldown.");
                return false;
            }

            channel.postMessage({ type: INCOMING_TRIGGERED, timestamp: now });
            return true;
        } finally {
            releaseAlertLock(window.TUtils.Utils.INCOMING_ALERT_LOCK_KEY); // Use exposed constant
        }

    }

    function sendIncomingAlert(currentCount, newIncoming) {

        let message = `⚠️⚠️ INCOMING ATTACKS ⚠️⚠️\n💻 Account: ${game_data.player.name} \n🗺️ World: ${game_data.world} \n👮‍♂️ Total Incoming Attacks: ${currentCount} \n🕵️‍♀️ New attacks: ${newIncoming}`;
        const encodedMessage = encodeURIComponent(message);

        let tempAlertsettings = getAlertSettings();

        if (tempAlertsettings.incoming.whatsappEnabled) {
            triggerWhatsappAlert(message, encodedMessage);
        }

        if (tempAlertsettings.discordUserId) {
            message = message + ` \n🔛 Ping: <@${tempAlertsettings.discordUserId}> `;
        }

        if (tempAlertsettings.incoming.discordWebhookEnabled) {
            triggerDiscordWebhookAlert(message);
        }

        if (tempAlertsettings.incoming.discordDMEnabled) {
            triggerDiscordDMAlert(message);
        }
    }

    /**
     * Trigger Alert Channels
     */

    async function triggerWhatsappAlert(message, encodedMessage) {

        let settings = getAlertSettings();

        let phone = settings.phoneNumber;
        let apiKey = settings.apiKey;

        if (!phone || !apiKey) {
            console.error("❌ Missing phoneNumber or apiKey.");
            return;
        }

        const url = `https://api.callmebot.com/whatsapp.php?phone=${phone}&text=${encodedMessage}&apikey=${apiKey}`;

        console.log("📤 Sending alert to CallMeBot:", message);

        fetch(url)
            .then(response => {
                if (!response.ok) {
                    throw new Error("HTTP error " + response.status);
                }
                console.log("✅ Alert sent successfully");
            })
            .catch(error => console.error("❌ Alert failed:", error));
    }

    async function triggerDiscordWebhookAlert(message) {
        console.log("📤 Sending alert to Discord WebHook:", message);

        fetch(getAlertSettings().webHook, {
            method: "POST",
            body: JSON.stringify({
                content: message
            }),
            mode: 'cors',
            headers: {
                "Content-type": "application/json; charset=UTF-8",
            }
        }).then(response => {
            if (!response.ok) {
                throw new Error("HTTP error " + response.status);
            }
            console.log("✅ Alert sent successfully");
        }).catch(error => console.error("❌ Alert failed:", error));
    }

    async function triggerDiscordDMAlert(message) {
        console.log("📤 Sending alert to Discord DM:", message);

        fetch("https://tnotificationsbot.rafaelazevedo.eu/send-dm", {
            method: "POST",
            body: JSON.stringify({
                userId: getAlertSettings().discordUserId,
                message: message
            }),
            mode: 'cors',
            headers: {
                "Content-type": "application/json; charset=UTF-8",
            }
        }).then(response => {
            if (!response.ok) {
                throw new Error("HTTP error " + response.status);
            }
            console.log("✅ Alert sent successfully");
        }).catch(error => console.error("❌ Alert failed:", error));
    }

    window.TUtils.Alert = {

        //Checks
        checkForCaptchaAndAlert,
        checkForIncomingAndAlert,

        //alerts
        triggerWhatsappAlert,
        triggerDiscordWebhookAlert,
        triggerDiscordDMAlert
    }
})();