// LeetTree Notes — Editor Modal Module
import { createCodeEditor } from './code-editor.js';
import { createRichEditor } from './rich-editor.js';

export class EditorModal {
  constructor(storage, callbacks) {
    this.storage = storage;
    this.callbacks = callbacks; // { onSave }
    this.modal = document.getElementById('editor-modal');
    this.closeBtn = document.getElementById('modal-close');
    this.titleEl = document.getElementById('modal-title');
    this.bodyEl = document.getElementById('modal-body');
    
    this.problem = null;
    this.solution = null;
    this.codeEditor = null;
    this.richEditor = null;

    this.closeBtn.addEventListener('click', () => this.close());
    
    // Close on click outside
    this.modal.addEventListener('click', (e) => {
      if (e.target === this.modal) this.close();
    });
  }

  open(problem, solution = null) {
    this.problem = problem;
    this.solution = solution;
    
    this.titleEl.textContent = solution ? 'Edit Solution' : 'Add Solution';
    
    this.renderForm();
    this.modal.style.display = 'flex';
    
    // Initialize editors
    setTimeout(() => {
      const codeContainer = document.getElementById('ed-code-container');
      const richContainer = document.getElementById('ed-rich-container');
      
      this.codeEditor = createCodeEditor(codeContainer, {
        value: solution ? solution.code : (problem._tempCode || ''),
        language: solution ? solution.language : (problem._tempLanguage || 'javascript')
      });
      
      this.richEditor = createRichEditor(richContainer, {
        value: solution ? (solution.approach || solution.notes || '') : '',
        placeholder: 'Write your approach, intuition, and notes here...'
      });

      // Handle language change
      const langSelect = document.getElementById('ed-lang');
      langSelect.addEventListener('change', (e) => {
        this.codeEditor.setLanguage(e.target.value);
      });
      
      // Handle type change
      const typeSelect = document.getElementById('ed-type');
      const customLabelGrp = document.getElementById('ed-custom-label-grp');
      typeSelect.addEventListener('change', (e) => {
        if (e.target.value === 'custom') {
          customLabelGrp.style.display = 'block';
        } else {
          customLabelGrp.style.display = 'none';
        }
      });
      
      this.richEditor.focus();
    }, 50);
  }

  close() {
    this.modal.style.display = 'none';
    this.bodyEl.innerHTML = ''; // Cleanup
    this.problem = null;
    this.solution = null;
    this.codeEditor = null;
    this.richEditor = null;
  }

  renderForm() {
    const s = this.solution || {};
    const type = s.type || 'optimal';
    const lang = s.language || this.problem._tempLanguage || 'javascript';
    
    this.bodyEl.innerHTML = `
      <form id="editor-form">
        <div class="form-row">
          <div class="form-group">
            <label class="form-label">Solution Type</label>
            <select class="form-input" id="ed-type">
              <option value="brute" ${type === 'brute' ? 'selected' : ''}>Brute Force</option>
              <option value="better" ${type === 'better' ? 'selected' : ''}>Better</option>
              <option value="optimal" ${type === 'optimal' ? 'selected' : ''}>Optimal</option>
              <option value="custom" ${type === 'custom' ? 'selected' : ''}>Custom</option>
            </select>
          </div>
          <div class="form-group" id="ed-custom-label-grp" style="display: ${type === 'custom' ? 'block' : 'none'};">
            <label class="form-label">Custom Label</label>
            <input type="text" class="form-input" id="ed-custom-label" value="${s.customLabel || ''}" placeholder="e.g. Iterative DFS">
          </div>
        </div>

        <div class="form-row">
          <div class="form-group">
            <label class="form-label">Time Complexity</label>
            <input type="text" class="form-input" id="ed-time" value="${s.timeComplexity || ''}" placeholder="O(N)">
          </div>
          <div class="form-group">
            <label class="form-label">Space Complexity</label>
            <input type="text" class="form-input" id="ed-space" value="${s.spaceComplexity || ''}" placeholder="O(1)">
          </div>
        </div>

        <div class="form-group">
          <label class="form-label">Problem Tags (Comma separated)</label>
          <input type="text" class="form-input" id="ed-tags" value="${(this.problem.tags || []).join(', ')}" placeholder="Sliding Window, DP, Graph">
        </div>

        <div class="form-group">
          <label class="form-label">Approach & Notes</label>
          <div id="ed-rich-container"></div>
        </div>

        <div class="form-group">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px;">
            <label class="form-label" style="margin: 0;">Code</label>
            <select class="form-input" id="ed-lang" style="width: auto; padding: 4px 8px; font-size: 12px; background-position: right 4px center;">
              <option value="javascript" ${lang === 'javascript' ? 'selected' : ''}>JavaScript</option>
              <option value="python" ${lang === 'python' ? 'selected' : ''}>Python</option>
              <option value="cpp" ${lang === 'cpp' ? 'selected' : ''}>C++</option>
              <option value="java" ${lang === 'java' ? 'selected' : ''}>Java</option>
              <option value="typescript" ${lang === 'typescript' ? 'selected' : ''}>TypeScript</option>
              <option value="go" ${lang === 'go' ? 'selected' : ''}>Go</option>
              <option value="rust" ${lang === 'rust' ? 'selected' : ''}>Rust</option>
            </select>
          </div>
          <div id="ed-code-container"></div>
        </div>

        <div class="form-actions" style="margin-top: 16px; padding-top: 16px;">
          ${s.id ? `<button type="button" class="btn btn--ghost" id="ed-btn-delete" style="margin-right: auto; color: #f85149;">Delete</button>` : '<div></div>'}
          <button type="button" class="btn btn--ghost" id="ed-btn-cancel">Cancel</button>
          <button type="submit" class="btn btn--primary">Save Solution</button>
        </div>
      </form>
    `;

    const form = document.getElementById('editor-form');
    
    // Save
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      
      const data = {
        type: document.getElementById('ed-type').value,
        customLabel: document.getElementById('ed-custom-label').value,
        timeComplexity: document.getElementById('ed-time').value,
        spaceComplexity: document.getElementById('ed-space').value,
        language: document.getElementById('ed-lang').value,
        code: this.codeEditor.getValue(),
        approach: this.richEditor.getValue(),
        notes: '' // Storing everything in approach for now
      };

      if (this.solution) {
        await this.storage.updateSolution(this.problem.id, this.solution.id, data);
      } else {
        await this.storage.addSolution(this.problem.id, data);
      }

      // Save tags to the problem
      const tagsInput = document.getElementById('ed-tags');
      if (tagsInput) {
        const tags = tagsInput.value.split(',').map(t => t.trim()).filter(t => t.length > 0);
        await this.storage.updateProblemTags(this.problem.id, tags);
      }

      if (this.callbacks.onSave) {
        this.callbacks.onSave(this.problem.id);
      }
      this.close();
    });

    // Cancel
    document.getElementById('ed-btn-cancel').addEventListener('click', () => this.close());

    // Delete
    const delBtn = document.getElementById('ed-btn-delete');
    if (delBtn) {
      delBtn.addEventListener('click', async () => {
        if (confirm('Are you sure you want to delete this solution?')) {
          await this.storage.deleteSolution(this.problem.id, this.solution.id);
          if (this.callbacks.onSave) {
            this.callbacks.onSave(this.problem.id);
          }
          this.close();
        }
      });
    }
  }
}
