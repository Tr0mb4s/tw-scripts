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

const scripts = [
    "t-utils.js",       // must load first
    "t-alerts.js",
    "t-attacks.js",
    "t-ui.js",
    "userInterface.js"
  ];

(function () {

    setInterval(() => {
        checkForCaptchaAndAlert();
        checkForIncomingAndAlert();
    }, getAlertSettings().checkerRefresh * 1000);

    configureUI();
    runAttackSender();
})();