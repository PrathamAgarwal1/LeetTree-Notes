// LeetTree Notes — Storage Module
// Handles all CRUD operations for folders, problems, and solutions

export class Storage {
  static async getFolders() {
    return new Promise(resolve => {
      chrome.storage.local.get('lt_folders', r => {
        resolve(r.lt_folders || { root: { id: 'root', name: 'My Topics', parentId: null, children: [], order: 0, expanded: true } });
      });
    });
  }

  static async saveFolders(folders) {
    return new Promise(resolve => chrome.storage.local.set({ lt_folders: folders }, resolve));
  }

  static async createFolder(name, parentId = 'root') {
    const folders = await this.getFolders();
    const id = 'f_' + Date.now() + '_' + Math.random().toString(36).substr(2, 6);
    folders[id] = { id, name, parentId, children: [], order: folders[parentId]?.children?.length || 0, expanded: false };
    if (folders[parentId]) folders[parentId].children.push(id);
    await this.saveFolders(folders);
    return folders[id];
  }

  static async renameFolder(folderId, newName) {
    const folders = await this.getFolders();
    if (folders[folderId]) { folders[folderId].name = newName; await this.saveFolders(folders); }
  }

  static async deleteFolder(folderId) {
    if (folderId === 'root') return;
    const folders = await this.getFolders();
    const problems = await this.getProblems();
    const del = (id) => {
      const f = folders[id]; if (!f) return;
      f.children.forEach(c => del(c));
      Object.values(problems).forEach(p => { if (p.folderId === id) p.folderId = 'root'; });
      delete folders[id];
    };
    const parent = folders[folders[folderId]?.parentId];
    if (parent) parent.children = parent.children.filter(id => id !== folderId);
    del(folderId);
    await this.saveFolders(folders);
    await this.saveProblems(problems);
  }

  static async toggleFolderExpand(folderId) {
    const folders = await this.getFolders();
    if (folders[folderId]) { folders[folderId].expanded = !folders[folderId].expanded; await this.saveFolders(folders); }
  }

  static async moveFolder(folderId, newParentId) {
    if (folderId === 'root' || folderId === newParentId) return;
    const folders = await this.getFolders();
    const folder = folders[folderId]; if (!folder) return;
    let check = newParentId;
    while (check) { if (check === folderId) return; check = folders[check]?.parentId; }
    const oldParent = folders[folder.parentId];
    if (oldParent) oldParent.children = oldParent.children.filter(id => id !== folderId);
    folder.parentId = newParentId;
    if (folders[newParentId]) folders[newParentId].children.push(folderId);
    await this.saveFolders(folders);
  }

  static async saveFolderNotes(folderId, notesHtml) {
    const folders = await this.getFolders();
    if (folders[folderId]) {
      folders[folderId].notes = notesHtml;
      await this.saveFolders(folders);
    }
  }

  static async getProblems() {
    return new Promise(resolve => {
      chrome.storage.local.get('lt_problems', r => resolve(r.lt_problems || {}));
    });
  }

  static async saveProblems(problems) {
    return new Promise(resolve => chrome.storage.local.set({ lt_problems: problems }, resolve));
  }

  static async createProblem(data) {
    const problems = await this.getProblems();
    const id = 'p_' + Date.now() + '_' + Math.random().toString(36).substr(2, 6);
    const problem = {
      id, title: data.title || 'Untitled', number: data.number || '', slug: data.slug || '',
      difficulty: data.difficulty || 'Medium', url: data.url || '', folderId: data.folderId || 'root',
      starred: false, revision: false, tags: data.tags || [], solutions: [],
      createdAt: Date.now(), updatedAt: Date.now()
    };
    problems[id] = problem;
    await this.saveProblems(problems);
    return problem;
  }

  static async saveProblem(problem) {
    const problems = await this.getProblems();
    problems[problem.id] = problem;
    await this.saveProblems(problems);
    return problem;
  }

  static async deleteProblem(problemId) {
    const problems = await this.getProblems();
    delete problems[problemId];
    await this.saveProblems(problems);
  }

  static async moveProblem(problemId, newFolderId) {
    const problems = await this.getProblems();
    if (problems[problemId]) {
      problems[problemId].folderId = newFolderId;
      problems[problemId].updatedAt = Date.now();
      await this.saveProblems(problems);
    }
  }

  static async toggleStar(problemId) {
    const problems = await this.getProblems();
    if (problems[problemId]) {
      problems[problemId].starred = !problems[problemId].starred;
      await this.saveProblems(problems);
      return problems[problemId].starred;
    }
    return false;
  }

  static async toggleRevision(problemId) {
    const problems = await this.getProblems();
    if (problems[problemId]) {
      problems[problemId].revision = !problems[problemId].revision;
      await this.saveProblems(problems);
      return problems[problemId].revision;
    }
    return false;
  }

  static async findProblemByUrl(url) {
    const problems = await this.getProblems();
    const norm = url.split('?')[0].replace(/\/$/, '');
    return Object.values(problems).find(p => p.url.split('?')[0].replace(/\/$/, '') === norm);
  }

  static async addSolution(problemId, data) {
    const problems = await this.getProblems();
    const problem = problems[problemId]; if (!problem) return null;
    const solution = {
      id: 's_' + Date.now() + '_' + Math.random().toString(36).substr(2, 6),
      type: data.type || 'optimal', customLabel: data.customLabel || '',
      approach: data.approach || '', code: data.code || '', language: data.language || 'javascript',
      timeComplexity: data.timeComplexity || '', spaceComplexity: data.spaceComplexity || '',
      notes: data.notes || '', createdAt: Date.now(), updatedAt: Date.now()
    };
    problem.solutions.push(solution);
    problem.updatedAt = Date.now();
    await this.saveProblems(problems);
    return solution;
  }

  static async updateSolution(problemId, solutionId, updates) {
    const problems = await this.getProblems();
    const problem = problems[problemId]; if (!problem) return null;
    const idx = problem.solutions.findIndex(s => s.id === solutionId);
    if (idx === -1) return null;
    Object.assign(problem.solutions[idx], updates, { updatedAt: Date.now() });
    problem.updatedAt = Date.now();
    await this.saveProblems(problems);
    return problem.solutions[idx];
  }

  static async deleteSolution(problemId, solutionId) {
    const problems = await this.getProblems();
    const problem = problems[problemId]; if (!problem) return;
    problem.solutions = problem.solutions.filter(s => s.id !== solutionId);
    problem.updatedAt = Date.now();
    await this.saveProblems(problems);
  }

  static async searchProblems(query) {
    const problems = await this.getProblems();
    const q = query.toLowerCase().trim();
    if (!q) return Object.values(problems);
    return Object.values(problems).filter(p =>
      p.title.toLowerCase().includes(q) || p.number.toString().includes(q) ||
      p.difficulty.toLowerCase().includes(q) ||
      (p.tags || []).some(t => t.toLowerCase().includes(q)) ||
      p.solutions.some(s => s.approach.toLowerCase().includes(q) || s.type.includes(q))
    );
  }

  static async getTempProblem() {
    return new Promise(resolve => {
      chrome.storage.local.get('_tempProblem', r => {
        resolve(r._tempProblem || null);
        chrome.storage.local.remove('_tempProblem');
      });
    });
  }

  static async updateProblemTags(problemId, tags) {
    const problems = await this.getProblems();
    if (problems[problemId]) {
      problems[problemId].tags = tags;
      problems[problemId].updatedAt = Date.now();
      await this.saveProblems(problems);
    }
  }

  static async getAllTags() {
    const problems = await this.getProblems();
    const tagSet = new Set();
    Object.values(problems).forEach(p => {
      (p.tags || []).forEach(t => tagSet.add(t));
    });
    return Array.from(tagSet).sort();
  }

  static async getSettings() {
    return new Promise(resolve => {
      chrome.storage.local.get('lt_settings', r => {
        resolve(r.lt_settings || {});
      });
    });
  }

  static async saveSettings(settings) {
    return new Promise(resolve => chrome.storage.local.set({ lt_settings: settings }, resolve));
  }

  static async exportAll() {
    return new Promise(resolve => {
      chrome.storage.local.get(['lt_folders', 'lt_problems', 'lt_settings'], r => {
        resolve({ folders: r.lt_folders, problems: r.lt_problems, settings: r.lt_settings, exportedAt: Date.now() });
      });
    });
  }

  static async importAll(data) {
    return new Promise(resolve => {
      chrome.storage.local.set({ lt_folders: data.folders, lt_problems: data.problems, lt_settings: data.settings }, resolve);
    });
  }
}
