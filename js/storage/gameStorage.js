const STORAGE_KEY = "checkers.gameState.v1";

export function loadGameState() {
    try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (!raw) return null;
        const parsed = JSON.parse(raw);
        if (!parsed || typeof parsed !== "object") return null;
        if (parsed.version !== 1) return null;
        return parsed;
    } catch {
        return null;
    }
}

export function saveGameState(state) {
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
        return true;
    } catch {
        return false;
    }
}

export function clearGameState() {
    try {
        localStorage.removeItem(STORAGE_KEY);
        return true;
    } catch {
        return false;
    }
}

