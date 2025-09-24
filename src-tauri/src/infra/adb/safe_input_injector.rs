use anyhow::Result;
use tokio::time::{sleep, Duration};
use tracing::{info, warn, error};
use super::input_injector::InputInjector;

/// 为任意 InputInjector 增加轻量重试与间隔的装饰器。
pub struct SafeInputInjector<I: InputInjector + Send + Sync> {
    inner: I,
    retries: usize,
    delay_ms: u64,
}

impl<I: InputInjector + Send + Sync> SafeInputInjector<I> {
    pub fn new(inner: I) -> Self {
        // 默认 2 次重试（共尝试 3 次），每次间隔 120ms，可按需扩展成从环境变量读取
        Self { inner, retries: 2, delay_ms: 120 }
    }

    /// 根据环境变量构建重试策略：
    /// - `INJECTOR_RETRIES`: usize，默认 2（即最多重试 2 次）
    /// - `INJECTOR_DELAY_MS`: u64，默认 120（两次尝试间的毫秒数）
    pub fn from_env(inner: I) -> Self {
        let retries = std::env::var("INJECTOR_RETRIES")
            .ok()
            .and_then(|v| v.parse::<usize>().ok())
            .unwrap_or(2);
        let delay_ms = std::env::var("INJECTOR_DELAY_MS")
            .ok()
            .and_then(|v| v.parse::<u64>().ok())
            .unwrap_or(120);
        Self { inner, retries, delay_ms }
    }

    pub fn with_policy(mut self, retries: usize, delay_ms: u64) -> Self {
        self.retries = retries;
        self.delay_ms = delay_ms;
        self
    }

    async fn retry<F, Fut, T>(&self, operation_name: &str, mut f: F) -> Result<T>
    where
        F: FnMut() -> Fut,
        Fut: std::future::Future<Output = Result<T>>,
    {
        let mut attempt = 0usize;
        let total_attempts = self.retries + 1; // 总尝试次数 = 重试次数 + 1
        
        info!("🛡️ 开始安全注入执行: {} (最多{}次尝试)", operation_name, total_attempts);
        
        loop {
            let current_attempt = attempt + 1;
            info!("🛡️ 执行第{}/{}次尝试: {}", current_attempt, total_attempts, operation_name);
            
            match f().await {
                Ok(v) => {
                    if attempt > 0 {
                        info!("✅ 安全注入重试成功: {} (第{}次尝试)", operation_name, current_attempt);
                    } else {
                        info!("✅ 安全注入首次成功: {}", operation_name);
                    }
                    return Ok(v);
                }
                Err(e) => {
                    if attempt >= self.retries {
                        error!("❌ 安全注入最终失败: {} (已尝试{}次) - 错误: {}", 
                              operation_name, total_attempts, e);
                        return Err(anyhow::anyhow!("安全注入器失败 ({}次尝试): {}", total_attempts, e));
                    }
                    
                    warn!("⚠️ 安全注入第{}次失败: {} - 错误: {} ({}ms后重试)", 
                          current_attempt, operation_name, e, self.delay_ms);
                    attempt += 1;
                    sleep(Duration::from_millis(self.delay_ms)).await;
                }
            }
        }
    }
}

#[async_trait::async_trait]
impl<I: InputInjector + Send + Sync> InputInjector for SafeInputInjector<I> {
    async fn tap(&self, serial: &str, x: u32, y: u32, duration_ms: Option<u32>) -> Result<()> {
        let s = serial.to_string();
        let operation_name = if duration_ms.is_some() {
            format!("长按 ({}, {})", x, y)
        } else {
            format!("点击 ({}, {})", x, y)
        };
        
        self.retry(&operation_name, || {
            let s = s.clone();
            let inner = &self.inner;
            let d = duration_ms;
            async move { inner.tap(&s, x, y, d).await }
        }).await
    }

    async fn swipe(&self, serial: &str, x1: u32, y1: u32, x2: u32, y2: u32, duration_ms: u32) -> Result<()> {
        let s = serial.to_string();
        let operation_name = format!("滑动 ({},{}) → ({},{}) {}ms", x1, y1, x2, y2, duration_ms);
        
        self.retry(&operation_name, || {
            let s = s.clone();
            let inner = &self.inner;
            async move { inner.swipe(&s, x1, y1, x2, y2, duration_ms).await }
        }).await
    }

    async fn keyevent(&self, serial: &str, code: i32) -> Result<()> {
        let s = serial.to_string();
        let operation_name = format!("按键事件 code={}", code);
        
        self.retry(&operation_name, || {
            let s = s.clone();
            let inner = &self.inner;
            async move { inner.keyevent(&s, code).await }
        }).await
    }

    async fn keyevent_symbolic(&self, serial: &str, code: &str) -> Result<()> {
        let s = serial.to_string();
        let c = code.to_string();
        let operation_name = format!("按键事件 code={}", code);
        
        self.retry(&operation_name, || {
            let s = s.clone();
            let c = c.clone();
            let inner = &self.inner;
            async move { inner.keyevent_symbolic(&s, &c).await }
        }).await
    }

    async fn input_text(&self, serial: &str, text: &str) -> Result<()> {
        let s = serial.to_string();
        let t = text.to_string();
        let operation_name = format!("输入文本: '{}'", text);
        
        self.retry(&operation_name, || {
            let s = s.clone();
            let t = t.clone();
            let inner = &self.inner;
            async move { inner.input_text(&s, &t).await }
        }).await
    }
}
