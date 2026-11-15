// prevents additional console window on Windows in release
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use std::io::Write;
use std::process::{Command, Stdio};
use std::sync::OnceLock;

const PROJECT_DIR: &str = concat!(env!("CARGO_MANIFEST_DIR"), "/..");

fn node_path() -> &'static str {
    static NODE_PATH: OnceLock<String> = OnceLock::new();
    NODE_PATH.get_or_init(|| {
        for candidate in [
            "/Users/jotape/.local/bin/node",
            "/opt/homebrew/bin/node",
            "/usr/local/bin/node",
        ] {
            if std::path::Path::new(candidate).exists() {
                return candidate.to_string();
            }
        }
        "node".to_string()
    })
}

fn run_node_script(script: &str, args: &[&str], stdin_data: Option<&str>) -> Result<String, String> {
    let script_path = format!("{}/{}", PROJECT_DIR, script);
    let mut cmd = Command::new(node_path());
    cmd.arg(&script_path).args(args);
    cmd.stdout(Stdio::piped());
    cmd.stderr(Stdio::piped());
    if stdin_data.is_some() {
        cmd.stdin(Stdio::piped());
    }

    let mut child = cmd.spawn().map_err(|e| e.to_string())?;

    if let Some(data) = stdin_data {
        child
            .stdin
            .take()
            .unwrap()
            .write_all(data.as_bytes())
            .map_err(|e| e.to_string())?;
    }

    let output = child.wait_with_output().map_err(|e| e.to_string())?;
    if !output.status.success() {
        return Err(String::from_utf8_lossy(&output.stderr).to_string());
    }
    Ok(String::from_utf8_lossy(&output.stdout).trim().to_string())
}

#[tauri::command]
fn sync_reminder(task_json: String) -> Result<String, String> {
    run_node_script("cli/reminders-sync.js", &[], Some(&task_json))
}

#[tauri::command]
fn delete_reminder(task_id: String) -> Result<String, String> {
    run_node_script("cli/reminders-delete.js", &[&task_id], None)
}

#[tauri::command]
fn get_reminder_status(task_id: String) -> Result<String, String> {
    run_node_script("cli/reminders-status.js", &[&task_id], None)
}

#[tauri::command]
fn get_mail_config() -> Result<String, String> {
    run_node_script("cli/mail-get-config.js", &[], None)
}

#[tauri::command]
fn set_mail_config(config_json: String) -> Result<String, String> {
    run_node_script("cli/mail-set-config.js", &[], Some(&config_json))
}

#[tauri::command]
fn send_test_mail(config_json: String) -> Result<String, String> {
    run_node_script("cli/mail-send-test.js", &[], Some(&config_json))
}

#[tauri::command]
fn install_reminder_agent() -> Result<String, String> {
    run_node_script("cli/agent-install.js", &[], None)
}

#[tauri::command]
fn uninstall_reminder_agent() -> Result<String, String> {
    run_node_script("cli/agent-uninstall.js", &[], None)
}

#[tauri::command]
fn reminder_agent_status() -> Result<String, String> {
    run_node_script("cli/agent-status.js", &[], None)
}

#[tauri::command]
fn get_sync_config() -> Result<String, String> {
    run_node_script("cli/sync-get-config.js", &[], None)
}

fn main() {
    tauri::Builder::default()
        .invoke_handler(tauri::generate_handler![
            sync_reminder,
            delete_reminder,
            get_reminder_status,
            get_mail_config,
            set_mail_config,
            send_test_mail,
            install_reminder_agent,
            uninstall_reminder_agent,
            reminder_agent_status,
            get_sync_config,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
