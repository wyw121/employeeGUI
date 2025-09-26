use regex::Regex;

pub fn is_phone_number(line: &str) -> bool {
    let re = Regex::new(r"^(\+?86[- ]?)?1[3-9]\d{9}$").unwrap();
    let s = line.trim();
    if re.is_match(s) {
        return true;
    }
    let digits: String = s.chars().filter(|c| c.is_ascii_digit()).collect();
    if digits.len() == 11 && digits.starts_with('1') {
        return true;
    }
    if digits.len() == 13 && (digits.starts_with("861") || digits.starts_with("0861")) {
        return true;
    }
    false
}

pub fn extract_numbers_from_text(content: &str) -> Vec<(String, String)> {
    let mut result = Vec::new();
    for line in content.lines() {
        let trimmed = line.trim();
        if trimmed.is_empty() {
            continue;
        }
        if is_phone_number(trimmed) {
            let digits: String = trimmed.chars().filter(|c| c.is_ascii_digit()).collect();
            result.push((digits, String::new()));
        }
    }
    result
}
