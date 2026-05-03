// LeetTree Notes — Popup Script

document.addEventListener('DOMContentLoaded', async () => {
  // Load stats
  try {
    const response = await chrome.runtime.sendMessage({ type: 'GET_STATS' });
    if (response && response.stats) {
      const s = response.stats;
      document.getElementById('stat-problems').textContent = s.totalProblems;
      document.getElementById('stat-solutions').textContent = s.totalSolutions;
      document.getElementById('stat-starred').textContent = s.starred;
      document.getElementById('stat-revision').textContent = s.revision;
      document.getElementById('folder-count').textContent = `${s.folderCount} folder${s.folderCount !== 1 ? 's' : ''}`;
    }
  } catch (e) {
    console.error('Error loading stats:', e);
  }

  // Open Dashboard
  document.getElementById('btn-dashboard').addEventListener('click', () => {
    chrome.runtime.sendMessage({ type: 'OPEN_DASHBOARD', data: {} });
    window.close();
  });

  // Save Current Problem
  document.getElementById('btn-save').addEventListener('click', async () => {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (tab && tab.url && tab.url.includes('leetcode.com/problems/')) {
      // Send message to content script to trigger save
      chrome.tabs.sendMessage(tab.id, { type: 'TRIGGER_SAVE' }, (response) => {
        if (chrome.runtime.lastError) {
          // Content script not loaded, open dashboard directly
          chrome.runtime.sendMessage({ type: 'OPEN_DASHBOARD', data: { mode: 'save' } });
        }
      });
      window.close();
    } else {
      // Not on a LeetCode problem page
      const btn = document.getElementById('btn-save');
      btn.style.borderColor = '#f85149';
      btn.querySelector('svg').style.stroke = '#f85149';
      setTimeout(() => {
        btn.style.borderColor = '';
        btn.querySelector('svg').style.stroke = '';
      }, 1500);
    }
  });
});
