// LeetTree Notes — Content Script
// Injected into LeetCode problem pages to add "Save as Solution" button

(function () {
  'use strict';

  // Prevent double injection at the file scope
  if (window.ltScriptInjected) return;
  window.ltScriptInjected = true;

  const SAVE_ICON = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/><polyline points="17 21 17 13 7 13 7 21"/><polyline points="7 3 7 8 15 8"/></svg>`;
  const CHECK_ICON = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>`;

  let problemData = null;

  // Extract problem info from the page
  function extractProblemInfo() {
    const url = window.location.href.split('?')[0].replace(/\/$/, '');
    const slug = url.split('/problems/')[1]?.split('/')[0] || '';

    // Get title from page
    const titleEl = document.querySelector('[data-cy="question-title"]')
      || document.querySelector('.text-title-large')
      || document.querySelector('div[class*="text-title"]')
      || document.querySelector('a[href*="/problems/"] span');

    let title = '';
    let number = '';

    if (titleEl) {
      const text = titleEl.textContent.trim();
      const match = text.match(/^(\d+)\.\s*(.+)$/);
      if (match) {
        number = match[1];
        title = match[2];
      } else {
        title = text;
      }
    }

    // Fallback: extract from URL
    if (!title) {
      title = slug.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
    }

    // Get difficulty
    const diffEl = document.querySelector('div[class*="text-difficulty"]')
      || document.querySelector('div[diff]')
      || document.querySelector('span[class*="text-olive"]')
      || document.querySelector('span[class*="text-yellow"]')
      || document.querySelector('span[class*="text-pink"]');

    let difficulty = 'Medium';
    if (diffEl) {
      const text = diffEl.textContent.trim().toLowerCase();
      if (text.includes('easy')) difficulty = 'Easy';
      else if (text.includes('hard')) difficulty = 'Hard';
      else if (text.includes('medium')) difficulty = 'Medium';
    }

    // Get Description
    const descEl = document.querySelector('[data-track-load="description_content"]') 
      || document.querySelector('.elfjS') 
      || document.querySelector('div[class*="question-content"]')
      || document.querySelector('.content__u3I1');
    const description = descEl ? descEl.innerHTML : '';

    // Try to get code from Monaco editor
    let code = '';
    let language = 'javascript';

    try {
      // LeetCode uses Monaco — try accessing via their exposed API
      const monacoEl = document.querySelector('.monaco-editor');
      if (monacoEl) {
        const model = monacoEl.__proto__?.constructor?._modelData;
        // Alternative: try to get text from the view lines
        const lines = document.querySelectorAll('.view-line');
        if (lines.length > 0) {
          code = Array.from(lines).map(l => l.textContent).join('\n');
        }
      }

      // Also try CodeMirror (LeetCode sometimes uses it)
      const cmEl = document.querySelector('.CodeMirror');
      if (cmEl && cmEl.CodeMirror) {
        code = cmEl.CodeMirror.getValue();
      }

      // Try getting from the code area more broadly
      if (!code) {
        const codeArea = document.querySelector('[data-cy="code-area"]')
          || document.querySelector('.monaco-scrollable-element');
        if (codeArea) {
          const lines = codeArea.querySelectorAll('.view-line');
          code = Array.from(lines).map(l => {
            // Preserve whitespace from spans
            return l.textContent;
          }).join('\n');
        }
      }

      // Detect language by searching buttons for known language names
      const knownLangs = {
        'c++': 'cpp', 'cpp': 'cpp', 'java': 'java', 'python': 'python', 'python3': 'python',
        'c': 'c', 'c#': 'csharp', 'javascript': 'javascript', 'typescript': 'typescript',
        'php': 'php', 'swift': 'swift', 'kotlin': 'kotlin', 'dart': 'dart',
        'go': 'go', 'ruby': 'ruby', 'scala': 'scala', 'rust': 'rust'
      };
      
      const langNames = Object.keys(knownLangs);
      let foundLang = null;
      
      const buttons = document.querySelectorAll('button, div[class*="select"]');
      for (const btn of buttons) {
        const text = btn.textContent.trim().toLowerCase();
        if (langNames.includes(text)) {
          foundLang = knownLangs[text];
          break;
        }
      }
      
      if (foundLang) {
        language = foundLang;
      }
    } catch (e) {
      console.log('[LeetTree] Could not extract code:', e);
    }

    return {
      title,
      number,
      slug,
      difficulty,
      url,
      description,
      code,
      language,
      extractedAt: Date.now()
    };
  }

  // Create and inject the save button
  function injectButton() {
    if (document.querySelector('.lt-save-btn')) return;

    // Find suitable insertion point
    const targetSelectors = [
      // New LeetCode UI
      'div[class*="flex items-center gap"]',
      'div.flex.items-center.gap-2',
      // Try finding near the run/submit buttons
      'div[class*="submit"]',
      // Fallback: action bar
      'div[class*="action"]'
    ];

    let target = null;
    for (const sel of targetSelectors) {
      const candidates = document.querySelectorAll(sel);
      for (const el of candidates) {
        // Look for the bar containing Run/Submit buttons
        if (el.querySelector('button') && el.closest('[class*="editor"]')) {
          target = el;
          break;
        }
      }
      if (target) break;
    }

    // Broader fallback: find the submit button and insert near it
    if (!target) {
      const submitBtn = Array.from(document.querySelectorAll('button')).find(btn =>
        btn.textContent.trim().toLowerCase().includes('submit')
      );
      if (submitBtn) {
        target = submitBtn.parentElement;
      }
    }

    // Ultimate fallback: create a floating button
    const btn = document.createElement('button');
    btn.className = 'lt-save-btn';
    btn.innerHTML = `${SAVE_ICON}<span>Save to LeetTree</span>`;
    btn.title = 'Save this solution to LeetTree Notes';

    btn.addEventListener('click', handleSave);

    if (target) {
      // Prepend to show before the first button (like Run) if possible
      target.insertBefore(btn, target.firstChild);
    } else {
      // Floating position near bottom-right of editor area
      btn.style.cssText = 'position:fixed;bottom:20px;right:120px;z-index:99999;padding:10px 18px;font-size:14px;';
      document.body.appendChild(btn);
    }
  }

  // Handle save button click
  async function handleSave() {
    const btn = document.querySelector('.lt-save-btn');
    if (!btn) return;

    problemData = extractProblemInfo();

    // Show injected modal to get intuition and complexities
    showSaveModal(problemData, btn);
  }

  function showSaveModal(data, btn) {
    if (document.querySelector('.lt-modal-overlay')) return;

    const overlay = document.createElement('div');
    overlay.className = 'lt-modal-overlay';
    overlay.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.7);z-index:999999;display:flex;align-items:center;justify-content:center;backdrop-filter:blur(4px);';

    const modal = document.createElement('div');
    modal.className = 'lt-modal';
    modal.style.cssText = 'background:#1a1a1a;border:1px solid #333;border-radius:12px;width:500px;max-width:90%;padding:24px;box-shadow:0 10px 40px rgba(0,0,0,0.5);font-family:system-ui,-apple-system,sans-serif;color:#eee;';

    modal.innerHTML = `
      <h2 style="margin:0 0 16px 0;font-size:20px;font-weight:600;color:#fff;">Save to LeetTree</h2>
      <div style="margin-bottom:16px;color:#aaa;font-size:14px;">${data.title}</div>
      
      <div style="margin-bottom:16px;">
        <label style="display:block;margin-bottom:6px;font-size:13px;color:#ccc;">Solution Type</label>
        <select id="lt-modal-type" style="width:100%;background:#2a2a2a;border:1px solid #444;border-radius:6px;padding:10px;color:#eee;font-family:inherit;font-size:14px;">
          <option value="optimal">Optimal</option>
          <option value="better">Better</option>
          <option value="brute">Brute Force</option>
          <option value="custom">Custom</option>
        </select>
      </div>

      <div style="margin-bottom:16px;">
        <label style="display:block;margin-bottom:6px;font-size:13px;color:#ccc;font-weight:500;">Intuition / Approach</label>
        <div style="background:#1e1e1e;border:1px solid #444;border-radius:8px;overflow:hidden;display:flex;flex-direction:column;box-shadow:inset 0 1px 3px rgba(0,0,0,0.2);">
          <div style="display:flex;align-items:center;padding:6px 8px;background:#2d2d2d;border-bottom:1px solid #444;flex-wrap:wrap;gap:4px;">
            <div style="display:flex;gap:2px;">
              <button type="button" data-cmd="bold" title="Bold" style="background:transparent;border:none;color:#aaa;width:28px;height:28px;display:flex;align-items:center;justify-content:center;cursor:pointer;border-radius:4px;transition:all 0.2s;"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><path d="M6 4h8a4 4 0 0 1 4 4 4 4 0 0 1-4 4H6z"/><path d="M6 12h9a4 4 0 0 1 4 4 4 4 0 0 1-4 4H6z"/></svg></button>
              <button type="button" data-cmd="italic" title="Italic" style="background:transparent;border:none;color:#aaa;width:28px;height:28px;display:flex;align-items:center;justify-content:center;cursor:pointer;border-radius:4px;transition:all 0.2s;"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><line x1="19" y1="4" x2="10" y2="4"/><line x1="14" y1="20" x2="5" y2="20"/><line x1="15" y1="4" x2="9" y2="20"/></svg></button>
            </div>
            <div style="width:1px;height:18px;background:#444;margin:0 4px;"></div>
            <div style="display:flex;gap:2px;">
              <button type="button" data-cmd="insertUnorderedList" title="Bullet List" style="background:transparent;border:none;color:#aaa;width:28px;height:28px;display:flex;align-items:center;justify-content:center;cursor:pointer;border-radius:4px;transition:all 0.2s;"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/></svg></button>
              <button type="button" data-cmd="insertOrderedList" title="Numbered List" style="background:transparent;border:none;color:#aaa;width:28px;height:28px;display:flex;align-items:center;justify-content:center;cursor:pointer;border-radius:4px;transition:all 0.2s;"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="10" y1="6" x2="21" y2="6"/><line x1="10" y1="12" x2="21" y2="12"/><line x1="10" y1="18" x2="21" y2="18"/><path d="M4 6h1v4"/><path d="M4 10h2"/><path d="M6 18H4c0-1 2-2 2-3s-1-1.5-2-1"/></svg></button>
            </div>
            <div style="width:1px;height:18px;background:#444;margin:0 4px;"></div>
            <div style="display:flex;gap:2px;">
              <button type="button" id="lt-modal-btn-code" title="Code Block" style="background:transparent;border:none;color:#aaa;width:28px;height:28px;display:flex;align-items:center;justify-content:center;cursor:pointer;border-radius:4px;transition:all 0.2s;"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="16 18 22 12 16 6"/><polyline points="8 6 2 12 8 18"/></svg></button>
              <button type="button" id="lt-modal-btn-img" title="Insert Image" style="background:transparent;border:none;color:#aaa;width:28px;height:28px;display:flex;align-items:center;justify-content:center;cursor:pointer;border-radius:4px;transition:all 0.2s;"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg></button>
              <button type="button" id="lt-modal-btn-link" title="Insert Link" style="background:transparent;border:none;color:#aaa;width:28px;height:28px;display:flex;align-items:center;justify-content:center;cursor:pointer;border-radius:4px;transition:all 0.2s;"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg></button>
            </div>
          </div>
          <div id="lt-modal-approach" contenteditable="true" style="width:100%;min-height:120px;max-height:300px;padding:16px;color:#eee;font-family:inherit;font-size:14px;line-height:1.6;overflow-y:auto;outline:none;" placeholder="How did you solve this? (Paste images here)"></div>
        </div>
        <input type="file" id="lt-modal-img-input" accept="image/*" style="display:none;" multiple>
      </div>

      <div style="display:flex;gap:16px;margin-bottom:24px;">
        <div style="flex:1;">
          <label style="display:block;margin-bottom:6px;font-size:13px;color:#ccc;">Time Complexity</label>
          <input type="text" id="lt-modal-time" style="width:100%;background:#2a2a2a;border:1px solid #444;border-radius:6px;padding:10px;color:#eee;font-family:monospace;font-size:13px;" placeholder="O(N)">
        </div>
        <div style="flex:1;">
          <label style="display:block;margin-bottom:6px;font-size:13px;color:#ccc;">Space Complexity</label>
          <input type="text" id="lt-modal-space" style="width:100%;background:#2a2a2a;border:1px solid #444;border-radius:6px;padding:10px;color:#eee;font-family:monospace;font-size:13px;" placeholder="O(1)">
        </div>
      </div>

      <div style="display:flex;justify-content:flex-end;gap:12px;">
        <button id="lt-modal-cancel" style="background:transparent;border:1px solid #555;color:#ccc;padding:8px 16px;border-radius:6px;cursor:pointer;font-weight:500;">Cancel</button>
        <button id="lt-modal-save" style="background:#e94560;border:none;color:#fff;padding:8px 16px;border-radius:6px;cursor:pointer;font-weight:500;box-shadow:0 2px 8px rgba(233,69,96,0.3);">Save Solution</button>
      </div>
    `;

    overlay.appendChild(modal);
    document.body.appendChild(overlay);

    const approachEditor = document.getElementById('lt-modal-approach');
    const imgInput = document.getElementById('lt-modal-img-input');
    
    // Toolbar Command handlers
    modal.querySelectorAll('button[data-cmd]').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        document.execCommand(btn.dataset.cmd, false, null);
        approachEditor.focus();
      });
    });

    // Custom toolbar actions
    document.getElementById('lt-modal-btn-code').addEventListener('click', (e) => {
      e.preventDefault();
      const selection = window.getSelection();
      const range = selection.getRangeAt(0);
      const pre = document.createElement('pre');
      pre.style.background = '#1a1a1a';
      pre.style.padding = '10px';
      pre.style.borderRadius = '4px';
      pre.style.fontFamily = 'monospace';
      pre.textContent = selection.toString() || 'code here...';
      range.deleteContents();
      range.insertNode(pre);
      approachEditor.focus();
    });

    document.getElementById('lt-modal-btn-img').addEventListener('click', (e) => {
      e.preventDefault();
      imgInput.click();
    });

    document.getElementById('lt-modal-btn-link').addEventListener('click', (e) => {
      e.preventDefault();
      const url = prompt('Enter URL:');
      if (url) document.execCommand('createLink', false, url);
      approachEditor.focus();
    });

    imgInput.addEventListener('change', (e) => {
      Array.from(e.target.files).forEach(file => {
        const reader = new FileReader();
        reader.onload = (event) => {
          insertImageToEditor(event.target.result);
        };
        reader.readAsDataURL(file);
      });
      imgInput.value = '';
    });

    function insertImageToEditor(src) {
      const img = document.createElement('img');
      img.src = src;
      img.style.maxWidth = '100%';
      img.style.borderRadius = '4px';
      img.style.margin = '10px 0';
      img.className = 'rich-image';
      
      // Insert at cursor
      const selection = window.getSelection();
      if (selection.rangeCount && approachEditor.contains(selection.anchorNode)) {
        const range = selection.getRangeAt(0);
        range.insertNode(img);
        range.collapse(false);
      } else {
        approachEditor.appendChild(img);
      }
    }

    // Handle image pasting
    approachEditor.addEventListener('paste', (e) => {
      const items = (e.clipboardData || e.originalEvent.clipboardData).items;
      for (const item of items) {
        if (item.type.indexOf('image') !== -1) {
          e.preventDefault();
          const file = item.getAsFile();
          const reader = new FileReader();
          reader.onload = (event) => {
            insertImageToEditor(event.target.result);
          };
          reader.readAsDataURL(file);
        }
      }
    });

    document.getElementById('lt-modal-cancel').addEventListener('click', () => {
      overlay.remove();
    });

    document.getElementById('lt-modal-save').addEventListener('click', async () => {
      const type = document.getElementById('lt-modal-type').value;
      const approach = approachEditor.innerHTML;
      const time = document.getElementById('lt-modal-time').value;
      const space = document.getElementById('lt-modal-space').value;

      data.solutionType = type;
      data.intuition = approach;
      data.timeComplexity = time;
      data.spaceComplexity = space;

      overlay.remove();
      btn.innerHTML = `<span style="display:inline-flex;align-items:center;gap:6px;"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/></svg> Saving...</span>`;

      try {
        await chrome.runtime.sendMessage({
          type: 'SAVE_PROBLEM_SILENT',
          data: data
        });

        btn.classList.add('lt-save-btn--saved');
        btn.innerHTML = `${CHECK_ICON}<span>Saved!</span>`;

        setTimeout(() => {
          btn.classList.remove('lt-save-btn--saved');
          btn.innerHTML = `${SAVE_ICON}<span>Save to LeetTree</span>`;
        }, 3000);

        showToast('Solution saved to LeetTree!', 'success');
      } catch (error) {
        console.error('[LeetTree] Save error:', error);
        
        if (error.message && error.message.includes('Extension context invalidated')) {
          alert('LeetTree Notes was updated! Please refresh the LeetCode page to continue saving.');
          overlay.remove();
        } else {
          showToast('Error saving. Please try again.', 'error');
        }
        
        btn.innerHTML = `${SAVE_ICON}<span>Save to LeetTree</span>`;
      }
    });
  }

  // Show toast notification
  function showToast(message, type = 'info') {
    const existing = document.querySelector('.lt-toast');
    if (existing) existing.remove();

    const toast = document.createElement('div');
    toast.className = `lt-toast ${type === 'success' ? 'lt-toast--success' : ''}`;
    toast.textContent = message;
    document.body.appendChild(toast);

    setTimeout(() => toast.remove(), 3000);
  }

  // Wait for page to fully load then inject
  function waitAndInject() {
    const check = () => {
      const hasEditor = document.querySelector('.monaco-editor')
        || document.querySelector('[class*="editor"]')
        || document.querySelector('[data-cy="code-area"]');
      const hasTitle = document.querySelector('[data-cy="question-title"]')
        || document.querySelector('.text-title-large')
        || document.querySelector('div[class*="text-title"]');

      if (hasEditor || hasTitle) {
        injectButton();
      } else {
        setTimeout(check, 1000);
      }
    };
    check();
  }

  // Handle SPA navigation (LeetCode is a SPA)
  let lastUrl = location.href;
  const observer = new MutationObserver(() => {
    if (location.href !== lastUrl) {
      lastUrl = location.href;
      // Remove old button
      const oldBtn = document.querySelector('.lt-save-btn');
      if (oldBtn) oldBtn.remove();
      // Re-inject after navigation
      if (location.href.includes('/problems/')) {
        setTimeout(waitAndInject, 1500);
      }
    }
  });

  observer.observe(document.body, { childList: true, subtree: true });

  // Initial injection
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', waitAndInject);
  } else {
    waitAndInject();
  }
})();
