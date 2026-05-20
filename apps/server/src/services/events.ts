type Listener = (data: unknown) => void;

class EventHub {
  private listeners = new Map<string, Set<Listener>>();

  subscribe(event: string, listener: Listener): () => void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event)!.add(listener);
    return () => this.listeners.get(event)?.delete(listener);
  }

  publish(event: string, data: unknown): void {
    this.listeners.get(event)?.forEach((fn) => fn(data));
  }
}

export const eventHub = new EventHub();
