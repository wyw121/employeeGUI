use anyhow::Result;

#[allow(dead_code)]
pub struct ScrollUntilFoundConfig {
    pub max_attempts: u32,
    pub direction: &'static str, // simple placeholder: "down" | "up"
    pub settle_ms: u64,
}

/// Skeleton: perform (dump → match → swipe) loop until found or attempts exhausted.
#[allow(dead_code)]
pub async fn scroll_until_found<FMatch, FSwipe, FDump, TMatch>(
    mut try_match: FMatch,
    mut do_swipe: FSwipe,
    mut dump_ui: FDump,
    cfg: ScrollUntilFoundConfig,
) -> Result<Option<TMatch>>
where
    FMatch: FnMut(&str) -> Option<TMatch>,
    FSwipe: FnMut() -> Result<()>,
    FDump: FnMut() -> Result<String>,
{
    for _ in 0..cfg.max_attempts {
        let xml = dump_ui()?;
        if let Some(found) = try_match(&xml) {
            return Ok(Some(found));
        }
        do_swipe()?;
        tokio::time::sleep(std::time::Duration::from_millis(cfg.settle_ms)).await;
    }
    Ok(None)
}
