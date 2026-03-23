import { clearGameState, loadGameState, saveGameState } from "../storage/gameStorage";
import { CLOCK_CONFIG, GAME_CONFIG } from "../constants";
import type {
  Coords,
  Move,
  Player,
  SerializableClockSnapshot,
  SerializableClockState,
} from "../types";
import type { CheckerModel } from "../models/CheckerModel";
import type { CheckerView } from "../views/CheckerView";
import { GameClock } from "../models/GameClock";
import { MoveHistoryModel } from "../models/MoveHistoryModel";

export class CheckerController {
  #model: CheckerModel;
  #view: CheckerView;

  #selectedCoords: Coords | null = null;
  #availableMoves: Move[] = [];

  #mustContinueCapture = false;

  #forcedCapturePieces: Coords[] = [];

  #gameOver = false;

  #clock: GameClock;
  #clockHistory: SerializableClockSnapshot[] = [];
  #clockIntervalId: number | null = null;

  #moveHistory: MoveHistoryModel = new MoveHistoryModel();

  constructor(model: CheckerModel, view: CheckerView) {
    this.#model = model;
    this.#view = view;
    this.#clock = new GameClock({ enabled: CLOCK_CONFIG.ENABLED, initialMs: CLOCK_CONFIG.INITIAL_TIME_MS, activePlayer: model.turn });
    this.#init();
  }

  #init(): void {
    this.#view.bindCellClick((r, c) => this.#handleCellClick(r, c));
    this.#view.bindUndoClick(() => this.#handleUndo());
    this.#view.bindNewGameClick(() => this.#handleNewGame());
    this.#view.bindMoveHistoryClick((id) => this.#handleHistoryClick(id));
    this.#attachLifecyclePersist();
    this.#restoreFromStorage();
    this.#renderAndSyncUI({ animate: false });
    this.#startClockLoop();
  }

  #restoreFromStorage(): void {
    const saved = loadGameState();
    if (!saved) {
      this.#clock.reset(this.#model.turn);
      return;
    }

    const ok = this.#model.importState(saved);
    if (!ok) {
      clearGameState();
      this.#clock.reset(this.#model.turn);
      return;
    }

    const importedClock = this.#clock.importState(saved.controller?.clock, performance.now(), Date.now());
    if (importedClock) {
      const history = saved.controller?.clock?.history;
      this.#clockHistory = Array.isArray(history) ? (history.filter(this.#isValidClockSnapshot) as SerializableClockSnapshot[]) : [];
    } else {
      this.#clock.reset(this.#model.turn);
      this.#clockHistory = [];
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
    this.#clock.tick();
    const state = this.#model.exportState();

    const controllerState: { captureChain: { active: boolean; piece?: Coords }; clock?: SerializableClockState } = {
      captureChain:
        this.#mustContinueCapture && this.#selectedCoords
          ? { active: true, piece: { ...this.#selectedCoords } }
          : { active: false },
    };

    if (this.#clock.enabled) {
      controllerState.clock = {
        ...this.#clock.exportState(Date.now()),
        history: this.#clockHistory.map((h) => ({ ...h })),
      };
    }

    state.controller = controllerState;
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

    const isFirstActionInTurn = !this.#mustContinueCapture;

    if (isFirstActionInTurn) {
      this.#clock.tick();
      this.#model.pushHistory();
      this.#clockHistory.push(this.#clock.getSnapshot());
    }

    this.#moveHistory.beginIfNeeded(this.#model.turn, from, { isCapture: move.type === "jump" });
    this.#moveHistory.appendStep(to, { isCapture: move.type === "jump" });

    if (move.type === "move") {
      this.#model.applyMove(from, to, move, { switchTurn: true });
      this.#clock.setActivePlayer(this.#model.turn);
      this.#mustContinueCapture = false;
      this.#resetSelection();
      this.#moveHistory.finalizePending();
      this.#view.clearHistoryHighlight();
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

    this.#moveHistory.finalizePending();
    this.#view.clearHistoryHighlight();

    this.#model.endTurn();
    this.#clock.setActivePlayer(this.#model.turn);
    this.#mustContinueCapture = false;
    this.#resetSelection();
    this.#renderAndSyncUI();
    this.#persistToStorage();
  }

  #handleUndo(): void {
    if (!this.#model.undo()) return;

    const hadPending = this.#moveHistory.cancelPending();
    if (!hadPending) this.#moveHistory.popLastEntry();

    this.#moveHistory.setActive(null);
    this.#view.renderMoveHistory(this.#moveHistory.getRenderList(), { activeId: this.#moveHistory.activeId });
    this.#view.clearHistoryHighlight();

    const prevClock = this.#clockHistory.pop();
    if (prevClock) this.#clock.restoreSnapshot(prevClock);
    this.#clock.setActivePlayer(this.#model.turn);
    this.#mustContinueCapture = false;
    this.#resetSelection();
    this.#renderAndSyncUI({ animate: false });
    this.#startClockLoop();
    this.#persistToStorage();
  }

  #handleNewGame(): void {
    this.#model.reset();
    this.#gameOver = false;
    this.#mustContinueCapture = false;
    this.#forcedCapturePieces = [];
    this.#clockHistory = [];

    this.#moveHistory.reset();
    this.#view.renderMoveHistory([], { activeId: this.#moveHistory.activeId });
    this.#view.clearHistoryHighlight();

    this.#clock.reset(this.#model.turn);
    this.#resetSelection();
    this.#renderAndSyncUI({ animate: false });
    this.#startClockLoop();
    this.#persistToStorage();
  }

  #renderAndSyncUI({ animate = true }: { animate?: boolean } = {}): void {
    this.#view.render(this.#model.board, { animate });
    this.#syncClocksUI();
    this.#view.renderMoveHistory(this.#moveHistory.getRenderList(), { activeId: this.#moveHistory.activeId });

    const timeWinner = this.#clock.getWinnerByTime();
    if (timeWinner) {
      this.#gameOver = true;
      this.#mustContinueCapture = false;
      this.#resetSelection();
      this.#forcedCapturePieces = [];
      this.#view.highlightCapturablePieces([]);
      this.#view.setWinner(timeWinner);
      this.#view.setUndoEnabled(this.#model.canUndo());
      this.#view.setNewGameEnabled(true);
      this.#stopClockLoop();
      return;
    }

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
      this.#stopClockLoop();
      return;
    }

    this.#gameOver = false;
    this.#view.setTurn(this.#model.turn);
    if (this.#clock.enabled && !this.#clock.running) this.#clock.start(this.#model.turn);

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

  #startClockLoop(): void {
    if (!this.#clock.enabled) {
      this.#syncClocksUI();
      return;
    }

    this.#stopClockLoop();

    if (!this.#gameOver) this.#clock.start(this.#model.turn);

    this.#clockIntervalId = window.setInterval(() => {
      if (this.#gameOver) return;

      this.#clock.tick();
      this.#syncClocksUI();

      const timeWinner = this.#clock.getWinnerByTime();
      if (!timeWinner) return;

      this.#gameOver = true;
      this.#mustContinueCapture = false;
      this.#resetSelection();
      this.#forcedCapturePieces = [];
      this.#view.highlightCapturablePieces([]);
      this.#view.setWinner(timeWinner);
      this.#view.setUndoEnabled(this.#model.canUndo());
      this.#view.setNewGameEnabled(true);
      this.#stopClockLoop();
      this.#persistToStorage();
    }, CLOCK_CONFIG.TICK_INTERVAL_MS);
  }

  #stopClockLoop(): void {
    if (this.#clockIntervalId !== null) {
      window.clearInterval(this.#clockIntervalId);
      this.#clockIntervalId = null;
    }
    this.#clock.stop();
  }

  #syncClocksUI(): void {
    this.#view.setClocks({
      enabled: this.#clock.enabled,
      whiteMs: this.#clock.getTimeLeftMs(GAME_CONFIG.WHITE_PLAYER),
      blackMs: this.#clock.getTimeLeftMs(GAME_CONFIG.BLACK_PLAYER),
      activePlayer: this.#clock.activePlayer,
    });
  }

  #attachLifecyclePersist(): void {
    window.addEventListener("beforeunload", () => {
      this.#persistToStorage();
    });

    document.addEventListener("visibilitychange", () => {
      if (document.visibilityState !== "hidden") return;
      this.#persistToStorage();
    });
  }

  #isValidClockSnapshot(value: unknown): value is SerializableClockSnapshot {
    if (!value || typeof value !== "object") return false;
    const v = value as Partial<SerializableClockSnapshot>;
    if (typeof v.whiteMs !== "number" || !Number.isFinite(v.whiteMs) || v.whiteMs < 0) return false;
    if (typeof v.blackMs !== "number" || !Number.isFinite(v.blackMs) || v.blackMs < 0) return false;
    if (v.activePlayer !== GAME_CONFIG.WHITE_PLAYER && v.activePlayer !== GAME_CONFIG.BLACK_PLAYER) return false;
    if (typeof v.running !== "boolean") return false;
    return true;
  }

  #handleHistoryClick(id: number): void {
    const entry = this.#moveHistory.getEntry(id);
    if (!entry) return;

    this.#moveHistory.setActive(id);
    this.#view.renderMoveHistory(this.#moveHistory.getRenderList(), { activeId: this.#moveHistory.activeId });
    this.#view.highlightHistoryPath(entry.path);
  }
}
