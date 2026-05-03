// LeetTree Notes — Main Application Orchestrator

import { Storage } from './storage.js';
import { TopicTree } from './topic-tree.js';
import { ProblemList } from './problem-list.js';
import { SolutionView } from './solution-view.js';
import { EditorModal } from './editor-modal.js';
import { createRichEditor } from './rich-editor.js';

class App {
  constructor() {
    this.init();
  }

  async init() {
    // Check for temp problem from content script
    const tempProblem = await Storage.getTempProblem();

    this.openTabs = []; // Array of problem objects
    this.activeTabId = null;

    // Initialize modules
    this.tree = new TopicTree('tree-container', Storage, {
      onSelectFolder: (id) => this.handleFolderSelect(id),
      onProblemMoved: (probId, folderId) => this.handleProblemMoved(probId, folderId)
    });

    this.problemList = new ProblemList('problem-list', Storage, {
      onSelectProblem: (problem) => this.handleProblemSelect(problem)
    });

    this.solutionView = new SolutionView('solution-view', 'solution-empty', Storage, {
      onEditSolution: (problem, solution) => this.editorModal.open(problem, solution),
      onAddSolution: (problem) => this.editorModal.open(problem, null),
      onDeleteProblem: (problemId) => this.handleDeleteProblem(problemId)
    });

    this.editorModal = new EditorModal(Storage, {
      onSave: (problemId) => this.handleSolutionSaved(problemId)
    });

    // Setup global UI
    this.setupUI();
    this.setupResizers();
    this.setupSearch();

    // Initial render
    await this.tree.render();
    await this.problemList.load();
    this.updateWelcomeStats();
    this.renderTagCloud();

    // Handle temp problem if exists
    if (tempProblem) {
      await this.handleIncomingProblem(tempProblem);
    } else {
      // Check URL parameters
      const urlParams = new URLSearchParams(window.location.search);
      if (urlParams.get('mode') === 'save') {
        // Just in case it was a bit slow to write to storage
        setTimeout(async () => {
          const delayedTemp = await Storage.getTempProblem();
          if (delayedTemp) await this.handleIncomingProblem(delayedTemp);
        }, 500);
      }
    }

    // Welcome Dashboard actions
    document.getElementById('btn-home-add-problem')?.addEventListener('click', () => {
      document.getElementById('btn-add-problem').click();
    });
    
    document.getElementById('btn-export-markdown')?.addEventListener('click', () => {
      this.exportAllToMarkdown();
    });

    // Listen for messages from background
    chrome.runtime.onMessage.addListener((msg) => {
      if (msg.type === 'LOAD_PROBLEM' && msg.data) {
        // Try getting temp problem again since data might be huge
        Storage.getTempProblem().then(prob => {
          if (prob) this.handleIncomingProblem(prob);
        });
      } else if (msg.type === 'RELOAD_PROBLEMS') {
        this.problemList.load();
        // If the active tab was updated silently, refresh it
        if (this.activeTabId) {
          Storage.getProblems().then(probs => {
            if (probs[this.activeTabId]) {
              this.solutionView.setProblem(probs[this.activeTabId]);
            }
          });
        }
      }
    });
  }

  // --- Handlers ---

  handleFolderSelect(id) {
    if (id === 'all') {
      this.problemList.setFilter('all');
      document.getElementById('problems-title').textContent = 'All Problems';
      this.setMainView(this.openTabs.length > 0 ? 'solution' : 'welcome');
    } else {
      this.problemList.setFilter('folder', id);
      const folder = this.tree.folders[id];
      document.getElementById('problems-title').textContent = folder ? folder.name : 'Problems';
      
      // Show topic notes if no problem is currently active, or if we want to force it
      // Let's make it show topic notes when a folder is explicitly clicked
      this.renderTopicNotes(id);
    }
  }

  handleProblemSelect(problem) {
    if (!problem) return;
    
    // Add to open tabs if not present
    if (!this.openTabs.find(t => t.id === problem.id)) {
      this.openTabs.push(problem);
    }
    this.activeTabId = problem.id;
    
    this.renderMainTabs();
    this.solutionView.setProblem(problem);
    this.setMainView('solution');
  }

  setMainView(mode) {
    const welcome = document.getElementById('solution-empty');
    const solution = document.getElementById('solution-view');
    const topicNotes = document.getElementById('topic-notes-view');
    
    if (welcome) welcome.style.display = mode === 'welcome' ? 'flex' : 'none';
    if (solution) solution.style.display = mode === 'solution' ? 'flex' : 'none';
    if (topicNotes) topicNotes.style.display = mode === 'topic-notes' ? 'block' : 'none';
  }

  async renderTopicNotes(folderId) {
    const folder = this.tree.folders[folderId];
    if (!folder) return;

    this.setMainView('topic-notes');
    
    document.getElementById('tn-title').innerHTML = `
      <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/></svg>
      ${folder.name} Notes
    `;

    const contentView = document.getElementById('tn-content-view');
    const editorContainer = document.getElementById('tn-editor-container');
    const editBtn = document.getElementById('tn-edit-btn');
    
    editorContainer.style.display = 'none';
    contentView.style.display = 'block';
    editBtn.style.display = 'block';

    if (folder.notes && folder.notes.trim()) {
      contentView.innerHTML = `<div class="rich-content">${folder.notes}</div>`;
    } else {
      contentView.innerHTML = `
        <div class="topic-notes-empty">
          <svg viewBox="0 0 24 24" width="48" height="48" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>
          <p>No notes for this topic yet.</p>
          <p style="font-size:13px; margin-top:8px;">Add patterns, formulas, and whiteboard drawings here.</p>
        </div>
      `;
    }

    // Edit logic
    editBtn.onclick = () => {
      contentView.style.display = 'none';
      editBtn.style.display = 'none';
      editorContainer.style.display = 'block';
      
      let currentNotes = folder.notes || '';
      const editorInstance = createRichEditor(document.getElementById('tn-rich-editor'), {
        value: currentNotes,
        onChange: (val) => currentNotes = val,
        placeholder: 'Write topic patterns, algorithms, or draw a whiteboard...'
      });

      document.getElementById('tn-cancel-btn').onclick = () => {
        this.renderTopicNotes(folderId); // Re-render without saving
      };

      document.getElementById('tn-save-btn').onclick = async () => {
        const finalNotes = editorInstance.getValue();
        await Storage.saveFolderNotes(folderId, finalNotes);
        this.tree.folders[folderId].notes = finalNotes; // update local cache
        this.renderTopicNotes(folderId);
      };
    };
  }

  handleProblemSelect(problem) {
    if (!problem) return;
    
    // Add to open tabs if not present
    if (!this.openTabs.find(t => t.id === problem.id)) {
      this.openTabs.push(problem);
    }
    this.activeTabId = problem.id;
    
    this.renderMainTabs();
    this.solutionView.setProblem(problem);
    this.setMainView('solution');
  }

  async handleSolutionSaved(problemId) {
    const problems = await Storage.getProblems();
    const updatedProblem = problems[problemId];
    
    // Update problem list
    this.problemList.setProblems(Object.values(problems));
    
    // Update open tabs with fresh data
    this.openTabs = this.openTabs.map(tab => tab.id === problemId ? updatedProblem : tab);
    
    // If it's the active tab, refresh the solution view
    if (this.activeTabId === problemId) {
      this.solutionView.setProblem(updatedProblem);
    }
    
    this.updateWelcomeStats();
    this.renderTagCloud();
    this.renderMainTabs();
  }

  async handleDeleteProblem(problemId) {
    await Storage.deleteProblem(problemId);
    
    // Remove from open tabs
    this.openTabs = this.openTabs.filter(t => t.id !== problemId);
    if (this.activeTabId === problemId) {
      this.activeTabId = this.openTabs.length > 0 ? this.openTabs[0].id : null;
    }
    
    // Reload everything
    const problems = await Storage.getProblems();
    this.problemList.setProblems(Object.values(problems));
    this.updateWelcomeStats();
    this.renderMainTabs();
    
    if (this.activeTabId) {
      this.solutionView.setProblem(problems[this.activeTabId]);
      this.setMainView('solution');
    } else {
      this.solutionView.setProblem(null);
      this.setMainView('welcome');
    }
  }

  async handleProblemMoved(problemId, folderId) {
    await Storage.moveProblem(problemId, folderId);
    // Refresh problem list to reflect folder change if needed
    const problems = await Storage.getProblems();
    this.problemList.setProblems(Object.values(problems));
  }

  renderMainTabs() {
    const container = document.getElementById('sv-main-tabs');
    if (this.openTabs.length === 0) {
      container.style.display = 'none';
      this.solutionView.setProblem(null);
      return;
    }
    
    container.style.display = 'flex';
    let html = '';
    this.openTabs.forEach(tab => {
      const isActive = tab.id === this.activeTabId;
      html += `
        <div class="sv-main-tab ${isActive ? 'active' : ''}" data-id="${tab.id}">
          <span class="sv-main-tab-title" title="${tab.title}">${tab.title}</span>
          <button class="sv-main-tab-close" data-close-id="${tab.id}">
            <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          </button>
        </div>
      `;
    });
    
    container.innerHTML = html;
    
    // Attach events
    container.querySelectorAll('.sv-main-tab').forEach(tabEl => {
      tabEl.addEventListener('click', async (e) => {
        // Prevent click if closing
        if (e.target.closest('.sv-main-tab-close')) return;
        
        const id = tabEl.dataset.id;
        this.activeTabId = id;
        this.renderMainTabs();
        
        // Refresh problem data from storage to ensure we have latest
        const probs = await Storage.getProblems();
        if (probs[id]) {
          this.solutionView.setProblem(probs[id]);
          // Highlight in list
          this.problemList.selectProblem(id, false); // false = don't trigger select event again
          this.setMainView('solution');
        }
      });
    });
    
    container.querySelectorAll('.sv-main-tab-close').forEach(closeBtn => {
      closeBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        const id = closeBtn.dataset.closeId;
        this.closeTab(id);
      });
    });
  }

  closeTab(id) {
    const index = this.openTabs.findIndex(t => t.id === id);
    if (index === -1) return;
    
    this.openTabs.splice(index, 1);
    
    if (this.openTabs.length === 0) {
      this.activeTabId = null;
    } else if (this.activeTabId === id) {
      // Pick next or previous
      const newActive = this.openTabs[index] || this.openTabs[index - 1];
      this.activeTabId = newActive.id;
    }
    
    this.renderMainTabs();
    
    if (this.activeTabId) {
      Storage.getProblems().then(probs => {
        if (probs[this.activeTabId]) {
          this.solutionView.setProblem(probs[this.activeTabId]);
          this.problemList.selectProblem(this.activeTabId, false);
          this.setMainView('solution');
        }
      });
    } else {
      this.solutionView.setProblem(null);
      this.problemList.selectProblem(null, false);
      
      // fallback to welcome or topic notes
      if (this.tree.selectedId && this.tree.selectedId !== 'all') {
        this.renderTopicNotes(this.tree.selectedId);
      } else {
        this.setMainView('welcome');
      }
    }
  }

  async handleDeleteProblem(problemId) {
    await Storage.deleteProblem(problemId);
    await this.problemList.load();
    this.closeTab(problemId);
  }

  async handleSolutionSaved(problemId) {
    await this.problemList.load();
    this.problemList.refreshProblem(problemId);
    
    // Refresh open tab data
    const probs = await Storage.getProblems();
    if (probs[problemId]) {
      const idx = this.openTabs.findIndex(t => t.id === problemId);
      if (idx !== -1) {
        this.openTabs[idx] = probs[problemId];
        this.renderMainTabs();
      }
      if (this.activeTabId === problemId) {
        this.solutionView.setProblem(probs[problemId]);
      }
    }
  }

  handleProblemMoved(probId, folderId) {
    this.problemList.load();
  }

  async handleIncomingProblem(tempProblem) {
    // Check if problem already exists by URL or slug
    let existing = await Storage.findProblemByUrl(tempProblem.url);
    
    if (existing) {
      // Pre-fill editor with temp problem code, but open for existing problem
      existing._tempCode = tempProblem.code;
      existing._tempLanguage = tempProblem.language;
      
      // Navigate to problem
      this.tree.selectFolder('all');
      this.problemList.setFilter('all');
      setTimeout(() => {
        this.problemList.selectProblem(existing.id);
        // Open editor
        this.editorModal.open(existing, null);
      }, 100);
    } else {
      // Create new problem
      const newProblem = await Storage.createProblem({
        title: tempProblem.title,
        number: tempProblem.number,
        slug: tempProblem.slug,
        difficulty: tempProblem.difficulty,
        url: tempProblem.url,
        folderId: 'root'
      });
      
      newProblem._tempCode = tempProblem.code;
      newProblem._tempLanguage = tempProblem.language;

      await this.problemList.load();
      this.tree.selectFolder('all');
      
      setTimeout(() => {
        this.problemList.selectProblem(newProblem.id);
        this.editorModal.open(newProblem, null);
      }, 100);
    }
  }

  // --- UI Setup ---

  setupUI() {
    // Filter Chips
    document.querySelectorAll('.filter-chip').forEach(chip => {
      chip.addEventListener('click', () => {
        const filter = chip.dataset.filter;
        
        // Update tree selection visually
        this.tree.selectedId = null;
        document.querySelectorAll('.tree-row').forEach(row => row.classList.remove('selected'));
        
        // Update chips
        document.querySelectorAll('.filter-chip').forEach(c => c.classList.remove('active'));
        chip.classList.add('active');

        // Apply filter
        if (filter === 'all') {
          this.problemList.setFilter('all');
          document.getElementById('problems-title').textContent = 'All Problems';
        } else {
          this.problemList.setFilter('filter', filter);
          document.getElementById('problems-title').textContent = filter === 'starred' ? 'Starred Problems' : 'Needs Revision';
        }
        
        this.solutionView.setProblem(null);
      });
    });

    // Sort Select
    document.getElementById('sort-select').addEventListener('change', (e) => {
      this.problemList.setSort(e.target.value);
    });

    // Add Folder
    document.getElementById('btn-add-folder').addEventListener('click', async () => {
      const name = prompt('Folder name:');
      if (name && name.trim()) {
        await Storage.createFolder(name.trim(), 'root');
        await this.tree.render();
      }
    });

    // Add Problem Modal
    const addProblemModal = document.getElementById('add-problem-modal');
    document.getElementById('btn-add-problem').addEventListener('click', async () => {
      // Populate folders
      const folders = await Storage.getFolders();
      const select = document.getElementById('ap-folder');
      select.innerHTML = '<option value="root">My Topics (Root)</option>';
      
      const buildOptions = (parentId, depth) => {
        const f = folders[parentId];
        if (!f || !f.children) return;
        f.children.forEach(childId => {
          const child = folders[childId];
          select.innerHTML += `<option value="${childId}">${'&nbsp;'.repeat(depth * 4)}${child.name}</option>`;
          buildOptions(childId, depth + 1);
        });
      };
      buildOptions('root', 1);

      // Pre-select current folder if applicable
      if (this.tree.selectedId && this.tree.selectedId !== 'all' && this.tree.selectedId !== 'root') {
        select.value = this.tree.selectedId;
      }

      addProblemModal.style.display = 'flex';
    });

    document.getElementById('add-problem-close').addEventListener('click', () => {
      addProblemModal.style.display = 'none';
      document.getElementById('add-problem-form').reset();
    });
    
    document.getElementById('ap-cancel').addEventListener('click', () => {
      addProblemModal.style.display = 'none';
      document.getElementById('add-problem-form').reset();
    });

    document.getElementById('add-problem-form').addEventListener('submit', async (e) => {
      e.preventDefault();
      
      const problem = await Storage.createProblem({
        title: document.getElementById('ap-title').value,
        number: document.getElementById('ap-number').value,
        difficulty: document.getElementById('ap-difficulty').value,
        url: document.getElementById('ap-url').value,
        folderId: document.getElementById('ap-folder').value
      });

      addProblemModal.style.display = 'none';
      document.getElementById('add-problem-form').reset();
      
      await this.problemList.load();
      this.problemList.selectProblem(problem.id);
    });

    // Export
    document.getElementById('btn-export').addEventListener('click', async () => {
      const data = await Storage.exportAll();
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `leettree-export-${new Date().toISOString().split('T')[0]}.json`;
      a.click();
      URL.revokeObjectURL(url);
    });

    // Import
    const importFile = document.getElementById('import-file');
    document.getElementById('btn-import').addEventListener('click', () => {
      importFile.click();
    });
    
    importFile.addEventListener('change', (e) => {
      const file = e.target.files[0];
      if (!file) return;
      
      const reader = new FileReader();
      reader.onload = async (event) => {
        try {
          const data = JSON.parse(event.target.result);
          if (data.folders && data.problems) {
            if (confirm('This will overwrite all current data. Are you sure?')) {
              await Storage.importAll(data);
              window.location.reload();
            }
          } else {
            alert('Invalid export file format.');
          }
        } catch (err) {
          alert('Error parsing JSON file.');
        }
      };
      reader.readAsText(file);
      importFile.value = '';
    });
  }

  setupResizers() {
    const handles = document.querySelectorAll('.resize-handle');
    const tree = document.getElementById('panel-tree');
    const problems = document.getElementById('panel-problems');
    
    handles.forEach(handle => {
      let isResizing = false;
      let startX, startWidth;
      const target = handle.dataset.resize; // 'tree' or 'problems'
      const el = target === 'tree' ? tree : problems;
      const originalMinWidth = parseInt(getComputedStyle(el).minWidth);

      handle.addEventListener('mousedown', (e) => {
        isResizing = true;
        startX = e.clientX;
        startWidth = el.offsetWidth;
        handle.classList.add('active');
        document.body.style.cursor = 'col-resize';
        e.preventDefault(); // prevent text selection
      });

      document.addEventListener('mousemove', (e) => {
        if (!isResizing) return;
        
        const diff = e.clientX - startX;
        let newWidth = startWidth + diff;
        
        // Collapse snap logic
        if (newWidth < originalMinWidth - 60) {
          el.classList.add('collapsed');
          el.style.width = '0px';
        } else {
          el.classList.remove('collapsed');
          
          // Enforce max widths
          const maxW = parseInt(getComputedStyle(el).maxWidth);
          if (newWidth < originalMinWidth) newWidth = originalMinWidth;
          if (newWidth > maxW) newWidth = maxW;
          
          el.style.width = `${newWidth}px`;
        }
      });

      document.addEventListener('mouseup', () => {
        if (isResizing) {
          isResizing = false;
          handle.classList.remove('active');
          document.body.style.cursor = '';
        }
      });
    });
  }

  setupSearch() {
    const searchInput = document.getElementById('search-input');
    const wrapper = document.getElementById('search-wrapper');

    // Ctrl+K shortcut
    document.addEventListener('keydown', (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        searchInput.focus();
      }
    });

    // Debounced search
    let timeout = null;
    searchInput.addEventListener('input', (e) => {
      clearTimeout(timeout);
      timeout = setTimeout(() => {
        const val = e.target.value.trim();
        if (val) {
          this.problemList.setFilter('search', val);
          document.getElementById('problems-title').textContent = 'Search Results';
        } else {
          // Revert to current tree selection
          this.handleFolderSelect(this.tree.selectedId || 'all');
        }
      }, 300);
    });
  }

  async updateWelcomeStats() {
    const problems = await Storage.getProblems();
    const problemList = Object.values(problems);
    
    const total = problemList.length;
    const starred = problemList.filter(p => p.starred).length;
    const revision = problemList.filter(p => p.revision).length;

    const elTotal = document.getElementById('stats-total');
    const elStarred = document.getElementById('stats-starred');
    const elRevision = document.getElementById('stats-revision');

    if (elTotal) elTotal.textContent = total;
    if (elStarred) elStarred.textContent = starred;
    if (elRevision) elRevision.textContent = revision;
  }

  async exportAllToMarkdown() {
    const problems = await Storage.getProblems();
    const problemList = Object.values(problems);
    
    if (problemList.length === 0) {
      alert('No problems to export!');
      return;
    }

    let md = `# LeetTree Notes — My Algorithmic Journey\n\n`;
    md += `Generated on: ${new Date().toLocaleDateString()}\n\n`;

    problemList.sort((a, b) => (a.number || 0) - (b.number || 0)).forEach(p => {
      md += `## ${p.number ? `${p.number}. ` : ''}${p.title}\n`;
      md += `- Difficulty: ${p.difficulty}\n`;
      md += `- URL: ${p.url}\n\n`;

      if (p.solutions && p.solutions.length > 0) {
        const typeOrder = { brute: 1, better: 2, optimal: 3, custom: 4 };
        const sortedSols = [...p.solutions].sort((a, b) => (typeOrder[a.type] || 5) - (typeOrder[b.type] || 5));
        
        sortedSols.forEach(s => {
          const typeLabel = s.type === 'custom' && s.customLabel ? s.customLabel : s.type.toUpperCase();
          md += `### ${typeLabel} Solution\n`;
          md += `- Time Complexity: ${s.timeComplexity || 'N/A'}\n`;
          md += `- Space Complexity: ${s.spaceComplexity || 'N/A'}\n\n`;
          
          if (s.approach) {
            md += `#### Approach\n${s.approach}\n\n`;
          }

          if (s.code) {
            md += `#### Code (${s.language})\n\`\`\`${s.language}\n${s.code}\n\`\`\`\n\n`;
          }
        });
      }
      md += `---\n\n`;
    });

    const blob = new Blob([md], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `LeetTree_Notes_${new Date().toISOString().split('T')[0]}.md`;
    a.click();
    URL.revokeObjectURL(url);
  }

  async renderTagCloud() {
    const container = document.getElementById('tag-cloud');
    if (!container) return;

    const tags = await Storage.getAllTags();
    
    if (tags.length === 0) {
      container.innerHTML = '<span style="font-size:11px;color:var(--text-muted);padding:4px 12px;">No tags yet. Add tags when editing a solution.</span>';
      return;
    }

    container.innerHTML = tags.map(tag => 
      `<button class="tag-cloud-chip" data-tag="${tag}">${tag}</button>`
    ).join('');

    container.querySelectorAll('.tag-cloud-chip').forEach(chip => {
      chip.addEventListener('click', () => {
        const isActive = chip.classList.contains('active');
        
        // Reset all chips
        container.querySelectorAll('.tag-cloud-chip').forEach(c => c.classList.remove('active'));
        
        // Also reset filter chips
        document.querySelectorAll('.filter-chip').forEach(c => c.classList.remove('active'));

        if (isActive) {
          // Deselect — go back to All
          document.querySelector('.filter-chip[data-filter="all"]')?.classList.add('active');
          this.problemList.setFilter('all');
          document.getElementById('problems-title').textContent = 'All Problems';
        } else {
          chip.classList.add('active');
          this.problemList.setFilter('tag', chip.dataset.tag);
          document.getElementById('problems-title').textContent = `🏷️ ${chip.dataset.tag}`;
        }
      });
    });
  }


}

// Start app
document.addEventListener('DOMContentLoaded', () => {
  window.app = new App();
});
