import { clearGameState, loadGameState, saveGameState } from "../storage/gameStorage";
import type { Coords, Move } from "../types";
import type { CheckerModel } from "../models/CheckerModel";
import type { CheckerView } from "../views/CheckerView";

export class CheckerController {
  #model: CheckerModel;
  #view: CheckerView;

  #selectedCoords: Coords | null = null;
  #availableMoves: Move[] = [];

  #mustContinueCapture = false;

  #forcedCapturePieces: Coords[] = [];

  #gameOver = false;

  constructor(model: CheckerModel, view: CheckerView) {
    this.#model = model;
    this.#view = view;
    this.#init();
  }

  #init(): void {
    this.#view.bindCellClick((r, c) => this.#handleCellClick(r, c));
    this.#view.bindUndoClick(() => this.#handleUndo());
    this.#view.bindNewGameClick(() => this.#handleNewGame());
    this.#restoreFromStorage();
    this.#renderAndSyncUI({ animate: false });
  }

  #restoreFromStorage(): void {
    const saved = loadGameState();
    if (!saved) return;

    const ok = this.#model.importState(saved);
    if (!ok) {
      clearGameState();
      return;
    }

    const chain = saved.controller?.captureChain;
    if (!chain || !chain.active) return;

    const r = chain.piece?.r;
    const c = chain.piece?.c;
    if (r == null || c == null) return;
    if (!Number.isInteger(r) || !Number.isInteger(c)) return;

    const piece = this.#model.getPiece(r, c);
    if (!piece || piece.color !== this.#model.turn) return;

    const nextCaptures = this.#model.getCaptures(r, c);
    if (nextCaptures.length === 0) return;

    this.#mustContinueCapture = true;
    this.#selectedCoords = { r, c };
    this.#availableMoves = nextCaptures;
  }

  #persistToStorage(): void {
    const state = this.#model.exportState();
    state.controller = {
      captureChain:
        this.#mustContinueCapture && this.#selectedCoords
          ? { active: true, piece: { ...this.#selectedCoords } }
          : { active: false },
    };
    saveGameState(state);
  }

  #handleCellClick(row: number, col: number): void {
    if (this.#gameOver) return;

    const clickedMove = this.#availableMoves.find((m) => m.r === row && m.c === col);
    if (clickedMove) {
      this.#applyMove(clickedMove, { r: row, c: col });
      return;
    }

    if (this.#mustContinueCapture) {
      return;
    }

    const piece = this.#model.getPiece(row, col);
    if (!piece || piece.color !== this.#model.turn) {
      this.#resetSelection();
      return;
    }

    const mustCapture = this.#model.playerHasCapture(this.#model.turn);
    if (mustCapture) {
      const canThisCapture = this.#forcedCapturePieces.some((p) => p.r === row && p.c === col);
      if (!canThisCapture) {
        this.#resetSelection();
        return;
      }
    }

    this.#selectedCoords = { r: row, c: col };
    this.#availableMoves = this.#model.getValidMoves(row, col, { mustCapture });

    this.#view.highlightCell(row, col);
    this.#view.highlightMoves(this.#availableMoves);
  }

  #applyMove(move: Move, to: Coords): void {
    const from = this.#selectedCoords;
    if (!from) return;

    if (!this.#mustContinueCapture) {
      this.#model.pushHistory();
    }

    if (move.type === "move") {
      this.#model.applyMove(from, to, move, { switchTurn: true });
      this.#mustContinueCapture = false;
      this.#resetSelection();
      this.#renderAndSyncUI();
      this.#persistToStorage();
      return;
    }

    this.#model.applyMove(from, to, move, { switchTurn: false });
    this.#selectedCoords = { r: to.r, c: to.c };

    const nextCaptures = this.#model.getCaptures(to.r, to.c);
    if (nextCaptures.length > 0) {
      this.#mustContinueCapture = true;
      this.#availableMoves = nextCaptures;
      this.#renderAndSyncUI();
      this.#view.highlightCell(to.r, to.c);
      this.#view.highlightMoves(this.#availableMoves);
      this.#view.highlightCapturablePieces([{ r: to.r, c: to.c }]);
      this.#persistToStorage();
      return;
    }

    this.#model.endTurn();
    this.#mustContinueCapture = false;
    this.#resetSelection();
    this.#renderAndSyncUI();
    this.#persistToStorage();
  }

  #handleUndo(): void {
    if (!this.#model.undo()) return;
    this.#mustContinueCapture = false;
    this.#resetSelection();
    this.#renderAndSyncUI({ animate: false });
    this.#persistToStorage();
  }

  #handleNewGame(): void {
    this.#model.reset();
    this.#gameOver = false;
    this.#mustContinueCapture = false;
    this.#forcedCapturePieces = [];
    this.#resetSelection();
    this.#renderAndSyncUI({ animate: false });
    this.#persistToStorage();
  }

  #renderAndSyncUI({ animate = true }: { animate?: boolean } = {}): void {
    this.#view.render(this.#model.board, { animate });

    const winner = this.#model.getWinner();
    if (winner) {
      this.#gameOver = true;
      this.#mustContinueCapture = false;
      this.#resetSelection();
      this.#forcedCapturePieces = [];
      this.#view.highlightCapturablePieces([]);
      this.#view.setWinner(winner);
      this.#view.setUndoEnabled(this.#model.canUndo());
      this.#view.setNewGameEnabled(true);
      return;
    }

    this.#gameOver = false;
    this.#view.setTurn(this.#model.turn);

    if (this.#mustContinueCapture && this.#selectedCoords) {
      this.#forcedCapturePieces = [];
      this.#view.highlightCapturablePieces([{ ...this.#selectedCoords }]);
    } else {
      const mustCapture = this.#model.playerHasCapture(this.#model.turn);
      this.#forcedCapturePieces = mustCapture ? this.#model.getCapturingPieces(this.#model.turn) : [];
      this.#view.highlightCapturablePieces(mustCapture ? this.#forcedCapturePieces : []);
    }

    this.#view.setUndoEnabled(this.#model.canUndo());
    this.#view.setNewGameEnabled(true);

    if (this.#selectedCoords) {
      this.#view.highlightCell(this.#selectedCoords.r, this.#selectedCoords.c);
      this.#view.highlightMoves(this.#availableMoves);
    } else {
      this.#view.highlightCell(null, null);
      this.#view.highlightMoves([]);
    }
  }

  #resetSelection(): void {
    this.#selectedCoords = null;
    this.#availableMoves = [];
    this.#view.highlightCell(null, null);
    this.#view.highlightMoves([]);
  }
}
