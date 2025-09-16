/**
 * 事件管理器 - 简单的发布订阅模式实现
 */
export class EventManager {
  private listeners: Map<string, Function[]> = new Map();

  /**
   * 监听事件
   */
  on(eventName: string, callback: Function): () => void {
    if (!this.listeners.has(eventName)) {
      this.listeners.set(eventName, []);
    }
    
    this.listeners.get(eventName)!.push(callback);
    
    // 返回取消监听的函数
    return () => {
      this.off(eventName, callback);
    };
  }

  /**
   * 取消监听
   */
  off(eventName: string, callback: Function): void {
    const callbacks = this.listeners.get(eventName);
    if (callbacks) {
      const index = callbacks.indexOf(callback);
      if (index > -1) {
        callbacks.splice(index, 1);
      }
      
      // 如果没有监听者了，删除这个事件
      if (callbacks.length === 0) {
        this.listeners.delete(eventName);
      }
    }
  }

  /**
   * 发送事件
   */
  emit(eventName: string, data?: any): void {
    const callbacks = this.listeners.get(eventName);
    if (callbacks) {
      callbacks.forEach(callback => {
        try {
          callback(data);
        } catch (error) {
          console.error(`事件回调执行失败 [${eventName}]:`, error);
        }
      });
    }
  }

  /**
   * 一次性监听事件
   */
  once(eventName: string, callback: Function): () => void {
    const onceCallback = (data: any) => {
      callback(data);
      this.off(eventName, onceCallback);
    };
    
    return this.on(eventName, onceCallback);
  }

  /**
   * 移除所有监听者
   */
  removeAllListeners(eventName?: string): void {
    if (eventName) {
      this.listeners.delete(eventName);
    } else {
      this.listeners.clear();
    }
  }

  /**
   * 获取事件的监听者数量
   */
  listenerCount(eventName: string): number {
    const callbacks = this.listeners.get(eventName);
    return callbacks ? callbacks.length : 0;
  }

  /**
   * 获取所有事件名称
   */
  eventNames(): string[] {
    return Array.from(this.listeners.keys());
  }
}