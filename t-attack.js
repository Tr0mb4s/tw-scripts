// ==UserScript==
// @name         T. Utilities - Attack Sender
// @description  Handles attack sending and logging logic
// ==/UserScript==

window.TUtils = window.TUtils || {}; // Ensure window.TUtils exists
window.TUtils.Attack = window.TUtils.Attack || {}; // Ensure window.TUtils.Attack is an object


(() => {

    /**
     * VARIABLES
     */
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
        buttonToggle,
        attackToggler
    } = window.TUtils.TUi;

    function runAttackSender() {
        const settings = getSettings();
        const isPlaceScreen = location.href.includes("screen=place");
        var attackSettings = settings.attackSettings;

        if (isPlaceScreen) {

            var attackButtonHtml = `
            <div id="command_actions" class="target-select clearfix vis float_left" bis_skin_checked="1">
                    <h4>Attack Config:</h4>
                    <table class="vis" style="width: 100%">
                        <tbody>
                            <tr>
                                <td>
                                    <button id="attack-toggle" class="btn ${attackSettings.enabled ? 'btn-confirm-yes' : ''}">${attackSettings.enabled ? '🛑 Stop' : '▶️ Start'}</button>
                                </td>
                            </tr>
                        </tbody>
                    </table>
                </div>`;

            $("#command-data-form").append(attackButtonHtml)
            attackToggler();

            if (getAttackSettings().enabled) {
                if (isConfirmAttackScreen()) {

                    if ($(".error_box") && $(".error_box").is(":visible")) {
                        if ($(".error_box").find("div").text().includes("Não existem unidades suficientes")) {
                            switchVillage();
                            return;
                        }

                        let url = window.location.href;
                        url = url.substring(0, url.indexOf('&try=confirm'));
                        location.href = url;
                    }

                    confirmAttack();
                } else {
                    runRallyPointHandler();
                }
            }
        }
    }

    function runRallyPointHandler() {
        const attackSettings = getAttackSettings();
        const attackIndex = getAttackIndex();
        const attackerSettings = getAttackerSettings();
        const attackIndexMultiplied = attackIndex * 8;
        const coords = attackSettings.coords.slice(attackIndexMultiplied, attackIndexMultiplied + 8);
        const form = $('form').first();

        sendAttack(form, coords, attackIndex, attackSettings, attackerSettings);
    }

    function sendAttack(form, coords, attackIndex, attackSettings, attackerSettings) {
        fillCoordinates(coords);

        let currentAttackLog = attackLog;
        currentAttackLog.time = new Date().toISOString();
        currentAttackLog.from = game_data.village.coord;
        currentAttackLog.to = game_data.village.coord;

        if (attackSettings.sendFulls) {
            setTimeout(() => {
                sleep(200);
                $("#selectAllUnits").get(0).click();
                sleep(200)
                $("#target_attack").click();
                currentAttackLog.success = true;
                updateAttackIndex(attackSettings, attackerSettings, currentAttackLog);
            }, delay(attackSettings.attackTime, attackSettings.attackDelay));
        } else {
            const sentCount = getSentAttackCount();
            const retry = getRetryCount();

            if (sentCount < attackSettings.attacksPerSource && retry <= attackSettings.maxRetriesPerVillage) {

                fillTroops(form, getTemplateTroops());
                sleep(200);
                setTimeout(() => {
                    $("#target_attack").click();
                    currentAttackLog.success = true;
                    updateAttackIndex(attackSettings, attackerSettings, currentAttackLog);
                }, delay(attackSettings.attackTime, attackSettings.attackDelay));

            } else {
                currentAttackLog.success = false;
                setRetryCount(0);
                switchVillage();
            }
        }

        addAttackLogs(currentAttackLog);
    }

    async function fillCoordinates(coords) {
        console.log("Setting coords: " + coords)
        let coordInput = $("#place_target").find("input");

        coordInput.focus();
        await sleep(200);
        const nativeInput = coordInput[0];
        nativeInput.value = coords;
        nativeInput.dispatchEvent(new Event("input", { bubbles: true }));
        await sleep(200);
        $(".village-item").click();
    }


    function fillTroops(form, troopConfig) {
        for (const [unit, amount] of Object.entries(troopConfig)) {
            form.find(`[name="${unit}"]`).val(amount);
        }
    }

    function getCurrentCoord() {
        const index = getAttackIndex();
        const coords = getAttackSettings().coords.split(/\s+/);
        return coords[index % coords.length];
    }

    function getAttackIndex() {
        return getAttackerSettings().attackIndex;
    }

    function setAttackIndex(index) {
        const attacker = getAttackerSettings();
        attacker.attackIndex = index;
        setAttackerSettings(attacker);
    }

    function addAttackLogs(log) {
        log.description = `${log.success ? '✅' : '❌'} Attack from ${log.from} to ${log.to}`;
        const logs = getAttackLogs();
        logs.push(log);
        setAttackLogs(logs);
    }

    function isConfirmAttackScreen() {
        return location.href.includes("try=confirm") || $('h2:contains("Confirm attack on")').length > 0 || $('h2:contains("Confirmar ataque a")').length > 0;
    }

    function confirmAttack() {
        let attackSettings = getAttackSettings();
        const hasNightBonusWarning = $('.error').toArray().some(e =>
            $(e).text().includes('Bónus noturno ativo') || $(e).text().includes('night bonus')
        );

        if (hasNightBonusWarning) {
            setRetryCount(getRetryCount() + 1);
            const rallyPointLink = $('.quickbar_link[href*="screen=place"]').first();
            if (rallyPointLink.length) {
                window.location.href = rallyPointLink.attr('href');
            }
        } else {
            if (attackSettings.enabled) {
                if (attackSettings.checkDate) {
                    let serverDate = $("#serverDate").text();
                    let serverTime = $("#serverTime").text();
                    let serverDateParsed = parseDateDependingOnFormat(serverDate, serverTime);

                    let minimunDate = parseSettingsDate(attackSettings.minDate)
                    let maximumDate = parseSettingsDate(attackSettings.maxDate)

                    if (!(minimunDate.getTime() <= serverDateParsed.getTime() && maximumDate.getTime() >= serverDateParsed.getTime())) {
                        setRetryCount(getRetryCount() + 1);
                        const rallyPointLink = $('.quickbar_link[href*="screen=place"]').first();
                        if (rallyPointLink.length) {
                            window.location.href = rallyPointLink.attr('href');
                        }
                    }
                }

                $("#troop_confirm_submit").click();
            }
        }
    }


    function getTemplateTroops() {
        let attackSettings = getAttackSettings();
        return attackSettings.selectedTemplate.troops;
    }

    function getSentAttackCount() {
        return $("#commands_outgoings").find("td").has("[data-command-type='attack']").length
    }


    function isRallyPointScreen() {
        return $('h2:contains("Rally point")').length > 0 || $('h2:contains("Praça de Reuniões")').length > 0;
    }

    function addAttackLogs(attackLog) {

        console.log("Adding to logs")
        attackLog.description = attackLog.success
            ? `Attack from ${attackLog.from} to ${attackLog.to} succeeded.`
            : `Attack from ${attackLog.from} to ${attackLog.to} failed.`;

        const logs = getAttackLogs() || [];

        const recent = logs[logs.length - 1];
        if (recent && recent.from === attackLog.from && recent.to === attackLog.to && Math.abs(new Date(recent.time) - new Date(attackLog.time)) < 1000) {
            return;
        }

        logs.push(attackLog);
        setAttackLogs(logs);
    }

    function updateAttackIndex(attackSettings, attackerSettings, currentAttackLog) {
        if (currentAttackLog.success && attackerSettings.attackIndex < attackSettings.attackPerVillage) {
            setAttackIndex(attackerSettings.attackIndex + 1);
        }
    }

    function getAttackIndex() {
        return getAttackerSettings().attackIndex;
    }

    function setAttackIndex(index) {
        let attackerSettings = getAttackerSettings();
        attackerSettings.attackIndex = index;
        setAttackerSettings(attackerSettings);
    }


    function getRetryCount() {
        return getAttackerSettings().retryCount;
    }

    function setRetryCount(count) {
        let attackerSettings = getAttackerSettings();
        attackerSettings.retryCount = count;
        setAttackerSettings(attackerSettings);
    }

    window.TUtils.Attack = {
        runAttackSender,
    }
})();