// LeetTree Notes — Problem List Module

export class ProblemList {
  constructor(containerId, storage, callbacks) {
    this.container = document.getElementById(containerId);
    this.storage = storage;
    this.callbacks = callbacks; // { onSelectProblem }
    this.problems = [];
    this.filteredProblems = [];
    this.selectedId = null;
    this.currentFilter = { type: 'all', val: null }; // type: all, folder, search, filter
    this.currentSort = 'recent';
  }

  async load() {
    const raw = await this.storage.getProblems();
    this.problems = Object.values(raw);
    this.applyFiltersAndSort();
  }

  setProblems(problems) {
    this.problems = problems;
    this.applyFiltersAndSort();
  }

  setFilter(type, val = null) {
    this.currentFilter = { type, val };
    this.applyFiltersAndSort();
  }

  setSort(sortType) {
    this.currentSort = sortType;
    this.applyFiltersAndSort();
  }

  applyFiltersAndSort() {
    // 1. Filter
    let filtered = [...this.problems];
    
    if (this.currentFilter.type === 'folder' && this.currentFilter.val !== 'all') {
      const targetFolder = this.currentFilter.val;
      filtered = filtered.filter(p => p.folderId === targetFolder);
    } else if (this.currentFilter.type === 'filter') {
      if (this.currentFilter.val === 'starred') filtered = filtered.filter(p => p.starred);
      if (this.currentFilter.val === 'revision') filtered = filtered.filter(p => p.revision);
    } else if (this.currentFilter.type === 'tag') {
      const tag = this.currentFilter.val;
      filtered = filtered.filter(p => (p.tags || []).includes(tag));
    } else if (this.currentFilter.type === 'search' && this.currentFilter.val) {
      const q = this.currentFilter.val.toLowerCase();
      filtered = filtered.filter(p => 
        p.title.toLowerCase().includes(q) || 
        p.number.toString().includes(q) ||
        p.difficulty.toLowerCase().includes(q) ||
        (p.tags || []).some(t => t.toLowerCase().includes(q)) ||
        p.solutions.some(s => s.approach.toLowerCase().includes(q) || s.type.includes(q))
      );
    }

    // 2. Sort
    filtered.sort((a, b) => {
      if (this.currentSort === 'recent') return b.updatedAt - a.updatedAt;
      if (this.currentSort === 'number') {
        const nA = parseInt(a.number) || 0;
        const nB = parseInt(b.number) || 0;
        return nA - nB;
      }
      if (this.currentSort === 'name') return a.title.localeCompare(b.title);
      
      const difficultyMap = { 'Easy': 1, 'Medium': 2, 'Hard': 3 };
      
      if (this.currentSort === 'difficulty-asc' || this.currentSort === 'difficulty') {
        return (difficultyMap[a.difficulty] || 0) - (difficultyMap[b.difficulty] || 0);
      }
      if (this.currentSort === 'difficulty-desc') {
        return (difficultyMap[b.difficulty] || 0) - (difficultyMap[a.difficulty] || 0);
      }
      
      if (this.currentSort === 'practice') {
        const calcScore = (p) => {
          let score = 0;
          // Massive priority for explicitly marked revision items
          if (p.revision) score += 10000;
          
          // High priority for starred/favorite items
          if (p.starred) score += 5000;
          
          // Higher difficulty needs more practice baseline
          const diffScores = { 'Easy': 100, 'Medium': 200, 'Hard': 300 };
          score += (diffScores[p.difficulty] || 0);
          
          // Time decay: Older items get higher priority (1 point per day)
          const daysOld = (Date.now() - p.updatedAt) / (1000 * 60 * 60 * 24);
          score += daysOld;
          
          return score;
        };
        
        return calcScore(b) - calcScore(a);
      }
      
      return 0;
    });

    this.filteredProblems = filtered;
    this.render();
  }

  render() {
    this.container.innerHTML = '';
    
    if (this.filteredProblems.length === 0) {
      this.container.innerHTML = `
        <div style="padding: 30px 20px; text-align: center; color: var(--text-muted);">
          <p>No problems found.</p>
        </div>
      `;
      return;
    }

    this.filteredProblems.forEach(p => {
      const card = document.createElement('div');
      card.className = `problem-card ${this.selectedId === p.id ? 'selected' : ''}`;
      card.dataset.id = p.id;
      card.draggable = true;

      const tagsHtml = (p.tags || []).length > 0 
        ? `<div class="pc-tags">${p.tags.map(t => `<span class="pc-tag">${t}</span>`).join('')}</div>` 
        : '';

      // Card content
      card.innerHTML = `
        <div class="pc-header">
          <div class="pc-title">
            ${p.number ? `<span class="pc-number">${p.number}.</span>` : ''}
            ${p.title}
          </div>
          <div class="pc-actions">
            <button class="pc-btn star ${p.starred ? 'active' : ''}" data-action="star" title="Star">
              <svg viewBox="0 0 24 24" width="14" height="14" fill="${p.starred ? 'currentColor' : 'none'}" stroke="currentColor" stroke-width="2"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>
            </button>
            <button class="pc-btn revision ${p.revision ? 'active' : ''}" data-action="revision" title="Needs Revision">
              <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2"><polyline points="1 4 1 10 7 10"/><polyline points="23 20 23 14 17 14"/><path d="M20.49 9A9 9 0 0 0 5.64 5.64L1 10m22 4l-4.64 4.36A9 9 0 0 1 3.51 15"/></svg>
            </button>
          </div>
        </div>
        <div class="pc-meta">
          <span class="difficulty diff-${p.difficulty}">${p.difficulty}</span>
          <span class="solution-count">
            <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>
            ${p.solutions.length}
          </span>
        </div>
        ${tagsHtml}
      `;

      // Events
      card.addEventListener('click', async (e) => {
        const btn = e.target.closest('.pc-btn');
        if (btn) {
          e.stopPropagation();
          const action = btn.dataset.action;
          if (action === 'star') {
            await this.storage.toggleStar(p.id);
          } else if (action === 'revision') {
            await this.storage.toggleRevision(p.id);
          }
          await this.load(); // Reload to update state
        } else {
          this.selectProblem(p.id);
        }
      });

      // Drag to tree
      card.addEventListener('dragstart', (e) => {
        e.dataTransfer.setData('text/plain', JSON.stringify({ type: 'problem', id: p.id }));
        e.dataTransfer.effectAllowed = 'move';
        setTimeout(() => card.style.opacity = '0.5', 0);
      });

      card.addEventListener('dragend', (e) => {
        card.style.opacity = '1';
      });

      this.container.appendChild(card);
    });
  }

  selectProblem(id) {
    this.selectedId = id;
    document.querySelectorAll('.problem-card').forEach(card => {
      card.classList.toggle('selected', card.dataset.id === id);
    });
    
    if (this.callbacks.onSelectProblem) {
      const problem = this.problems.find(p => p.id === id);
      this.callbacks.onSelectProblem(problem);
    }
  }

  refreshProblem(id) {
    this.load().then(() => {
      if (this.selectedId === id) {
        const problem = this.problems.find(p => p.id === id);
        if (problem && this.callbacks.onSelectProblem) {
          this.callbacks.onSelectProblem(problem);
        }
      }
    });
  }
}
