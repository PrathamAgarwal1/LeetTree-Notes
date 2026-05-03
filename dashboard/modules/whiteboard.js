// LeetTree Notes — Whiteboard Drawing Canvas Module

export class Whiteboard {
  constructor(container, options = {}) {
    this.container = container;
    this.width = options.width || 800;
    this.height = options.height || 500;
    this.onSave = options.onSave || null;
    this.initialImage = options.initialImage || null;

    this.isDrawing = false;
    this.tool = 'pen';         // pen, eraser, line, rect, circle
    this.color = '#ffffff';
    this.lineWidth = 2;
    this.history = [];
    this.historyIndex = -1;
    this.startX = 0;
    this.startY = 0;

    this.render();
    this.initCanvas();
    
    if (this.initialImage) {
      this.loadImage(this.initialImage);
    } else {
      this.saveState();
    }
  }

  render() {
    const colors = ['#ffffff','#e94560','#00b894','#fdcb6e','#6c5ce7','#0984e3','#fd79a8','#55efc4','#fab1a0','#636e72'];

    this.container.innerHTML = `
      <div class="wb-wrapper">
        <div class="wb-toolbar">
          <div class="wb-tool-group">
            <button class="wb-tool active" data-tool="pen" title="Pen">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 19l7-7 3 3-7 7-3-3z"/><path d="M18 13l-1.5-7.5L2 2l3.5 14.5L13 18l5-5z"/><path d="M2 2l7.586 7.586"/><circle cx="11" cy="11" r="2"/></svg>
            </button>
            <button class="wb-tool" data-tool="line" title="Line">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="5" y1="19" x2="19" y2="5"/></svg>
            </button>
            <button class="wb-tool" data-tool="rect" title="Rectangle">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2"/></svg>
            </button>
            <button class="wb-tool" data-tool="circle" title="Circle">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/></svg>
            </button>
            <button class="wb-tool" data-tool="arrow" title="Arrow">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="5" y1="19" x2="19" y2="5"/><polyline points="13 5 19 5 19 11"/></svg>
            </button>
            <button class="wb-tool" data-tool="text" title="Text">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="4 7 4 4 20 4 20 7"/><line x1="9" y1="20" x2="15" y2="20"/><line x1="12" y1="4" x2="12" y2="20"/></svg>
            </button>
            <div class="wb-separator"></div>
            <button class="wb-tool" data-tool="eraser" title="Eraser">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 20H7L3 16c-.8-.8-.8-2 0-2.8L14.6 1.6c.8-.8 2-.8 2.8 0L21.4 5.6c.8.8.8 2 0 2.8L10 20"/><line x1="6" y1="14" x2="14" y2="6"/></svg>
            </button>
          </div>

          <div class="wb-separator"></div>

          <div class="wb-tool-group">
            <div class="wb-colors">
              ${colors.map(c => `<button class="wb-color ${c === '#ffffff' ? 'active' : ''}" data-color="${c}" style="background:${c};"></button>`).join('')}
            </div>
          </div>

          <div class="wb-separator"></div>

          <div class="wb-tool-group">
            <label class="wb-size-label">
              <input type="range" class="wb-size-range" min="1" max="12" value="2" id="wb-line-width">
              <span class="wb-size-val">2px</span>
            </label>
          </div>

          <div class="wb-separator"></div>

          <div class="wb-tool-group">
            <button class="wb-action" id="wb-undo" title="Undo (Ctrl+Z)">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="1 4 1 10 7 10"/><path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10"/></svg>
            </button>
            <button class="wb-action" id="wb-redo" title="Redo (Ctrl+Y)">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/></svg>
            </button>
            <button class="wb-action" id="wb-clear" title="Clear All">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
            </button>
          </div>

          <div style="flex:1;"></div>

          <div class="wb-tool-group">
            <button class="btn btn--ghost wb-action" id="wb-cancel">Cancel</button>
            <button class="btn btn--primary wb-action" id="wb-save">Insert Drawing</button>
          </div>
        </div>

        <div class="wb-canvas-container">
          <canvas id="wb-canvas" width="${this.width}" height="${this.height}"></canvas>
          <canvas id="wb-preview" width="${this.width}" height="${this.height}" style="position:absolute;top:0;left:0;pointer-events:none;"></canvas>
        </div>
      </div>
    `;
  }

  initCanvas() {
    this.canvas = this.container.querySelector('#wb-canvas');
    this.preview = this.container.querySelector('#wb-preview');
    this.ctx = this.canvas.getContext('2d');
    this.previewCtx = this.preview.getContext('2d');

    // Set canvas background
    this.ctx.fillStyle = '#1a1a2e';
    this.ctx.fillRect(0, 0, this.width, this.height);

    // Drawing events
    this.canvas.addEventListener('mousedown', (e) => this.onMouseDown(e));
    this.canvas.addEventListener('mousemove', (e) => this.onMouseMove(e));
    this.canvas.addEventListener('mouseup', (e) => this.onMouseUp(e));
    this.canvas.addEventListener('mouseleave', () => { if (this.isDrawing) this.onMouseUp(); });

    // Touch support
    this.canvas.addEventListener('touchstart', (e) => { e.preventDefault(); this.onMouseDown(this.touchToMouse(e)); });
    this.canvas.addEventListener('touchmove', (e) => { e.preventDefault(); this.onMouseMove(this.touchToMouse(e)); });
    this.canvas.addEventListener('touchend', (e) => { e.preventDefault(); this.onMouseUp(); });

    // Tool buttons
    this.container.querySelectorAll('.wb-tool[data-tool]').forEach(btn => {
      btn.addEventListener('click', () => {
        this.container.querySelectorAll('.wb-tool').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        this.tool = btn.dataset.tool;
        this.canvas.style.cursor = this.tool === 'eraser' ? 'crosshair' : 'crosshair';
      });
    });

    // Colors
    this.container.querySelectorAll('.wb-color').forEach(btn => {
      btn.addEventListener('click', () => {
        this.container.querySelectorAll('.wb-color').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        this.color = btn.dataset.color;
      });
    });

    // Line width
    const lineWidthInput = this.container.querySelector('#wb-line-width');
    const lineWidthVal = this.container.querySelector('.wb-size-val');
    lineWidthInput.addEventListener('input', () => {
      this.lineWidth = parseInt(lineWidthInput.value);
      lineWidthVal.textContent = `${this.lineWidth}px`;
    });

    // Actions
    this.container.querySelector('#wb-undo').addEventListener('click', () => this.undo());
    this.container.querySelector('#wb-redo').addEventListener('click', () => this.redo());
    this.container.querySelector('#wb-clear').addEventListener('click', () => this.clear());
    this.container.querySelector('#wb-cancel').addEventListener('click', () => {
      this.container.innerHTML = '';
      this.container.style.display = 'none';
    });
    this.container.querySelector('#wb-save').addEventListener('click', () => this.save());

    // Keyboard shortcuts
    this.keyHandler = (e) => {
      if (e.ctrlKey && e.key === 'z') { e.preventDefault(); this.undo(); }
      if (e.ctrlKey && e.key === 'y') { e.preventDefault(); this.redo(); }
    };
    document.addEventListener('keydown', this.keyHandler);
  }

  touchToMouse(e) {
    const rect = this.canvas.getBoundingClientRect();
    const touch = e.touches[0];
    return { offsetX: touch.clientX - rect.left, offsetY: touch.clientY - rect.top };
  }

  getPos(e) {
    const rect = this.canvas.getBoundingClientRect();
    const scaleX = this.width / rect.width;
    const scaleY = this.height / rect.height;
    return {
      x: (e.offsetX || (e.clientX - rect.left)) * scaleX,
      y: (e.offsetY || (e.clientY - rect.top)) * scaleY
    };
  }

  onMouseDown(e) {
    this.isDrawing = true;
    const pos = this.getPos(e);
    this.startX = pos.x;
    this.startY = pos.y;

    if (this.tool === 'pen' || this.tool === 'eraser') {
      this.ctx.beginPath();
      this.ctx.moveTo(pos.x, pos.y);
      this.ctx.strokeStyle = this.tool === 'eraser' ? '#1a1a2e' : this.color;
      this.ctx.lineWidth = this.tool === 'eraser' ? this.lineWidth * 5 : this.lineWidth;
      this.ctx.lineCap = 'round';
      this.ctx.lineJoin = 'round';
    }

    if (this.tool === 'text') {
      this.isDrawing = false;
      const text = prompt('Enter text:');
      if (text) {
        this.ctx.font = `${Math.max(14, this.lineWidth * 6)}px Inter, sans-serif`;
        this.ctx.fillStyle = this.color;
        this.ctx.fillText(text, pos.x, pos.y);
        this.saveState();
      }
    }
  }

  onMouseMove(e) {
    if (!this.isDrawing) return;
    const pos = this.getPos(e);

    if (this.tool === 'pen' || this.tool === 'eraser') {
      this.ctx.lineTo(pos.x, pos.y);
      this.ctx.stroke();
    } else {
      // Preview shapes
      this.previewCtx.clearRect(0, 0, this.width, this.height);
      this.previewCtx.strokeStyle = this.color;
      this.previewCtx.lineWidth = this.lineWidth;
      this.previewCtx.lineCap = 'round';
      this.previewCtx.setLineDash([4, 4]);
      this.previewCtx.beginPath();

      if (this.tool === 'line' || this.tool === 'arrow') {
        this.previewCtx.moveTo(this.startX, this.startY);
        this.previewCtx.lineTo(pos.x, pos.y);
        if (this.tool === 'arrow') {
          this.drawArrowHead(this.previewCtx, this.startX, this.startY, pos.x, pos.y);
        }
      } else if (this.tool === 'rect') {
        this.previewCtx.rect(this.startX, this.startY, pos.x - this.startX, pos.y - this.startY);
      } else if (this.tool === 'circle') {
        const rx = Math.abs(pos.x - this.startX) / 2;
        const ry = Math.abs(pos.y - this.startY) / 2;
        const cx = this.startX + (pos.x - this.startX) / 2;
        const cy = this.startY + (pos.y - this.startY) / 2;
        this.previewCtx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2);
      }

      this.previewCtx.stroke();
      this.previewCtx.setLineDash([]);
    }
  }

  onMouseUp(e) {
    if (!this.isDrawing) return;
    this.isDrawing = false;

    if (this.tool === 'pen' || this.tool === 'eraser') {
      this.ctx.closePath();
    } else if (e) {
      const pos = this.getPos(e);
      
      // Draw final shape on main canvas
      this.previewCtx.clearRect(0, 0, this.width, this.height);
      this.ctx.strokeStyle = this.color;
      this.ctx.lineWidth = this.lineWidth;
      this.ctx.lineCap = 'round';
      this.ctx.beginPath();

      if (this.tool === 'line' || this.tool === 'arrow') {
        this.ctx.moveTo(this.startX, this.startY);
        this.ctx.lineTo(pos.x, pos.y);
        this.ctx.stroke();
        if (this.tool === 'arrow') {
          this.drawArrowHead(this.ctx, this.startX, this.startY, pos.x, pos.y);
        }
      } else if (this.tool === 'rect') {
        this.ctx.rect(this.startX, this.startY, pos.x - this.startX, pos.y - this.startY);
        this.ctx.stroke();
      } else if (this.tool === 'circle') {
        const rx = Math.abs(pos.x - this.startX) / 2;
        const ry = Math.abs(pos.y - this.startY) / 2;
        const cx = this.startX + (pos.x - this.startX) / 2;
        const cy = this.startY + (pos.y - this.startY) / 2;
        this.ctx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2);
        this.ctx.stroke();
      }
    }

    this.saveState();
  }

  drawArrowHead(ctx, fromX, fromY, toX, toY) {
    const headLength = 12;
    const angle = Math.atan2(toY - fromY, toX - fromX);
    ctx.moveTo(toX, toY);
    ctx.lineTo(toX - headLength * Math.cos(angle - Math.PI / 6), toY - headLength * Math.sin(angle - Math.PI / 6));
    ctx.moveTo(toX, toY);
    ctx.lineTo(toX - headLength * Math.cos(angle + Math.PI / 6), toY - headLength * Math.sin(angle + Math.PI / 6));
    ctx.stroke();
  }

  saveState() {
    this.historyIndex++;
    this.history = this.history.slice(0, this.historyIndex);
    this.history.push(this.canvas.toDataURL());
  }

  undo() {
    if (this.historyIndex <= 0) return;
    this.historyIndex--;
    this.loadImage(this.history[this.historyIndex]);
  }

  redo() {
    if (this.historyIndex >= this.history.length - 1) return;
    this.historyIndex++;
    this.loadImage(this.history[this.historyIndex]);
  }

  clear() {
    this.ctx.fillStyle = '#1a1a2e';
    this.ctx.fillRect(0, 0, this.width, this.height);
    this.saveState();
  }

  loadImage(dataUrl) {
    const img = new Image();
    img.onload = () => {
      this.ctx.clearRect(0, 0, this.width, this.height);
      this.ctx.drawImage(img, 0, 0);
    };
    img.src = dataUrl;
  }

  save() {
    const dataUrl = this.canvas.toDataURL('image/png');
    if (this.onSave) this.onSave(dataUrl);
    // Cleanup
    document.removeEventListener('keydown', this.keyHandler);
    this.container.innerHTML = '';
    this.container.style.display = 'none';
  }

  destroy() {
    document.removeEventListener('keydown', this.keyHandler);
  }
}
