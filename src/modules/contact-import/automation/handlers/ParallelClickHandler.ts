import { DialogType, ClickResult, ElementMatch } from '../types/DialogTypes';

/**
 * 重试处理器
 * 
 * 提供通用的重试机制，支持指数退避和最大重试限制
 */
export class RetryHandler {
  private maxRetries: number;
  private baseDelay: number;
  private exponentialBackoff: boolean;

  constructor(
    maxRetries: number = 3,
    baseDelay: number = 500,
    exponentialBackoff: boolean = true
  ) {
    this.maxRetries = maxRetries;
    this.baseDelay = baseDelay;
    this.exponentialBackoff = exponentialBackoff;
  }

  /**
   * 执行带重试的异步操作
   */
  public async executeWithRetry<T>(
    operation: () => Promise<T>,
    operationName: string = 'operation'
  ): Promise<T> {
    let lastError: Error;

    for (let attempt = 0; attempt <= this.maxRetries; attempt++) {
      try {
        return await operation();
      } catch (error) {
        lastError = error as Error;
        
        if (attempt === this.maxRetries) {
          throw new Error(
            `${operationName} failed after ${this.maxRetries + 1} attempts. Last error: ${lastError.message}`
          );
        }

        // 计算延迟时间
        const delay = this.exponentialBackoff 
          ? this.baseDelay * Math.pow(2, attempt)
          : this.baseDelay;

        await this.sleep(delay);
      }
    }

    throw lastError!;
  }

  /**
   * 延迟执行
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

/**
 * 并行点击处理器
 * 
 * 支持并发处理多个对话框的点击操作
 */
export class ParallelClickHandler {
  private retryHandler: RetryHandler;
  private timeout: number;

  constructor(timeout: number = 10000, retryHandler?: RetryHandler) {
    this.timeout = timeout;
    this.retryHandler = retryHandler || new RetryHandler(2, 200);
  }

  /**
   * 并行执行点击操作
   * 
   * @param clickOperations 点击操作数组
   * @returns 点击结果数组
   */
  public async executeParallelClicks(
    clickOperations: Array<{
      dialogType: DialogType;
      elementMatch: ElementMatch;
      deviceId: string;
      operation: () => Promise<boolean>;
    }>
  ): Promise<ClickResult[]> {
    const startTime = Date.now();
    
    try {
      // 创建并行执行的Promise数组
      const clickPromises = clickOperations.map(async (op) => {
        return await this.executeSingleClick(op);
      });

      // 使用Promise.allSettled处理并行操作
      // 这样即使某个操作失败，其他操作仍然会继续执行
      const results = await Promise.allSettled(clickPromises);

      // 转换结果格式
      return results.map((result, index) => {
        const operation = clickOperations[index];
        
        if (result.status === 'fulfilled') {
          return result.value;
        } else {
          // 处理失败的操作
          return {
            success: false,
            dialogType: operation.dialogType,
            elementClicked: operation.elementMatch,
            timestamp: Date.now(),
            error: result.reason?.message || 'Unknown error'
          };
        }
      });

    } catch (error) {
      // 创建失败结果数组
      return clickOperations.map(op => ({
        success: false,
        dialogType: op.dialogType,
        elementClicked: op.elementMatch,
        timestamp: Date.now(),
        error: `Parallel execution failed: ${error}`
      }));
    }
  }

  /**
   * 执行单个点击操作
   */
  private async executeSingleClick(operation: {
    dialogType: DialogType;
    elementMatch: ElementMatch;
    deviceId: string;
    operation: () => Promise<boolean>;
  }): Promise<ClickResult> {
    const startTime = Date.now();

    try {
      // 使用重试机制执行点击
      const success = await this.retryHandler.executeWithRetry(
        operation.operation,
        `Click ${operation.dialogType} button`
      );

      return {
        success,
        dialogType: operation.dialogType,
        elementClicked: operation.elementMatch,
        timestamp: Date.now(),
        message: success ? 
          `Successfully clicked ${operation.dialogType} button` :
          `Failed to click ${operation.dialogType} button`
      };

    } catch (error) {
      return {
        success: false,
        dialogType: operation.dialogType,
        elementClicked: operation.elementMatch,
        timestamp: Date.now(),
        error: (error as Error).message
      };
    }
  }

  /**
   * 执行带超时的操作
   */
  public async executeWithTimeout<T>(
    operation: Promise<T>,
    timeoutMs: number = this.timeout
  ): Promise<T> {
    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => {
        reject(new Error(`Operation timed out after ${timeoutMs}ms`));
      }, timeoutMs);
    });

    return Promise.race([operation, timeoutPromise]);
  }

  /**
   * 配置重试处理器
   */
  public configureRetry(maxRetries: number, baseDelay: number, exponentialBackoff: boolean = true): void {
    this.retryHandler = new RetryHandler(maxRetries, baseDelay, exponentialBackoff);
  }

  /**
   * 设置超时时间
   */
  public setTimeout(timeout: number): void {
    this.timeout = timeout;
  }
}