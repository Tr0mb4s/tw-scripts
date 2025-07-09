// ==UserScript==
// @name         T. Utilities - Auto Builder
// @description  Auto Builds a village according to a given template
// ==/UserScript==


window.TUtils = window.TUtils || {}; // Ensure window.TUtils exists
window.TUtils.Builder = window.TUtils.Builder || {}; // Ensure window.TUtils.Builder is an object


(() => {

    const BUILDINGS = {
        "main": "20",
        "barracks": "25",
        "stable": "20",
        "garage": "15",
        "church": "3",
        "church_f": "20",
        "watchtower": "0",
        "snob": "1",
        "smith": "20",
        "place": "1",
        "statue": "1",
        "market": "25",
        "wood": "30",
        "stone": "30",
        "iron": "30",
        "farm": "30",
        "storage": "30",
        "hide": "1",
        "wall": "1"
    }


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
        isLeaderTab,
        refreshLeaderLock
    } = window.TUtils.Utils;

    const {
        configureUI,
        builderHTML,
        buttonToggle
    } = window.TUtils.TUi;

    function processTemplate() {
        let template = document.getElementById("custom--builder-template").value;
        let coords = document.getElementById("custom-builder-coord").value;

        const binary = atob(template);
        const bytes = Uint8Array.from(binary, c => c.charCodeAt(0));

        let upgrades = [];
        for (let i = 0; i < bytes.length - 1; i += 2) {
            const id = bytes[i];
            const level = bytes[i + 1];

            if (id >= 0 && id <= 19 && level > 0 && level <= 30) {
                const totalLevel = upgrades.filter(entry => entry.buildingId === id).length;
                upgrades.push({
                    step: upgrades.length + 1,
                    buildingId: id,
                    building: Object.keys(BUILDINGS)[id],
                    levels: level,
                    totalLevel: totalLevel
                });
            }
        }
        return upgrades;
    }

    function executeBuilder() {
        const coord = getCurrentVillageCoord();
        if (!coord) return console.warn("Cannot determine village coordinates");

        const template = getTemplateForCurrentVillage();
        if (!template) return console.warn("No template configured for this village");

        const upgrades = processTemplate(template);
        console.log("Parsed upgrade plan:", upgrades);
        // Here you would loop through upgrades and trigger build actions
    }

    function builderUserInterface() {

        const isOverview = location.href.includes("screen=overview");
        const isMain = location.href.includes("screen=main");
        const builderUI = builderHTML();

        if (isOverview) {
            $("#rightcolumn").prepend(builderUI)
            builderToggler();
        }

        if (isMain) {
            $("#building_wrapper").prepend(builderUI);
            builderToggler();
        }

    }

    function builderToggler() {
        document.getElementById("builder-toggle").onclick = () => {
            const builderSettings = getBuilderSettings();
            builderSettings.enabled = !builderSettings.enabled;
            setBuilderSettings(builderSettings);

            const btn = $("#builder-toggle")[0];
            btn.textContent = buttonToggle(builderSettings.enabled);
            btn.classList.toggle("btn-confirm-yes", builderSettings.enabled);
        };
    }

    /**
     * UTILITY FUNCTIONS FOR BUILDER
     */

    function getCurrentVillageCoord() {
        return game_data.village.coord;
    }

    function getTemplateForCurrentVillage() {
        let currentCoord = getCurrentVillageCoord();
        let tempBuilderSettings = getBuilderSettings();
        return villageTemplates.entries().find(([key, value]) => key == currentCoord)[1] || tempBuilderSettings.defaultTemplate;
    }

    window.TUtils.Builder = {
        builderUserInterface,
        executeBuilder,
    }
})();