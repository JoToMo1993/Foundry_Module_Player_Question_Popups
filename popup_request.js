// --- MAIN EXECUTION ---
const SOCKET_NAME = "module.PlayerQuestionPopups";

if (game.user.isGM) {
    const buttons = [
        {
            action: 'inspiration',
            label: 'Send Inspiration',
            callback: () => sendInspiration(),
        },
        {
            action: 'nevermind',
            label: 'Nevermind',
            callback: () => ui.notifications.info("Nothing done"),
        },
        {
            action: 'send',
            label: 'Send',
            callback: (_, button, __) => sendFormular(button),
        }
    ];

    const popupTemplate = `
<table id='formTable' style="margin: 0">
  <tr>
    <td><label for='text'>Frage</label></td>
    <td><input id="text" value="" /></td>
  </tr>
  <tr>
    <td><label for='players'>Players as options</label></td>
    <td><input type="checkbox" id="players" /></td>
  </tr>
  <tr class="players">
    <td><label for='selfSelect'>Players may select themselves</label></td>
    <td><input type="checkbox" id="selfSelect" /></td>
  </tr>
  <tr class="options">
    <td><span>Options</span></td>
    <td><a id="options_add">Add</a></td>
  </tr>
  <tr class="options">
    <td><input id="option_0" value="" /></td>
    <td><a id="option0_remove">Remove</a></td>
  </tr>
</table>
`;
    new foundry.applications.api.DialogV2({
        window: {title: 'Popup request creater'},
        content: popupTemplate,
        buttons,
    }).render(true).then((dialog) => {
        let dialogByIds = [...dialog.element.getElementsByTagName("*")]
            .reduce((acc, cur, _) => {
                if (cur.id) {
                    acc[cur.id] = cur;
                }
                return acc;
            }, {});

        let optionId = 0;
        dialogByIds["players"].onchange = () => {
            if (dialogByIds["players"].checked) {
                [...dialog.element.getElementsByClassName('options')].forEach(el => {
                    el.style.visibility = 'collapse';
                });
                [...dialog.element.getElementsByClassName('players')].forEach(el => {
                    el.style.visibility = 'visible';
                });
            } else {
                [...dialog.element.getElementsByClassName('options')].forEach(el => {
                    el.style.visibility = 'visible';
                });
                [...dialog.element.getElementsByClassName('players')].forEach(el => {
                    el.style.visibility = 'collapse';
                });
            }
        };
        dialogByIds["options_add"].onclick = function () {
            const table = dialogByIds['formTable'];

            const row = table.insertRow(-1);
            optionId++;
            row.id = 'option_' + optionId;
            row.classList.add('options');

            const inputCell = row.insertCell(-1);
            inputCell.innerHTML = `<input id="option_${optionId}" value="" />`;
            const buttonCell = row.insertCell(-1);
            buttonCell.innerHTML = `<a id="option${optionId}_remove">Remove</a>`;

            buttonCell.firstChild.onclick = function () {
                row.remove();
            }
        };
        dialogByIds["option0_remove"].onclick = function () {
            dialogByIds["option0_remove"].parent.remove();
        };
    });
} else {
    ui.notifications.warn("Only the GM should run this macro.");
}

function sendFormular(button) {
    const form = button.form.elements
    const formData = {};

    for (const [key, input] of Object.entries(form)) {
        if (input.tagName === 'BUTTON') {
            continue;
        }
        // not a numbered index
        let properKey = '';
        if (!/^\d+$/.test(key)) {
            properKey = key;
        } else {
            console.log(input, input.id)
            properKey = input.id
        }

        let val;
        if (!input.type || input.type.toLowerCase() !== 'checkbox') {
            val = input.value;
        } else {
            val = input.checked
        }
        formData[properKey] = val;
    }

    let optionsType = 'free';
    let options = [];
    if (formData.players) {
        options = game.users.filter(u => u.active).filter(u => !u.isGM).map(u => u.name);
        if (!formData.selfSelect) {
            optionsType = 'players';
        }
    } else {
        options = Object.keys(formData).filter(key => key.startsWith('option_')).map(key => formData[key])
    }

    const request = {
        content: `<p>${formData.text}</p>`,
        optionsType, options
    }
    sendPopup(request);
}

function sendInspiration() {
    const request = {
        content: `<p>Wer soll Inspiration bekommen?</p>`,
        optionsType: 'players',
        // Build target list dynamically (non-GM users)
        options: game.users.filter(u => u.active).filter(u => !u.isGM).map(u => u.name)
    }
    sendPopup(request);
}

function sendPopup(request) {
    // GM sends socket message to all players
    game.socket.emit(SOCKET_NAME, {
        type: "openSelectionDialog",
        request
    });
    ui.notifications.info("Sent selection dialog to all players.");
}
