use std::fs;
use std::io::Write;
use std::path::PathBuf;
use std::time::{Duration, SystemTime};

// 临时注释MD5依赖
// use md5::{Digest, Md5};

pub struct IconDiskCache {
    base_dir: PathBuf,
    ttl: Duration,
    max_files: usize,
}

impl IconDiskCache {
    pub fn new() -> Self {
        let mut dir = std::env::temp_dir();
        dir.push("employee_gui_icons");
        let _ = fs::create_dir_all(&dir);
        Self {
            base_dir: dir,
            ttl: Duration::from_secs(3 * 24 * 3600), // 3天
            max_files: 300,
        }
    }

    fn key_to_path(&self, key: &str) -> PathBuf {
        // 临时使用简单的哈希替代MD5
        let hash = format!("{:x}", key.as_bytes().iter().fold(0u64, |acc, &b| acc.wrapping_mul(31).wrapping_add(b as u64)));
        let mut p = self.base_dir.clone();
        p.push(format!("{}.png", hash));
        p
    }

    fn touch(&self, path: &PathBuf) {
        let _ = filetime::set_file_mtime(
            path,
            filetime::FileTime::from_system_time(SystemTime::now()),
        );
    }

    fn cleanup(&self) {
        if let Ok(mut entries) = fs::read_dir(&self.base_dir) {
            let mut files: Vec<(PathBuf, SystemTime)> = Vec::new();
            while let Some(Ok(e)) = entries.next() {
                let p = e.path();
                if p.is_file() {
                    if let Ok(meta) = e.metadata() {
                        if let Ok(modified) = meta.modified() {
                            // TTL 过期
                            if modified.elapsed().map(|d| d > self.ttl).unwrap_or(false) {
                                let _ = fs::remove_file(&p);
                                continue;
                            }
                            files.push((p, modified));
                        }
                    }
                }
            }
            // LRU by mtime (oldest first)
            if files.len() > self.max_files {
                files.sort_by_key(|(_, t)| *t);
                let to_delete = files.len() - self.max_files;
                for i in 0..to_delete {
                    let _ = fs::remove_file(&files[i].0);
                }
            }
        }
    }

    pub fn get(&self, key: &str) -> Option<Vec<u8>> {
        self.cleanup();
        let path = self.key_to_path(key);
        if let Ok(bytes) = fs::read(&path) {
            // 更新访问时间，作为 LRU 依据
            self.touch(&path);
            Some(bytes)
        } else {
            None
        }
    }

    pub fn put(&self, key: &str, bytes: &[u8]) -> std::io::Result<()> {
        self.cleanup();
        let path = self.key_to_path(key);
        let mut f = fs::File::create(&path)?;
        f.write_all(bytes)?;
        self.touch(&path);
        Ok(())
    }
}
