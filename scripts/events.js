// --- CONFIGURATION ---
const SOCKET_NAME = "module.PlayerQuestionPopups";

// --- INITIALIZE SOCKET HANDLER ---
Hooks.once("ready", async () => {
    if (!game.socket) return;

    console.log("Initialize PlayerQuestionPopups");
    game.socket.on(SOCKET_NAME, async (data) => {
        if (data.type === "openSelectionDialog" && !game.user.isGM) {
            openSelectionDialog(data.request);
        }
    });

    await updateMacros();
});

// --- FUNCTION: Open Popup for Players ---
function openSelectionDialog(request) {
    const buttons = getButtons(request.optionsType, request.options, `${request.content}`);

    new foundry.applications.api.DialogV2({
        window: {title: 'Player Question Popup'},
        content: request.content,
        buttons,
    }).render({force: true});
}

function getButtons(optionType, options, question) {
    // noinspection FallThroughInSwitchStatementJS
    switch (optionType) {
        case "players":
            options = options.filter(o => o !== game.user.name);
        default:
            return options.map(o => {
                return {
                    action: o,
                    label: o,
                    callback: () => handleSelection(o, question),
                }
            });
    }
}

// --- FUNCTION: Handle Button Click (player side) ---
function handleSelection(option, question) {
    const playerUser = game.user;

    ui.notifications.info(`Du hast ${option} gewählt.`);
    notifyGM(playerUser.name, option, question);
}

// --- FUNCTION: GM receives and posts message ---
async function notifyGM(player, option, question) {
    const content = `${question}<span>${player} hat gewählt:</span><h1 style="margin: 0; padding: 0">${option}</h1>`;
    ChatMessage.create({
        content,
        whisper: ChatMessage.getWhisperRecipients("GM"),
        speaker: {alias: "Umfrage Antwort"}
    });
}

const MACROS_CONFIG = [
    {
        name: 'Inspiration / Player Choice',
        version: '1.0.0',
        image: 'player_choice.webp',
        content: 'popup_request.js',
    }
]

async function updateMacros() {
    const pack = game.packs.get("PlayerQuestionPopups.player-question-macros");
    await pack.configure({
        locked: false
    });

    await syncCompendiumMacros(pack);

    await pack.configure({
        locked: true
    });
}

async function syncCompendiumMacros(pack) {
    const documents = await pack.getDocuments();
    for (const macroConfig of MACROS_CONFIG) {
        const existing = documents.find(
            m => m.name === macroConfig.name
        );

        if (existing) {
            // update
            const currentVersion = existing.getFlag('PlayerQuestionPopups', 'version') ?? '';

            if (currentVersion < macroConfig.version) {
                // update
                const content = {
                    command: await loadMacroSource(macroConfig.content),
                    flags: {
                        'PlayerQuestionPopups': {
                            'version': macroConfig.version,
                        }
                    }
                };
                if (!!macroConfig.image) {
                    content.img = `modules/PlayerQuestionPopups/assets/images/${macroConfig.image}`;
                }

                await existing.update(content);
            }
        } else {
            // create
            const content = {
                name: macroConfig.name,
                type: 'script',
                command: await loadMacroSource(macroConfig.content),
                flags: {
                    'PlayerQuestionPopups': {
                        'version': macroConfig.version,
                    }
                }
            };
            if (!!macroConfig.image) {
                content.img = `modules/PlayerQuestionPopups/assets/images/${macroConfig.image}`;
            }
            await Macro.create(content, {
                pack: 'PlayerQuestionPopups.player-question-macros',
            })
        }
    }
}

async function loadMacroSource(filename) {
    const response = await fetch(
        `modules/jotomo_macros/scripts/macros/${filename}`
    );

    if (!response.ok) {
        throw new Error(`Failed to load macro: ${filename}`);
    }

    return response.text();
}
