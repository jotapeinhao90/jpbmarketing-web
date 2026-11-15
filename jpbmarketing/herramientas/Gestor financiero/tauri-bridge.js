'use strict';

(function () {
  if (!window.__TAURI__) return;
  const invoke = window.__TAURI__.core.invoke;

  window.gestipyme = {
    syncReminder:   (task)   => invoke('sync_reminder', { taskJson: JSON.stringify(task) }),
    deleteReminder: (taskId) => invoke('delete_reminder', { taskId }),
    getReminderStatus: (taskId) => invoke('get_reminder_status', { taskId }).then(JSON.parse),

    getMailConfig: ()    => invoke('get_mail_config').then(JSON.parse),
    setMailConfig: (cfg) => invoke('set_mail_config', { configJson: JSON.stringify(cfg) }),
    sendTestMail:  (cfg) => invoke('send_test_mail', { configJson: JSON.stringify(cfg) }).then(JSON.parse),

    installReminderAgent:   () => invoke('install_reminder_agent').then(JSON.parse),
    uninstallReminderAgent: () => invoke('uninstall_reminder_agent').then(JSON.parse),
    reminderAgentStatus:    () => invoke('reminder_agent_status').then(JSON.parse),

    getSyncConfig: () => invoke('get_sync_config').then(JSON.parse),
  };
})();
