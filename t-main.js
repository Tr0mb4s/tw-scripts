// ==UserScript==
// @name         T. Utilities
// @author       Tr0mb4s
// @version      2.2.0
// @description  Main entry point for T. Utilities suite
// @match        *://*.tribalwars.com.*/*
// @require      t-utils.js
// @require      t-alerts.js
// @require      t-attacks.js
// @require      https://code.jquery.com/jquery-3.7.1.min.js
// ==/UserScript==

(function () {

    $(function () {

        // Destructure functions from their respective TUtils modules.
        // Use '|| {}' to prevent errors if a module somehow didn't load or
        // define its namespace correctly.
        const { getAlertSettings } = window.TUtils.Utils || {};
        const { checkForCaptchaAndAlert, checkForIncomingAndAlert } = window.TUtils.Alert || {};
        const { runAttackSender } = window.TUtils.Attack || {};
        const { configureUI } = window.TUtils.UI || {}; // Assuming configureUI is exposed by t-ui.js


        // --- UI Configuration ---
        if (typeof configureUI === 'function') {
            configureUI();
        } else {
            console.warn("T.Utils.UI.configureUI not found. UI module might not be loaded correctly.");
        }

        // --- Alert Polling ---
        // Check if essential alert functions and settings getter are available
        if (typeof getAlertSettings === 'function' &&
            typeof checkForCaptchaAndAlert === 'function' &&
            typeof checkForIncomingAndAlert === 'function') {

            // Call setInterval. getAlertSettings() is now properly scoped.
            setInterval(() => {
                checkForCaptchaAndAlert();
                checkForIncomingAndAlert();
            }, getAlertSettings().checkerRefresh * 1000); // Access getAlertSettings via TUtils.Utils
        } else {
            console.warn("Alert functions or settings getter not found. Alert module might not be loaded correctly.");
        }

        if (typeof runAttackSender === 'function') {
            runAttackSender();
        } else {
            console.warn("T.Utils.Attack.runAttackSender not found. Attack module might not be loaded correctly.");
        }

    });
})();