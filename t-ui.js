// ==UserScript==
// @name         T. Utilities - UI Module
// @namespace    https://yourdomain.t.utilities
// @version      1.0
// @description  UI Panel for alert/attack configuration
// @grant        none
// ==/UserScript==

window.TUtils = window.TUtils || {}; // Ensure window.TUtils exists
window.TUtils.TUi = window.TUtils.TUi || {}; // Ensure window.TUtils.TUi is an object


(() => {

    /**
     * VARIABLES
     */
    const {
        TROOP_ICONS,

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

    function configureUI() {
        //Enable console.log if other script disables it
        delete console.log;
        var i = document.createElement('iframe');
        i.style.display = 'none';
        document.body.appendChild(i);
        window.console = i.contentWindow.console;

        //if (game_data.features.Premium.active) {
        let questLog = $('#questlog, #questlog_new');
        if (questLog.length < 1) {
            $('.maincell').prepend(`<div style="position:fixed;"><div id="questlog" class="questlog"></div></div>`);
            questLog = $('#questlog');
        }
        questLog.append(
            `<div class="quest opened triggerAlert" style="background-image: url('https://i.ibb.co/ZRBC9VsX/T-notifications.png'); background-size: contain;">
             <div class="quest_progress" style="width: 0%;"></div>
        </div>`
        );

        $('.triggerAlert').click(() => {
            getAlertSettings();
            openUI();
            injectFakeDoisCocosUI();
            initializeForm();
            return
        });

        //}
    }

    function openUI() {
        var html = userInterface();

        Dialog.show("alert_script_settings", html);

        $(".tooltip-trigger").on("mouseenter", function () {
            const tooltip = $(this).find(".tooltip-content");

            // Store a reference to the original parent
            const originalParent = $(this);

            // Append tooltip to body
            tooltip.appendTo("body").show();

            $(this).on("mousemove", function (e) {
                tooltip.css({
                    position: "fixed", // Adjust position for the viewport
                    top: `${e.clientY + 10}px`,
                    left: `${e.clientX + 10}px`,
                });
            });

            $(this).on("mouseleave", function () {
                // Hide and reattach tooltip to its original parent
                tooltip.hide().appendTo(originalParent);
                $(this).off("mousemove"); // Remove mousemove event
            });
        });

        let settings = getAlertSettings();

        // Select Tab
        $("#captcha-whatsapp-enabled").prop('checked', settings.captcha.whatsappEnabled)
        $("#captcha-discord-webhook-enabled").prop('checked', settings.captcha.discordWebhookEnabled)
        $("#captcha-discord-dm-enabled").prop('checked', settings.captcha.discordDMEnabled)

        $("#incoming-whatsapp-enabled").prop('checked', settings.incoming.whatsappEnabled)
        $("#incoming-discord-webhook-enabled").prop('checked', settings.incoming.discordWebhookEnabled)
        $("#incoming-discord-dm-enabled").prop('checked', settings.incoming.discordDMEnabled)

        // Alert Channels Config
        $("#alertPhoneNumber").prop('disabled', !(settings.captcha.whatsappEnabled || settings.incoming.whatsappEnabled));
        $("#alertApiKey").prop('disabled', !(settings.captcha.whatsappEnabled || settings.incoming.whatsappEnabled));
        $("#alertPhoneNumber").val(settings.phoneNumber);
        $("#alertApiKey").val(settings.apiKey);

        $("#alertWebhookUrl").prop('disabled', !(settings.captcha.discordWebhookEnabled || settings.incoming.discordWebhookEnabled));
        $("#alertWebhookUrl").val(settings.webHook);

        $("#alertUserId").prop('disabled', !(settings.captcha.discordDMEnabled || settings.incoming.discordDMEnabled));
        $("#alertUserId").val(settings.discordUserId);

        // Select Alerts
        $("#captchaAlertCooldown").val(settings.captcha.alertCooldown)
        $("#incomingAlertCooldown").val(settings.incoming.alertCooldown)
        $("#checkerRefresh").val(settings.checkerRefresh)

        // Import & Export
        $("#allAlertConfigurations").val(JSON.stringify(getAlertSettings(), null, 4))
        configureButtons();
    }

    function initializeForm() {
        const settings = getSettings();
        const selectedTemplate = settings.attackSettings.selectedTemplate;

        if (selectedTemplate && selectedTemplate.troops) {
            Object.keys(selectedTemplate.troops).forEach(key => {
                $(`#attack-${key}`).val(selectedTemplate.troops[key] || 0);
            });
            $("#attack-template-name").val(selectedTemplate.name);
        }

        loadTemplatePicker();
    }

    function loadTemplatePicker() {
        const templates = getSettings().attackSettings.userTemplates;
        const picker = $("#attack-template-picker");
        picker.empty();
        templates.forEach((tpl, idx) => {
            picker.append(`<option value="${idx}" ${tpl.name === getSettings().attackSettings.selectedTemplate.name ? 'selected' : ''}>${tpl.name}</option>`);
        });
    }

    function injectFakeDoisCocosUI() {
        $(document).on("change", "#attack-checkDate", function () {
            $("#attack-date-config").toggle(this.checked);
        });


        $("#attack-template-picker").on("change", function () {
            const templates = getSettings().attackSettings.userTemplates;
            const selectedIdx = parseInt($("#attack-template-picker").val());

            if (isNaN(selectedIdx) || !templates[selectedIdx]) {
                UI.ErrorMessage("No template selected or invalid selection.");
                return;
            }

            const tpl = templates[selectedIdx].troops || {};
            Object.keys(tpl).forEach(key => {
                $(`#attack-${key}`).val(tpl[key] || 0);
            });

            $("#attack-template-name").val(templates[selectedIdx].name || "");
            const settings = getSettings();
            settings.attackSettings.selectedTemplate = templates[selectedIdx];
            saveSettings(settings);
            UI.SuccessMessage("Template loaded!");
        });

        $("#attack-save-template").on("click", function () {
            const name = $("#attack-template-name").val().trim();
            if (!name) {
                UI.ErrorMessage("Template name is required.");
                return;
            }

            const all = getSettings();
            const settings = all.attackSettings;

            const newTemplate = {
                name,
                troops: Object.fromEntries(
                    Object.keys(TROOP_ICONS).map(key => [key, parseInt($(`#attack-${key}`).val()) || 0])
                )
            };

            const existingTemplateIdx = settings.userTemplates.findIndex(tpl => tpl.name === name);

            if (existingTemplateIdx > -1) {
                // Update existing template
                settings.userTemplates[existingTemplateIdx] = newTemplate;
                UI.SuccessMessage("Template updated successfully.");
            } else {
                // Add new template
                settings.userTemplates.push(newTemplate);
                UI.SuccessMessage("New template saved successfully.");
            }

            settings.selectedTemplate = newTemplate;

            saveSettings(all);
            loadTemplatePicker();
        });

        $("#attack-delete-template").on("click", function () {
            const selectedIdx = parseInt($("#attack-template-picker").val());
            const settings = getSettings();
            const templates = settings.attackSettings.userTemplates;

            if (isNaN(selectedIdx) || !templates[selectedIdx]) {
                UI.ErrorMessage("No template selected or invalid selection.");
                return;
            }

            templates.splice(selectedIdx, 1);
            saveSettings(settings);
            loadTemplatePicker();
            UI.SuccessMessage("Template deleted!");
        });

        $("#attack-reset-index").on("click", function () {
            let tempSettings = getAttackerSettings();
            tempSettings.attackIndex = 0;
            setAttackerSettings(tempSettings);
            UI.SuccessMessage("Coords Index Reset!");
        });

        $("#attack-retry-counter").on("click", function () {
            let tempSettings = getAttackerSettings();
            tempSettings.retryCount = 0;
            setAttackerSettings(tempSettings);
            UI.SuccessMessage("Village retry count Reset");
        });


        document.getElementById("attack-save").onclick = () => {
            const all = getSettings();
            const settings = all.attackSettings;

            // Save basic attack settings
            settings.attackTime = parseInt(document.getElementById("attack-attackTime").value) || 0;
            settings.attackDelay = parseInt(document.getElementById("attack-attackDelay").value) || 0;
            settings.switchTime = parseInt(document.getElementById("attack-switchTime").value) || 0;
            settings.switchDelay = parseInt(document.getElementById("attack-switchDelay").value) || 0;
            settings.attackPerVillage = parseInt(document.getElementById("attacks-per-village").value) || 0;
            settings.maxRetriesPerVillage = parseInt(document.getElementById("attack-max-retries").value) || 0;
            settings.sendFulls = document.getElementById("attack-sendFulls").checked;
            settings.coords = document.getElementById("attack-coords").value.trim();
            settings.checkDate = document.getElementById("attack-checkDate").checked;
            settings.minDate = document.getElementById("attack-dmin").value;
            settings.maxDate = document.getElementById("attack-dmax").value;

            // Validate and set the selected template
            const selectedTemplate = $("#attack-template-picker").val();
            if (selectedTemplate) {
                settings.selectedTemplate = settings.userTemplates[selectedTemplate];
            } else {
                UI.ErrorMessage("No template selected.");
                return;
            }

            // Update the troop template data
            const troopTemplate = {};
            Object.keys(TROOP_ICONS).forEach(key => {
                troopTemplate[key] = parseInt(document.getElementById(`attack-${key}`).value) || 0;
            });

            const existingTemplateIdx = settings.userTemplates.findIndex(tpl => tpl.name === settings.selectedTemplate.name);
            if (existingTemplateIdx > -1) {
                settings.userTemplates[existingTemplateIdx].troops = troopTemplate;
            } else {
                UI.ErrorMessage("Selected template not found in user templates.");
                return;
            }

            saveSettings(all);
            UI.SuccessMessage("Attack settings saved successfully.");
        };

        attackToggler();
        loadTemplatePicker();
    }


    /**
     * UI
     */

    function userInterface() {
        const containerStyle = 'style="display:none"';
        const attackSettings = getSettings().attackSettings;
        const alertSettings = getSettings().alertSettings;
        const tempAttackLogs = getSettings().attackLogs;

        const inputsWithIcons = Object.entries(TROOP_ICONS).map(([key, icon]) => {
            return `<div><img src="${icon}" alt="${key}" style="width: 20px; height: 20px; vertical-align: middle;" />
                <input type="number" id="attack-${key}" placeholder="${key}" style="width: 60px;"/ value="${attackSettings.selectedTemplate.troops.key}"></div>`;
        }).join("</br>");

        const attackLogsHtml = generateLogsHtml(tempAttackLogs);

        return `<head>
                    <style>
                        .alertSettingsContainer {
                            min-height: 700px
                        }
                        
                        .input-checkbox-container {
                            position: relative;
                            max-width: 75%;
                        }


                        .input-checkbox-container input[type='checkbox']{
                            position: absolute;
                            right: 50px;
                        }

                        #alertButtons {
                            padding-bottom: 20px
                        }

                        #popup_box_alert_script_settings {
                            width: 550px !important
                        }
                        
                        .btn {
                            padding: 5px;
                            margin: 5px 0;
                        }

                        .tooltip-trigger{
                            position: relative;
                            padding: 10px;
                        }

                        .tooltip-content {
                            display: none;
                            font-style: italic;
                            font-weight: bold;
                            position: absolute;
                            background-color: #333;
                            color: #000;
                            padding: 10px;
                            border-radius: 5px;
                            box-shadow: 0 4px 8px rgba(0, 0, 0, 0.2);
                            z-index: 35000;
                        }
                    </style>
                </head>

                <body>
                    <div class="alertSettingsContainer">
                        <h1>T. Utilities Settings</h1>
                        <div id="alertButtons">
                            <button class="btn btn-confirm-yes" id="btn-selectAlerts" onclick="openAlertConfigMenu('selectAlerts')">Select Alerts</button>
                            <button class="btn" id="btn-captchaConfig" onclick="openAlertConfigMenu('captchaConfig')">Alert Channels Config</button>
                            </br>
                            <button class="btn" id="btn-attackerConfigs" onclick="openAlertConfigMenu('attackerConfigs')">Attack Settings</button>
                            <button class="btn" id="btn-attackerTemplate" onclick="openAlertConfigMenu('attackerTemplate')">Attack Template</button>
                            <button class="btn" id="btn-attackLogs" onclick="openAlertConfigMenu('attackLogs')">Attack Logs</button>
                            </br>
                            <button class="btn" id="btn-iexportConfig" onclick="openAlertConfigMenu('iexportConfig')">Import / Export Configs</button>
                        </div>
                        <div id="selectAlerts" class="alertConfigMenu">
                            <fieldset style="margin-top:15px">
                                <legend>Select which alerts to receive</legend>
                                <p>
                                    <div class="input-checkbox-container">
                                        <span class="tooltip-trigger">
                                            ❓
                                            <span class="tooltip-content tooltip-style" style="display:none;">
                                                Select which channels to receive notifications for Captcha
                                            </span>
                                        </span>
                                        <label>Captcha<input type="checkbox" id="captcha-alert-enabled" name="source" value="captcha-alert-enabled" checked="true"></label>
                                    </div>
                                </p>
                                <div class="input-checkbox-container" id="captcha-alert-channels" display:${alertSettings.captcha.enabled ? 'block' : 'none'}" style="margin-left:50px;">
                                    <p><label>Whatsapp Notification - CallMeBot<input type="checkbox" id="captcha-whatsapp-enabled" name="source" checked="${alertSettings.captcha.whatsappEnabled}"></label></p>
                                    <p><label>Discord Notification - WebHook<input type="checkbox" id="captcha-discord-webhook-enabled" name="source" checked="${alertSettings.captcha.discordWebhookEnabled}"></label></p>
                                    <p><label>Discord Notification - Direct Message<input type="checkbox" id="captcha-discord-dm-enabled" name="source" checked="${alertSettings.captcha.discordDMEnabled}"></label></p>
                                </div>
                                <p>
                                    <div class="input-checkbox-container">
                                    <span class="tooltip-trigger">
                                        ❓
                                        <span class="tooltip-content tooltip-style" style="display:none;">
                                            Select which channels to receive notifications for Incoming Attacks
                                        </span>
                                    </span>
                                    <label>Incoming<input type="checkbox" id="incoming-alert-enabled" name="source" value="incoming-alert-enabled" checked="true"></label>
                                    </div>
                                </p>
                                <div class="input-checkbox-container" id="incoming-alert-channels" display:${alertSettings.incoming.enabled ? 'block' : 'none'}" style="margin-left:50px;">
                                    <p><label>Whatsapp Notification - CallMeBot<input type="checkbox" id="incoming-whatsapp-enabled" name="source" checked="${alertSettings.incoming.whatsappEnabled}"></label></p>
                                    <p><label>Discord Notification - WebHook<input type="checkbox" id="incoming-discord-webhook-enabled" name="source" checked="${alertSettings.incoming.discordWebhookEnabled}"></label></p>
                                    <p><label>Discord Notification - Direct Message<input type="checkbox" id="incoming-discord-dm-enabled" name="source" checked="${alertSettings.incoming.discordDMEnabled}"></label></p>
                                </div>
                            </fieldset>
                            <p><input type="button" class="btn evt-confirm-btn btn-confirm-yes" id="saveAlertFormButton" value="Save"> <input type="button" class="btn evt-confirm-btn btn-confirm-no" id="resetAlertFormButton" value="Reset settings"></p>
                        </div>
                        <div id="captchaConfig" class="alertConfigMenu"  ${containerStyle}>
                            <form>
                                <fieldset>
                                    <legend>Settings</legend>
                                    <p><label>Number:</label><input id="alertPhoneNumber" type="text" placeholder="351987654321"></p>
                                    <p><label>Api Key:</label><input id="alertApiKey" type="text" placeholder="1234567"></p>
                                </fieldset>
                                <h2>Discord</h2>
                                <fieldset style="margin-top:15px">
                                    <legend>Discord Webhook</legend>
                                    <p><label>Channel Webhook:</label><input type="text" id="alertWebhookUrl" placeholder="https://discord.com/api/webhooks/........." disabled="false"></p>
                                </fieldset>
                                <fieldset style="margin-top:15px">
                                    <legend>Discord Direct Message</legend>
                                    <p><label>User ID:</label><input type="text" id="alertUserId" placeholder="123456789012345678" disabled="false"></p>
                                </fieldset>
                                <h2>Other Settings</h2>
                                <fieldset style="margin-top:15px">
                                    <legend>Other Configurations</legend>
                                    <p><label>Captcha Alert Cooldown: (mins)</label><input id="captchaAlertCooldown" type="number" placeholder="60"></p>
                                    <p><label>Incoming Alert Cooldown: (mins)</label><input id="incomingAlertCooldown" type="number" placeholder="15"></p>
                                    <p><label>Checker refresh: (secs)</label><input id="checkerRefresh" type="number" placeholder="10"></p>
                                </fieldset>
                            </form>
                            <p><input type="button" class="btn evt-confirm-btn btn-confirm-yes" id="saveFormButton" value="Save"> <input type="button" class="btn evt-confirm-btn btn-confirm-no" id="resetFormButton" value="Reset settings"></p>
                        </div>
                        <div id="iexportConfig" class="alertConfigMenu" ${containerStyle}>
                            <form>
                                <p><label>Current Configurations:</label></p><textarea id="allAlertConfigurations" name="allAlertConfigurations" rows="25" cols="50"></textarea>
                                <p><input type="button" class="btn evt-confirm-btn btn-confirm-yes" id="saveAllAlertConfigurations" value="Save"> <input type="button" class="btn evt-confirm-btn btn-confirm-no" id="resetAllAlertConfigurations" value="Reset settings"></p>
                            </form>
                        </div>
                        <div id="attackerConfigs" class="alertConfigMenu" ${containerStyle}>
                            <fieldset><legend>Attack Configs</legend>
                                <p>
                                    <span class="tooltip-trigger">
                                        ❓
                                        <span class="tooltip-content tooltip-style" style="display:none;">
                                            How long script will wait between attacks.
                                        </span>
                                    </span> 
                                    <label>Delay between attacks (ms): <input id="attack-attackTime" type="number" value="${attackSettings.attackTime}"/></label>
                                <p/>
                                <p>
                                    <span class="tooltip-trigger">
                                        ❓
                                        <span class="tooltip-content tooltip-style" style="display:none;">
                                            Amount of miliseconds to calculate randomizer for sending attacks.
                                        </span>
                                    </span> 
                                    <label>Randomizer delay between attacks (ms):<input id="attack-attackDelay" type="number" value="${attackSettings.attackDelay}"/></label>
                                <p/>
                                <p>
                                    <span class="tooltip-trigger">
                                        ❓
                                        <span class="tooltip-content tooltip-style" style="display:none;">
                                            The delay between switching villages.
                                        </span>
                                    </span> 
                                    <label>Delay between village switch (ms): <input id="attack-switchTime" type="number" value="${attackSettings.switchTime}"/></label>
                                <p/>
                                <p>
                                    <span class="tooltip-trigger">
                                        ❓
                                        <span class="tooltip-content tooltip-style" style="display:none;">
                                            Amount of miliseconds to calculate randomizer for village switch.
                                        </span>
                                    </span> 
                                    <label>Randomizer delay between village switch (ms): 
                                    <input id="attack-switchDelay" type="number" value="${attackSettings.switchDelay}"/></label>
                                </p>
                                <p>
                                    <span class="tooltip-trigger">
                                        ❓
                                        <span class="tooltip-content tooltip-style" style="display:none;">
                                            Check if you want to send attacks with all troops.
                                            Otherwise, uncheck to use attack templates.
                                        </span>
                                    </span>
                                    <label>Full Attacks: <input type="checkbox" id="attack-sendFulls" ${attackSettings.sendFulls ? 'checked' : ''}/></label></p>
                                <p>
                                    <span class="tooltip-trigger">
                                        ❓
                                        <span class="tooltip-content tooltip-style" style="display:none;">
                                            How many attacks per target village.
                                        </span>
                                    </span> 
                                    <label>Attacks per target: <input id="attacks-per-village" type="number" value="${attackSettings.attackPerVillage}"/></label>
                                </p>
                                <p>
                                    <span class="tooltip-trigger">
                                        ❓
                                        <span class="tooltip-content tooltip-style" style="display:none;">
                                            Attacks per source village
                                        </span>
                                    </span>
                                    <label>Attacks per source village: 
                                        <input id="attack-max-retries" type="number" value="${attackSettings.attacksPerSource}"/>
                                    </label>
                                </p>
                                <p>
                                    <span class="tooltip-trigger">
                                        ❓
                                        <span class="tooltip-content tooltip-style" style="display:none;">
                                            How many retries per village.
                                            Used in case an attack to a certain target village would land during night bonus.
                                        </span>
                                    </span>
                                    <label>Maximum attempts per village: <input id="attack-max-retries" type="number" value="${attackSettings.maxRetriesPerVillage}"/></label>
                                </p>
                                <p>
                                    <span class="tooltip-trigger">
                                        ❓
                                        <span class="tooltip-content tooltip-style" style="display:none;">
                                            Check if you want your attacks to land within a specific time window.
                                        </span>
                                    </span>
                                    <label>Check Date: <input type="checkbox" id="attack-checkDate" ${attackSettings.checkDate ? 'checked' : ''}/></label>
                                <p/>
                                <div id="attack-date-config" style="margin-left:10px; margin-bottom:8px; display:${attackSettings.checkDate ? 'block' : 'none'}">
                                <br/>
                                <br/>
                                <label>Date Range (min-max):
                                    <input id="attack-dmin" type="datetime-local" value="${parseDate(attackSettings.minDate)}" style="width: 60px"/> -
                                    <input id="attack-dmax" type="datetime-local" value="${parseDate(attackSettings.maxDate)}" style="width: 60px"/>
                                </label><br/>
                                </div>
                                <label>Coords:<br/><textarea id="attack-coords" rows="4" style="width:100%">${attackSettings.coords}</textarea></label><br/>
                                <button id="attack-reset-index" class="btn">🆔 Reset Coord Index</button>
                                <button id="attack-retry-counter" class="btn">🔢 Reset Retry Counter</button>
                                <button id="attack-save" class="btn">💾 Save</button>
                                <button id="attack-toggle" class="btn ${attackSettings.enabled ? 'btn-confirm-yes' : ''}">${attackSettings.enabled ? '🛑 Stop' : '▶️ Start'}</button>
                                </fieldset>
                            </div>

                            <div id="attackerTemplate" class="alertConfigMenu" ${containerStyle}>
                                <fieldset><legend>Template Manager</legend>
                                    <label>Template:    
                                    <select id="attack-template-picker"></select>
                                    <button class="btn" id="attack-delete-template">🗑 Delete</button>
                                    </label><br/>
                                    <p></p><label for="attack-template-name">Template Name:</label><input type="text" id="attack-template-name" placeholder="Enter template name" style="width: 150px;"/></p>
                                    <label>Units:</label><br/>
                                    ${inputsWithIcons}<br/>
                                    <button class="btn" id="attack-save-template">💾 Save as Template</button><br/>
                                </fieldset>
                            </div>

                            <div id="attackLogs" class="alertConfigMenu" ${containerStyle}>
                                <fieldset>
                                    <legend>Attack Logs</legend>
                                    <table class="vis">
                                        <thead>
                                            <tr>
                                                <th style="min-width:85%">Description</th>
                                                <th style="min-width:15%">Timestamp</th>
                                            </tr>
                                        </thead>
                                        <tbody id="attack-logs-tbody">
                                            ${attackLogsHtml}
                                        </tbody>
                                    </table>
                                    <button class="btn" id="utilities-export-logs">📥 Export Logs</button>
                                    <button class="btn" id="utilities-delete-logs">🚮 Reset Logs</button>
                                </fieldset>
                                <fieldset id="attackLogs-export" ${containerStyle}">
                                    <legend>Export Logs</legend>
                                    <textarea id="attack-logs-area" rows="4" style="width:100%">${JSON.stringify(tempAttackLogs)}</textarea>
                                </fieldset>
                            </div>
                    </div>
                    <script>
                        function openAlertConfigMenu(e) {
                            var t, n = document.getElementsByClassName("alertConfigMenu");
                            for (t = 0; t < n.length; t++) n[t].style.display = "none";
                            document.getElementById(e).style.display = "block";
                            var s = document.getElementById("alertButtons").getElementsByClassName("btn");
                            for (t = 0; t < n.length; t++) s[t].id != "btn-" + e ? s[t].classList.remove("btn-confirm-yes") : s[t].classList.add("btn-confirm-yes")
                        }
                    </script>
                </body>`;
    }

    function builderHTML() {
        let builderSettings = getBuilderSettings;
        return `<div id="show_tbuilder_settings" class="vis moveable widget " bis_skin_checked="1">
                    <h4 class="head with-button ui-sortable-handle">
                        <img class="widget-button" onclick="return VillageOverview.toggleWidget( 'show_tbuilder_settings', this );" src="graphic/minus.png">		T. Builder
                    </h4>
                    <div class="widget_content" style="display: block;" bis_skin_checked="1"><form id="amqueue-edit-form" method="post">
                    <table width="100%">
                        <tbody>
                            <tr>
                                <td style="white-space: nowrap; height: 20px;">
                                    <button id="builder-toggle" class="btn ${builderSettings.enabled ? 'btn-confirm-yes' : ''}">${builderSettings.enabled ? '🛑 Stop' : '▶️ Start'}</button>
                                </td>
                            </tr>
                        </tbody>
                    
                    </table>

                    <script>
                        VillageOverview.registerAMWidgetEvents();
                    </script></div>
                </div>`
    }

    function configureButtons() {
        // Captcha Buttons
        $('#resetFormButton').on('click', () => {
            resetForm();
        });
    
        $('#saveFormButton').on('click', () => {
            saveSettingsButton();
        });
    
        // Select Alert Buttons
        $('#saveAlertFormButton').on('click', () => {
            saveAlertSettings();
        });
        $('#resetAlertFormButton').on('click', () => {
            resetAlertSettings();
        });
    
        //Select Alerts
        $('#captcha-alert-enabled').change(function () {
            $('#captcha-alert-channels').css('display', $('#captcha-alert-enabled').prop("checked") ? 'block' : 'none');
        });
        $('#incoming-alert-enabled').change(function () {
            $('#incoming-alert-channels').css('display', $('#incoming-alert-enabled').prop("checked") ? 'block' : 'none');
        });
    
        // Import Buttons
        $('#saveAllAlertConfigurations').on('click', () => {
            saveAllSettings();
        });
        $('#resetAllAlertConfigurations').on('click', () => {
            resetAllSettings();
        });
    
        // Toggle Captcha
        $('#captcha-whatsapp-enabled, #incoming-whatsapp-enabled').on("change", () => {
            toggleWhatsappNotification()
        });
        $('#captcha-discord-webhook-enabled, #incoming-discord-webhook-enabled').on("change", () => {
            toggleDiscordWebhookNotification();
        });
        $('#captcha-discord-dm-enabled, #incoming-discord-dm-enabled').on("change", () => {
            toggleDiscordDMNotification();
        });
    
        $('#btn-iexportConfig').on('click', (event) => {
            if (event.isTrigger) {
                console.warn('❌ Ignoring jQuery-triggered synthetic event');
                return;
            }
    
            if (!(event.originalEvent instanceof MouseEvent)) {
                console.warn('❌ Ignoring non-mouse event');
                return;
            }
    
            if (event.originalEvent.isTrusted === false) {
                console.warn('❌ Ignoring untrusted event');
                return;
            }
    
            updateConfigurationsTextbox();
        });
    
        $('#utilities-export-logs').on('click', () => {
            $('#attackLogs-export').val(JSON.stringify(getAttackLogs())).toggle();
        });
    
        $('#utilities-delete-logs').on('click', () => {
            $('#attack-logs-tbody').empty();
            $('#attackLogs-export').val();
            setAttackLogs([]);
    
        });
    }
    
    function saveAlertSettings() {
        let settings = getAlertSettings();
    
        settings.captcha.enabled = $("#captcha-alert-enabled").is(":checked");
        settings.captcha.whatsappEnabled = $("#captcha-whatsapp-enabled").is(":checked");
        settings.captcha.discordWebhookEnabled = $("#captcha-discord-webhook-enabled").is(":checked");
        settings.captcha.discordDMEnabled = $("#captcha-discord-dm-enabled").is(":checked");
    
        settings.incoming.enabled = $("#incoming-alert-enabled").is(":checked");
        settings.incoming.whatsappEnabled = $("#incoming-whatsapp-enabled").is(":checked");
        settings.incoming.discordWebhookEnabled = $("#incoming-discord-webhook-enabled").is(":checked");
        settings.incoming.discordDMEnabled = $("#incoming-discord-dm-enabled").is(":checked");
    
        setAlertSettings(settings);
        UI.SuccessMessage('Settings saved', 3000);
    }
    
    function resetAlertSettings() {
        localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(alertSettings))
        UI.SuccessMessage('Settings reseted', 3000);
    }
    
    function saveAllSettings() {
        try {
            const parsed = JSON.parse($("#allAlertConfigurations").val());
            saveSettings(parsed);
            UI.SuccessMessage('Settings saved', 3000);
        } catch (err) {
            UI.ErrorMessage('Invalid JSON format');
        }
    }
    
    function resetAllSettings() {
        saveSettings(defaultSettings);
        $("#allAlertConfigurations").val(JSON.stringify(getSettings(), null, 4));
        UI.SuccessMessage('Settings reseted', 3000);
    }
    
    function saveSettingsButton() {
    
        let tempAlertSettings = getAlertSettings();
    
        whatsappStatus = (tempAlertSettings.captcha.whatsappEnabled || tempAlertSettings.incoming.whatsappEnabled);
        discordWebhookStatus = (tempAlertSettings.captcha.discordWebhookEnabled || tempAlertSettings.incoming.discordWebhookEnabled)
        discordDMStatus = (tempAlertSettings.captcha.discordDMEnabled || tempAlertSettings.incoming.discordDMEnabled)
    
        if (whatsappStatus && ($("#alertPhoneNumber").val().trim().length === 0 || $("#alertApiKey").val().trim().length === 0 ||
            $("#alertPhoneNumber").val().trim().length != 12 || $("#alertApiKey").val().trim().length != 7)) {
    
            UI.ErrorMessage('CallMeBot is not correctly setup');
            return
        }
    
        if (discordWebhookStatus && $("#alertWebhookUrl").val().trim().length === 0) {
            UI.ErrorMessage('Webhook is not correctly setup');
            return
        }
    
        if (discordDMStatus && $("#alertUserId").val().trim().length === 0) {
            UI.ErrorMessage('UserId is not correctly setup');
            return
        }
    
        tempAlertSettings.phoneNumber = $("#alertPhoneNumber").val();
        tempAlertSettings.apiKey = $("#alertApiKey").val();
        tempAlertSettings.webHook = $("#alertWebhookUrl").val();
        tempAlertSettings.discordUserId = $("#alertUserId").val();
        tempAlertSettings.captcha.alertCooldown = parseInt($("#captchaAlertCooldown").val());
        tempAlertSettings.incoming.alertCooldown = parseInt($("#incomingAlertCooldown").val());
        tempAlertSettings.checkerRefresh = parseInt($("#checkerRefresh").val());
    
        setAlertSettings(tempAlertSettings);
        UI.SuccessMessage('Settings saved', 3000);
    }
    
    function resetForm() {
        localStorage.removeItem(LOCAL_STORAGE_KEY);
        openUI();
    }
    
    function toggleWhatsappNotification() {
        $("#alertPhoneNumber").prop('disabled', !($("#captcha-whatsapp-enabled").is(":checked") || $("#incoming-whatsapp-enabled").is(":checked")));
        $("#alertApiKey").prop('disabled', !($("#captcha-whatsapp-enabled").is(":checked") || $("#incoming-whatsapp-enabled").is(":checked")));
    }
    
    function toggleDiscordWebhookNotification() {
        $("#alertWebhookUrl").prop('disabled', !($("#captcha-discord-webhook-enabled").is(":checked") || $("#incoming-discord-webhook-enabled").is(":checked")));
    }
    
    function toggleDiscordDMNotification() {
        $("#alertUserId").prop('disabled', !($("#captcha-discord-dm-enabled").is(":checked") || $("#incoming-discord-dm-enabled").is(":checked")));
    }
    
    function updateConfigurationsTextbox() {
        $("#allAlertConfigurations").val(JSON.stringify(getSettings(), null, 4));
    }

        function attackToggler() {
        document.getElementById("attack-toggle").onclick = () => {
            const attackSettings = getAttackSettings();
            attackSettings.enabled = !attackSettings.enabled;
            setAttackSettings(attackSettings);
            const btn = $("#attack-toggle")[0];
            btn.textContent = buttonToggle(attackSettings.enabled);
            btn.classList.toggle("btn-confirm-yes", attackSettings.enabled);
        };
    }


    /**
     * BUTTONS
     */

    function buttonToggle(bool){
        return bool ? '🛑 Stop' : '▶️ Start';
    }

    /**
     * OTHER UI COMPONENTS
     */

    function generateLogsHtml(tempAttackLogs) {
        return Object.entries(tempAttackLogs).map(log => {
            console.log(log)
            return `<tr>
                        <td>${log[1].description}</td>
                        <td>${log[1].time}</td>
                    </tr>`
        }).join("");
    }

    window.TUtils.TUi = {
        configureUI,
        builderHTML,
        buttonToggle,
        attackToggler
    }
})();