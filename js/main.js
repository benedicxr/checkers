import {CheckerModel} from "./models/CheckerModel.js";
import {CheckerView} from "./views/CheckerView.js";
import {CheckerController} from "./controllers/CheckerController.js";

document.addEventListener('DOMContentLoaded', () => {
    const model = new CheckerModel();
    const view = new CheckerView('board-game', {
        turnElementId: 'turn-indicator',
        undoButtonId: 'undo-btn',
        newGameButtonId: 'new-game-btn',
    });
    const controller = new CheckerController(model, view);
});
