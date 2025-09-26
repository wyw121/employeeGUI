use tauri::State;
use std::sync::Mutex;
use crate::services::adb_service::AdbService;
use crate::services::adb_device_tracker::*;
use crate::services::safe_adb_manager::*;
use crate::services::log_bridge::LOG_COLLECTOR;
#[cfg(windows)]
use std::os::windows::process::CommandExt; // for creation_flags to hide console window

#[tauri::command]
pub async fn execute_adb_command(adb_path: String, args: Vec<String>, service: State<'_, Mutex<AdbService>>) -> Result<String, String> { let service = service.lock().map_err(|e| e.to_string())?; service.execute_command(&adb_path, &args).map_err(|e| e.to_string()) }

#[tauri::command]
pub async fn check_file_exists(path: String, service: State<'_, Mutex<AdbService>>) -> Result<bool, String> { let service = service.lock().map_err(|e| e.to_string())?; Ok(service.check_file_exists(&path)) }

#[tauri::command]
pub async fn detect_ldplayer_adb(service: State<'_, Mutex<AdbService>>) -> Result<Option<String>, String> { let service = service.lock().map_err(|e| e.to_string())?; Ok(service.detect_ldplayer_adb()) }

#[tauri::command]
pub async fn detect_smart_adb_path(service: State<'_, Mutex<AdbService>>) -> Result<String, String> { let service = service.lock().map_err(|e| e.to_string())?; if let Some(detected_path) = service.detect_ldplayer_adb() { Ok(detected_path) } else { match service.execute_command("adb.exe", &["version".to_string()]) { Ok(_) => Ok("adb.exe".to_string()), Err(_) => { let current_dir = std::env::current_dir().map_err(|e| format!("Failed to get current directory: {}", e))?; let adb_path = current_dir.join("platform-tools").join("adb.exe"); if adb_path.exists() { Ok(adb_path.to_string_lossy().to_string()) } else { let parent_adb_path = current_dir.parent().ok_or("No parent directory")?.join("platform-tools").join("adb.exe"); if parent_adb_path.exists() { Ok(parent_adb_path.to_string_lossy().to_string()) } else { Err("未找到可用的ADB路径".to_string()) } } } } }
}

#[tauri::command]
pub async fn get_adb_devices(adb_path: String, service: State<'_, Mutex<AdbService>>) -> Result<String, String> { let service = service.lock().map_err(|e| e.to_string())?; service.get_devices(&adb_path).map_err(|e| e.to_string()) }

#[tauri::command]
pub async fn get_adb_version() -> Result<String, String> {
	use std::process::Command;
	let adb_path = "platform-tools/adb.exe";
	let mut cmd = Command::new(adb_path);
	cmd.arg("version");
	#[cfg(windows)]
	{ cmd.creation_flags(0x08000000); }
	match cmd.output() {
		Ok(output) => {
			if output.status.success() {
				let version_output = String::from_utf8_lossy(&output.stdout);
				Ok(version_output.lines().next().unwrap_or("Unknown").to_string())
			} else {
				Err(format!("ADB版本获取失败: {}", String::from_utf8_lossy(&output.stderr)))
			}
		}
		Err(e) => Err(format!("无法执行ADB命令: {}", e)),
	}
}

#[tauri::command]
pub async fn start_adb_server_simple() -> Result<String, String> {
	use std::process::Command;
	use std::time::Instant;
	let adb_path = "platform-tools/adb.exe";
	let mut cmd = Command::new(adb_path);
	cmd.arg("start-server");
	#[cfg(windows)]
	{ cmd.creation_flags(0x08000000); }
	let start = Instant::now();
	let res = cmd.output();
	let dur = start.elapsed();
	match res {
		Ok(output) => {
			if output.status.success() {
				let out_str = String::from_utf8_lossy(&output.stdout).to_string();
				let err_str = String::from_utf8_lossy(&output.stderr).to_string();
				LOG_COLLECTOR.add_adb_command_log(
					adb_path,
					&vec!["start-server".to_string()],
					&out_str,
					if err_str.is_empty() { None } else { Some(err_str.as_str()) },
					output.status.code(),
					dur.as_millis() as u64,
				);
				Ok("ADB服务器启动成功".to_string())
			} else {
				let error = String::from_utf8_lossy(&output.stderr);
				let out_str = String::from_utf8_lossy(&output.stdout).to_string();
				LOG_COLLECTOR.add_adb_command_log(
					adb_path,
					&vec!["start-server".to_string()],
					&out_str,
					Some(error.as_ref()),
					output.status.code(),
					dur.as_millis() as u64,
				);
				Err(format!("ADB服务器启动失败: {}", error))
			}
		}
		Err(e) => {
			LOG_COLLECTOR.add_adb_command_log(
				adb_path,
				&vec!["start-server".to_string()],
				"",
				Some(&format!("{}", e)),
				None,
				dur.as_millis() as u64,
			);
			Err(format!("无法执行ADB命令: {}", e))
		}
	}
}

#[tauri::command]
pub async fn kill_adb_server_simple() -> Result<String, String> {
	use std::process::Command;
	use std::time::Instant;
	let adb_path = "platform-tools/adb.exe";
	let mut cmd = Command::new(adb_path);
	cmd.arg("kill-server");
	#[cfg(windows)]
	{ cmd.creation_flags(0x08000000); }
	let start = Instant::now();
	let res = cmd.output();
	let dur = start.elapsed();
	match res {
		Ok(output) => {
			if output.status.success() {
				let out_str = String::from_utf8_lossy(&output.stdout).to_string();
				let err_str = String::from_utf8_lossy(&output.stderr).to_string();
				LOG_COLLECTOR.add_adb_command_log(
					adb_path,
					&vec!["kill-server".to_string()],
					&out_str,
					if err_str.is_empty() { None } else { Some(err_str.as_str()) },
					output.status.code(),
					dur.as_millis() as u64,
				);
				Ok("ADB服务器停止成功".to_string())
			} else {
				let error = String::from_utf8_lossy(&output.stderr);
				let out_str = String::from_utf8_lossy(&output.stdout).to_string();
				LOG_COLLECTOR.add_adb_command_log(
					adb_path,
					&vec!["kill-server".to_string()],
					&out_str,
					Some(error.as_ref()),
					output.status.code(),
					dur.as_millis() as u64,
				);
				Err(format!("ADB服务器停止失败: {}", error))
			}
		}
		Err(e) => {
			LOG_COLLECTOR.add_adb_command_log(
				adb_path,
				&vec!["kill-server".to_string()],
				"",
				Some(&format!("{}", e)),
				None,
				dur.as_millis() as u64,
			);
			Err(format!("无法执行ADB命令: {}", e))
		}
	}
}

#[tauri::command]
pub async fn execute_adb_command_simple(command: String) -> Result<String, String> {
	use std::process::Command;
	use std::time::Instant;
	let adb_path = "platform-tools/adb.exe";
	let args: Vec<&str> = command.split_whitespace().collect();
	let mut cmd = Command::new(adb_path);
	cmd.args(&args);
	#[cfg(windows)]
	{ cmd.creation_flags(0x08000000); }
	let start = Instant::now();
	let res = cmd.output();
	let dur = start.elapsed();
	match res {
		Ok(output) => {
			if output.status.success() {
				let result = String::from_utf8_lossy(&output.stdout);
				LOG_COLLECTOR.add_adb_command_log(
					adb_path,
					&args.iter().map(|s| s.to_string()).collect::<Vec<String>>(),
					&result.to_string(),
					None,
					output.status.code(),
					dur.as_millis() as u64,
				);
				Ok(result.to_string())
			} else {
				let error = String::from_utf8_lossy(&output.stderr);
				let out_str = String::from_utf8_lossy(&output.stdout).to_string();
				LOG_COLLECTOR.add_adb_command_log(
					adb_path,
					&args.iter().map(|s| s.to_string()).collect::<Vec<String>>(),
					&out_str,
					Some(error.as_ref()),
					output.status.code(),
					dur.as_millis() as u64,
				);
				Err(format!("ADB命令执行失败: {}", error))
			}
		}
		Err(e) => {
			LOG_COLLECTOR.add_adb_command_log(
				adb_path,
				&args.iter().map(|s| s.to_string()).collect::<Vec<String>>(),
				"",
				Some(&format!("{}", e)),
				None,
				dur.as_millis() as u64,
			);
			Err(format!("无法执行ADB命令: {}", e))
		}
	}
}

#[tauri::command]
pub async fn connect_adb_device(adb_path: String, address: String, service: State<'_, Mutex<AdbService>>) -> Result<String, String> { let service = service.lock().map_err(|e| e.to_string())?; service.connect_device(&adb_path, &address).map_err(|e| e.to_string()) }

#[tauri::command]
pub async fn disconnect_adb_device(adb_path: String, address: String, service: State<'_, Mutex<AdbService>>) -> Result<String, String> { let service = service.lock().map_err(|e| e.to_string())?; service.disconnect_device(&adb_path, &address).map_err(|e| e.to_string()) }

#[tauri::command]
pub async fn start_adb_server(adb_path: String, service: State<'_, Mutex<AdbService>>) -> Result<String, String> { let service = service.lock().map_err(|e| e.to_string())?; service.start_server(&adb_path).map_err(|e| e.to_string()) }

#[tauri::command]
pub async fn kill_adb_server(adb_path: String, service: State<'_, Mutex<AdbService>>) -> Result<String, String> { let service = service.lock().map_err(|e| e.to_string())?; service.kill_server(&adb_path).map_err(|e| e.to_string()) }

#[tauri::command]
pub async fn get_device_properties(adb_path: String, device_id: String, service: State<'_, Mutex<AdbService>>) -> Result<String, String> { let service = service.lock().map_err(|e| e.to_string())?; service.get_device_properties(&adb_path, &device_id).map_err(|e| e.to_string()) }
