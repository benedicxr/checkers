import { CheckerModel } from "./models/CheckerModel";
import { CheckerView } from "./views/CheckerView";
import { CheckerController } from "./controllers/CheckerController";

document.addEventListener("DOMContentLoaded", () => {
  const model = new CheckerModel();
  const view = new CheckerView("board-game", {
    turnElementId: "turn-indicator",
    undoButtonId: "undo-btn",
    newGameButtonId: "new-game-btn",
  });
  new CheckerController(model, view);
});
