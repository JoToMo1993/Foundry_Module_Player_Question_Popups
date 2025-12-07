// --- CONFIGURATION ---
const SOCKET_NAME = "module.PlayerQuestionPopups";

// --- INITIALIZE SOCKET HANDLER ---
Hooks.once("ready", () => {
    if (!game.socket) return;

    console.log("Initialize PlayerQuestionPopups");
    game.socket.on(SOCKET_NAME, async (data) => {
        if (data.type === "openSelectionDialog" && !game.user.isGM) {
            openSelectionDialog(data.request);
        }
    });
});

// --- FUNCTION: Open Popup for Players ---
function openSelectionDialog(request) {
    const buttons = getButtons(request.optionsType, request.options,
        `<p>${request.title}<br />${request.content.replace(/<[^>]*>/g, '')}</p>`);

    new foundry.applications.api.DialogV2({
        window: {title: request.title},
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