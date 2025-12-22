// ==UserScript==
// @name         Script Extra Widgets Premium
// @version      4.9.7
// @description  Widgets available: Village Navigation Arrors; Adds a new column on the left of the main screen with: Village List, Notepad, Extra Build Queue(experimental); Maps extra options & Larger map view; Auto-Scavenging; Auto-Train Paladin and auto Paladins Training;
// @author       Giulio Brazzo
// @require      https://github.com/Wekkser/Tribalwars_Script/raw/master/utils.user.js
// @require      https://github.com/Wekkser/Tribalwars_Script/raw/master/custom_css.user.js
// @require      https://github.com/Wekkser/Tribalwars_Script/raw/master/settings_script.user.js
// @require      https://github.com/Wekkser/Tribalwars_Script/raw/master/navigationArrows_script.user.js
// @require      https://github.com/Wekkser/Tribalwars_Script/raw/master/map_script.user.js
// @require      https://github.com/Wekkser/Tribalwars_Script/raw/master/overviewPremiumInfo.user.js
// @require      https://github.com/Wekkser/Tribalwars_Script/raw/master/bot_trainerPaladin.user.js
// @require      https://github.com/Wekkser/Tribalwars_Script/raw/master/bot_scavenging.user.js
// @require      https://github.com/Wekkser/Tribalwars_Script/raw/master/widget_villageList.user.js
// @require      https://github.com/Wekkser/Tribalwars_Script/raw/master/widget_notepad.user.js
// @require      https://github.com/Wekkser/Tribalwars_Script/raw/master/widget_extraBuildQueue.user.js
// @require      https://github.com/Wekkser/Tribalwars_Script/raw/master/widget_recruitTroops.user.js
// @updateURL    https://github.com/Wekkser/Tribalwars_Script/raw/master/main.user.js
// @downloadURL  https://github.com/Wekkser/Tribalwars_Script/raw/master/main.user.js
// @match        https://*.tribals.it/*
// @grant        GM_addStyle
// @grant        GM_xmlhttpRequest
// ==/UserScript==
(function () {
    'use strict';
    init();
    var villageList;
    function init() {
        restoreTimeouts();
        prepareLocalStorageItems();
        if (!document.getElementById('mobileContent')) {
            start();
        }
    }
})();