interface HistoryState {
  nodes: any[];
  connections: any[];
}

export class HistoryManager {
  private history: HistoryState[] = [];
  private currentIndex: number = -1;
  private maxHistory: number = 50;

  push(state: HistoryState): void {
    // Remove any future states if we're not at the end
    if (this.currentIndex < this.history.length - 1) {
      this.history = this.history.slice(0, this.currentIndex + 1);
    }

    // Add new state
    this.history.push(JSON.parse(JSON.stringify(state)));
    this.currentIndex++;

    // Limit history size
    if (this.history.length > this.maxHistory) {
      this.history.shift();
      this.currentIndex--;
    }
  }

  undo(): HistoryState | null {
    if (!this.canUndo()) return null;
    this.currentIndex--;
    return this.getCurrent();
  }

  redo(): HistoryState | null {
    if (!this.canRedo()) return null;
    this.currentIndex++;
    return this.getCurrent();
  }

  canUndo(): boolean {
    return this.currentIndex > 0;
  }

  canRedo(): boolean {
    return this.currentIndex < this.history.length - 1;
  }

  getCurrent(): HistoryState | null {
    if (this.currentIndex >= 0 && this.currentIndex < this.history.length) {
      return JSON.parse(JSON.stringify(this.history[this.currentIndex]));
    }
    return null;
  }

  clear(): void {
    this.history = [];
    this.currentIndex = -1;
  }

  getHistoryInfo(): { current: number; total: number } {
    return {
      current: this.currentIndex,
      total: this.history.length,
    };
  }
}
