// LeetTree Notes — Rich Text Editor
// contenteditable-based rich text editor with image support

import { Whiteboard } from './whiteboard.js';

export function createRichEditor(container, options = {}) {
  const { value = '', onChange = null, placeholder = 'Write your notes here...' } = options;
  container.innerHTML = '';
  container.classList.add('rich-editor-wrapper');

  // Toolbar
  const toolbar = document.createElement('div');
  toolbar.className = 'rich-toolbar';
  toolbar.innerHTML = `
    <div class="rich-toolbar-group">
      <button type="button" data-cmd="bold" title="Bold (Ctrl+B)" class="rich-tb-btn"><strong>B</strong></button>
      <button type="button" data-cmd="italic" title="Italic (Ctrl+I)" class="rich-tb-btn"><em>I</em></button>
      <button type="button" data-cmd="underline" title="Underline (Ctrl+U)" class="rich-tb-btn"><u>U</u></button>
      <button type="button" data-cmd="strikeThrough" title="Strikethrough" class="rich-tb-btn"><s>S</s></button>
    </div>
    <div class="rich-toolbar-sep"></div>
    <div class="rich-toolbar-group">
      <button type="button" data-cmd="formatBlock" data-val="H2" title="Heading" class="rich-tb-btn">H</button>
      <button type="button" data-cmd="formatBlock" data-val="H3" title="Subheading" class="rich-tb-btn rich-tb-btn--sm">H₂</button>
    </div>
    <div class="rich-toolbar-sep"></div>
    <div class="rich-toolbar-group">
      <button type="button" data-cmd="insertUnorderedList" title="Bullet List" class="rich-tb-btn">
        <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2"><line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><circle cx="4" cy="6" r="1.5" fill="currentColor"/><circle cx="4" cy="12" r="1.5" fill="currentColor"/><circle cx="4" cy="18" r="1.5" fill="currentColor"/></svg>
      </button>
      <button type="button" data-cmd="insertOrderedList" title="Numbered List" class="rich-tb-btn">
        <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2"><line x1="10" y1="6" x2="21" y2="6"/><line x1="10" y1="12" x2="21" y2="12"/><line x1="10" y1="18" x2="21" y2="18"/><text x="2" y="8" font-size="8" fill="currentColor" stroke="none">1</text><text x="2" y="14" font-size="8" fill="currentColor" stroke="none">2</text><text x="2" y="20" font-size="8" fill="currentColor" stroke="none">3</text></svg>
      </button>
    </div>
    <div class="rich-toolbar-sep"></div>
    <div class="rich-toolbar-group">
      <button type="button" data-action="code" title="Code Block" class="rich-tb-btn">
        <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2"><polyline points="16 18 22 12 16 6"/><polyline points="8 6 2 12 8 18"/></svg>
      </button>
      <button type="button" data-action="image" title="Insert Image" class="rich-tb-btn">
        <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>
      </button>
      <button type="button" data-action="link" title="Insert Link" class="rich-tb-btn">
        <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>
      </button>
      <button type="button" data-action="whiteboard" title="Open Whiteboard" class="rich-tb-btn">
        <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 19l7-7 3 3-7 7-3-3z"/><path d="M18 13l-1.5-7.5L2 2l3.5 14.5L13 18l5-5z"/><path d="M2 2l7.586 7.586"/><circle cx="11" cy="11" r="2"/></svg>
      </button>
    </div>
  `;

  // Hidden file input for image upload
  const fileInput = document.createElement('input');
  fileInput.type = 'file';
  fileInput.accept = 'image/*';
  fileInput.style.display = 'none';
  fileInput.multiple = true;

  // Editor area
  const editor = document.createElement('div');
  editor.className = 'rich-editor-content';
  editor.contentEditable = true;
  editor.innerHTML = value || `<p>${placeholder}</p>`;
  editor.setAttribute('data-placeholder', placeholder);

  container.appendChild(toolbar);
  container.appendChild(editor);
  container.appendChild(fileInput);

  // Toolbar click handlers
  toolbar.addEventListener('click', (e) => {
    const btn = e.target.closest('button');
    if (!btn) return;

    const cmd = btn.dataset.cmd;
    const val = btn.dataset.val;
    const action = btn.dataset.action;

    if (cmd) {
      document.execCommand(cmd, false, val || null);
    } else if (action === 'code') {
      insertCodeBlock();
    } else if (action === 'image') {
      fileInput.click();
    } else if (action === 'link') {
      const url = prompt('Enter URL:');
      if (url) document.execCommand('createLink', false, url);
    } else if (action === 'whiteboard') {
      openWhiteboard();
    }

    editor.focus();
    if (onChange) onChange(editor.innerHTML);
  });

  // Insert code block
  function insertCodeBlock() {
    const selection = window.getSelection();
    const range = selection.rangeCount > 0 ? selection.getRangeAt(0) : null;
    const pre = document.createElement('pre');
    const code = document.createElement('code');
    code.textContent = selection.toString() || 'code here...';
    pre.appendChild(code);
    pre.className = 'rich-code-block';
    if (range && editor.contains(range.commonAncestorContainer)) {
      range.deleteContents();
      range.insertNode(pre);
      // Move cursor after the block
      const newRange = document.createRange();
      newRange.setStartAfter(pre);
      newRange.collapse(true);
      selection.removeAllRanges();
      selection.addRange(newRange);
    } else {
      editor.appendChild(pre);
    }
  }

  function openWhiteboard() {
    const modal = document.getElementById('wb-modal');
    const container = document.getElementById('wb-container');
    if (!modal || !container) return;

    modal.style.display = 'flex';
    const wb = new Whiteboard(container, {
      width: container.clientWidth,
      height: container.clientHeight - 48, // Adjust for toolbar
      onSave: (dataUrl) => {
        modal.style.display = 'none';
        insertImageBase64(dataUrl);
        if (onChange) onChange(editor.innerHTML);
      }
    });
    
    // Cleanup if closed by other means (e.g., clicking outside)
    modal.onclick = (e) => {
      if (e.target === modal) {
        wb.destroy();
        container.innerHTML = '';
        modal.style.display = 'none';
      }
    };
  }

  // File input change handler
  fileInput.addEventListener('change', (e) => {
    Array.from(e.target.files).forEach(file => insertImageFile(file));
    fileInput.value = '';
  });

  // Insert image from file
  function insertImageFile(file) {
    if (!file.type.startsWith('image/')) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      insertImageBase64(e.target.result);
    };
    reader.readAsDataURL(file);
  }

  // Insert base64 image into editor
  function insertImageBase64(base64) {
    const wrapper = document.createElement('div');
    wrapper.className = 'rich-image-wrapper';
    wrapper.contentEditable = false;

    const img = document.createElement('img');
    img.src = base64;
    img.className = 'rich-image';
    img.addEventListener('click', () => showImageModal(base64));

    const removeBtn = document.createElement('button');
    removeBtn.className = 'rich-image-remove';
    removeBtn.innerHTML = '×';
    removeBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      wrapper.remove();
      if (onChange) onChange(editor.innerHTML);
    });

    wrapper.appendChild(img);
    wrapper.appendChild(removeBtn);

    const selection = window.getSelection();
    if (selection.rangeCount > 0) {
      const range = selection.getRangeAt(0);
      if (editor.contains(range.commonAncestorContainer)) {
        range.collapse(false);
        range.insertNode(wrapper);
        const newRange = document.createRange();
        newRange.setStartAfter(wrapper);
        newRange.collapse(true);
        selection.removeAllRanges();
        selection.addRange(newRange);
      } else {
        editor.appendChild(wrapper);
      }
    } else {
      editor.appendChild(wrapper);
    }

    if (onChange) onChange(editor.innerHTML);
  }

  // Full-size image modal
  function showImageModal(src) {
    const modal = document.createElement('div');
    modal.className = 'image-modal-overlay';
    modal.innerHTML = `
      <div class="image-modal-content">
        <img src="${src}" alt="Full size">
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
  }

  // Drag and drop images
  editor.addEventListener('dragover', (e) => {
    e.preventDefault();
    editor.classList.add('drag-over');
  });

  editor.addEventListener('dragleave', () => {
    editor.classList.remove('drag-over');
  });

  editor.addEventListener('drop', (e) => {
    e.preventDefault();
    editor.classList.remove('drag-over');
    const files = e.dataTransfer.files;
    Array.from(files).forEach(file => insertImageFile(file));
  });

  // Paste images from clipboard
  editor.addEventListener('paste', (e) => {
    const items = e.clipboardData?.items;
    if (!items) return;

    for (const item of items) {
      if (item.type.startsWith('image/')) {
        e.preventDefault();
        const file = item.getAsFile();
        if (file) insertImageFile(file);
        return;
      }
    }
  });

  // Handle placeholder
  editor.addEventListener('focus', () => {
    if (editor.textContent.trim() === placeholder) {
      editor.innerHTML = '<p><br></p>';
    }
  });

  editor.addEventListener('blur', () => {
    if (!editor.textContent.trim()) {
      editor.innerHTML = `<p>${placeholder}</p>`;
    }
  });

  // Track changes
  editor.addEventListener('input', () => {
    if (onChange) onChange(editor.innerHTML);
  });

  return {
    getValue: () => {
      const content = editor.innerHTML;
      if (editor.textContent.trim() === placeholder) return '';
      return content;
    },
    setValue: (val) => {
      editor.innerHTML = val || `<p>${placeholder}</p>`;
    },
    getElement: () => container,
    focus: () => editor.focus(),
    insertImage: insertImageBase64
  };
}
