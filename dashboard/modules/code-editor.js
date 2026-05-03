// LeetTree Notes — Code Editor with Syntax Highlighting
// Custom textarea-based editor with syntax highlighting overlay

const LANG_KEYWORDS = {
  javascript: ['const','let','var','function','return','if','else','for','while','do','switch','case','break','continue','new','this','class','extends','import','export','default','from','async','await','try','catch','finally','throw','typeof','instanceof','in','of','null','undefined','true','false','void','delete','yield','static','get','set','super','constructor'],
  python: ['def','return','if','elif','else','for','while','break','continue','class','import','from','as','try','except','finally','raise','with','lambda','yield','pass','True','False','None','and','or','not','in','is','global','nonlocal','assert','del','print','self'],
  cpp: ['#include','int','float','double','char','bool','void','long','short','unsigned','signed','const','static','class','struct','public','private','protected','virtual','override','new','delete','return','if','else','for','while','do','switch','case','break','continue','try','catch','throw','namespace','using','template','typename','auto','nullptr','true','false','sizeof','typedef','enum'],
  java: ['public','private','protected','static','final','abstract','class','interface','extends','implements','new','return','if','else','for','while','do','switch','case','break','continue','try','catch','finally','throw','throws','import','package','void','int','long','double','float','char','boolean','byte','short','String','null','true','false','this','super','instanceof'],
  typescript: ['const','let','var','function','return','if','else','for','while','do','switch','case','break','continue','new','this','class','extends','import','export','default','from','async','await','try','catch','finally','throw','typeof','instanceof','in','of','null','undefined','true','false','void','interface','type','enum','namespace','module','declare','as','implements','readonly','keyof','never','unknown','any','string','number','boolean'],
  go: ['func','return','if','else','for','range','switch','case','break','continue','var','const','type','struct','interface','map','chan','go','select','defer','package','import','nil','true','false','make','len','cap','append','delete','copy','new','panic','recover','fallthrough'],
  rust: ['fn','let','mut','return','if','else','for','while','loop','match','break','continue','struct','enum','impl','trait','pub','use','mod','crate','self','super','where','as','in','ref','move','async','await','true','false','None','Some','Ok','Err','Box','Vec','String','Option','Result','i32','i64','u32','u64','f32','f64','bool','str','usize','isize']
};

const LANG_COMMENT = {
  javascript: { line: '//', blockStart: '/*', blockEnd: '*/' },
  python: { line: '#', blockStart: '"""', blockEnd: '"""' },
  cpp: { line: '//', blockStart: '/*', blockEnd: '*/' },
  java: { line: '//', blockStart: '/*', blockEnd: '*/' },
  typescript: { line: '//', blockStart: '/*', blockEnd: '*/' },
  go: { line: '//', blockStart: '/*', blockEnd: '*/' },
  rust: { line: '//', blockStart: '/*', blockEnd: '*/' }
};

function escapeHtml(text) {
  return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

export function highlightCode(code, language = 'javascript') {
  const lang = language.toLowerCase();
  const keywords = LANG_KEYWORDS[lang] || LANG_KEYWORDS.javascript;
  const comments = LANG_COMMENT[lang] || LANG_COMMENT.javascript;
  const lines = code.split('\n');
  let inBlockComment = false;
  let result = [];

  for (const line of lines) {
    let highlighted = '';
    let i = 0;
    const chars = line;

    while (i < chars.length) {
      // Block comment
      if (inBlockComment) {
        const endIdx = chars.indexOf(comments.blockEnd, i);
        if (endIdx !== -1) {
          highlighted += `<span class="hl-comment">${escapeHtml(chars.substring(i, endIdx + comments.blockEnd.length))}</span>`;
          i = endIdx + comments.blockEnd.length;
          inBlockComment = false;
        } else {
          highlighted += `<span class="hl-comment">${escapeHtml(chars.substring(i))}</span>`;
          i = chars.length;
        }
        continue;
      }

      // Block comment start
      if (chars.substring(i, i + comments.blockStart.length) === comments.blockStart) {
        const endIdx = chars.indexOf(comments.blockEnd, i + comments.blockStart.length);
        if (endIdx !== -1) {
          highlighted += `<span class="hl-comment">${escapeHtml(chars.substring(i, endIdx + comments.blockEnd.length))}</span>`;
          i = endIdx + comments.blockEnd.length;
        } else {
          highlighted += `<span class="hl-comment">${escapeHtml(chars.substring(i))}</span>`;
          i = chars.length;
          inBlockComment = true;
        }
        continue;
      }

      // Line comment
      if (chars.substring(i, i + comments.line.length) === comments.line) {
        highlighted += `<span class="hl-comment">${escapeHtml(chars.substring(i))}</span>`;
        i = chars.length;
        continue;
      }

      // Strings
      if (chars[i] === '"' || chars[i] === "'" || chars[i] === '`') {
        const quote = chars[i];
        let j = i + 1;
        while (j < chars.length && (chars[j] !== quote || chars[j - 1] === '\\')) j++;
        j = Math.min(j + 1, chars.length);
        highlighted += `<span class="hl-string">${escapeHtml(chars.substring(i, j))}</span>`;
        i = j;
        continue;
      }

      // Numbers
      if (/\d/.test(chars[i]) && (i === 0 || /[\s(,=+\-*/<>[\]{};:]/.test(chars[i - 1]))) {
        let j = i;
        while (j < chars.length && /[\d.xXabcdefABCDEF_]/.test(chars[j])) j++;
        highlighted += `<span class="hl-number">${escapeHtml(chars.substring(i, j))}</span>`;
        i = j;
        continue;
      }

      // Words (keywords, identifiers)
      if (/[a-zA-Z_$#]/.test(chars[i])) {
        let j = i;
        while (j < chars.length && /[a-zA-Z0-9_$#]/.test(chars[j])) j++;
        const word = chars.substring(i, j);
        if (keywords.includes(word)) {
          highlighted += `<span class="hl-keyword">${escapeHtml(word)}</span>`;
        } else if (/^[A-Z]/.test(word)) {
          highlighted += `<span class="hl-type">${escapeHtml(word)}</span>`;
        } else if (j < chars.length && chars[j] === '(') {
          highlighted += `<span class="hl-function">${escapeHtml(word)}</span>`;
        } else {
          highlighted += escapeHtml(word);
        }
        i = j;
        continue;
      }

      // Operators
      if (/[+\-*/%=<>!&|^~?:]/.test(chars[i])) {
        highlighted += `<span class="hl-operator">${escapeHtml(chars[i])}</span>`;
        i++;
        continue;
      }

      // Brackets
      if (/[()[\]{}]/.test(chars[i])) {
        highlighted += `<span class="hl-bracket">${escapeHtml(chars[i])}</span>`;
        i++;
        continue;
      }

      highlighted += escapeHtml(chars[i]);
      i++;
    }

    result.push(highlighted);
  }

  return result.join('\n');
}

export function createCodeEditor(container, options = {}) {
  const { value = '', language = 'javascript', readOnly = false, onChange = null } = options;

  container.innerHTML = '';
  container.classList.add('code-editor-wrapper');

  const lineNumbers = document.createElement('div');
  lineNumbers.className = 'code-line-numbers';

  const editorArea = document.createElement('div');
  editorArea.className = 'code-editor-area';

  const highlight = document.createElement('pre');
  highlight.className = 'code-highlight-layer';
  const highlightCode_ = document.createElement('code');
  highlight.appendChild(highlightCode_);

  const textarea = document.createElement('textarea');
  textarea.className = 'code-textarea';
  textarea.value = value;
  textarea.readOnly = readOnly;
  textarea.spellcheck = false;
  textarea.autocomplete = 'off';
  textarea.autocapitalize = 'off';
  textarea.setAttribute('data-gramm', 'false');

  editorArea.appendChild(highlight);
  editorArea.appendChild(textarea);
  container.appendChild(lineNumbers);
  container.appendChild(editorArea);

  let currentLanguage = language;

  function updateHighlight() {
    highlightCode_.innerHTML = highlightCode(textarea.value, currentLanguage) + '\n';
    updateLineNumbers();
    if (onChange) onChange(textarea.value);
  }

  function updateLineNumbers() {
    const lines = textarea.value.split('\n').length;
    lineNumbers.innerHTML = Array.from({ length: lines }, (_, i) =>
      `<span class="line-num">${i + 1}</span>`
    ).join('');
  }

  function syncScroll() {
    highlight.scrollTop = textarea.scrollTop;
    highlight.scrollLeft = textarea.scrollLeft;
    lineNumbers.scrollTop = textarea.scrollTop;
  }

  textarea.addEventListener('input', updateHighlight);
  textarea.addEventListener('scroll', syncScroll);

  // Tab key support
  textarea.addEventListener('keydown', (e) => {
    if (e.key === 'Tab') {
      e.preventDefault();
      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
      textarea.value = textarea.value.substring(0, start) + '    ' + textarea.value.substring(end);
      textarea.selectionStart = textarea.selectionEnd = start + 4;
      updateHighlight();
    }
  });

  updateHighlight();

  return {
    getValue: () => textarea.value,
    setValue: (val) => { textarea.value = val; updateHighlight(); },
    setLanguage: (lang) => { currentLanguage = lang; updateHighlight(); },
    getElement: () => container,
    focus: () => textarea.focus()
  };
}
