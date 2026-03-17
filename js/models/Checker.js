export class Checker {
    constructor(color, { id, isKing = false } = {}) {
        this.#id = id;
        this.#color = color;
        this.#isKing = Boolean(isKing);
    }

    #id;
    #color;
    #isKing;

    get id() {
        return this.#id;
    }

    get color() {
        return this.#color;
    }

    get isKing() {
        return this.#isKing;
    }

    promote() {
        if (this.#isKing) return false;
        this.#isKing = true;
        return true;
    }
}
