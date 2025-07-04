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

    // Helper function to load a single script via AJAX
    function loadScript(scriptName) {
        console.log(`T. Utilities: Attempting to load module: ${scriptName}`);
        return $.ajax({
            type: "GET",
            url: baseUrl + scriptName + '?cachebuster=' + Date.now(), // Add cachebuster here too for component scripts
            dataType: "script",
            cache: false // Always fetch the latest version of component scripts
        });
    }

    // Define the scripts to load:
    // 1. Core utilities must load first.
    // 2. All other component scripts can load in parallel.
    const coreUtilsScript = 't-utils.js';
    const componentScripts = [
        't-alerts.js',
        't-attack.js',
        't-builder.js',
        't-ui.js'
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
        const { configureUI } = window.TUtils.TUi || {};

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
    });

})();