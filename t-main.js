// ==UserScript==
// @name         T. Utilities - Main (Dynamic Loader)
// @description  Main entry point for T. Utilities suite, dynamically loads components.
//               This file is loaded via AJAX by the primary Tampermonkey script.
// Note: No @require directives here, as modules are loaded dynamically.
// ==/UserScript==


// Ensure window.TUtils exists, as other modules will populate it.
window.TUtils = window.TUtils || {};

(function() {
    'use strict';

    const baseUrl = 'https://tr0mb4s.github.io/tw-scripts/'; // Base URL for your scripts
    const MAX_RETRIES = 3; // Maximum number of retries for each script
    const RETRY_DELAY_MS = 1000; // Delay between retries in milliseconds

        /**
     * Helper function to load a single script via AJAX with retries.
     * @param {string} scriptName The name of the script file (e.g., 't-utils.js').
     * @returns {Promise<void>} A promise that resolves if the script loads successfully,
     * or rejects if it fails after all retries.
     */
    function loadScriptWithRetries(scriptName, attempt = 1) {
        return new Promise((resolve, reject) => {
            console.log(`T. Utilities: Attempting to load module: ${scriptName} (Attempt ${attempt}/${MAX_RETRIES})`);
            $.ajax({
                type: "GET",
                url: baseUrl + scriptName + '?cachebuster=' + Date.now(), // Keep cachebuster for component scripts during development
                dataType: "script",
                cache: false // Always fetch the latest version of component scripts for development
            })
            .done(function() {
                //console.log(`✅ Module loaded successfully: ${scriptName}`);
                resolve(); // Resolve the promise on success
            })
            .fail(function(jqXHR, textStatus, errorThrown) {
                console.error(`❌ Error loading module ${scriptName} (Attempt ${attempt}):`, textStatus, errorThrown);
                if (attempt < MAX_RETRIES) {
                    console.warn(`Retrying ${scriptName} in ${RETRY_DELAY_MS}ms...`);
                    setTimeout(() => {
                        loadScriptWithRetries(scriptName, attempt + 1).then(resolve).catch(reject);
                    }, RETRY_DELAY_MS);
                } else {
                    console.error(`🔴 Failed to load module ${scriptName} after ${MAX_RETRIES} attempts.`);
                    alert(`T. Utilities: Failed to load module: ${scriptName}. Check console for details.`);
                    reject(new Error(`Failed to load ${scriptName}`)); // Reject after max retries
                }
            });
        });
    }


    // Define the scripts to load in their dependency order:
    const modulesToLoad = [
        { name: 'T.Utils', url: 't-utils.js' },      // Core utilities must load first
        { name: 'T.Alerts', url: 't-alerts.js' },    // Depends on T.Utils
        { name: 'T.Ui', url: 't-ui.js' },            // Depends on T.Utils
        { name: 'T.Builder', url: 't-builder.js' },  // Depends on T.Utils, T.Ui
        { name: 'T.Attack', url: 't-attack.js' }     // Depends on T.Utils, possibly T.Ui
        // Add other modules here in their dependency order
    ];

     // Start a promise chain for sequential loading
    let sequentialLoaderPromise = Promise.resolve(); // Start with a resolved promise

    modulesToLoad.forEach(module => {
        sequentialLoaderPromise = sequentialLoaderPromise.then(() => {
            // Chain the promise returned by loadScriptWithRetries
            return loadScriptWithRetries(module.url);
        });
    });


        // This .then() block will only execute after ALL modules have successfully loaded (including retries)
    sequentialLoaderPromise.then(function() {
        console.log("T. Utilities: All component scripts loaded successfully.");

        if (window.TUtils && window.TUtils.TUi && typeof window.TUtils.TUi.configureUI === 'function') {
            window.TUtils.TUi.configureUI(); // Calls the configureUI function from t-ui.js
        } else {
            console.warn("T.Utils.TUi.configureUI not found. UI module might not be loaded correctly or method not exposed.");
        }

        if (window.TUtils && window.TUtils.Builder && typeof window.TUtils.Builder.builderUserInterface === 'function') {
            window.TUtils.Builder.builderUserInterface(); // Calls the builderUserInterface function from t-builder.js
        } else {
            console.warn("T.Utils.Builder.builderUserInterface not found. Builder module might not be loaded correctly or method not exposed.");
        }

        // --- Alert Polling ---
        // Ensure all necessary dependencies (TUtils.Alert, TUtils.Utils) are available
        if (window.TUtils && window.TUtils.Alert && typeof window.TUtils.Alert.checkForCaptchaAndAlert === 'function' &&
            typeof window.TUtils.Alert.checkForIncomingAndAlert === 'function' &&
            window.TUtils.Utils && typeof window.TUtils.Utils.getAlertSettings === 'function') {
            setInterval(() => {
                window.TUtils.Alert.checkForCaptchaAndAlert();
                window.TUtils.Alert.checkForIncomingAndAlert();
            }, window.TUtils.Utils.getAlertSettings().checkerRefresh * 1000);
            //console.log("Alert polling started.");
        } else {
            console.warn("Alert functions, settings getter, or Alert module not found. Alert module might not be loaded correctly or T.Utils.Utils not fully set up.");
        }

        // --- Attack Sender ---
        if (window.TUtils && window.TUtils.Attack && typeof window.TUtils.Attack.runAttackSender === 'function') {
            window.TUtils.Attack.runAttackSender();
            //console.log("Attack sender initiated.");
        } else {
            console.warn("T.Utils.Attack.runAttackSender not found. Attack module might not be loaded correctly or method not exposed.");
        }

    }).catch(function(error) {
        // This catch block will be triggered if any script fails to load after all retries
        console.error("🔴 T. Utilities main logic could not start due to critical script loading errors. Script will not run.", error);
    });

})(jQuery);