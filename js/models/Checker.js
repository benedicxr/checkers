export class Checker {
    constructor(color, { id, isKing = false } = {}) {
        this.id = id;
        this.color = color;
        this.isKing = isKing;
    }
}

