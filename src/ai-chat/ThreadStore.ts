import type { Listener, Message } from "@/ai-chat/types";
import { MessageStatus } from "./types";

export class ObservableThreadStore {
  private messages: Message[] = [];
  private listeners = new Set<Listener>();

  public getSnapshot = (): Message[] => this.messages;

  public subscribe = (listener: Listener): (() => void) => {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  };

  public appendMessage(message: Message): void {
    this.messages = [...this.messages, message];
    this.notify();
  }

  public updateMessage(
    id: string,
    update: (message: Message) => Message,
  ): boolean {
    if (!this.messages.some((message) => message.id === id)) return false;
    this.messages = this.messages.map((message) =>
      message.id === id ? update(message) : message,
    );
    this.notify();
    return true;
  }

  public hydrate(messages: Message[]): void {
    this.messages = messages.map((message) =>
      message.status === MessageStatus.Loading ||
      message.status === MessageStatus.Streaming
        ? { ...message, status: MessageStatus.Interrupted }
        : message,
    );
    this.notify();
  }

  private notify(): void {
    this.listeners.forEach((listener) => {
      listener();
    });
  }
}
