// Nomi livelli di scavenger
const SCAVENGE_NAMES = ["Razziatore svogliato", "Trasportatori Umili", "Rovistamento astuto", "Ottimi Raccoglitori"];
// Capacità delle unità (per eventuali calcoli)
const UNIT_CAPACITY = {
    spear: 25,
    sword: 15,
    axe: 10,
    light: 80,
    heavy: 50,
    knight: 100
};

const SCAVENGE_FACTORS = {
    1: 7.5,   // Razziatore svogliato
    2: 3, // Trasportatori Umili
    3: 1.5,   // Rovistamento astuto
    4: 1    // Ottimi Raccoglitori
};

let autoScavengingActive = localStorage.getItem('autoScavengingActive') === 'true';
if (autoScavengingActive) {
    startAutoScavengingLoop();
}

function waitForScavengeTable(callback) {
    const interval = setInterval(() => {
        const table = document.querySelector('.candidate-squad-widget tbody');
        if (table) {
            clearInterval(interval);
            callback(table);
        }
    }, 100);
}

let waitScavengeText = null; // riferimento globale alla cella di stato
let waitBuildingText = null;

function injectAutoScavengingOption() {
    waitForScavengeTable(function (tbody) {

        if (document.getElementById('auto_scavenging_control')) return;

        const tr = document.createElement('tr');
        tr.id = 'auto_scavenging_control';

        const options = [1, 2, 3, 4];
        const checkboxes = {};

        options.forEach(opt => {
            const td = document.createElement('td');

            const cb = document.createElement('input');
            cb.type = 'checkbox';
            cb.checked = true;
            cb.dataset.option = opt;

            checkboxes[opt] = cb;

            const label = document.createElement('label');
            label.style.cursor = 'pointer';
            label.appendChild(cb);
            label.appendChild(document.createTextNode(` R${opt}`));

            td.appendChild(label);
            tr.appendChild(td);
        });

        /* TD CONTROLLO */
        const controlTd = document.createElement('td');
        controlTd.classList.add('squad-village-required');

        const btn = document.createElement('a');
        btn.href = '#';
        btn.classList.add('btn', 'current-quest');

        const indicator = document.createElement('span');
        indicator.classList.add('scavenge-indicator');

        function updateUI() {
            if (autoScavengingActive) {
                btn.textContent = 'Stop Auto Scavenge';
                indicator.classList.add('active');
                indicator.title = 'Auto Scavenge attivo';
            } else {
                btn.textContent = 'Start Auto Scavenge';
                indicator.classList.remove('active');
                indicator.title = 'Auto Scavenge disattivato';
            }
        }

        btn.onclick = function (e) {
            e.preventDefault();

            if (!autoScavengingActive) {
                const selected = Object.values(checkboxes)
                    .filter(cb => cb.checked)
                    .map(cb => Number(cb.dataset.option));

                if (!selected.length) {
                    showAutoHideBox('Select at least one rovistamento', true);
                    return;
                }

                autoScavengingActive = true;
                localStorage.setItem('autoScavengingActive', 'true');
                startAutoScavengingLoop(selected);
            } else {
                autoScavengingActive = false;
                localStorage.setItem('autoScavengingActive', 'false');
                stopAutoScavengingLoop();
            }

            updateUI();
        };

        updateUI();

        controlTd.appendChild(btn);
        controlTd.appendChild(indicator);
        tr.appendChild(controlTd);

        /* TD per countdown */
        waitScavengeText = document.createElement('td');
        waitScavengeText.id = 'waitScavengeTextTd';
        waitScavengeText.style.fontWeight = 'bold';
        waitScavengeText.colSpan = 2;
        tr.appendChild(waitScavengeText);

        /* TD per countdown */
        waitBuildingText = document.createElement('td');
        waitBuildingText.id = 'waitBuildingTextTd';
        waitBuildingText.style.fontWeight = 'bold';
        waitBuildingText.colSpan = 1;
        tr.appendChild(waitBuildingText);

        tbody.appendChild(tr);
    });
}

// Ottieni unità disponibili dalla pagina
function getUnitsAvailable() {
    const units = {};
    document.querySelectorAll('.units-entry-all.squad-village-required').forEach(a => {
        const type = a.getAttribute('data-unit');
        const count = parseInt(a.textContent.replace(/[()]/g,'')) || 0;
        units[type] = count;
    });
    return units;
}

// Ottieni i slot scavenger dalla pagina
function getScavengeSlots() {
    const slots = [];
    SCAVENGE_NAMES.forEach((name, index) => {
        const container = Array.from(document.querySelectorAll('.scavenge-option')).find(c => c.querySelector('.title')?.textContent.trim() === name);
        if (!container) return;
        const countdown = container.querySelector('.return-countdown');
        const unlockButton = container.querySelector('.locked-view');
        slots.push({
            slotId: index + 1, // 1..4
            name: name,
            busy: !!countdown || !!unlockButton, 
            unitsAvailable: getUnitsAvailable(),
            returnCountdownSec: countdown ? parseCountdown(countdown.textContent) : 0,
            container: container,
            factor: SCAVENGE_FACTORS[index + 1] || 1
        });
    });
    return slots;
}

// Parse countdown hh:mm:ss / mm:ss
function parseCountdown(text) {
    const parts = text.trim().split(':').map(Number);
    if (parts.length === 3) return parts[0]*3600 + parts[1]*60 + parts[2];
    if (parts.length === 2) return parts[0]*60 + parts[1];
    return parts[0] || 0;
}

// Invia una singola richiesta scavenging via AJAX (sicura con CSRF e cookie)
async function sendScavengeAjax(slot, units) {
    const carry = Object.entries(units)
        .reduce((s, [u, c]) => s + (UNIT_CAPACITY[u] || 0) * c, 0);

    const body = new URLSearchParams();
    body.append("h", game_data.csrf);
    body.append("squad_requests[0][village_id]", game_data.village.id);
    body.append("squad_requests[0][option_id]", slot.slotId);
    body.append("squad_requests[0][use_premium]", "false");
    body.append("squad_requests[0][candidate_squad][carry_max]", carry);

    for (const [u, c] of Object.entries(units)) {
        body.append(`squad_requests[0][candidate_squad][unit_counts][${u}]`, c);
    }

    try {
        const res = await fetch(game_data.link_base_pure + "scavenge_api&ajaxaction=send_squads", {
            method: "POST",
            credentials: "include", // importantissimo per inviare cookie di sessione
            headers: {
                "tribalwars-ajax": "1",
                "x-requested-with": "XMLHttpRequest",
                "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8"
            },
            referrer: game_data.link_base_pure + "place&mode=scavenge",
            body
        });

        const text = await res.text();
        let resp;
        try { resp = JSON.parse(text); } 
        catch (err) { console.error('Errore parsing JSON:', text); return; }

        if (resp.squad_responses?.[0]?.success === false) {
            console.warn(`Slot ${slot.slotId} errore:`, resp.squad_responses[0].error);
        } else {
            console.log(`Slot ${slot.slotId} inviato`);
        }
    } catch (err) {
        console.error(`Errore invio slot ${slot.slotId}:`, err);
    }
}

// Distribuisce unità in base al carry_max dei rovistamenti disponibili e ai fattori di peso
function distributeUnitsProportionalFixed(unitsAvailable, slots) {
    // calcola il totale dei pesi dei slot disponibili
    const totalWeight = slots.reduce((sum, s) => sum + (SCAVENGE_FACTORS[s.slotId] || 1), 0);

    const plan = {};

    // inizializza plan per ogni slot
    slots.forEach(slot => plan[slot.slotId] = {});

    // distribuisci ogni tipo di unità proporzionalmente ai pesi dei slot
    Object.entries(unitsAvailable).forEach(([unit, count]) => {
        slots.forEach(slot => {
            const weight = SCAVENGE_FACTORS[slot.slotId] || 1;
            plan[slot.slotId][unit] = Math.floor(count * (weight / totalWeight));
        });
    });

    return plan;
}

async function startAutoScavengingLoop() {
    await waitForGameReady();
    await waitForWaitTd();

    if (game_data.screen !== "place") {
        console.log("Non sono in scavenge, loop sospeso");
        return;
    }

    while (autoScavengingActive) {
        const slots = getScavengeSlots();
        const freeSlots = slots.filter(s => !s.busy);

        if (freeSlots.length) {
            const unitsAvailable = getUnitsAvailable();
            const plan = distributeUnitsProportionalFixed(unitsAvailable, freeSlots);

            for (const slot of freeSlots) {
                if (!slot.busy){
                    await sendScavengeAjax(slot, plan[slot.slotId]);
                    showAutoHideBox(`Slot ${slot.slotId} inviato`, true);
                    console.log(`Slot ${slot.slotId} inviato`);

                    slot.busy = true;
                    console.log(`Rovistamento n:${slot.slotId} inviato`);
                    // jitter umano tra invii
                    const jitter = 800 + Math.random() * 1200;
                    await new Promise(r => setTimeout(r, jitter));
                }
            }

            showAutoHideBox(`Tutti i rovistamenti inviati`, true);
            sendTelegramMessage(`✅ Rovistamenti inviato!`);
            console.log(`Tutti inviati`);
            
            const jitter = 800 + Math.random() * 1200;
            await new Promise(r => setTimeout(r, jitter));
            location.reload();

        } else {
            const buildingQueue = JSON.parse(localStorage.getItem('building_queue') || '[]');
            const now = Date.now();
            const nextSlot = parseInt(localStorage.getItem('building_queue_next_slot') || '0') - now;

            // Nessun slot libero: calcola tempo minimo di attesa
            const countdowns = slots.map(s => s.returnCountdownSec).filter(t => t > 0);
            let minScavenge = countdowns.length ? Math.min(...countdowns) : 30; // default 30s
            minScavenge += 10 + Math.random() * 5;

            // Countdown dinamico
            let remainingScavengeTime = minScavenge;
            let remainingBuildingTime = nextSlot;

            let waitScavenge = "Scavenge";
            let waitBuilding = "Building";

            while (remainingScavengeTime > 0 && autoScavengingActive) {
                waitScavengeText.textContent = `Prossimo ${waitScavenge}: ${secondsToHMS(remainingScavengeTime)}`;
                
                if (buildingQueue.length != 0 && remainingBuildingTime > 0) {
                    waitBuildingText.textContent = `Prossimo ${waitBuilding}: ${formatQeueNextSlot(remainingBuildingTime)}`;
                }
                await new Promise(r => setTimeout(r, 1000));
                remainingScavengeTime--;
                remainingBuildingTime -= 1000;
            }
        }

    }

    console.log('Auto Scavenging fermato');
}

async function waitForWaitTd() {
    while (!waitScavengeText) {
        await new Promise(r => setTimeout(r, 50)); // check ogni 50ms
    }
    return waitScavengeText;
}

// Ferma loop
function stopAutoScavengingLoop() {
    if(autoScavengingActive){
        autoScavengingActive = false;
        localStorage.removeItem('autoScavengingActive');
        console.log("autoScavenging disattivato");
    }else{
        showAutoHideBox('Auto Scavenging non attivo', true);
    }
}

// --------- TIME FUNCTIONS ----------- //
function hmsToMs(ms){
    const [h, m, s] = ms.split(':').map(Number);
    return (h * 3600 + m * 60 + s) * 1000;
}

function hmsToSeconds(hms) {
    const [h, m, s] = hms.split(':').map(Number);
    return h * 3600 + m * 60 + s;
}

function msToHMS(ms) {
    ms = Math.max(0, ms);

    const totalSeconds = Math.floor(ms / 1000);
    const h = Math.floor(totalSeconds / 3600);
    const m = Math.floor((totalSeconds % 3600) / 60);
    const s = totalSeconds % 60;

    return [
        h.toString().padStart(2, '0'),
        m.toString().padStart(2, '0'),
        s.toString().padStart(2, '0')
    ].join(':');
}

function secondsToHMS(sec) {
    sec = Math.max(0, Math.floor(sec));
    const h = Math.floor(sec / 3600);
    const m = Math.floor((sec % 3600) / 60);
    const s = sec % 60;

    return [
        h.toString().padStart(2, '0'),
        m.toString().padStart(2, '0'),
        s.toString().padStart(2, '0')
    ].join(':');
}

function formatQeueNextSlot(remainingTime){
    const totalSeconds = Math.max(0, Math.floor(remainingTime / 1000));
    return secondsToHMS(totalSeconds);
}

// --------- ------------- ------------ //

function waitForGameReady() {
    return new Promise(resolve => {
        const check = () => {
            if (typeof game_data === "undefined") {
                setTimeout(check, 100);
                return;
            }

            const screen = game_data.screen;

            // segnali di ready per screen diversi
            const ready =
                document.readyState === "complete" &&
                (
                    // rovistamenti
                    (screen === "scavenge" && $("#scavenge_screen").length) ||

                    // overview villaggio
                    (screen === "overview" && $("#overviewtable").length) ||

                    // table
                    (screen === "scavenge" && $("#auto_scavenging_control.lastChild")) ||

                    // fallback generico
                    $(".maincell").length
                );

            if (ready) {
                resolve();
            } else {
                setTimeout(check, 100);
            }
        };

        check();
    });
}

// Funzione headless che invia l'edificio al server
function callUpgradeBuildingHeadless(buildId) {
    if (!buildId) return;

    $.ajax({
        url: `${game_data.link_base_pure}main&action=upgrade_building&id=${buildId}&type=main&h=${game_data.csrf}`,
        type: 'GET',
        success: function () {
            console.log(`Edificio ${buildId} inviato per costruzione (headless).`);
            localStorage.setItem('waiting_for_queue', JSON.stringify({}));
        },
        error: function (xhr, status, error) {
            console.error(`Errore upgrade edificio ${buildId}:`, status, error);
        }
    });
}

function sendTelegramMessage(message) {
    if (TG_TOKEN && TG_CHAT_ID){
        fetch(`https://api.telegram.org/bot${TG_TOKEN}/sendMessage`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                chat_id: TG_CHAT_ID,
                text: message,
                parse_mode: "HTML" // opzionale, puoi usare HTML per formattare
            })
        }).catch(err => console.error("Errore Telegram:", err));    
    }
}


async function fetchBuildingCostsFromMain(villageId) {
    if (!villageId) return {};

    try {
        const res = await fetch(`${game_data.link_base_pure}game.php?village=${villageId}&screen=main`, {
            credentials: "include",
            headers: {
                "x-requested-with": "XMLHttpRequest"
            }
        });

        const text = await res.text();
        const parser = new DOMParser();
        const doc = parser.parseFromString(text, "text/html");

        const costs = {};

        doc.querySelectorAll("[id^='main_buildrow_']").forEach(row => {
            const id = row.id.replace("main_buildrow_", "");
            const tds = row.querySelectorAll("td");

            if (tds.length > 2) {
                const wood = parseInt(row.querySelector(".cost_wood")?.getAttribute("data-cost") || "0", 10);
                const stone = parseInt(row.querySelector(".cost_stone")?.getAttribute("data-cost") || "0", 10);
                const iron = parseInt(row.querySelector(".cost_iron")?.getAttribute("data-cost") || "0", 10);
                const time = tds[4]?.innerText.trim() || "";
                const population = tds[5]?.innerText.trim() || "";

                costs[id] = { wood, stone, iron, time, population };
            }
        });

        localStorage.setItem('nextLevelBuildsQueueInfo', JSON.stringify(costs));
        return costs;
    } catch (err) {
        console.error("Errore fetch building costs from main:", err);
        return {};
    }
}
