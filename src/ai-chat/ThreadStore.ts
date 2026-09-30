import type { Listener, Message } from "@/ai-chat/types";
import { MessageStatus } from "./types";

export class ObservableThreadStore {
  private messages: Message[];
  private listeners: Set<Listener>;

  constructor({ messages = [], listeners = new Set<Listener>() } = {}) {
    this.messages = messages;
    this.listeners = listeners;
  }

  private getActive(): Message | undefined {
    return this.messages[this.messages.length - 1];
  }

  private setActive(newMessage: Message) {
    this.messages = [
      ...this.messages.slice(0, this.messages.length - 1),
      newMessage,
    ];
  }

  public getSnapshot = (): Message[] => {
    return this.messages;
  };

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

  public appendChunkToActive(chunk: string): void {
    const active = this.getActive();
    if (active) {
      this.setActive({
        ...active,
        content: active.content + chunk,
        status: MessageStatus.Streaming,
      });
      this.notify();
    }
  }

  public markActiveDone(): void {
    const active = this.getActive();
    if (active) {
      this.setActive({
        ...active,
        status: MessageStatus.Done,
      });
      this.notify();
    }
  }

  public setError(error: string): void {
    const active = this.getActive();
    if (active) {
      this.setActive({
        ...active,
        status: MessageStatus.Error,
        content: error,
      });
      this.notify();
    }
  }

  public resetActive(): void {
    const active = this.getActive();
    if (active) {
      this.setActive({
        ...active,
        content: "",
        status: MessageStatus.Loading,
      });
      this.notify();
    }
  }

  // Internal Helper
  private notify(): void {
    this.listeners.forEach((l) => {
      l();
    });
  }
}
