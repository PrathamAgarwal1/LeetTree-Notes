// LeetTree Notes — Background Service Worker
// Handles messaging between content scripts and extension pages

// Listen for messages from content scripts
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  switch (message.type) {
    case 'OPEN_DASHBOARD':
      openDashboard(message.data);
      sendResponse({ success: true });
      break;

    case 'SAVE_PROBLEM_TEMP':
      // Store problem data temporarily for the dashboard to pick up
      chrome.storage.local.set({ _tempProblem: message.data }, () => {
        sendResponse({ success: true });
      });
      return true; // async response

    case 'SAVE_PROBLEM_SILENT':
      saveProblemSilent(message.data).then(() => {
        sendResponse({ success: true });
      });
      return true; // async response

    case 'GET_TEMP_PROBLEM':
      chrome.storage.local.get('_tempProblem', (result) => {
        sendResponse({ data: result._tempProblem || null });
        // Clear temp data after retrieval
        chrome.storage.local.remove('_tempProblem');
      });
      return true;

    case 'GET_STATS':
      getStats().then(stats => sendResponse({ stats }));
      return true;

    default:
      sendResponse({ error: 'Unknown message type' });
  }
});

async function saveProblemSilent(data) {
  return new Promise((resolve) => {
    chrome.storage.local.get('lt_problems', (result) => {
      const problems = result.lt_problems || {};
      let targetProblem = null;

      // Find existing by slug
      if (data.slug) {
        targetProblem = Object.values(problems).find(p => p.slug === data.slug);
      }

      if (!targetProblem) {
        // Create new
        const id = 'p_' + Date.now() + '_' + Math.random().toString(36).substr(2, 6);
        targetProblem = {
          id,
          title: data.title || 'Untitled',
          number: data.number || '',
          slug: data.slug || '',
          difficulty: data.difficulty || 'Medium',
          url: data.url || '',
          folderId: 'root', // Default save to root
          starred: false,
          revision: false,
          tags: [],
          solutions: [],
          createdAt: Date.now(),
          updatedAt: Date.now()
        };
        problems[id] = targetProblem;
      }

      // Determine solution type
      const solType = data.solutionType || 'optimal';
      
      // Check if solution of this type already exists
      const existingSolIndex = targetProblem.solutions.findIndex(s => s.type === solType && s.type !== 'custom');

      const solData = {
        id: 's_' + Date.now() + '_' + Math.random().toString(36).substr(2, 6),
        type: solType,
        customLabel: '',
        approach: data.intuition || '',
        code: data.code || '',
        language: data.language || 'javascript',
        timeComplexity: data.timeComplexity || '',
        spaceComplexity: data.spaceComplexity || '',
        notes: '',
        createdAt: Date.now(),
        updatedAt: Date.now()
      };

      if (existingSolIndex !== -1) {
        // Overwrite existing solution of the same type
        solData.id = targetProblem.solutions[existingSolIndex].id;
        solData.createdAt = targetProblem.solutions[existingSolIndex].createdAt;
        targetProblem.solutions[existingSolIndex] = solData;
      } else {
        // Add new solution
        targetProblem.solutions.push(solData);
      }
      
      // Save description directly on problem if not present
      if (data.description && !targetProblem.description) {
        targetProblem.description = data.description;
      }
      
      targetProblem.updatedAt = Date.now();

      chrome.storage.local.set({ lt_problems: problems }, () => {
        // Notify dashboard if open
        chrome.tabs.query({ url: chrome.runtime.getURL('dashboard/index.html') + '*' }).then(tabs => {
          if (tabs.length > 0) {
            chrome.tabs.sendMessage(tabs[0].id, { type: 'RELOAD_PROBLEMS' });
          }
        });
        resolve();
      });
    });
  });
}

// Open the dashboard in a new tab or focus existing one
async function openDashboard(data = {}) {
  const dashboardUrl = chrome.runtime.getURL('dashboard/index.html');

  // Check if dashboard is already open
  const tabs = await chrome.tabs.query({ url: dashboardUrl + '*' });

  if (tabs.length > 0) {
    // Focus existing tab
    await chrome.tabs.update(tabs[0].id, { active: true });
    await chrome.windows.update(tabs[0].windowId, { focused: true });

    // Send data to existing dashboard
    if (data && Object.keys(data).length > 0) {
      chrome.tabs.sendMessage(tabs[0].id, {
        type: 'LOAD_PROBLEM',
        data
      });
    }
  } else {
    // Open new tab
    let url = dashboardUrl;
    if (data && data.mode) {
      url += `?mode=${data.mode}`;
    }
    await chrome.tabs.create({ url });
  }
}

// Get quick stats for popup
async function getStats() {
  return new Promise((resolve) => {
    chrome.storage.local.get(['lt_folders', 'lt_problems'], (result) => {
      const folders = result.lt_folders || {};
      const problems = result.lt_problems || {};

      const problemList = Object.values(problems);
      const totalProblems = problemList.length;
      const starred = problemList.filter(p => p.starred).length;
      const revision = problemList.filter(p => p.revision).length;
      const totalSolutions = problemList.reduce((sum, p) => sum + (p.solutions ? p.solutions.length : 0), 0);
      const folderCount = Object.keys(folders).filter(k => k !== 'root').length;

      resolve({
        totalProblems,
        totalSolutions,
        starred,
        revision,
        folderCount
      });
    });
  });
}

// Install handler — initialize default data
chrome.runtime.onInstalled.addListener((details) => {
  if (details.reason === 'install') {
    const defaultFolders = {
      root: {
        id: 'root',
        name: 'My Topics',
        parentId: null,
        children: [],
        order: 0,
        expanded: true
      }
    };

    chrome.storage.local.set({
      lt_folders: defaultFolders,
      lt_problems: {},
      lt_settings: {
        theme: 'dark',
        defaultLanguage: 'javascript'
      }
    });
  }
});
