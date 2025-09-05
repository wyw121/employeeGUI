use reqwest;
use serde::{Deserialize, Serialize};
use serde_json::json;
use tauri::command;

#[derive(Debug, Serialize, Deserialize)]
pub struct LoginRequest {
    pub username: String,
    pub password: String,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct LoginResponse {
    pub success: bool,
    pub token: Option<String>,
    pub user: Option<serde_json::Value>,
    pub error: Option<String>,
    pub expires_at: Option<String>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct ApiResponse<T> {
    pub success: bool,
    pub data: Option<T>,
    pub message: Option<String>,
    pub error: Option<String>,
}

/// 员工登录
#[command]
pub async fn employee_login(
    server_url: String,
    username: String,
    password: String,
) -> Result<LoginResponse, String> {
    let client = reqwest::Client::new();
    let login_url = format!("{}/auth/login", server_url);

    let request_body = json!({
        "username": username,
        "password": password
    });

    println!("Attempting login to: {}", login_url);
    println!("Request body: {}", request_body);

    match client.post(&login_url).json(&request_body).send().await {
        Ok(response) => {
            let status = response.status();
            println!("Response status: {}", status);

            match response.json::<ApiResponse<serde_json::Value>>().await {
                Ok(api_response) => {
                    if api_response.success {
                        if let Some(data) = api_response.data {
                            return Ok(LoginResponse {
                                success: true,
                                token: data
                                    .get("token")
                                    .and_then(|v| v.as_str().map(|s| s.to_string())),
                                user: data.get("user").cloned(),
                                error: None,
                                expires_at: data
                                    .get("expires_at")
                                    .and_then(|v| v.as_str().map(|s| s.to_string())),
                            });
                        }
                    }

                    Ok(LoginResponse {
                        success: false,
                        token: None,
                        user: None,
                        error: Some(api_response.message.unwrap_or("登录失败".to_string())),
                        expires_at: None,
                    })
                }
                Err(e) => {
                    println!("Failed to parse response: {}", e);
                    Ok(LoginResponse {
                        success: false,
                        token: None,
                        user: None,
                        error: Some("服务器响应格式错误".to_string()),
                        expires_at: None,
                    })
                }
            }
        }
        Err(e) => {
            println!("Network error: {}", e);
            Ok(LoginResponse {
                success: false,
                token: None,
                user: None,
                error: Some(format!("网络连接失败: {}", e)),
                expires_at: None,
            })
        }
    }
}

/// 验证Token
#[command]
pub async fn verify_token(server_url: String, token: String) -> Result<bool, String> {
    let client = reqwest::Client::new();
    let verify_url = format!("{}/auth/me", server_url);

    match client.get(&verify_url).bearer_auth(&token).send().await {
        Ok(response) => Ok(response.status().is_success()),
        Err(e) => {
            println!("Token verification error: {}", e);
            Ok(false)
        }
    }
}

/// 获取当前用户信息
#[command]
pub async fn get_current_user(
    server_url: String,
    token: String,
) -> Result<ApiResponse<serde_json::Value>, String> {
    let client = reqwest::Client::new();
    let user_url = format!("{}/auth/me", server_url);

    match client.get(&user_url).bearer_auth(&token).send().await {
        Ok(response) => match response.json::<ApiResponse<serde_json::Value>>().await {
            Ok(api_response) => Ok(api_response),
            Err(e) => Ok(ApiResponse {
                success: false,
                data: None,
                message: None,
                error: Some(format!("解析用户信息失败: {}", e)),
            }),
        },
        Err(e) => Ok(ApiResponse {
            success: false,
            data: None,
            message: None,
            error: Some(format!("获取用户信息失败: {}", e)),
        }),
    }
}

/// 员工登出
#[command]
pub async fn employee_logout(server_url: String, token: Option<String>) -> Result<bool, String> {
    if let Some(token) = token {
        let client = reqwest::Client::new();
        let logout_url = format!("{}/auth/logout", server_url);

        match client.post(&logout_url).bearer_auth(&token).send().await {
            Ok(_) => Ok(true),
            Err(e) => {
                println!("Logout error: {}", e);
                Ok(true) // 即使服务器登出失败，本地也要清除
            }
        }
    } else {
        Ok(true)
    }
}

/// 刷新Token
#[command]
pub async fn refresh_token(
    server_url: String,
    token: String,
) -> Result<ApiResponse<String>, String> {
    let client = reqwest::Client::new();
    let refresh_url = format!("{}/auth/refresh", server_url);

    match client.post(&refresh_url).bearer_auth(&token).send().await {
        Ok(response) => match response.json::<ApiResponse<String>>().await {
            Ok(api_response) => Ok(api_response),
            Err(e) => Ok(ApiResponse {
                success: false,
                data: None,
                message: None,
                error: Some(format!("解析刷新Token响应失败: {}", e)),
            }),
        },
        Err(e) => Ok(ApiResponse {
            success: false,
            data: None,
            message: None,
            error: Some(format!("刷新Token失败: {}", e)),
        }),
    }
}

/// 修改密码
#[command]
pub async fn change_password(
    server_url: String,
    token: String,
    current_password: String,
    new_password: String,
) -> Result<ApiResponse<String>, String> {
    let client = reqwest::Client::new();
    let change_password_url = format!("{}/auth/change-password", server_url);

    let request_body = json!({
        "currentPassword": current_password,
        "newPassword": new_password
    });

    match client
        .post(&change_password_url)
        .bearer_auth(&token)
        .json(&request_body)
        .send()
        .await
    {
        Ok(response) => match response.json::<ApiResponse<String>>().await {
            Ok(api_response) => Ok(api_response),
            Err(e) => Ok(ApiResponse {
                success: false,
                data: None,
                message: None,
                error: Some(format!("解析修改密码响应失败: {}", e)),
            }),
        },
        Err(e) => Ok(ApiResponse {
            success: false,
            data: None,
            message: None,
            error: Some(format!("修改密码请求失败: {}", e)),
        }),
    }
}
