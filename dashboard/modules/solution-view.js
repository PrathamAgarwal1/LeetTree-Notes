// LeetTree Notes — Solution View Module
import { highlightCode } from './code-editor.js';

export class SolutionView {
  constructor(containerId, emptyId, storage, callbacks) {
    this.container = document.getElementById(containerId);
    this.emptyState = document.getElementById(emptyId);
    this.storage = storage;
    this.callbacks = callbacks; // { onEditSolution, onAddSolution, onDeleteProblem }
    this.problem = null;
    this.activeSolutionId = null;
    this.codeHidden = true; // Active Recall mode ON by default
  }

  setProblem(problem) {
    this.problem = problem;
    if (!problem) {
      return;
    }

    // Set active solution (default to question) and reset code visibility
    this.activeSolutionId = 'question';
    this.codeHidden = true;
    this.render();
  }

  render() {
    if (!this.problem) return;

    // Header
    const tags = this.problem.tags || [];
    const diffClass = `diff-${this.problem.difficulty}`;
    let html = `
      <div class="sv-header">
        <div class="sv-title-row">
          <h2 class="sv-title">
            ${this.problem.number ? `<span class="sv-num">${this.problem.number}.</span> ` : ''}${this.problem.title}
            <span class="difficulty ${diffClass}" style="margin-left:10px;font-size:12px;">${this.problem.difficulty}</span>
          </h2>
          <div class="sv-actions">
            ${this.problem.url ? `<a href="${this.problem.url}" target="_blank" class="btn btn--ghost" title="Open in LeetCode"><svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg> LC</a>` : ''}
            <button class="btn btn--ghost" id="sv-btn-delete" title="Delete Problem"><svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg></button>
          </div>
        </div>
        ${tags.length > 0 ? `<div class="sv-tags">${tags.map(t => `<span class="sv-tag">${t}</span>`).join('')}</div>` : ''}
      </div>
    `;

    // Tabs
    html += `<div class="sv-tabs">`;
    html += `<button class="sv-tab ${this.activeSolutionId === 'question' ? 'active' : ''}" data-id="question">Question</button>`;
    
    if (this.problem.solutions && this.problem.solutions.length > 0) {
      // Sort solutions: Brute -> Better -> Optimal -> Custom
      const typeOrder = { brute: 1, better: 2, optimal: 3, custom: 4 };
      const sortedSols = [...this.problem.solutions].sort((a, b) => (typeOrder[a.type] || 5) - (typeOrder[b.type] || 5));

      sortedSols.forEach(s => {
        const label = s.type === 'custom' && s.customLabel ? s.customLabel : s.type.charAt(0).toUpperCase() + s.type.slice(1);
        const isActive = s.id === this.activeSolutionId;
        html += `<button class="sv-tab ${isActive ? 'active' : ''}" data-id="${s.id}">${label}</button>`;
      });
    }
    html += `<button class="sv-tab-add" id="sv-btn-add-sol" title="Add Solution"><svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg></button>`;
    html += `</div>`;

    // Content area
    html += `<div class="sv-content">`;

    if (this.activeSolutionId === 'question') {
      // Render Question Description
      const content = this.problem.description || '<p style="color: var(--text-muted); text-align: center; padding: 20px;">No description saved.</p>';
      html += `
        <div class="sv-section">
          <div class="sv-section-header">
            <span class="sv-section-title">Problem Description</span>
          </div>
          <div class="sv-approach">${content}</div>
        </div>
      `;
    } else {
      const activeSol = this.problem.solutions?.find(s => s.id === this.activeSolutionId);

      if (!activeSol) {
        html += `
          <div style="text-align: center; padding: 40px; color: var(--text-muted);">
            <p style="margin-bottom: 16px;">No solutions saved yet.</p>
            <button class="btn btn--primary" id="sv-btn-add-sol-lg">Add Solution</button>
          </div>
        `;
      } else {
        // Complexity
        if (activeSol.timeComplexity || activeSol.spaceComplexity) {
          html += `
            <div class="sv-section">
              <div class="sv-section-header" style="cursor:pointer; user-select:none;">
                <span class="sv-section-title"><svg class="sv-chevron" viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" style="margin-right:6px; transition:transform 0.2s; vertical-align:middle; transform:rotate(90deg);"><polyline points="9 18 15 12 9 6"/></svg>Complexity</span>
              </div>
              <div class="sv-section-content">
                <div class="sv-comp">
                  ${activeSol.timeComplexity ? `<div class="sv-comp-item"><span class="sv-comp-label">Time:</span> <span class="sv-comp-val">${this.formatComplexity(activeSol.timeComplexity)}</span></div>` : ''}
                  ${activeSol.spaceComplexity ? `<div class="sv-comp-item"><span class="sv-comp-label">Space:</span> <span class="sv-comp-val">${this.formatComplexity(activeSol.spaceComplexity)}</span></div>` : ''}
                </div>
              </div>
            </div>
          `;
        }

        // Approach/Notes (Rich Text)
        if (activeSol.approach || activeSol.notes) {
          const content = activeSol.approach || activeSol.notes;
          html += `
            <div class="sv-section">
              <div class="sv-section-header" style="cursor:pointer; user-select:none;">
                <span class="sv-section-title"><svg class="sv-chevron" viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" style="margin-right:6px; transition:transform 0.2s; vertical-align:middle; transform:rotate(90deg);"><polyline points="9 18 15 12 9 6"/></svg>Approach & Notes</span>
              </div>
              <div class="sv-section-content">
                <div class="sv-approach">${content}</div>
              </div>
            </div>
          `;
        }

        // Code
        if (activeSol.code) {
          const highlightedCode = highlightCode(activeSol.code, activeSol.language);
          html += `
            <div class="sv-section">
              <div class="sv-section-header" style="cursor:pointer; user-select:none;">
                <span class="sv-section-title"><svg class="sv-chevron" viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" style="margin-right:6px; transition:transform 0.2s; vertical-align:middle; transform:rotate(90deg);"><polyline points="9 18 15 12 9 6"/></svg>Code (${activeSol.language})</span>
                <div class="sv-section-actions">
                  <button class="btn btn--ghost sv-recall-btn ${this.codeHidden ? 'active' : ''}" id="sv-btn-recall" title="Active Recall: Hide/Reveal Code">
                    <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2">${this.codeHidden ? '<path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/>' : '<path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/>'}</svg>
                    ${this.codeHidden ? 'Reveal' : 'Hide'}
                  </button>
                  <button class="btn btn--ghost" id="sv-btn-copy-code" title="Copy Code">
                    <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
                  </button>
                  <button class="btn btn--primary" id="sv-btn-edit">Edit Solution</button>
                </div>
              </div>
              <div class="sv-section-content">
                <div class="code-editor-wrapper code-viewer ${this.codeHidden ? 'code-hidden' : ''}">
                  <div class="code-line-numbers">
                    ${Array.from({ length: activeSol.code.split('\n').length }, (_, i) => `<span class="line-num">${i + 1}</span>`).join('')}
                  </div>
                  <div class="code-editor-area">
                    <pre class="code-highlight-layer"><code>${highlightedCode}</code></pre>
                  </div>
                  ${this.codeHidden ? '<div class="code-recall-overlay"><div class="code-recall-msg"><svg viewBox="0 0 24 24" width="32" height="32" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg><span>Active Recall Mode</span><small>Try to recall the logic before revealing</small><button class="btn btn--primary" id="sv-btn-reveal">Click to Reveal</button></div></div>' : ''}
                </div>
              </div>
            </div>
          `;
        } else {
          html += `
            <div style="margin-top: 16px; text-align: right;">
              <button class="btn btn--primary" id="sv-btn-edit">Edit Solution</button>
            </div>
          `;
        }
      }
    }

    html += `</div>`;
    
    // Save scroll position
    const scrollTop = this.container.scrollTop;
    
    this.container.innerHTML = html;
    
    // Restore scroll position
    this.container.scrollTop = scrollTop;

    this.attachEvents(this.problem.solutions?.find(s => s.id === this.activeSolutionId));
  }

  formatComplexity(text) {
    // Basic formatting to make O(N) look nicer if it's plain text
    if (!text.startsWith('O(') && !text.startsWith('O (')) {
      return `O(${text})`;
    }
    return text;
  }

  attachEvents(activeSol) {
    // Tabs
    this.container.querySelectorAll('.sv-tab[data-id]').forEach(tab => {
      tab.addEventListener('click', () => {
        this.activeSolutionId = tab.dataset.id;
        this.render();
      });
    });

    // Accordions
    this.container.querySelectorAll('.sv-section-header').forEach(header => {
      header.addEventListener('click', (e) => {
        // Prevent toggling if clicking a button inside header
        if (e.target.closest('button')) return;
        
        const content = header.nextElementSibling;
        const chevron = header.querySelector('.sv-chevron');
        if (content && content.classList.contains('sv-section-content')) {
          if (content.style.display === 'none') {
            content.style.display = 'block';
            if (chevron) chevron.style.transform = 'rotate(90deg)';
          } else {
            content.style.display = 'none';
            if (chevron) chevron.style.transform = 'rotate(0deg)';
          }
        }
      });
    });

    // Add Solution
    const addBtn = this.container.querySelector('#sv-btn-add-sol');
    const addBtnLg = this.container.querySelector('#sv-btn-add-sol-lg');
    const onAdd = () => {
      if (this.callbacks.onAddSolution) this.callbacks.onAddSolution(this.problem);
    };
    if (addBtn) addBtn.addEventListener('click', onAdd);
    if (addBtnLg) addBtnLg.addEventListener('click', onAdd);

    // Edit Solution
    const editBtn = this.container.querySelector('#sv-btn-edit');
    if (editBtn && activeSol) {
      editBtn.addEventListener('click', () => {
        if (this.callbacks.onEditSolution) this.callbacks.onEditSolution(this.problem, activeSol);
      });
    }

    // Delete Problem
    const delBtn = this.container.querySelector('#sv-btn-delete');
    if (delBtn) {
      delBtn.addEventListener('click', () => {
        if (confirm(`Are you sure you want to delete "${this.problem.title}"?`)) {
          if (this.callbacks.onDeleteProblem) this.callbacks.onDeleteProblem(this.problem.id);
        }
      });
    }

    // Copy Code
    const copyBtn = this.container.querySelector('#sv-btn-copy-code');
    if (copyBtn && activeSol) {
      copyBtn.addEventListener('click', () => {
        navigator.clipboard.writeText(activeSol.code);
        const icon = copyBtn.innerHTML;
        copyBtn.innerHTML = '<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20 6 9 17 4 12"/></svg>';
        setTimeout(() => copyBtn.innerHTML = icon, 2000);
      });
    }

    // Active Recall toggle
    const recallBtn = this.container.querySelector('#sv-btn-recall');
    if (recallBtn) {
      recallBtn.addEventListener('click', () => {
        this.codeHidden = !this.codeHidden;
        this.render();
      });
    }
    const revealBtn = this.container.querySelector('#sv-btn-reveal');
    if (revealBtn) {
      revealBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        this.codeHidden = false;
        this.render();
      });
    }

    // Image Modal handling inside rich text
    this.container.querySelectorAll('.rich-image').forEach(img => {
      img.addEventListener('click', () => {
        const modal = document.createElement('div');
        modal.className = 'image-modal-overlay';
        modal.innerHTML = `
          <div class="image-modal-content">
            <img src="${img.src}" alt="Full size">
            <button class="image-modal-close">×</button>
          </div>
        `;
        modal.addEventListener('click', (e) => {
          if (e.target === modal || e.target.classList.contains('image-modal-close')) {
            modal.remove();
          }
        });
        document.body.appendChild(modal);
        requestAnimationFrame(() => modal.classList.add('active'));
      });
    });
  }
}
