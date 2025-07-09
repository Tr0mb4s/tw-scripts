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
                console.log(`✅ Module loaded successfully: ${scriptName}`);
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

        // --- Bootstrap the application here ---
        // Now that all scripts are loaded and their window.TUtils.X objects are defined,
        // you can run your main application logic or a global bootstrap function.

        console.log("T. Utilities: All modules defined. Bootstrapping main application logic.");

        // Call the main entry points for your modules
        // These calls are guaranteed to happen AFTER all module files have executed
        // and populated window.TUtils.* with their functions.

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
            console.log("Alert polling started.");
        } else {
            console.warn("Alert functions, settings getter, or Alert module not found. Alert module might not be loaded correctly or T.Utils.Utils not fully set up.");
        }

        // --- Attack Sender ---
        if (window.TUtils && window.TUtils.Attack && typeof window.TUtils.Attack.runAttackSender === 'function') {
            window.TUtils.Attack.runAttackSender();
            console.log("Attack sender initiated.");
        } else {
            console.warn("T.Utils.Attack.runAttackSender not found. Attack module might not be loaded correctly or method not exposed.");
        }

    }).catch(function(error) {
        // This catch block will be triggered if any script fails to load after all retries
        console.error("🔴 T. Utilities main logic could not start due to critical script loading errors. Script will not run.", error);
    });

/*
    // Define the scripts to load:
    // 1. Core utilities must load first.
    // 2. All other component scripts can load in parallel.
    const coreUtilsScript = 't-utils.js';
    const componentScripts = [
        't-ui.js',
        't-alerts.js',
        't-attack.js',
        't-builder.js',
        // Add new modules here (e.g., 't-recruiter.js')
        // The order of these in 'componentScripts' does not strictly matter
        // as they are loaded in parallel via $.when.
        // However, ensure they correctly use `window.TUtils.ModuleName = {...}`
        // and access `window.TUtils.Utils` functions only AFTER `t-utils.js` has loaded.
        // Our deferred approach below ensures this.
    ];

    // Use a Deferred object to signal when all *necessary* scripts are loaded
    // before the main application logic in t-main.js can run.
    const allDependenciesLoaded = $.Deferred();

    // 1. Load the core utility script first
    loadScript(coreUtilsScript)
        .done(function() {
            console.log(`T. Utilities: ${coreUtilsScript} loaded successfully.`);

            // 2. Once core utilities are loaded, load all other component scripts in parallel
            const componentPromises = componentScripts.map(script => loadScript(script));

            $.when(...componentPromises)
                .done(function() {
                    console.log('T. Utilities: All component scripts loaded successfully.');
                    allDependenciesLoaded.resolve(); // Signal that all dependencies for t-main are ready
                })
                .fail(function(jqXHR, textStatus, errorThrown) {
                    console.error("T. Utilities: Error loading one or more component scripts:", textStatus, errorThrown);
                    // You might want to display a more user-friendly message or log to a custom error service
                    alert(`T. Utilities: Failed to load one or more component modules. Please check the browser console for details.`);
                    allDependenciesLoaded.reject(); // Signal failure
                });
        })
        .fail(function(jqXHR, textStatus, errorThrown) {
            console.error(`T. Utilities: Error loading essential utility script (${coreUtilsScript}):`, textStatus, errorThrown);
            alert(`T. Utilities: Failed to load the core utility script (${coreUtilsScript}). The script will not function correctly. Please check the browser console for details.`);
            allDependenciesLoaded.reject(); // Signal failure
        });

    // Main application logic for t-main.js, this part waits for all dynamic loads.
    allDependenciesLoaded.done(function() {
        // This code will only run after t-utils.js and all component scripts are loaded
        // and have populated window.TUtils.
        console.log("T. Utilities: All modules initialized. Running main logic.");

        // Destructure functions from their respective TUtils modules.
        // Use '|| {}' to prevent errors if a module somehow didn't load or
        // define its namespace correctly, though the .fail() should catch this.
        const { getAlertSettings } = window.TUtils.Utils || {};
        const { checkForCaptchaAndAlert, checkForIncomingAndAlert } = window.TUtils.Alert || {};
        const { runAttackSender } = window.TUtils.Attack || {};
        const { builderUserInterface } = window.TUtils.Builder || {}; // Assuming this function is in t-builder.js
        const { configureUI } = window.TUtils.TUi || {};q

        // --- UI Configuration (run after DOM is ready if it manipulates it) ---
        // It's generally good practice to run UI modifications after DOM is ready.
        // The $.ajax dataType: "script" usually means it executes immediately,
        // but wrapping in $(function() { ... }) ensures DOM elements exist.
        $(function() {
            if (typeof configureUI === 'function') {
                configureUI();
            } else {
                console.warn("T.Utils.TUi.configureUI not found. UI module might not be loaded correctly.");
            }

            if (typeof builderUserInterface === 'function') {
                builderUserInterface();
            } else {
                console.warn("T.Utils.Builder.builderUserInterface not found. Builder module might not be loaded correctly.");
            }
        });


        // --- Alert Polling ---
        if (typeof getAlertSettings === 'function' &&
            typeof checkForCaptchaAndAlert === 'function' &&
            typeof checkForIncomingAndAlert === 'function') {

            setInterval(() => {
                checkForCaptchaAndAlert();
                checkForIncomingAndAlert();
            }, getAlertSettings().checkerRefresh * 1000);
        } else {
            console.warn("Alert functions or settings getter not found. Alert module might not be loaded correctly.");
        }

        // --- Attack Sender ---
        if (typeof runAttackSender === 'function') {
            runAttackSender();
        } else {
            console.warn("T.Utils.Attack.runAttackSender not found. Attack module might not be loaded correctly.");
        }

    }).fail(function() {
        console.error("T. Utilities main logic could not start due to failed script loads. Script will not run.");
    });*/

})(jQuery);