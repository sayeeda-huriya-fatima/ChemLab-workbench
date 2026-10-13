/**
 * ChemLab Workbench - Laboratory Calculations & Plotting
 * B.Tech Engineering Chemistry Lab Practicals
 */

document.addEventListener('DOMContentLoaded', () => {

  // Theme color palette
  const PALETTE = {
    sage: '#8EA66B',
    sagedark: '#3C4E26',
    sagelight: '#F1F6EC',
    sageborder: '#BCCD9E',
    rose: '#D8A2A2',
    rosedark: '#9E5B5B',
    blush: '#FFDCDC',
    cream: '#FFF9D6',
    creamdark: '#66541D',
    border: '#E5DEC9',
    textdark: '#26331C',
    textmuted: '#5C6B4F',
    bg: '#FAF8F5'
  };

  // --- AUDIO SYNTHESIS ENGINE (Web Audio API - Zero External Dependencies) ---
  let audioContext = null;
  let audioEnabled = true;

  function initAudio() {
    if (!audioContext) {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (AudioCtx) {
        audioContext = new AudioCtx();
      }
    }
  }

  function playLabTone(type = 'drop') {
    if (!audioEnabled) return;
    try {
      initAudio();
      if (!audioContext) return;
      if (audioContext.state === 'suspended') {
        audioContext.resume();
      }

      const osc = audioContext.createOscillator();
      const gain = audioContext.createGain();
      osc.connect(gain);
      gain.connect(audioContext.destination);

      const now = audioContext.currentTime;

      if (type === 'drop') {
        // High soft droplet plink
        osc.type = 'sine';
        osc.frequency.setValueAtTime(880, now);
        osc.frequency.exponentialRampToValueAtTime(440, now + 0.08);
        gain.gain.setValueAtTime(0.12, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.08);
        osc.start(now);
        osc.stop(now + 0.08);
      } else if (type === 'endpoint') {
        // Harmonious chord for equivalence point discovery
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(523.25, now); // C5
        osc.frequency.setValueAtTime(659.25, now + 0.08); // E5
        osc.frequency.setValueAtTime(783.99, now + 0.16); // G5
        gain.gain.setValueAtTime(0.15, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);
        osc.start(now);
        osc.stop(now + 0.35);
      } else if (type === 'click') {
        // Tactile click
        osc.type = 'sine';
        osc.frequency.setValueAtTime(320, now);
        gain.gain.setValueAtTime(0.08, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.04);
        osc.start(now);
        osc.stop(now + 0.04);
      }
    } catch (e) {
      // Audio autoplay gracefully handled
    }
  }

  const audioToggleBtn = document.getElementById('btn-audio-toggle');
  const audioIconOn = document.getElementById('audio-icon-on');
  const audioIconOff = document.getElementById('audio-icon-off');

  audioToggleBtn.addEventListener('click', () => {
    audioEnabled = !audioEnabled;
    if (audioEnabled) {
      initAudio();
      audioIconOn.classList.remove('hidden');
      audioIconOff.classList.add('hidden');
      playLabTone('click');
    } else {
      audioIconOn.classList.add('hidden');
      audioIconOff.classList.remove('hidden');
    }
  });

  // --- TAB NAVIGATION CONTROLLER (#8EA66B & #FFDCDC Active Theme) ---
  const navTabs = document.querySelectorAll('.nav-tab');
  const tabContents = document.querySelectorAll('.tab-content');

  navTabs.forEach(tab => {
    tab.addEventListener('click', () => {
      const targetId = tab.dataset.tab;
      playLabTone('click');

      navTabs.forEach(t => {
        t.classList.remove('active', 'bg-[#8EA66B]', 'text-white', 'border-[#8EA66B]', 'shadow-sm');
        t.classList.add('text-[#5C6B4F]', 'border-transparent');
      });

      tab.classList.add('active', 'bg-[#8EA66B]', 'text-white', 'border-[#8EA66B]', 'shadow-sm');
      tab.classList.remove('text-[#5C6B4F]', 'border-transparent');

      tabContents.forEach(content => {
        if (content.id === targetId) {
          content.classList.remove('hidden');
          content.classList.add('block');
        } else {
          content.classList.add('hidden');
          content.classList.remove('block');
        }
      });

      // Synchronize bulk import target with active tab
      const targetSelect = document.getElementById('bulk-import-target-select');
      if (targetSelect) {
        if (targetId === 'tab-cond-strong') targetSelect.value = 'cond-strong';
        else if (targetId === 'tab-cond-mixture') targetSelect.value = 'cond-mix';
        else if (targetId === 'tab-potentiometry') targetSelect.value = 'pot';
      }

      // Trigger chart resize when tabs become visible
      if (targetId === 'tab-cond-strong' && chartCondStrong) {
        chartCondStrong.resize();
      } else if (targetId === 'tab-cond-mixture' && chartCondMix) {
        chartCondMix.resize();
      } else if (targetId === 'tab-potentiometry') {
        if (chartPotEmf) chartPotEmf.resize();
        if (chartPotDeriv) chartPotDeriv.resize();
      }
    });
  });

  // -------------------------------------------------------------------------
  // LINEAR REGRESSION MATHEMATICAL HELPER
  // Least squares fit: y = m*x + c with R² goodness-of-fit & standard error
  // -------------------------------------------------------------------------
  function linearRegression(points) {
    if (!points || points.length < 2) return { m: 0, c: 0, r2: 0, stdError: 0 };
    const n = points.length;
    let sumX = 0, sumY = 0, sumXY = 0, sumX2 = 0, sumY2 = 0;

    for (let i = 0; i < n; i++) {
      const x = points[i].x;
      const y = points[i].y;
      sumX += x;
      sumY += y;
      sumXY += x * y;
      sumX2 += x * x;
      sumY2 += y * y;
    }

    const denom = n * sumX2 - sumX * sumX;
    if (Math.abs(denom) < 1e-9) return { m: 0, c: sumY / n, r2: 0, stdError: 0 };

    const m = (n * sumXY - sumX * sumY) / denom;
    const c = (sumY - m * sumX) / n;

    // Coefficient of determination R^2 and residuals
    const yMean = sumY / n;
    let ssTot = 0, ssRes = 0;
    for (let i = 0; i < n; i++) {
      const y = points[i].y;
      const yPred = m * points[i].x + c;
      ssTot += Math.pow(y - yMean, 2);
      ssRes += Math.pow(y - yPred, 2);
    }
    const r2 = ssTot === 0 ? 1 : Math.max(0, 1 - ssRes / ssTot);
    const stdError = Math.sqrt(ssRes / (n > 2 ? n - 2 : 1));

    return { m, c, r2, stdError, ssRes, n };
  }

  // Linear Intersection Helper
  function findIntersection(line1, line2) {
    if (Math.abs(line1.m - line2.m) < 1e-6) return null;
    const x = (line2.c - line1.c) / (line1.m - line2.m);
    const y = line1.m * x + line1.c;
    return { x, y };
  }

  // --- GRAPH EXPORT ENGINE (High-Resolution PNG with Academic Watermark) ---
  function downloadCanvasAsPNG(canvasId, filename, titleText) {
    const canvas = document.getElementById(canvasId);
    if (!canvas) return;

    // Offscreen high-res banner canvas
    const exportCanvas = document.createElement('canvas');
    const w = canvas.width || 800;
    const h = canvas.height || 450;
    const headerH = 65;

    exportCanvas.width = w;
    exportCanvas.height = h + headerH;
    const ctx = exportCanvas.getContext('2d');

    // Clean laboratory white backdrop
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, exportCanvas.width, exportCanvas.height);

    // Top accent bar
    ctx.fillStyle = PALETTE.sage;
    ctx.fillRect(0, 0, w, 5);

    // Title & Academic Subtitle
    ctx.fillStyle = PALETTE.sagedark;
    ctx.font = 'bold 15px "JetBrains Mono", monospace';
    ctx.textAlign = 'left';
    ctx.fillText(titleText, 18, 30);

    ctx.fillStyle = PALETTE.textmuted;
    ctx.font = '11px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
    ctx.fillText('ChemLab Computation & Virtual Workbench • B.Tech Engineering Chemistry Laboratory', 18, 48);

    // Draw the chart image onto export canvas
    ctx.drawImage(canvas, 0, headerH);

    // Footer Watermark
    ctx.fillStyle = PALETTE.border;
    ctx.fillRect(0, exportCanvas.height - 18, w, 1);
    ctx.fillStyle = PALETTE.textmuted;
    ctx.font = '9px "JetBrains Mono", monospace';
    ctx.textAlign = 'right';
    ctx.fillText('Exported from ChemLab Workbench | JNTU / AICTE Compliant', w - 16, exportCanvas.height - 5);

    // Trigger download
    const link = document.createElement('a');
    link.download = filename;
    link.href = exportCanvas.toDataURL('image/png');
    link.click();
    playLabTone('click');
  }

  // --- MODULE 1: EDTA WATER HARDNESS ENGINE & VIRTUAL COLORIMETER ---
  const edtaV1Input = document.getElementById('edta-v1');
  const edtaV2Input = document.getElementById('edta-v2');
  const edtaV3Input = document.getElementById('edta-v3');
  const edtaPresetSelect = document.getElementById('edta-preset-select');
  const edtaResetBtn = document.getElementById('edta-btn-reset');
  const edtaWarningBox = document.getElementById('edta-validation-warning');

  // Metric elements
  const metricTotalH = document.getElementById('metric-total-hardness');
  const metricTotalVal = document.getElementById('metric-total-val');
  const metricPermH = document.getElementById('metric-perm-hardness');
  const metricPermVal = document.getElementById('metric-perm-val');
  const metricTempH = document.getElementById('metric-temp-hardness');
  const metricTempVal = document.getElementById('metric-temp-val');
  const hardnessBadge = document.getElementById('hardness-badge');

  // Calculation display steps
  const stepTotalCalc = document.getElementById('step-total-calc');
  const stepPermCalc = document.getElementById('step-perm-calc');
  const stepTempCalc = document.getElementById('step-temp-calc');

  // Virtual flask elements
  const edtaSlider = document.getElementById('edta-sim-slider');
  const titrationProgressPct = document.getElementById('titration-progress-pct');
  const flaskStateTag = document.getElementById('flask-state-tag');
  const flaskGradStop1 = document.getElementById('flask-grad-stop1');
  const flaskGradStop2 = document.getElementById('flask-grad-stop2');
  const droplet = document.getElementById('titration-droplet');
  const btnTitrateStep = document.getElementById('btn-titrate-step');
  const btnJumpEndpoint = document.getElementById('btn-jump-endpoint');

  const edtaPresets = {
    'preset-tap': { v1: 18.5, v2: 23.2, v3: 11.4 },
    'preset-borewell': { v1: 20.0, v2: 38.6, v3: 16.8 },
    'preset-river': { v1: 19.2, v2: 12.4, v3: 5.8 },
    'preset-soft': { v1: 20.0, v2: 0.9, v3: 0.4 }
  };

  function calculateEDTA() {
    const v1 = parseFloat(edtaV1Input.value) || 1;
    const v2 = parseFloat(edtaV2Input.value) || 0;
    const v3 = parseFloat(edtaV3Input.value) || 0;

    // Manual formula specifications:
    // Total Hardness = (V2 / V1) * 1000 mg/L (ppm)
    // Permanent Hardness = (V3 / V1) * 1000 mg/L (ppm)
    // Temporary Hardness = Total Hardness - Permanent Hardness
    const totalHardness = (v2 / v1) * 1000;
    const permHardness = (v3 / v1) * 1000;
    const tempHardness = Math.max(0, totalHardness - permHardness);

    // Discrepancy warning
    if (v3 > v2) {
      edtaWarningBox.classList.remove('hidden');
    } else {
      edtaWarningBox.classList.add('hidden');
    }

    // Update readouts
    metricTotalH.textContent = totalHardness.toFixed(1);
    metricTotalVal.textContent = `${totalHardness.toFixed(2)} ppm`;

    metricPermH.textContent = permHardness.toFixed(1);
    metricPermVal.textContent = `${permHardness.toFixed(2)} ppm`;

    metricTempH.textContent = tempHardness.toFixed(1);
    metricTempVal.textContent = `${tempHardness.toFixed(2)} ppm`;

    // Step-by-step formula substitutions
    stepTotalCalc.innerHTML = `= (<span class="text-[#8EA66B] font-bold">${v2.toFixed(1)}</span> / <span class="text-[#3C4E26] font-bold">${v1.toFixed(1)}</span>) × 1000 = <span class="text-[#3C4E26] font-extrabold">${totalHardness.toFixed(2)} mg/L</span> (ppm CaCO₃ eq)`;
    stepPermCalc.innerHTML = `= (<span class="text-[#66541D] font-bold">${v3.toFixed(1)}</span> / <span class="text-[#3C4E26] font-bold">${v1.toFixed(1)}</span>) × 1000 = <span class="text-[#66541D] font-extrabold">${permHardness.toFixed(2)} mg/L</span> (ppm CaCO₃ eq)`;
    stepTempCalc.innerHTML = `= <span class="text-[#3C4E26] font-bold">${totalHardness.toFixed(2)}</span> - <span class="text-[#66541D] font-bold">${permHardness.toFixed(2)}</span> = <span class="text-[#8B4242] font-extrabold">${tempHardness.toFixed(2)} mg/L</span> (ppm CaCO₃ eq)`;

    // Classification badge
    // Soft < 60 ppm, Moderately Hard 61-120 ppm, Hard 121-180 ppm, Very Hard > 180 ppm
    if (totalHardness < 60) {
      hardnessBadge.className = 'self-start sm:self-auto px-3 py-1 rounded-full text-xs font-bold font-mono uppercase tracking-wider bg-[#F1F6EC] text-[#3C4E26] border border-[#BCCD9E] flex items-center gap-1.5 shadow-sm';
      hardnessBadge.innerHTML = '<span class="w-2 h-2 rounded-full bg-[#8EA66B]"></span><span>Soft Water (&lt; 60 ppm)</span>';
    } else if (totalHardness <= 120) {
      hardnessBadge.className = 'self-start sm:self-auto px-3 py-1 rounded-full text-xs font-bold font-mono uppercase tracking-wider bg-[#FFF9D6] text-[#66541D] border border-[#E5DEC9] flex items-center gap-1.5 shadow-sm';
      hardnessBadge.innerHTML = '<span class="w-2 h-2 rounded-full bg-[#66541D]"></span><span>Moderately Hard (61–120 ppm)</span>';
    } else if (totalHardness <= 180) {
      hardnessBadge.className = 'self-start sm:self-auto px-3 py-1 rounded-full text-xs font-bold font-mono uppercase tracking-wider bg-[#FFF3BF] text-[#66541D] border border-[#D8A2A2] flex items-center gap-1.5 shadow-sm';
      hardnessBadge.innerHTML = '<span class="w-2 h-2 rounded-full bg-[#D8A2A2]"></span><span>Hard Water (121–180 ppm)</span>';
    } else {
      hardnessBadge.className = 'self-start sm:self-auto px-3 py-1 rounded-full text-xs font-bold font-mono uppercase tracking-wider bg-[#FFDCDC] text-[#8B4242] border border-[#D8A2A2] flex items-center gap-1.5 shadow-sm';
      hardnessBadge.innerHTML = '<span class="w-2 h-2 rounded-full bg-[#8EA66B] animate-ping"></span><span>Very Hard (&gt; 180 ppm)</span>';
    }

    updateFlaskVisual();
  }

  // Update EBT Color in virtual flask
  function updateFlaskVisual() {
    const progress = parseInt(edtaSlider.value, 10);
    titrationProgressPct.textContent = `${progress}%`;

    let r, g, b, stateText, stateClass;

    if (progress < 70) {
      // Wine Red to Purplish Red
      const t = progress / 70;
      r = Math.round(159 * (1 - t) + 140 * t);
      g = Math.round(18 * (1 - t) + 25 * t);
      b = Math.round(57 * (1 - t) + 120 * t);
      stateText = 'Wine Red [M-EBT]';
      stateClass = 'bg-[#FFDCDC] text-[#8B4242] border-[#D8A2A2]';
    } else if (progress < 100) {
      // Transition from Purple to Blue
      const t = (progress - 70) / 30;
      r = Math.round(140 * (1 - t) + 142 * t);
      g = Math.round(25 * (1 - t) + 166 * t);
      b = Math.round(120 * (1 - t) + 107 * t);
      stateText = 'Purple Intermediate';
      stateClass = 'bg-[#FFF9D6] text-[#66541D] border-[#E5DEC9]';
    } else {
      // Clear Sky Blue / Endpoint
      r = 30;
      g = 135;
      b = 200;
      stateText = 'Clear Sky Blue (Endpoint)';
      stateClass = 'bg-[#F1F6EC] text-[#3C4E26] border-[#BCCD9E]';
    }

    flaskGradStop1.setAttribute('stop-color', `rgb(${r}, ${g}, ${b})`);
    flaskGradStop2.setAttribute('stop-color', `rgb(${Math.max(0, r - 20)}, ${Math.max(0, g - 20)}, ${Math.max(0, b - 20)})`);

    flaskStateTag.textContent = stateText;
    flaskStateTag.className = `text-xs px-2.5 py-0.5 rounded-full font-mono font-semibold border ${stateClass}`;
  }

  edtaV1Input.addEventListener('input', calculateEDTA);
  edtaV2Input.addEventListener('input', calculateEDTA);
  edtaV3Input.addEventListener('input', calculateEDTA);

  edtaPresetSelect.addEventListener('change', () => {
    const val = edtaPresetSelect.value;
    if (edtaPresets[val]) {
      edtaV1Input.value = edtaPresets[val].v1;
      edtaV2Input.value = edtaPresets[val].v2;
      edtaV3Input.value = edtaPresets[val].v3;
      playLabTone('click');
      calculateEDTA();
    }
  });

  edtaResetBtn.addEventListener('click', () => {
    edtaPresetSelect.value = 'preset-tap';
    edtaV1Input.value = edtaPresets['preset-tap'].v1;
    edtaV2Input.value = edtaPresets['preset-tap'].v2;
    edtaV3Input.value = edtaPresets['preset-tap'].v3;
    edtaSlider.value = 0;
    playLabTone('click');
    calculateEDTA();
  });

  edtaSlider.addEventListener('input', () => {
    updateFlaskVisual();
    playLabTone('drop');
    if (parseInt(edtaSlider.value, 10) === 100 && typeof confetti === 'function') {
      playLabTone('endpoint');
      confetti({ particleCount: 40, spread: 60, origin: { y: 0.6 } });
    }
  });

  btnTitrateStep.addEventListener('click', () => {
    let current = parseInt(edtaSlider.value, 10);
    if (current < 120) {
      current = Math.min(120, current + 10);
      edtaSlider.value = current;
      updateFlaskVisual();
      
      // Animate drop
      droplet.classList.add('anim-drop');
      playLabTone('drop');
      setTimeout(() => droplet.classList.remove('anim-drop'), 400);

      if (current === 100 && typeof confetti === 'function') {
        playLabTone('endpoint');
        confetti({ particleCount: 50, spread: 70, origin: { y: 0.6 } });
      }
    }
  });

  btnJumpEndpoint.addEventListener('click', () => {
    edtaSlider.value = 100;
    updateFlaskVisual();
    playLabTone('endpoint');
    if (typeof confetti === 'function') {
      confetti({ particleCount: 75, spread: 80, origin: { y: 0.6 } });
    }
  });

  // Initial EDTA run
  calculateEDTA();

  // --- MODULE 2: CONDUCTOMETRIC TITRATION (STRONG ACID: HCl vs NaOH) ---
  const condStrongNormBase = document.getElementById('cond-strong-norm-base');
  const condStrongTbody = document.getElementById('cond-strong-tbody');
  const condStrongAddRowBtn = document.getElementById('cond-strong-add-row');
  const condStrongClearBtn = document.getElementById('cond-strong-clear-rows');
  const condStrongLoadBtn = document.getElementById('cond-strong-btn-load');
  const condStrongResetBtn = document.getElementById('cond-strong-btn-reset');
  const condStrongBtnImport = document.getElementById('cond-strong-btn-import');
  const condStrongBtnExportPng = document.getElementById('cond-strong-btn-export-png');

  const condStrongV2Badge = document.getElementById('cond-strong-v2-badge');
  const condStrongCminBadge = document.getElementById('cond-strong-cmin-badge');
  const condStrongRegDesc = document.getElementById('cond-strong-reg-desc');
  const condStrongRegAsc = document.getElementById('cond-strong-reg-asc');

  const resCondStrongV2 = document.getElementById('res-cond-strong-v2');
  const resCondStrongN1 = document.getElementById('res-cond-strong-n1');
  const resCondStrongStr = document.getElementById('res-cond-strong-str');

  const calcCondStrongStep1 = document.getElementById('calc-cond-strong-step1');
  const calcCondStrongStep2 = document.getElementById('calc-cond-strong-step2');

  const condStrongOutlierNotice = document.getElementById('cond-strong-outlier-notice');
  const condStrongOutlierText = document.getElementById('cond-strong-outlier-text');

  // Derivation Elements
  const derivStrongLine1 = document.getElementById('deriv-strong-line1');
  const derivStrongLine2 = document.getElementById('deriv-strong-line2');
  const derivStrongAlgebra = document.getElementById('deriv-strong-algebra');
  const derivStrongResiduals = document.getElementById('deriv-strong-residuals');

  // Virtual simulator elements (Exp 2)
  const simStrongBuretFluid = document.getElementById('sim-strong-buret-fluid');
  const simStrongStirrer = document.getElementById('sim-strong-stirrer');
  const simStrongReadout = document.getElementById('sim-strong-readout');
  const simStrongBtnDrop = document.getElementById('sim-strong-btn-drop');
  const simStrongBtnAutoRun = document.getElementById('sim-strong-btn-autorun');
  const simStrongBtnReset = document.getElementById('sim-strong-btn-reset');

  // Standard Lab Data for HCl vs NaOH (V_acid = 40 mL, N_base = 0.1 N)
  const defaultStrongData = [
    { v: 0.0, c: 8.42 },
    { v: 2.0, c: 7.15 },
    { v: 4.0, c: 5.86 },
    { v: 6.0, c: 4.60 },
    { v: 8.0, c: 3.35 },
    { v: 10.0, c: 2.10 }, // Neutralization minimum
    { v: 12.0, c: 3.12 },
    { v: 14.0, c: 4.16 },
    { v: 16.0, c: 5.20 },
    { v: 18.0, c: 6.25 },
    { v: 20.0, c: 7.30 }
  ];

  let condStrongData = JSON.parse(JSON.stringify(defaultStrongData));
  let chartCondStrong = null;

  function renderCondStrongTable() {
    condStrongTbody.innerHTML = '';
    condStrongData.forEach((row, index) => {
      const tr = document.createElement('tr');
      tr.className = 'hover:bg-[#FAF8F5] transition group';
      tr.dataset.index = index;
      tr.innerHTML = `
        <td class="p-2 text-center text-[#5C6B4F] text-[11px]">${index + 1}</td>
        <td class="p-2">
          <input type="number" step="0.1" value="${row.v.toFixed(1)}" data-idx="${index}" data-field="v" class="cond-s-input table-inline-input w-20">
        </td>
        <td class="p-2">
          <input type="number" step="0.01" value="${row.c.toFixed(2)}" data-idx="${index}" data-field="c" class="cond-s-input table-inline-input w-24 text-[#3C4E26] font-bold">
        </td>
        <td class="p-2 text-center text-[10px]" id="cond-s-diag-${index}">
          <span class="text-[#5C6B4F]">Normal</span>
        </td>
        <td class="p-2 text-center">
          <button data-idx="${index}" class="cond-s-del text-slate-400 hover:text-rose-600 p-1 rounded transition opacity-0 group-hover:opacity-100" title="Delete Row">
            <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg>
          </button>
        </td>
      `;
      condStrongTbody.appendChild(tr);
    });

    // Add inline listeners (both input and change for instant reactivity)
    document.querySelectorAll('.cond-s-input').forEach(input => {
      const handleUpdate = (e) => {
        const idx = parseInt(e.target.dataset.idx, 10);
        const field = e.target.dataset.field;
        condStrongData[idx][field] = parseFloat(e.target.value) || 0;
        calculateCondStrong();
      };
      input.addEventListener('input', handleUpdate);
      input.addEventListener('change', handleUpdate);
    });

    document.querySelectorAll('.cond-s-del').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const idx = parseInt(btn.dataset.idx, 10);
        if (condStrongData.length > 3) {
          condStrongData.splice(idx, 1);
          renderCondStrongTable();
          calculateCondStrong();
          playLabTone('click');
        }
      });
    });
  }

  function calculateCondStrong() {
    if (!condStrongData || condStrongData.length < 3) return;

    // Sort by volume ascending
    condStrongData.sort((a, b) => a.v - b.v);

    // Find the minimum conductance point
    let minIdx = 0;
    let minC = condStrongData[0].c;
    for (let i = 1; i < condStrongData.length; i++) {
      if (condStrongData[i].c < minC) {
        minC = condStrongData[i].c;
        minIdx = i;
      }
    }

    // Split points:
    // Arm 1 (Descending): from 0 to minIdx
    // Arm 2 (Ascending): from minIdx to end
    const descPoints = condStrongData.slice(0, minIdx + 1).map(p => ({ x: p.v, y: p.c }));
    const ascPoints = condStrongData.slice(minIdx).map(p => ({ x: p.v, y: p.c }));

    const regDesc = linearRegression(descPoints);
    const regAsc = linearRegression(ascPoints);

    // Compute intersection point (V2, C_min)
    let v2 = 10.0;
    let cEq = minC;
    const intersection = findIntersection(regDesc, regAsc);
    if (intersection && intersection.x > 0 && intersection.x < (condStrongData[condStrongData.length - 1].v * 1.5)) {
      v2 = intersection.x;
      cEq = intersection.y;
    } else {
      v2 = condStrongData[minIdx].v;
    }

    const n2 = parseFloat(condStrongNormBase.value) || 0.10;
    // Syllabus formula: N1 = (N2 * V2) / 40.0
    // Strength (g/L) = N1 * 36.5
    const n1 = (n2 * v2) / 40.0;
    const strength = n1 * 36.5;

    // Outlier checking: calculate residuals against the fitted lines
    let outlierCount = 0;
    let worstOutlierV = null;

    condStrongData.forEach((pt, i) => {
      const pred = i <= minIdx ? (regDesc.m * pt.v + regDesc.c) : (regAsc.m * pt.v + regAsc.c);
      const res = Math.abs(pt.c - pred);
      const threshold = 1.35; // 1.35 mS/cm threshold for potential error
      const diagCell = document.getElementById(`cond-s-diag-${i}`);
      if (diagCell) {
        if (res > threshold) {
          outlierCount++;
          worstOutlierV = pt.v;
          diagCell.innerHTML = `<span class="px-1.5 py-0.5 rounded bg-[#FFDCDC] text-[#8B4242] border border-[#D8A2A2] font-semibold text-[10px]">⚠️ Outlier</span>`;
          diagCell.closest('tr').classList.add('outlier-row');
        } else {
          diagCell.innerHTML = `<span class="text-[#5C6B4F]">Normal</span>`;
          diagCell.closest('tr').classList.remove('outlier-row');
        }
      }
    });

    if (outlierCount > 0 && condStrongOutlierNotice) {
      condStrongOutlierNotice.classList.remove('hidden');
      condStrongOutlierText.textContent = `Warning: ${outlierCount} reading(s) deviate significantly near ${worstOutlierV.toFixed(1)} mL. Check conductivity cell dipping and mixing.`;
    } else if (condStrongOutlierNotice) {
      condStrongOutlierNotice.classList.add('hidden');
    }

    // Update UI elements
    condStrongV2Badge.textContent = v2.toFixed(2);
    condStrongCminBadge.textContent = cEq.toFixed(2);

    condStrongRegDesc.textContent = `Desc (HCl): y = ${regDesc.m.toFixed(3)}x + ${regDesc.c.toFixed(2)} (R² = ${regDesc.r2.toFixed(3)})`;
    condStrongRegAsc.textContent = `Asc (NaOH): y = ${regAsc.m.toFixed(3)}x + ${regAsc.c.toFixed(2)} (R² = ${regAsc.r2.toFixed(3)})`;

    resCondStrongV2.textContent = v2.toFixed(2);
    resCondStrongN1.textContent = n1.toFixed(4);
    resCondStrongStr.textContent = strength.toFixed(4);

    calcCondStrongStep1.innerHTML = `N₁ = (${n2.toFixed(2)} N × ${v2.toFixed(2)} mL) / 40.0 mL = <span class="text-[#3C4E26] font-bold">${n1.toFixed(4)} N</span>`;
    calcCondStrongStep2.innerHTML = `Strength = ${n1.toFixed(4)} N × 36.5 = <span class="text-[#66541D] font-bold">${strength.toFixed(4)} g/L</span>`;

    // Mathematical Derivation substitution
    if (derivStrongLine1) {
      derivStrongLine1.innerHTML = `y = ${regDesc.m.toFixed(3)}x + ${regDesc.c.toFixed(2)} &nbsp;(R₁² = ${regDesc.r2.toFixed(3)})`;
      derivStrongLine2.innerHTML = `y = ${regAsc.m.toFixed(3)}x + ${regAsc.c.toFixed(2)} &nbsp;(R₂² = ${regAsc.r2.toFixed(3)})`;
      derivStrongAlgebra.innerHTML = `x = (${regAsc.c.toFixed(2)} - ${regDesc.c.toFixed(2)}) / (${regDesc.m.toFixed(3)} - ${regAsc.m.toFixed(3)}) = <span class="text-[#8EA66B] font-extrabold">${v2.toFixed(2)} mL</span> &nbsp;⟹&nbsp; Equivalence Volume V₂`;
      derivStrongResiduals.innerHTML = `Goodness of Fit: Descending R₁² = ${regDesc.r2.toFixed(3)}, Ascending R₂² = ${regAsc.r2.toFixed(3)}. Standard error = ±${regDesc.stdError.toFixed(2)} mS/cm.`;
    }

    updateCondStrongChart(regDesc, regAsc, v2, cEq);
  }

  // --- NATIVE HTML5 CANVAS 2D FALLBACK RENDERER (Palette: #8EA66B, #D8A2A2, #FFF9D6) ---
  function drawFallbackScatter(canvas, points, trendLines, eqPoint, xLabel, yLabel) {
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const rect = canvas.getBoundingClientRect();
    const w = canvas.width = (rect.width > 50 ? rect.width : (canvas.parentElement ? canvas.parentElement.clientWidth : 500)) || 500;
    const h = canvas.height = (rect.height > 50 ? rect.height : 280);

    // Crisp white canvas background
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, w, h);

    const pad = { left: 55, right: 30, top: 30, bottom: 45 };
    const plotW = Math.max(100, w - pad.left - pad.right);
    const plotH = Math.max(100, h - pad.top - pad.bottom);

    let minX = 0, maxX = 22, minY = 0, maxY = 12;
    if (points && points.length) {
      const allX = points.map(p => p.x !== undefined ? p.x : p.v);
      const allY = points.map(p => p.y !== undefined ? p.y : (p.c !== undefined ? p.c : p.e));
      maxX = Math.max(...allX) + 2;
      minX = Math.max(0, Math.min(...allX) - 1);
      maxY = Math.max(...allY) * 1.15;
      minY = Math.max(0, Math.min(...allY) * 0.85);
    }

    const toX = (val) => pad.left + ((val - minX) / (maxX - minX || 1)) * plotW;
    const toY = (val) => pad.top + plotH - ((val - minY) / (maxY - minY || 1)) * plotH;

    // Grid lines & Y ticks
    ctx.strokeStyle = 'rgba(142, 166, 107, 0.12)';
    ctx.lineWidth = 1;
    for (let i = 0; i <= 5; i++) {
      const yVal = minY + (i / 5) * (maxY - minY);
      const y = toY(yVal);
      ctx.beginPath();
      ctx.moveTo(pad.left, y);
      ctx.lineTo(pad.left + plotW, y);
      ctx.stroke();

      ctx.fillStyle = PALETTE.sagedark;
      ctx.font = '10px monospace';
      ctx.textAlign = 'right';
      ctx.fillText(yVal.toFixed(1), pad.left - 8, y + 3);
    }

    // X ticks
    for (let i = 0; i <= 6; i++) {
      const xVal = minX + (i / 6) * (maxX - minX);
      const x = toX(xVal);
      ctx.beginPath();
      ctx.moveTo(x, pad.top);
      ctx.lineTo(x, pad.top + plotH);
      ctx.stroke();

      ctx.fillStyle = PALETTE.sagedark;
      ctx.font = '10px monospace';
      ctx.textAlign = 'center';
      ctx.fillText(xVal.toFixed(1), x, pad.top + plotH + 18);
    }

    // Trend lines
    if (trendLines) {
      trendLines.forEach(tl => {
        if (!tl.pts || tl.pts.length < 2) return;
        ctx.strokeStyle = tl.color || PALETTE.sage;
        ctx.lineWidth = 2;
        ctx.setLineDash([4, 4]);
        ctx.beginPath();
        ctx.moveTo(toX(tl.pts[0].x), toY(tl.pts[0].y));
        ctx.lineTo(toX(tl.pts[1].x), toY(tl.pts[1].y));
        ctx.stroke();
        ctx.setLineDash([]);
      });
    }

    // Experimental points
    if (points) {
      points.forEach(p => {
        const px = toX(p.x !== undefined ? p.x : p.v);
        const py = toY(p.y !== undefined ? p.y : (p.c !== undefined ? p.c : p.e));
        ctx.fillStyle = PALETTE.sage;
        ctx.beginPath();
        ctx.arc(px, py, 4.5, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = PALETTE.border;
        ctx.lineWidth = 2;
        ctx.stroke();
      });
    }

    // Equivalence point marker
    if (eqPoint && eqPoint.x) {
      const ex = toX(eqPoint.x);
      const ey = toY(eqPoint.y);
      ctx.fillStyle = PALETTE.rose;
      ctx.beginPath();
      ctx.arc(ex, ey, 7, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = PALETTE.cream;
      ctx.lineWidth = 2.5;
      ctx.stroke();

      ctx.fillStyle = PALETTE.rosedark;
      ctx.font = 'bold 11px monospace';
      ctx.textAlign = 'left';
      ctx.fillText(`${eqPoint.label || 'V₂'}: ${eqPoint.x.toFixed(2)} mL`, ex + 8, ey - 6);
    }

    // Axis labels
    ctx.fillStyle = PALETTE.sagedark;
    ctx.font = 'bold 11px monospace';
    ctx.textAlign = 'center';
    ctx.fillText(xLabel, pad.left + plotW / 2, h - 8);
  }

  function updateCondStrongChart(regDesc, regAsc, v2, cEq) {
    const canvas = document.getElementById('chart-cond-strong');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const minX = Math.max(0, condStrongData[0].v - 1);
    const maxX = condStrongData[condStrongData.length - 1].v + 2;

    // Extrapolated line 1 (descending)
    const lineDescData = [
      { x: minX, y: regDesc.m * minX + regDesc.c },
      { x: v2 + 1.5, y: regDesc.m * (v2 + 1.5) + regDesc.c }
    ];

    // Extrapolated line 2 (ascending)
    const lineAscData = [
      { x: Math.max(0, v2 - 1.5), y: regAsc.m * Math.max(0, v2 - 1.5) + regAsc.c },
      { x: maxX, y: regAsc.m * maxX + regAsc.c }
    ];

    if (typeof Chart === 'undefined') {
      drawFallbackScatter(
        canvas,
        condStrongData,
        [
          { pts: lineDescData, color: PALETTE.sage },
          { pts: lineAscData, color: PALETTE.rose }
        ],
        { x: v2, y: cEq, label: 'V₂' },
        'Volume of NaOH Added (mL)',
        'Conductance (mS/cm)'
      );
      return;
    }

    const chartConfig = {
      type: 'scatter',
      data: {
        datasets: [
          {
            label: 'Experimental Conductance (mS/cm)',
            data: condStrongData.map(p => ({ x: p.v, y: p.c })),
            backgroundColor: PALETTE.sage,
            borderColor: PALETTE.border,
            pointRadius: 6,
            pointHoverRadius: 8,
            pointBorderWidth: 2,
            pointBackgroundColor: PALETTE.sage,
            showLine: false,
            order: 1
          },
          {
            label: 'HCl Regression Line',
            data: lineDescData,
            borderColor: PALETTE.sagedark,
            borderWidth: 2.2,
            borderDash: [5, 5],
            showLine: true,
            pointRadius: 0,
            fill: false,
            order: 3
          },
          {
            label: 'NaOH Regression Line',
            data: lineAscData,
            borderColor: PALETTE.rose,
            borderWidth: 2.2,
            borderDash: [5, 5],
            showLine: true,
            pointRadius: 0,
            fill: false,
            order: 4
          },
          {
            label: 'Equivalence Point (V₂)',
            data: [{ x: v2, y: cEq }],
            backgroundColor: PALETTE.rosedark,
            borderColor: PALETTE.cream,
            pointRadius: 9,
            pointHoverRadius: 11,
            pointBorderWidth: 3,
            showLine: false,
            order: 0
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        animation: { duration: 250 },
        plugins: {
          legend: {
            position: 'top',
            labels: {
              color: PALETTE.sagedark,
              font: { family: 'JetBrains Mono', size: 11, weight: 'bold' },
              boxWidth: 12
            }
          },
          tooltip: {
            backgroundColor: PALETTE.sagedark,
            titleColor: '#FFFFFF',
            bodyColor: PALETTE.cream,
            borderColor: PALETTE.border,
            borderWidth: 1,
            callbacks: {
              label: (ctx) => `(${ctx.parsed.x.toFixed(2)} mL, ${ctx.parsed.y.toFixed(2)} mS/cm)`
            }
          }
        },
        scales: {
          x: {
            title: {
              display: true,
              text: 'Volume of NaOH Added (mL)',
              color: PALETTE.sagedark,
              font: { family: 'JetBrains Mono', size: 12, weight: 'bold' }
            },
            grid: { color: 'rgba(142, 166, 107, 0.12)' },
            ticks: { color: PALETTE.sagedark, font: { family: 'JetBrains Mono' } }
          },
          y: {
            title: {
              display: true,
              text: 'Conductance (mS/cm)',
              color: PALETTE.sagedark,
              font: { family: 'JetBrains Mono', size: 12, weight: 'bold' }
            },
            grid: { color: 'rgba(142, 166, 107, 0.12)' },
            ticks: { color: PALETTE.sagedark, font: { family: 'JetBrains Mono' } }
          }
        }
      }
    };

    if (chartCondStrong) {
      chartCondStrong.data = chartConfig.data;
      chartCondStrong.options = chartConfig.options;
      chartCondStrong.update();
    } else {
      chartCondStrong = new Chart(ctx, chartConfig);
    }
  }

  // Virtual Titration Simulator Engine (Exp 2)
  let simStrongVolume = 0;
  let simStrongTimer = null;

  function updateSimStrongState(vol) {
    simStrongVolume = vol;
    // Draining burette fluid level
    const pct = Math.max(5, 100 - (vol / 20) * 85);
    if (simStrongBuretFluid) simStrongBuretFluid.style.height = `${pct}%`;

    // Calculate conductance at this volume from current regression
    let cond = 8.42;
    const v2 = parseFloat(condStrongV2Badge.textContent) || 10.0;
    if (vol <= v2) {
      cond = Math.max(2.1, 8.42 - (vol / v2) * (8.42 - 2.1));
    } else {
      cond = 2.1 + ((vol - v2) / 10) * (7.3 - 2.1);
    }

    if (simStrongReadout) simStrongReadout.textContent = cond.toFixed(2);

    // Play tone and check for equivalence point
    playLabTone('drop');
    if (Math.abs(vol - v2) < 0.3) {
      playLabTone('endpoint');
      if (typeof confetti === 'function') {
        confetti({ particleCount: 45, spread: 65, origin: { y: 0.6 } });
      }
    }
  }

  if (simStrongBtnDrop) {
    simStrongBtnDrop.addEventListener('click', () => {
      const nextVol = Math.min(20, Math.round((simStrongVolume + 1.0) * 10) / 10);
      updateSimStrongState(nextVol);
    });
  }

  if (simStrongBtnAutoRun) {
    simStrongBtnAutoRun.addEventListener('click', () => {
      if (simStrongTimer) {
        clearInterval(simStrongTimer);
        simStrongTimer = null;
        simStrongBtnAutoRun.textContent = 'Auto Run ▶';
        simStrongBtnAutoRun.classList.remove('bg-[#D8A2A2]');
        simStrongBtnAutoRun.classList.add('bg-[#8EA66B]');
      } else {
        simStrongBtnAutoRun.textContent = 'Pause ⏸';
        simStrongBtnAutoRun.classList.remove('bg-[#8EA66B]');
        simStrongBtnAutoRun.classList.add('bg-[#D8A2A2]');
        simStrongTimer = setInterval(() => {
          if (simStrongVolume >= 20) {
            clearInterval(simStrongTimer);
            simStrongTimer = null;
            simStrongBtnAutoRun.textContent = 'Auto Run ▶';
            simStrongBtnAutoRun.classList.remove('bg-[#D8A2A2]');
            simStrongBtnAutoRun.classList.add('bg-[#8EA66B]');
            return;
          }
          const nextVol = Math.min(20, Math.round((simStrongVolume + 1.0) * 10) / 10);
          updateSimStrongState(nextVol);
        }, 650);
      }
    });
  }

  if (simStrongBtnReset) {
    simStrongBtnReset.addEventListener('click', () => {
      if (simStrongTimer) {
        clearInterval(simStrongTimer);
        simStrongTimer = null;
        simStrongBtnAutoRun.textContent = 'Auto Run ▶';
      }
      updateSimStrongState(0);
      playLabTone('click');
    });
  }

  // Export Chart PNG Button
  if (condStrongBtnExportPng) {
    condStrongBtnExportPng.addEventListener('click', () => {
      downloadCanvasAsPNG('chart-cond-strong', 'ChemLab_Exp2_HCl_Conductance_Curve.png', 'Conductometric Titration: Strong Acid (HCl) vs Strong Base (NaOH)');
    });
  }

  condStrongAddRowBtn.addEventListener('click', () => {
    const lastRow = condStrongData[condStrongData.length - 1];
    const newV = lastRow ? lastRow.v + 2.0 : 0.0;
    const newC = lastRow ? lastRow.c + 1.0 : 5.0;
    condStrongData.push({ v: newV, c: newC });
    renderCondStrongTable();
    calculateCondStrong();
    playLabTone('click');
  });

  condStrongClearBtn.addEventListener('click', () => {
    condStrongData = [];
    renderCondStrongTable();
    playLabTone('click');
  });

  condStrongLoadBtn.addEventListener('click', () => {
    condStrongData = JSON.parse(JSON.stringify(defaultStrongData));
    renderCondStrongTable();
    calculateCondStrong();
    playLabTone('click');
  });

  condStrongResetBtn.addEventListener('click', () => {
    condStrongNormBase.value = 0.10;
    condStrongData = JSON.parse(JSON.stringify(defaultStrongData));
    renderCondStrongTable();
    calculateCondStrong();
    playLabTone('click');
  });

  condStrongNormBase.addEventListener('input', calculateCondStrong);

  // Initialize Module 2
  renderCondStrongTable();
  calculateCondStrong();

  // --- MODULE 3: CONDUCTOMETRIC TITRATION (MIXTURE OF ACIDS: HCl + CH3COOH) ---
  const condMixNormBase = document.getElementById('cond-mix-norm-base');
  const condMixTbody = document.getElementById('cond-mix-tbody');
  const condMixAddRowBtn = document.getElementById('cond-mix-add-row');
  const condMixClearBtn = document.getElementById('cond-mix-clear-rows');
  const condMixLoadBtn = document.getElementById('cond-mix-btn-load');
  const condMixResetBtn = document.getElementById('cond-mix-btn-reset');
  const condMixBtnImport = document.getElementById('cond-mix-btn-import');
  const condMixBtnExportPng = document.getElementById('cond-mix-btn-export-png');

  const condMixV2Badge = document.getElementById('cond-mix-v2-badge');
  const condMixV4Badge = document.getElementById('cond-mix-v4-badge');
  const condMixV2Val = document.getElementById('cond-mix-v2-val');
  const condMixV3Val = document.getElementById('cond-mix-v3-val');
  const condMixV4Val = document.getElementById('cond-mix-v4-val');

  const resCondMixN1 = document.getElementById('res-cond-mix-n1');
  const resCondMixStr1 = document.getElementById('res-cond-mix-str1');
  const resCondMixN3 = document.getElementById('res-cond-mix-n3');
  const resCondMixStr3 = document.getElementById('res-cond-mix-str3');

  const calcCondMixHcl = document.getElementById('calc-cond-mix-hcl');
  const calcCondMixCh3cooh = document.getElementById('calc-cond-mix-ch3cooh');

  // Standard Lab Data for Acid Mixture:
  const defaultMixData = [
    { v: 0.0, c: 9.20 },
    { v: 2.0, c: 7.10 },
    { v: 4.0, c: 4.85 },
    { v: 6.0, c: 2.70 }, // 1st inflection point V2 (HCl complete)
    { v: 8.0, c: 3.10 },
    { v: 10.0, c: 3.55 },
    { v: 12.0, c: 4.00 },
    { v: 14.0, c: 4.45 }, // 2nd inflection point V4 (Both acids complete)
    { v: 16.0, c: 5.75 },
    { v: 18.0, c: 7.15 },
    { v: 20.0, c: 8.55 },
    { v: 22.0, c: 9.95 }
  ];

  let condMixData = JSON.parse(JSON.stringify(defaultMixData));
  let chartCondMix = null;

  function renderCondMixTable() {
    condMixTbody.innerHTML = '';
    condMixData.forEach((row, index) => {
      // Determine titration segment for didactic clarity
      let segBadge = '<span class="text-[#3C4E26] bg-[#F1F6EC] px-1.5 py-0.5 rounded border border-[#BCCD9E] text-[10px]">HCl</span>';
      if (row.v > 6.0 && row.v <= 14.0) {
        segBadge = '<span class="text-[#66541D] bg-[#FFF9D6] px-1.5 py-0.5 rounded border border-[#E5DEC9] text-[10px]">CH₃COOH</span>';
      } else if (row.v > 14.0) {
        segBadge = '<span class="text-[#8B4242] bg-[#FFDCDC] px-1.5 py-0.5 rounded border border-[#D8A2A2] text-[10px]">Excess NaOH</span>';
      }

      const tr = document.createElement('tr');
      tr.className = 'hover:bg-[#FAF8F5] transition group';
      tr.innerHTML = `
        <td class="p-2 text-center text-[#5C6B4F] text-[11px]">${index + 1}</td>
        <td class="p-2">
          <input type="number" step="0.1" value="${row.v.toFixed(1)}" data-idx="${index}" data-field="v" class="cond-m-input table-inline-input w-20">
        </td>
        <td class="p-2">
          <input type="number" step="0.01" value="${row.c.toFixed(2)}" data-idx="${index}" data-field="c" class="cond-m-input table-inline-input w-24 text-[#3C4E26] font-bold">
        </td>
        <td class="p-2 text-center text-[10px]">
          ${segBadge}
        </td>
        <td class="p-2 text-center">
          <button data-idx="${index}" class="cond-m-del text-slate-400 hover:text-rose-600 p-1 rounded transition opacity-0 group-hover:opacity-100" title="Delete Row">
            <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg>
          </button>
        </td>
      `;
      condMixTbody.appendChild(tr);
    });

    document.querySelectorAll('.cond-m-input').forEach(input => {
      const handleUpdate = (e) => {
        const idx = parseInt(e.target.dataset.idx, 10);
        const field = e.target.dataset.field;
        condMixData[idx][field] = parseFloat(e.target.value) || 0;
        calculateCondMix();
      };
      input.addEventListener('input', handleUpdate);
      input.addEventListener('change', handleUpdate);
    });

    document.querySelectorAll('.cond-m-del').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const idx = parseInt(btn.dataset.idx, 10);
        if (condMixData.length > 4) {
          condMixData.splice(idx, 1);
          renderCondMixTable();
          calculateCondMix();
          playLabTone('click');
        }
      });
    });
  }

  function calculateCondMix() {
    if (!condMixData || condMixData.length < 5) return;

    condMixData.sort((a, b) => a.v - b.v);

    // Find the minimum point (end of HCl descent)
    let minIdx = 0;
    let minC = condMixData[0].c;
    for (let i = 1; i < condMixData.length; i++) {
      if (condMixData[i].c < minC) {
        minC = condMixData[i].c;
        minIdx = i;
      }
    }

    // Segment 1 (HCl Descent): 0 to minIdx
    const seg1 = condMixData.slice(0, minIdx + 1).map(p => ({ x: p.v, y: p.c }));
    const reg1 = linearRegression(seg1);

    // Segment 2 & 3: Find inflection where slope increases sharply
    let inflection2Idx = Math.min(condMixData.length - 2, minIdx + 3);
    let maxSlopeDiff = -1;

    for (let i = minIdx + 1; i < condMixData.length - 2; i++) {
      const slopeBefore = (condMixData[i].c - condMixData[minIdx].c) / (condMixData[i].v - condMixData[minIdx].v || 1);
      const slopeAfter = (condMixData[condMixData.length - 1].c - condMixData[i].c) / (condMixData[condMixData.length - 1].v - condMixData[i].v || 1);
      const diff = slopeAfter - slopeBefore;
      if (diff > maxSlopeDiff) {
        maxSlopeDiff = diff;
        inflection2Idx = i;
      }
    }

    const seg2 = condMixData.slice(minIdx, inflection2Idx + 1).map(p => ({ x: p.v, y: p.c }));
    const seg3 = condMixData.slice(inflection2Idx).map(p => ({ x: p.v, y: p.c }));

    const reg2 = linearRegression(seg2);
    const reg3 = linearRegression(seg3);

    // Intersections:
    let v2 = 6.0, cEq1 = 2.70;
    const inter1 = findIntersection(reg1, reg2);
    if (inter1 && inter1.x > 0 && inter1.x < 15) {
      v2 = inter1.x;
      cEq1 = inter1.y;
    } else {
      v2 = condMixData[minIdx].v;
    }

    let v4 = 14.0, cEq2 = 4.45;
    const inter2 = findIntersection(reg2, reg3);
    if (inter2 && inter2.x > v2 && inter2.x < condMixData[condMixData.length - 1].v) {
      v4 = inter2.x;
      cEq2 = inter2.y;
    } else {
      v4 = condMixData[inflection2Idx].v;
    }

    // V3 = Volume consumed by acetic acid alone
    const v3 = Math.max(0, v4 - v2);

    const n2 = parseFloat(condMixNormBase.value) || 0.10;

    // Syllabus formulas:
    // HCl: N1 = (N2 * V2) / 40.0; Strength = N1 * 36.5
    // CH3COOH: N3 = (N2 * V3) / 40.0; Strength = N3 * 60.05
    const n1 = (n2 * v2) / 40.0;
    const str1 = n1 * 36.5;

    const n3 = (n2 * v3) / 40.0;
    const str3 = n3 * 60.05;

    // UI Updates
    condMixV2Badge.textContent = v2.toFixed(2);
    condMixV4Badge.textContent = v4.toFixed(2);
    condMixV2Val.textContent = `${v2.toFixed(2)} mL`;
    condMixV3Val.textContent = `${v3.toFixed(2)} mL`;
    condMixV4Val.textContent = `${v4.toFixed(2)} mL`;

    resCondMixN1.textContent = `${n1.toFixed(4)} N`;
    resCondMixStr1.textContent = str1.toFixed(4);
    resCondMixN3.textContent = `${n3.toFixed(4)} N`;
    resCondMixStr3.textContent = str3.toFixed(4);

    calcCondMixHcl.innerHTML = `N₁ = (${n2.toFixed(2)} × ${v2.toFixed(2)}) / 40 = <span class="text-[#3C4E26] font-bold">${n1.toFixed(4)} N</span>; &nbsp; Strength = ${n1.toFixed(4)} × 36.5 = <span class="text-[#3C4E26] font-bold">${str1.toFixed(4)} g/L</span>`;
    calcCondMixCh3cooh.innerHTML = `V₃ = ${v4.toFixed(2)} - ${v2.toFixed(2)} = ${v3.toFixed(2)} mL &nbsp;⟹&nbsp; N₃ = (${n2.toFixed(2)} × ${v3.toFixed(2)}) / 40 = <span class="text-[#66541D] font-bold">${n3.toFixed(4)} N</span>; &nbsp; Strength = ${n3.toFixed(4)} × 60.05 = <span class="text-[#66541D] font-bold">${str3.toFixed(4)} g/L</span>`;

    updateCondMixChart(reg1, reg2, reg3, v2, cEq1, v4, cEq2);
  }

  function updateCondMixChart(reg1, reg2, reg3, v2, cEq1, v4, cEq2) {
    const canvas = document.getElementById('chart-cond-mix');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');

    const minX = 0;
    const maxX = condMixData[condMixData.length - 1].v + 2;

    const datasetLine1 = [
      { x: minX, y: reg1.m * minX + reg1.c },
      { x: v2 + 1.2, y: reg1.m * (v2 + 1.2) + reg1.c }
    ];

    const datasetLine2 = [
      { x: Math.max(0, v2 - 1.2), y: reg2.m * Math.max(0, v2 - 1.2) + reg2.c },
      { x: v4 + 1.2, y: reg2.m * (v4 + 1.2) + reg2.c }
    ];

    const datasetLine3 = [
      { x: Math.max(0, v4 - 1.2), y: reg3.m * Math.max(0, v4 - 1.2) + reg3.c },
      { x: maxX, y: reg3.m * maxX + reg3.c }
    ];

    if (typeof Chart === 'undefined') {
      drawFallbackScatter(
        canvas,
        condMixData,
        [
          { pts: datasetLine1, color: PALETTE.sage },
          { pts: datasetLine2, color: PALETTE.creamdark },
          { pts: datasetLine3, color: PALETTE.rose }
        ],
        { x: v2, y: cEq1, label: 'V₂ (HCl)' },
        'Volume of 0.1 N NaOH (mL)',
        'Conductance (mS/cm)'
      );
      return;
    }

    const chartConfig = {
      type: 'scatter',
      data: {
        datasets: [
          {
            label: 'Experimental Points',
            data: condMixData.map(p => ({ x: p.v, y: p.c })),
            backgroundColor: PALETTE.sage,
            borderColor: PALETTE.border,
            pointRadius: 6,
            pointHoverRadius: 8,
            pointBorderWidth: 2,
            pointBackgroundColor: PALETTE.sage,
            showLine: false,
            order: 1
          },
          {
            label: 'Line 1: HCl Descent',
            data: datasetLine1,
            borderColor: PALETTE.sagedark,
            borderWidth: 2,
            borderDash: [4, 4],
            showLine: true,
            pointRadius: 0,
            fill: false,
            order: 3
          },
          {
            label: 'Line 2: CH₃COOH Buffer',
            data: datasetLine2,
            borderColor: PALETTE.creamdark,
            borderWidth: 2,
            borderDash: [4, 4],
            showLine: true,
            pointRadius: 0,
            fill: false,
            order: 4
          },
          {
            label: 'Line 3: Excess Base Rise',
            data: datasetLine3,
            borderColor: PALETTE.rose,
            borderWidth: 2,
            borderDash: [4, 4],
            showLine: true,
            pointRadius: 0,
            fill: false,
            order: 5
          },
          {
            label: 'Inflection 1 (V₂ - HCl)',
            data: [{ x: v2, y: cEq1 }],
            backgroundColor: PALETTE.sagedark,
            borderColor: PALETTE.cream,
            pointRadius: 8,
            pointBorderWidth: 3,
            showLine: false,
            order: 0
          },
          {
            label: 'Inflection 2 (V₄ - Total)',
            data: [{ x: v4, y: cEq2 }],
            backgroundColor: PALETTE.rose,
            borderColor: PALETTE.cream,
            pointRadius: 8,
            pointBorderWidth: 3,
            showLine: false,
            order: 0
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        animation: { duration: 250 },
        plugins: {
          legend: {
            position: 'top',
            labels: {
              color: PALETTE.sagedark,
              font: { family: 'JetBrains Mono', size: 10, weight: 'bold' },
              boxWidth: 10
            }
          },
          tooltip: {
            backgroundColor: PALETTE.sagedark,
            titleColor: '#FFFFFF',
            bodyColor: PALETTE.cream,
            borderColor: PALETTE.border,
            borderWidth: 1,
            callbacks: {
              label: (ctx) => `(${ctx.parsed.x.toFixed(2)} mL, ${ctx.parsed.y.toFixed(2)} mS/cm)`
            }
          }
        },
        scales: {
          x: {
            title: {
              display: true,
              text: 'Volume of 0.1 N NaOH Added (mL)',
              color: PALETTE.sagedark,
              font: { family: 'JetBrains Mono', size: 12, weight: 'bold' }
            },
            grid: { color: 'rgba(142, 166, 107, 0.12)' },
            ticks: { color: PALETTE.sagedark, font: { family: 'JetBrains Mono' } }
          },
          y: {
            title: {
              display: true,
              text: 'Conductance (mS/cm)',
              color: PALETTE.sagedark,
              font: { family: 'JetBrains Mono', size: 12, weight: 'bold' }
            },
            grid: { color: 'rgba(142, 166, 107, 0.12)' },
            ticks: { color: PALETTE.sagedark, font: { family: 'JetBrains Mono' } }
          }
        }
      }
    };

    if (chartCondMix) {
      chartCondMix.data = chartConfig.data;
      chartCondMix.options = chartConfig.options;
      chartCondMix.update();
    } else {
      chartCondMix = new Chart(ctx, chartConfig);
    }
  }

  if (condMixBtnExportPng) {
    condMixBtnExportPng.addEventListener('click', () => {
      downloadCanvasAsPNG('chart-cond-mix', 'ChemLab_Exp3_AcidMixture_Curve.png', 'Conductometric Titration: Acid Mixture (HCl + CH₃COOH vs NaOH)');
    });
  }

  condMixAddRowBtn.addEventListener('click', () => {
    const last = condMixData[condMixData.length - 1];
    const newV = last ? last.v + 2.0 : 0.0;
    const newC = last ? last.c + 1.2 : 5.0;
    condMixData.push({ v: newV, c: newC });
    renderCondMixTable();
    calculateCondMix();
    playLabTone('click');
  });

  condMixClearBtn.addEventListener('click', () => {
    condMixData = [];
    renderCondMixTable();
    playLabTone('click');
  });

  condMixLoadBtn.addEventListener('click', () => {
    condMixData = JSON.parse(JSON.stringify(defaultMixData));
    renderCondMixTable();
    calculateCondMix();
    playLabTone('click');
  });

  condMixResetBtn.addEventListener('click', () => {
    condMixNormBase.value = 0.10;
    condMixData = JSON.parse(JSON.stringify(defaultMixData));
    renderCondMixTable();
    calculateCondMix();
    playLabTone('click');
  });

  condMixNormBase.addEventListener('input', calculateCondMix);

  // Initialize Module 3
  renderCondMixTable();
  calculateCondMix();

  // --- MODULE 4: POTENTIOMETRIC TITRATION (Fe2+ using KMnO4) ---
  const potNormKmno4 = document.getElementById('pot-norm-kmno4');
  const potTbody = document.getElementById('pot-tbody');
  const potAddRowBtn = document.getElementById('pot-add-row');
  const potClearBtn = document.getElementById('pot-clear-rows');
  const potLoadBtn = document.getElementById('pot-btn-load');
  const potResetBtn = document.getElementById('pot-btn-reset');
  const potBtnImport = document.getElementById('pot-btn-import');
  const potBtnExportEmfPng = document.getElementById('pot-btn-export-emf-png');
  const potBtnExportDerivPng = document.getElementById('pot-btn-export-deriv-png');

  const potV1Badge = document.getElementById('pot-v1-badge');
  const potDerivMaxBadge = document.getElementById('pot-deriv-max-badge');

  const resPotV1 = document.getElementById('res-pot-v1');
  const resPotN2 = document.getElementById('res-pot-n2');
  const resPotIronStr = document.getElementById('res-pot-iron-str');

  const calcPotStep1 = document.getElementById('calc-pot-step1');
  const calcPotStep2 = document.getElementById('calc-pot-step2');

  // Chart view switches
  const potBtnSplit = document.getElementById('pot-btn-view-split');
  const potBtnEmf = document.getElementById('pot-btn-view-emf');
  const potBtnDeriv = document.getElementById('pot-btn-view-deriv');
  const potChartsContainer = document.getElementById('pot-charts-container');
  const potChart1Box = document.getElementById('pot-chart1-box');
  const potChart2Box = document.getElementById('pot-chart2-box');

  // Standard Lab Data for Fe2+ vs KMnO4
  const defaultPotData = [
    { v: 0.0, e: 380 },
    { v: 2.0, e: 405 },
    { v: 4.0, e: 430 },
    { v: 6.0, e: 458 },
    { v: 8.0, e: 490 },
    { v: 9.0, e: 520 },
    { v: 9.5, e: 550 },
    { v: 9.8, e: 590 },
    { v: 10.0, e: 720 }, // Sigmoidal jump
    { v: 10.2, e: 840 }, // Sigmoidal jump peak
    { v: 10.5, e: 875 },
    { v: 11.0, e: 895 },
    { v: 12.0, e: 915 },
    { v: 14.0, e: 935 }
  ];

  let potData = JSON.parse(JSON.stringify(defaultPotData));
  let chartPotEmf = null;
  let chartPotDeriv = null;

  function renderPotTable() {
    potTbody.innerHTML = '';
    
    // Sort ascending
    potData.sort((a, b) => a.v - b.v);

    let maxDerivVal = -1;
    let peakIdx = -1;

    // First pass: find maximum derivative
    for (let i = 1; i < potData.length; i++) {
      const dv = potData[i].v - potData[i - 1].v;
      const de = potData[i].e - potData[i - 1].e;
      const deriv = dv > 0 ? de / dv : 0;
      if (deriv > maxDerivVal) {
        maxDerivVal = deriv;
        peakIdx = i;
      }
    }

    potData.forEach((row, index) => {
      let deltaV = '-';
      let deltaE = '-';
      let derivStr = '-';
      let isPeak = false;
      let isInversion = false;

      if (index > 0) {
        const dv = row.v - potData[index - 1].v;
        const de = row.e - potData[index - 1].e;
        const deriv = dv > 0 ? (de / dv) : 0;
        deltaV = dv.toFixed(1);
        deltaE = de.toFixed(0);
        derivStr = deriv.toFixed(1);
        if (index === peakIdx) {
          isPeak = true;
        }
        if (de < 0) {
          isInversion = true;
        }
      }

      const tr = document.createElement('tr');
      tr.className = `transition group ${isPeak ? 'pot-peak-row' : 'hover:bg-[#FAF8F5]'}`;
      tr.innerHTML = `
        <td class="p-2 text-center text-[#5C6B4F] text-[11px]">${index + 1}</td>
        <td class="p-2">
          <input type="number" step="0.1" value="${row.v.toFixed(1)}" data-idx="${index}" data-field="v" class="pot-input table-inline-input w-16">
        </td>
        <td class="p-2">
          <input type="number" step="1" value="${row.e.toFixed(0)}" data-idx="${index}" data-field="e" class="pot-input table-inline-input w-16 text-[#3C4E26] font-bold">
        </td>
        <td class="p-2 text-[#5C6B4F] text-xs">${deltaV}</td>
        <td class="p-2 ${isInversion ? 'text-[#8B4242] font-bold' : 'text-[#5C6B4F]'} text-xs">${deltaE}</td>
        <td class="p-2 font-semibold ${isPeak ? 'text-[#3C4E26] font-bold flex items-center gap-1.5' : 'text-[#26331C]'} text-xs">
          <span>${derivStr}</span>
          ${isPeak ? '<span class="text-[9px] bg-[#8EA66B] text-white px-1.5 py-0.5 rounded font-mono font-bold shadow-sm animate-pulse">★ PEAK (V₁)</span>' : ''}
          ${isInversion ? '<span class="text-[9px] bg-[#FFDCDC] text-[#8B4242] px-1 rounded border border-[#D8A2A2]">⚠️ Inversion</span>' : ''}
        </td>
        <td class="p-2 text-center">
          <button data-idx="${index}" class="pot-del text-slate-400 hover:text-rose-600 p-1 rounded transition opacity-0 group-hover:opacity-100" title="Delete Row">
            <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg>
          </button>
        </td>
      `;
      potTbody.appendChild(tr);
    });

    document.querySelectorAll('.pot-input').forEach(input => {
      const handleUpdate = (e) => {
        const idx = parseInt(e.target.dataset.idx, 10);
        const field = e.target.dataset.field;
        potData[idx][field] = parseFloat(e.target.value) || 0;
        calculatePotentiometry();
      };
      input.addEventListener('input', handleUpdate);
      input.addEventListener('change', handleUpdate);
    });

    document.querySelectorAll('.pot-del').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const idx = parseInt(btn.dataset.idx, 10);
        if (potData.length > 4) {
          potData.splice(idx, 1);
          renderPotTable();
          calculatePotentiometry();
          playLabTone('click');
        }
      });
    });
  }

  function calculatePotentiometry() {
    if (!potData || potData.length < 3) return;

    potData.sort((a, b) => a.v - b.v);

    let maxDeriv = 0;
    let peakIndex = 1;
    const derivData = [];

    for (let i = 1; i < potData.length; i++) {
      const dv = potData[i].v - potData[i - 1].v;
      const de = potData[i].e - potData[i - 1].e;
      const vMean = (potData[i].v + potData[i - 1].v) / 2;
      const deriv = dv > 0 ? (de / dv) : 0;
      
      derivData.push({ x: vMean, y: deriv });

      if (deriv > maxDeriv) {
        maxDeriv = deriv;
        peakIndex = i;
      }
    }

    // Equivalent volume V1: midpoint of the step with maximum ΔE/ΔV
    const v1 = (potData[peakIndex].v + potData[peakIndex - 1].v) / 2;

    const n1 = parseFloat(potNormKmno4.value) || 0.10;
    // Syllabus formula: N2 = (N1 * V1) / 20.0
    // Iron concentration (g/L) = N2 * 55.85
    const n2 = (n1 * v1) / 20.0;
    const ironConc = n2 * 55.85;

    // UI Updates
    potV1Badge.textContent = `${v1.toFixed(2)} mL`;
    potDerivMaxBadge.textContent = `${maxDeriv.toFixed(1)} mV/mL`;

    resPotV1.textContent = v1.toFixed(2);
    resPotN2.textContent = n2.toFixed(4);
    resPotIronStr.textContent = ironConc.toFixed(4);

    calcPotStep1.innerHTML = `N₂ = (${n1.toFixed(2)} N × ${v1.toFixed(2)} mL) / 20.0 mL = <span class="text-[#3C4E26] font-bold">${n2.toFixed(4)} N</span>`;
    calcPotStep2.innerHTML = `Concentration = ${n2.toFixed(4)} N × 55.85 = <span class="text-[#66541D] font-bold">${ironConc.toFixed(4)} g/L</span>`;

    updatePotCharts(derivData, v1, maxDeriv);
  }

  function updatePotCharts(derivData, v1, maxDeriv) {
    const canvasEmf = document.getElementById('chart-pot-emf');
    const canvasDeriv = document.getElementById('chart-pot-deriv');
    if (!canvasEmf || !canvasDeriv) return;

    if (typeof Chart === 'undefined') {
      drawFallbackScatter(
        canvasEmf,
        potData.map(p => ({ x: p.v, y: p.e })),
        [],
        { x: v1, y: 720, label: 'V₁ Inflection' },
        'Vol KMnO₄ (mL)',
        'EMF (mV)'
      );
      drawFallbackScatter(
        canvasDeriv,
        derivData,
        [],
        { x: v1, y: maxDeriv, label: 'Peak' },
        'Vol KMnO₄ (mL)',
        'ΔE/ΔV (mV/mL)'
      );
      return;
    }

    const ctxEmf = canvasEmf.getContext('2d');
    const ctxDeriv = canvasDeriv.getContext('2d');

    // Chart 1: Sigmoidal EMF Curve
    const configEmf = {
      type: 'line',
      data: {
        datasets: [
          {
            label: 'EMF (mV)',
            data: potData.map(p => ({ x: p.v, y: p.e })),
            borderColor: PALETTE.sage,
            backgroundColor: 'rgba(142, 166, 107, 0.18)',
            fill: true,
            tension: 0.3,
            pointRadius: 4,
            pointHoverRadius: 6,
            pointBackgroundColor: PALETTE.sage,
            pointBorderColor: PALETTE.border,
            pointBorderWidth: 1.5
          },
          {
            label: 'Equivalence Inflection',
            data: [{ x: v1, y: 720 }],
            borderColor: PALETTE.cream,
            backgroundColor: PALETTE.rose,
            pointRadius: 7,
            pointBorderWidth: 2,
            pointBorderColor: PALETTE.cream,
            showLine: false
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: {
            backgroundColor: PALETTE.sagedark,
            titleColor: '#FFFFFF',
            bodyColor: PALETTE.cream,
            borderColor: PALETTE.border,
            borderWidth: 1,
            callbacks: {
              label: (c) => `EMF: ${c.parsed.y} mV at ${c.parsed.x.toFixed(2)} mL`
            }
          }
        },
        scales: {
          x: {
            type: 'linear',
            title: { display: true, text: 'Vol KMnO₄ (mL)', color: PALETTE.sagedark, font: { family: 'JetBrains Mono', size: 10, weight: 'bold' } },
            grid: { color: 'rgba(142, 166, 107, 0.12)' },
            ticks: { color: PALETTE.sagedark, font: { family: 'JetBrains Mono', size: 10 } }
          },
          y: {
            title: { display: true, text: 'EMF (mV)', color: PALETTE.sagedark, font: { family: 'JetBrains Mono', size: 10, weight: 'bold' } },
            grid: { color: 'rgba(142, 166, 107, 0.12)' },
            ticks: { color: PALETTE.sagedark, font: { family: 'JetBrains Mono', size: 10 } }
          }
        }
      }
    };

    if (chartPotEmf) {
      chartPotEmf.data = configEmf.data;
      chartPotEmf.options = configEmf.options;
      chartPotEmf.update();
    } else {
      chartPotEmf = new Chart(ctxEmf, configEmf);
    }

    // Chart 2: First Derivative Curve (ΔE/ΔV)
    const configDeriv = {
      type: 'line',
      data: {
        datasets: [
          {
            label: 'ΔE / ΔV (mV/mL)',
            data: derivData,
            borderColor: PALETTE.rose,
            backgroundColor: 'rgba(255, 220, 220, 0.45)',
            fill: true,
            tension: 0.25,
            pointRadius: 4,
            pointHoverRadius: 6,
            pointBackgroundColor: PALETTE.rose,
            pointBorderColor: PALETTE.border,
            pointBorderWidth: 1.5
          },
          {
            label: 'Peak Maximum (V₁)',
            data: [{ x: v1, y: maxDeriv }],
            borderColor: PALETTE.cream,
            backgroundColor: PALETTE.sage,
            pointRadius: 8,
            pointBorderWidth: 2,
            pointBorderColor: PALETTE.cream,
            showLine: false
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: {
            backgroundColor: PALETTE.sagedark,
            titleColor: '#FFFFFF',
            bodyColor: PALETTE.cream,
            borderColor: PALETTE.border,
            borderWidth: 1,
            callbacks: {
              label: (c) => `ΔE/ΔV: ${c.parsed.y.toFixed(1)} mV/mL at ${c.parsed.x.toFixed(2)} mL`
            }
          }
        },
        scales: {
          x: {
            type: 'linear',
            title: { display: true, text: 'Vol KMnO₄ (mL)', color: PALETTE.sagedark, font: { family: 'JetBrains Mono', size: 10, weight: 'bold' } },
            grid: { color: 'rgba(142, 166, 107, 0.12)' },
            ticks: { color: PALETTE.sagedark, font: { family: 'JetBrains Mono', size: 10 } }
          },
          y: {
            title: { display: true, text: 'ΔE / ΔV (mV/mL)', color: PALETTE.sagedark, font: { family: 'JetBrains Mono', size: 10, weight: 'bold' } },
            grid: { color: 'rgba(142, 166, 107, 0.12)' },
            ticks: { color: PALETTE.sagedark, font: { family: 'JetBrains Mono', size: 10 } }
          }
        }
      }
    };

    if (chartPotDeriv) {
      chartPotDeriv.data = configDeriv.data;
      chartPotDeriv.options = configDeriv.options;
      chartPotDeriv.update();
    } else {
      chartPotDeriv = new Chart(ctxDeriv, configDeriv);
    }
  }

  if (potBtnExportEmfPng) {
    potBtnExportEmfPng.addEventListener('click', () => {
      downloadCanvasAsPNG('chart-pot-emf', 'ChemLab_Exp4_EMF_Sigmoidal_Curve.png', 'Potentiometric Titration: Fe²⁺ vs KMnO₄ (Sigmoidal EMF Curve)');
    });
  }

  if (potBtnExportDerivPng) {
    potBtnExportDerivPng.addEventListener('click', () => {
      downloadCanvasAsPNG('chart-pot-deriv', 'ChemLab_Exp4_Derivative_Peak_Curve.png', 'Potentiometric Titration: First Derivative Spike (ΔE/ΔV)');
    });
  }

  potAddRowBtn.addEventListener('click', () => {
    const last = potData[potData.length - 1];
    const newV = last ? last.v + 1.0 : 0.0;
    const newE = last ? last.e + 20 : 400;
    potData.push({ v: newV, e: newE });
    renderPotTable();
    calculatePotentiometry();
    playLabTone('click');
  });

  potClearBtn.addEventListener('click', () => {
    potData = [];
    renderPotTable();
    playLabTone('click');
  });

  potLoadBtn.addEventListener('click', () => {
    potData = JSON.parse(JSON.stringify(defaultPotData));
    renderPotTable();
    calculatePotentiometry();
    playLabTone('click');
  });

  potResetBtn.addEventListener('click', () => {
    potNormKmno4.value = 0.10;
    potData = JSON.parse(JSON.stringify(defaultPotData));
    renderPotTable();
    calculatePotentiometry();
    playLabTone('click');
  });

  potNormKmno4.addEventListener('input', calculatePotentiometry);

  // View Switchers for Potentiometry
  potBtnSplit.addEventListener('click', () => {
    potChartsContainer.className = 'grid grid-cols-1 md:grid-cols-2 gap-4';
    potChart1Box.classList.remove('hidden');
    potChart2Box.classList.remove('hidden');
    potBtnSplit.className = 'px-2.5 py-1 rounded-lg bg-[#8EA66B] text-white font-semibold transition shadow-sm';
    potBtnEmf.className = 'px-2.5 py-1 rounded-lg text-[#5C6B4F] hover:text-[#3C4E26] transition';
    potBtnDeriv.className = 'px-2.5 py-1 rounded-lg text-[#5C6B4F] hover:text-[#3C4E26] transition';
    if (chartPotEmf) chartPotEmf.resize();
    if (chartPotDeriv) chartPotDeriv.resize();
  });

  potBtnEmf.addEventListener('click', () => {
    potChartsContainer.className = 'grid grid-cols-1 gap-4';
    potChart1Box.classList.remove('hidden');
    potChart2Box.classList.add('hidden');
    potBtnEmf.className = 'px-2.5 py-1 rounded-lg bg-[#8EA66B] text-white font-semibold transition shadow-sm';
    potBtnSplit.className = 'px-2.5 py-1 rounded-lg text-[#5C6B4F] hover:text-[#3C4E26] transition';
    potBtnDeriv.className = 'px-2.5 py-1 rounded-lg text-[#5C6B4F] hover:text-[#3C4E26] transition';
    if (chartPotEmf) chartPotEmf.resize();
  });

  potBtnDeriv.addEventListener('click', () => {
    potChartsContainer.className = 'grid grid-cols-1 gap-4';
    potChart1Box.classList.add('hidden');
    potChart2Box.classList.remove('hidden');
    potBtnDeriv.className = 'px-2.5 py-1 rounded-lg bg-[#8EA66B] text-white font-semibold transition shadow-sm';
    potBtnSplit.className = 'px-2.5 py-1 rounded-lg text-[#5C6B4F] hover:text-[#3C4E26] transition';
    potBtnEmf.className = 'px-2.5 py-1 rounded-lg text-[#5C6B4F] hover:text-[#3C4E26] transition';
    if (chartPotDeriv) chartPotDeriv.resize();
  });

  // Initialize Module 4
  renderPotTable();
  calculatePotentiometry();

  // --- BULK PASTE / CSV / EXCEL IMPORT MODAL CONTROLLER ---
  const modalBulkImport = document.getElementById('modal-bulk-import');
  const btnCloseBulkImport = document.getElementById('btn-close-bulk-import');
  const bulkImportTargetSelect = document.getElementById('bulk-import-target-select');
  const bulkImportTextarea = document.getElementById('bulk-import-textarea');
  const bulkImportStatus = document.getElementById('bulk-import-status');
  const bulkImportCount = document.getElementById('bulk-import-count');
  const bulkImportPreviewBox = document.getElementById('bulk-import-preview-box');
  const bulkImportPreviewTbody = document.getElementById('bulk-import-preview-tbody');
  const btnBulkImportApply = document.getElementById('btn-bulk-import-apply');
  const btnBulkImportAppend = document.getElementById('btn-bulk-import-append');
  const btnBulkLoadSample = document.getElementById('btn-bulk-load-sample');

  function openBulkImportModal(targetExp) {
    if (targetExp) bulkImportTargetSelect.value = targetExp;
    modalBulkImport.classList.remove('hidden');
    playLabTone('click');
    bulkImportTextarea.focus();
  }

  if (condStrongBtnImport) condStrongBtnImport.addEventListener('click', () => openBulkImportModal('cond-strong'));
  if (condMixBtnImport) condMixBtnImport.addEventListener('click', () => openBulkImportModal('cond-mix'));
  if (potBtnImport) potBtnImport.addEventListener('click', () => openBulkImportModal('pot'));

  btnCloseBulkImport.addEventListener('click', () => {
    modalBulkImport.classList.add('hidden');
    playLabTone('click');
  });

  // Parse raw text pasted from spreadsheets or text files
  function parsePastedData(text) {
    const lines = text.trim().split(/\r?\n/);
    const validPoints = [];

    lines.forEach(line => {
      const clean = line.trim();
      if (!clean) return;

      // Ignore header rows containing letters like "Volume" or "Conductance"
      if (/^[a-zA-Z#]/i.test(clean)) return;

      // Split by tab, comma, semicolon, or whitespace
      const tokens = clean.split(/[\t,;]|\s+/).filter(Boolean);
      if (tokens.length >= 2) {
        const v = parseFloat(tokens[0]);
        const y = parseFloat(tokens[1]);
        if (!isNaN(v) && !isNaN(y) && isFinite(v) && isFinite(y)) {
          validPoints.push({ v, y });
        }
      }
    });

    return validPoints;
  }

  function updateBulkPreview() {
    const points = parsePastedData(bulkImportTextarea.value);
    bulkImportCount.textContent = `${points.length} rows detected`;

    if (points.length > 0) {
      bulkImportPreviewBox.classList.remove('hidden');
      bulkImportStatus.className = 'p-2.5 rounded-lg bg-[#F1F6EC] border border-[#BCCD9E] text-[#3C4E26] flex items-center justify-between';
      bulkImportStatus.firstElementChild.textContent = `Valid format: ${points.length} coordinate pairs parsed successfully.`;

      bulkImportPreviewTbody.innerHTML = '';
      points.slice(0, 20).forEach((pt, i) => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
          <td class="p-1.5 text-center text-[#5C6B4F]">${i + 1}</td>
          <td class="p-1.5 text-[#3C4E26] font-bold">${pt.v.toFixed(2)} mL</td>
          <td class="p-1.5 text-[#26331C]">${pt.y.toFixed(2)}</td>
        `;
        bulkImportPreviewTbody.appendChild(tr);
      });
      if (points.length > 20) {
        const trMore = document.createElement('tr');
        trMore.innerHTML = `<td colspan="3" class="p-1 text-center text-[#5C6B4F] italic">+ ${points.length - 20} more rows...</td>`;
        bulkImportPreviewTbody.appendChild(trMore);
      }
    } else {
      bulkImportPreviewBox.classList.add('hidden');
      bulkImportStatus.className = 'p-2.5 rounded-lg bg-[#FAF8F5] border border-[#E5DEC9] text-[#5C6B4F] flex items-center justify-between';
      bulkImportStatus.firstElementChild.textContent = 'Paste spreadsheet columns above to preview.';
    }
  }

  bulkImportTextarea.addEventListener('input', updateBulkPreview);

  btnBulkLoadSample.addEventListener('click', () => {
    const target = bulkImportTargetSelect.value;
    if (target === 'cond-strong') {
      bulkImportTextarea.value = "0.0\t8.42\n2.0\t7.15\n4.0\t5.86\n6.0\t4.60\n8.0\t3.35\n10.0\t2.10\n12.0\t3.12\n14.0\t4.16\n16.0\t5.20\n18.0\t6.25\n20.0\t7.30";
    } else if (target === 'cond-mix') {
      bulkImportTextarea.value = "0.0\t9.20\n2.0\t7.10\n4.0\t4.85\n6.0\t2.70\n8.0\t3.10\n10.0\t3.55\n12.0\t4.00\n14.0\t4.45\n16.0\t5.75\n18.0\t7.15\n20.0\t8.55\n22.0\t9.95";
    } else {
      bulkImportTextarea.value = "0.0\t380\n2.0\t405\n4.0\t430\n6.0\t458\n8.0\t490\n9.0\t520\n9.5\t550\n9.8\t590\n10.0\t720\n10.2\t840\n10.5\t875\n11.0\t895\n12.0\t915\n14.0\t935";
    }
    updateBulkPreview();
    playLabTone('click');
  });

  btnBulkImportApply.addEventListener('click', () => {
    const points = parsePastedData(bulkImportTextarea.value);
    if (!points.length) {
      alert('Please paste at least two valid numeric columns (Volume and Reading).');
      return;
    }

    const target = bulkImportTargetSelect.value;
    if (target === 'cond-strong') {
      condStrongData = points.map(p => ({ v: p.v, c: p.y }));
      renderCondStrongTable();
      calculateCondStrong();
    } else if (target === 'cond-mix') {
      condMixData = points.map(p => ({ v: p.v, c: p.y }));
      renderCondMixTable();
      calculateCondMix();
    } else if (target === 'pot') {
      potData = points.map(p => ({ v: p.v, e: p.y }));
      renderPotTable();
      calculatePotentiometry();
    }

    modalBulkImport.classList.add('hidden');
    playLabTone('endpoint');
  });

  btnBulkImportAppend.addEventListener('click', () => {
    const points = parsePastedData(bulkImportTextarea.value);
    if (!points.length) return;

    const target = bulkImportTargetSelect.value;
    if (target === 'cond-strong') {
      points.forEach(p => condStrongData.push({ v: p.v, c: p.y }));
      renderCondStrongTable();
      calculateCondStrong();
    } else if (target === 'cond-mix') {
      points.forEach(p => condMixData.push({ v: p.v, c: p.y }));
      renderCondMixTable();
      calculateCondMix();
    } else if (target === 'pot') {
      points.forEach(p => potData.push({ v: p.v, e: p.y }));
      renderPotTable();
      calculatePotentiometry();
    }

    modalBulkImport.classList.add('hidden');
    playLabTone('click');
  });

  // --- ARCHITECTURE & NUMERICAL METHODS MODAL CONTROLLER ---
  const modalArchitecture = document.getElementById('modal-architecture');
  const btnOpenArch = document.getElementById('btn-open-arch');
  const btnCloseArch = document.getElementById('btn-close-arch');

  if (btnOpenArch && modalArchitecture) {
    btnOpenArch.addEventListener('click', () => {
      modalArchitecture.classList.remove('hidden');
      playLabTone('click');
    });
  }

  if (btnCloseArch && modalArchitecture) {
    btnCloseArch.addEventListener('click', () => {
      modalArchitecture.classList.add('hidden');
      playLabTone('click');
    });
  }

  // --- VIVA VOCE FLASHCARDS DATABASE & INTERACTION CONTROLLER ---
  const vivaQuestions = [
    {
      topic: 'edta',
      tag: 'EXP 01 • EDTA',
      diff: 'High Frequency',
      q: 'Why is an ammonium chloride-ammonium hydroxide buffer solution (pH 10) added during EDTA titration?',
      a: 'At pH 9–10, the [Ca/Mg-EBT] complex remains stable yet less stable than the [Ca/Mg-EDTA] chelate, allowing EDTA to cleanly displace EBT at equivalence. Below pH 9, the indicator remains in its red (H₂In⁻) conjugate acid form regardless of metal; above pH 10, Mg(OH)₂ precipitates.'
    },
    {
      topic: 'edta',
      tag: 'EXP 01 • EDTA',
      diff: 'Core Concept',
      q: 'Why does the color change from Wine Red to Clear Sky Blue at the endpoint in EDTA titration?',
      a: 'Initially, free EBT binds traces of Ca²⁺/Mg²⁺ forming an unstable wine-red complex: M²⁺ + EBT (blue) → [M-EBT] (wine-red). During titration, EDTA preferentially chelates free metal ions. At the exact endpoint, EDTA breaks down the [M-EBT] complex because [M-EDTA] is far more stable, liberating free uncomplexed EBT indicator which appears bright sky-blue at pH 10.'
    },
    {
      topic: 'edta',
      tag: 'EXP 01 • EDTA',
      diff: 'Lab Technique',
      q: 'Why is boiled water cooled and filtered before titrating for permanent hardness?',
      a: 'Boiling decomposes temporary hardness (soluble calcium and magnesium bicarbonates) into insoluble carbonates: Ca(HCO₃)₂ → CaCO₃↓ + H₂O + CO₂↑. Filtration removes this precipitated CaCO₃. If not filtered, EDTA would redissolve the solid CaCO₃, yielding erroneous Total Hardness values instead of Permanent Hardness.'
    },
    {
      topic: 'edta',
      tag: 'EXP 01 • EDTA',
      diff: 'Standardization',
      q: 'Why is hardness universally expressed in terms of parts per million (ppm) of CaCO₃ equivalents?',
      a: '1) Calcium carbonate (CaCO₃) has a round molecular weight of exactly 100 g/mol and equivalent weight of 50 g/equiv, greatly simplifying stoichiometry. 2) CaCO₃ is the most insoluble salt among common mineral precipitants, and standard hard water can be readily synthesized with high purity CaCO₃.'
    },
    {
      topic: 'edta',
      tag: 'EXP 01 • EDTA',
      diff: 'Chemical Structure',
      q: 'What is the structure and denticity of EDTA? How many coordinate bonds does it form?',
      a: 'Disodium EDTA is a hexadentate ligand. It possesses 2 tertiary amino nitrogen donor atoms (with lone pairs) and 4 carboxylate oxygen donor atoms (-COO⁻), forming a very stable 1:1 octahedral cage complex with metal cations.'
    },
    {
      topic: 'conductometry',
      tag: 'EXP 02 • Conductometry',
      diff: 'Ionic Mobility',
      q: 'Why does conductance decrease steeply in the first arm of HCl vs NaOH titration?',
      a: 'Hydrochloric acid is fully dissociated into H⁺ and Cl⁻. The H⁺ ion has an exceptionally high ionic mobility (λ° = 349.8 S·cm²/mol via Grotthuss proton hopping). As NaOH is titrated, H⁺ is converted to unionized H₂O, and replaced by Na⁺ which has a much lower mobility (λ° = 50.1 S·cm²/mol), causing a sharp linear drop in electrical conductance.'
    },
    {
      topic: 'conductometry',
      tag: 'EXP 02 • Conductometry',
      diff: 'Theory',
      q: 'Why does the conductance curve rise linearly after the equivalence point in HCl vs NaOH?',
      a: 'After the equivalence point, all acid has been neutralized. Further addition of NaOH introduces free, highly mobile hydroxyl ions (OH⁻, λ° = 198.6 S·cm²/mol) and Na⁺ ions, causing total electrolyte conductance to rise steeply in a straight line.'
    },
    {
      topic: 'conductometry',
      tag: 'EXP 02 • Conductometry',
      diff: 'Error Minimization',
      q: 'Why should the titrant (NaOH) be at least 5 to 10 times more concentrated than the acid in conductometry?',
      a: 'To minimize the dilution effect! If the titrant is dilute, adding large volumes increases total liquid volume significantly, causing an artificial downward curve in conductance. Higher concentration ensures minimal volume change during titration.'
    },
    {
      topic: 'conductometry',
      tag: 'EXP 03 • Acid Mixture',
      diff: 'Equilibrium',
      q: 'In a mixture of HCl and CH₃COOH, why is HCl neutralized completely before CH₃COOH begins reacting?',
      a: 'HCl is a strong electrolyte that fully dissociates, releasing a high concentration of H⁺ ions. By Le Chatelier’s principle and the Common Ion Effect, the ionization of the weak acid CH₃COOH (Ka = 1.8 × 10⁻⁵) is heavily suppressed. Hence, NaOH reacts exclusively with H⁺ from HCl first.'
    },
    {
      topic: 'conductometry',
      tag: 'EXP 03 • Acid Mixture',
      diff: 'Curve Analysis',
      q: 'Why does the conductance curve between V₂ and V₄ show a gentle rise rather than a decrease?',
      a: 'During acetic acid neutralization, unionized CH₃COOH is converted to highly ionized sodium acetate (CH₃COO⁻ + Na⁺). Although acetate ions have modest mobility (λ° = 40.9), the continuous generation of electrolyte ions causes conductance to gently rise until all acetic acid is consumed at V₄.'
    },
    {
      topic: 'potentiometry',
      tag: 'EXP 04 • Potentiometry',
      diff: 'Cell Construction',
      q: 'What are the indicator and reference electrodes used in the potentiometric titration of Fe²⁺ against KMnO₄?',
      a: 'Indicator Electrode: Bright Platinum wire (Pt) electrode, which serves as an inert electron conduit sensitive to the Fe³⁺/Fe²⁺ and MnO₄⁻/Mn²⁺ redox ratios. Reference Electrode: Saturated Calomel Electrode (SCE, Hg/Hg₂Cl₂/sat. KCl), which maintains a constant potential of +0.242 V vs SHE.'
    },
    {
      topic: 'potentiometry',
      tag: 'EXP 04 • Potentiometry',
      diff: 'Nernst Equation',
      q: 'Explain the origin of the sigmoidal EMF jump at the equivalence point in Fe²⁺ vs KMnO₄.',
      a: 'Prior to equivalence, the cell potential is governed by the Fe³⁺/Fe²⁺ redox couple (E° = +0.77 V). At the equivalence point, Fe²⁺ is completely oxidized, and the potential suddenly becomes governed by the much higher potential MnO₄⁻/Mn²⁺ couple (E° = +1.51 V), producing an abrupt sigmoidal jump of ~250–400 mV.'
    },
    {
      topic: 'potentiometry',
      tag: 'EXP 04 • Potentiometry',
      diff: 'Analytical Calculus',
      q: 'Why is the first derivative curve (ΔE/ΔV vs V) plotted in potentiometric titrations?',
      a: 'On a sigmoidal E vs V curve, determining the exact point of maximum slope (inflection point) visually can introduce observer error. The first derivative ΔE/ΔV transforms the inflection into a sharp, narrow mathematical peak maximum, allowing the equivalence volume V₁ to be located with extreme precision.'
    },
    {
      topic: 'potentiometry',
      tag: 'EXP 04 • Potentiometry',
      diff: 'Reagents',
      q: 'Why is dilute H₂SO₄ added to the titration beaker, and why can HCl or HNO₃ not be used?',
      a: 'H₂SO₄ provides the necessary acidic medium (8 H⁺ per MnO₄⁻) without participating in redox. HCl cannot be used because KMnO₄ would oxidize Cl⁻ to poisonous Cl₂ gas, consuming extra titrant. HNO₃ cannot be used because it is itself an oxidizing agent that would oxidize Fe²⁺ prematurely.'
    },
    {
      topic: 'potentiometry',
      tag: 'EXP 04 • Potentiometry',
      diff: 'Instrumentation',
      q: 'Why is a potentiometer or high-impedance digital millivoltmeter used instead of an ordinary voltmeter?',
      a: 'An ordinary voltmeter draws appreciable current from the electrochemical cell, altering ionic concentrations near the electrode surfaces (polarization) and causing an IR drop error. A potentiometer or digital millivoltmeter draws near-zero current (infinite input impedance > 10¹² Ω).'
    }
  ];

  let currentVivaIdx = 0;
  let filteredVivaList = [...vivaQuestions];

  const modalViva = document.getElementById('modal-viva');
  const btnOpenViva = document.getElementById('btn-open-viva');
  const btnCloseViva = document.getElementById('btn-close-viva');
  const vivaFilter = document.getElementById('viva-filter');
  const vivaCurrentIdx = document.getElementById('viva-current-idx');
  const vivaTotalCount = document.getElementById('viva-total-count');

  const vivaCardTag = document.getElementById('viva-card-tag');
  const vivaCardDiff = document.getElementById('viva-card-diff');
  const vivaQuestionText = document.getElementById('viva-question-text');
  const vivaAnswerBox = document.getElementById('viva-answer-box');
  const vivaAnswerText = document.getElementById('viva-answer-text');

  const vivaBtnPrev = document.getElementById('viva-btn-prev');
  const vivaBtnNext = document.getElementById('viva-btn-next');
  const vivaBtnReveal = document.getElementById('viva-btn-reveal');

  function renderVivaCard() {
    if (!filteredVivaList.length) return;
    const item = filteredVivaList[currentVivaIdx];
    vivaCardTag.textContent = item.tag;
    vivaCardDiff.textContent = item.diff;
    vivaQuestionText.textContent = item.q;
    vivaAnswerText.textContent = item.a;

    vivaAnswerBox.classList.add('hidden');
    vivaBtnReveal.textContent = 'Show Answer';

    vivaCurrentIdx.textContent = currentVivaIdx + 1;
    vivaTotalCount.textContent = filteredVivaList.length;

    vivaBtnPrev.disabled = (currentVivaIdx === 0);
    vivaBtnNext.disabled = (currentVivaIdx === filteredVivaList.length - 1);
  }

  btnOpenViva.addEventListener('click', () => {
    modalViva.classList.remove('hidden');
    playLabTone('click');
  });

  btnCloseViva.addEventListener('click', () => {
    modalViva.classList.add('hidden');
    playLabTone('click');
  });

  vivaFilter.addEventListener('change', () => {
    const val = vivaFilter.value;
    if (val === 'all') {
      filteredVivaList = [...vivaQuestions];
    } else {
      filteredVivaList = vivaQuestions.filter(q => q.topic === val);
    }
    currentVivaIdx = 0;
    renderVivaCard();
    playLabTone('click');
  });

  vivaBtnReveal.addEventListener('click', () => {
    if (vivaAnswerBox.classList.contains('hidden')) {
      vivaAnswerBox.classList.remove('hidden');
      vivaBtnReveal.textContent = 'Hide Answer';
      playLabTone('click');
    } else {
      vivaAnswerBox.classList.add('hidden');
      vivaBtnReveal.textContent = 'Show Answer';
    }
  });

  vivaBtnPrev.addEventListener('click', () => {
    if (currentVivaIdx > 0) {
      currentVivaIdx--;
      renderVivaCard();
      playLabTone('click');
    }
  });

  vivaBtnNext.addEventListener('click', () => {
    if (currentVivaIdx < filteredVivaList.length - 1) {
      currentVivaIdx++;
      renderVivaCard();
      playLabTone('click');
    }
  });

  renderVivaCard();

  // --- LAB MANUAL / THEORY MODAL ---
  const modalTheory = document.getElementById('modal-theory');
  const btnOpenTheory = document.getElementById('btn-open-theory');
  const btnCloseTheory = document.getElementById('btn-close-theory');

  btnOpenTheory.addEventListener('click', () => {
    modalTheory.classList.remove('hidden');
    playLabTone('click');
  });

  btnCloseTheory.addEventListener('click', () => {
    modalTheory.classList.add('hidden');
    playLabTone('click');
  });

  // --- PRINT OBSERVATION SHEET GENERATOR (B.TECH ACADEMIC MANUAL FORMAT) ---
  const modalSheet = document.getElementById('modal-observation-sheet');
  const btnPrintSheet = document.getElementById('btn-print-sheet');
  const btnCloseModalSheet = document.getElementById('btn-close-modal-sheet');
  const btnTriggerPrint = document.getElementById('btn-trigger-print');
  const sheetExperimentSelect = document.getElementById('sheet-experiment-select');
  const sheetDynamicBody = document.getElementById('sheet-dynamic-body');
  const sheetDateInput = document.getElementById('sheet-date');

  // Set today's date
  const today = new Date().toISOString().split('T')[0];
  if (sheetDateInput) sheetDateInput.value = today;

  btnPrintSheet.addEventListener('click', () => {
    generateObservationSheet();
    modalSheet.classList.remove('hidden');
    playLabTone('click');
  });

  btnCloseModalSheet.addEventListener('click', () => {
    modalSheet.classList.add('hidden');
    playLabTone('click');
  });

  sheetExperimentSelect.addEventListener('change', generateObservationSheet);

  btnTriggerPrint.addEventListener('click', () => {
    window.print();
  });

  function generateObservationSheet() {
    const selected = sheetExperimentSelect.value;
    let html = '';

    // EXP 1 Section
    if (selected === 'all' || selected === 'edta') {
      const v1 = parseFloat(edtaV1Input.value) || 18.5;
      const v2 = parseFloat(edtaV2Input.value) || 23.2;
      const v3 = parseFloat(edtaV3Input.value) || 11.4;
      const totalH = ((v2 / v1) * 1000).toFixed(2);
      const permH = ((v3 / v1) * 1000).toFixed(2);
      const tempH = (parseFloat(totalH) - parseFloat(permH)).toFixed(2);

      html += `
        <div class="sheet-section border border-slate-400 rounded p-4 space-y-4">
          <div class="border-b border-slate-400 pb-2">
            <h3 class="text-sm font-bold uppercase text-slate-900 font-serif">EXPERIMENT 1: DETERMINATION OF TOTAL, PERMANENT & TEMPORARY HARDNESS OF WATER BY EDTA METHOD</h3>
            <p class="text-xs text-slate-700">Principle: Complexometric titration using Disodium EDTA and Eriochrome Black T indicator at pH 10 buffer.</p>
          </div>

          <!-- Observation Tables -->
          <div class="space-y-3">
            <h4 class="text-xs font-bold text-slate-800 uppercase">Table 1: Burette Readings & Titration Concordance</h4>
            <table class="w-full text-xs border-collapse border border-slate-400 font-mono">
              <thead>
                <tr class="bg-slate-100 border-b border-slate-400 text-slate-900">
                  <th class="border border-slate-400 p-1.5 text-left">Titration Description</th>
                  <th class="border border-slate-400 p-1.5 text-center">Volume of Aliquot (mL)</th>
                  <th class="border border-slate-400 p-1.5 text-center">Initial Burette Reading (mL)</th>
                  <th class="border border-slate-400 p-1.5 text-center">Final Burette Reading (mL)</th>
                  <th class="border border-slate-400 p-1.5 text-center">Volume of EDTA (mL)</th>
                  <th class="border border-slate-400 p-1.5 text-center font-bold">Concordant Value</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td class="border border-slate-400 p-1.5">1. Std. Hard Water vs EDTA (Standardization)</td>
                  <td class="border border-slate-400 p-1.5 text-center">50.0</td>
                  <td class="border border-slate-400 p-1.5 text-center">0.0</td>
                  <td class="border border-slate-400 p-1.5 text-center">${v1.toFixed(1)}</td>
                  <td class="border border-slate-400 p-1.5 text-center font-bold">${v1.toFixed(1)}</td>
                  <td class="border border-slate-400 p-1.5 text-center font-bold bg-slate-50">V₁ = ${v1.toFixed(1)} mL</td>
                </tr>
                <tr>
                  <td class="border border-slate-400 p-1.5">2. Sample Water vs EDTA (Total Hardness)</td>
                  <td class="border border-slate-400 p-1.5 text-center">50.0</td>
                  <td class="border border-slate-400 p-1.5 text-center">0.0</td>
                  <td class="border border-slate-400 p-1.5 text-center">${v2.toFixed(1)}</td>
                  <td class="border border-slate-400 p-1.5 text-center font-bold">${v2.toFixed(1)}</td>
                  <td class="border border-slate-400 p-1.5 text-center font-bold bg-slate-50">V₂ = ${v2.toFixed(1)} mL</td>
                </tr>
                <tr>
                  <td class="border border-slate-400 p-1.5">3. Boiled Water vs EDTA (Permanent Hardness)</td>
                  <td class="border border-slate-400 p-1.5 text-center">50.0</td>
                  <td class="border border-slate-400 p-1.5 text-center">0.0</td>
                  <td class="border border-slate-400 p-1.5 text-center">${v3.toFixed(1)}</td>
                  <td class="border border-slate-400 p-1.5 text-center font-bold">${v3.toFixed(1)}</td>
                  <td class="border border-slate-400 p-1.5 text-center font-bold bg-slate-50">V₃ = ${v3.toFixed(1)} mL</td>
                </tr>
              </tbody>
            </table>
          </div>

          <!-- Formula & Calculation Block -->
          <div class="bg-slate-50 p-3 rounded border border-slate-300 text-xs font-mono space-y-2">
            <div class="font-bold text-slate-900">Calculations:</div>
            <div>• Total Hardness = (V₂ / V₁) × 1000 = (${v2.toFixed(1)} / ${v1.toFixed(1)}) × 1000 = <strong>${totalH} mg/L (ppm CaCO₃ eq)</strong></div>
            <div>• Permanent Hardness = (V₃ / V₁) × 1000 = (${v3.toFixed(1)} / ${v1.toFixed(1)}) × 1000 = <strong>${permH} mg/L (ppm CaCO₃ eq)</strong></div>
            <div>• Temporary Hardness = Total Hardness - Permanent Hardness = ${totalH} - ${permH} = <strong>${tempH} mg/L (ppm CaCO₃ eq)</strong></div>
          </div>

          <!-- Results Summary -->
          <div class="border-t border-slate-400 pt-2 text-xs">
            <span class="font-bold text-slate-900">Result:</span>
            <span>Total Hardness = <strong>${totalH} ppm</strong>, Permanent Hardness = <strong>${permH} ppm</strong>, Temporary Hardness = <strong>${tempH} ppm</strong>.</span>
          </div>
        </div>
      `;
    }

    // EXP 2 Section
    if (selected === 'all' || selected === 'cond-strong') {
      const v2 = parseFloat(resCondStrongV2.textContent) || 10.0;
      const n1 = parseFloat(resCondStrongN1.textContent) || 0.025;
      const str = parseFloat(resCondStrongStr.textContent) || 0.9125;
      const n2 = parseFloat(condStrongNormBase.value) || 0.10;

      let rowsHtml = '';
      condStrongData.forEach((row, i) => {
        rowsHtml += `
          <tr>
            <td class="border border-slate-400 p-1 text-center">${i + 1}</td>
            <td class="border border-slate-400 p-1 text-center">${row.v.toFixed(1)}</td>
            <td class="border border-slate-400 p-1 text-center font-bold">${row.c.toFixed(2)}</td>
          </tr>
        `;
      });

      html += `
        <div class="sheet-section border border-slate-400 rounded p-4 space-y-4">
          <div class="border-b border-slate-400 pb-2">
            <h3 class="text-sm font-bold uppercase text-slate-900 font-serif">EXPERIMENT 2: CONDUCTOMETRIC TITRATION OF STRONG ACID (HCl) AGAINST STRONG BASE (NaOH)</h3>
            <p class="text-xs text-slate-700">Principle: Neutralization of highly mobile H⁺ ions by NaOH yielding a classic V-shaped conductance profile.</p>
          </div>

          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <h4 class="text-xs font-bold text-slate-800 uppercase mb-1">Observation Table:</h4>
              <div class="max-h-48 overflow-y-auto border border-slate-400">
                <table class="w-full text-[11px] border-collapse font-mono">
                  <thead>
                    <tr class="bg-slate-100 border-b border-slate-400">
                      <th class="border border-slate-400 p-1 text-center">#</th>
                      <th class="border border-slate-400 p-1 text-center">Vol NaOH (mL)</th>
                      <th class="border border-slate-400 p-1 text-center">Conductance (mS/cm)</th>
                    </tr>
                  </thead>
                  <tbody>${rowsHtml}</tbody>
                </table>
              </div>
            </div>

            <div class="space-y-3 font-mono text-xs">
              <div class="bg-slate-50 p-3 rounded border border-slate-300 space-y-2">
                <div class="font-bold text-slate-900">Analytical Parameters & Equivalence:</div>
                <div>• Volume of HCl taken (V₁) = 40.0 mL</div>
                <div>• Normality of NaOH (N₂) = ${n2.toFixed(2)} N</div>
                <div>• Equivalence Point (V₂) from intersection = <strong>${v2.toFixed(2)} mL</strong></div>
                <div class="border-t border-slate-300 pt-1">
                  • N₁ = (N₂ × V₂) / 40.0 = (${n2.toFixed(2)} × ${v2.toFixed(2)}) / 40.0 = <strong>${n1.toFixed(4)} N</strong>
                </div>
                <div>
                  • Strength of HCl = N₁ × 36.5 = ${n1.toFixed(4)} × 36.5 = <strong>${str.toFixed(4)} g/L</strong>
                </div>
              </div>
            </div>
          </div>

          <div class="border-t border-slate-400 pt-2 text-xs">
            <span class="font-bold text-slate-900">Result:</span>
            <span>Normality of HCl = <strong>${n1.toFixed(4)} N</strong>; Strength of HCl = <strong>${str.toFixed(4)} g/L</strong>.</span>
          </div>
        </div>
      `;
    }

    // EXP 3 Section
    if (selected === 'all' || selected === 'cond-mix') {
      const v2 = parseFloat(condMixV2Badge.textContent) || 6.0;
      const v4 = parseFloat(condMixV4Badge.textContent) || 14.0;
      const v3 = (v4 - v2).toFixed(2);
      const n1 = parseFloat(resCondMixN1.textContent) || 0.015;
      const str1 = parseFloat(resCondMixStr1.textContent) || 0.5475;
      const n3 = parseFloat(resCondMixN3.textContent) || 0.02;
      const str3 = parseFloat(resCondMixStr3.textContent) || 1.201;

      html += `
        <div class="sheet-section border border-slate-400 rounded p-4 space-y-4">
          <div class="border-b border-slate-400 pb-2">
            <h3 class="text-sm font-bold uppercase text-slate-900 font-serif">EXPERIMENT 3: CONDUCTOMETRIC TITRATION OF ACID MIXTURE (HCl + CH₃COOH) AGAINST NaOH</h3>
            <p class="text-xs text-slate-700">Principle: Fractional titration resolving strong and weak acid inflections using linear regressions.</p>
          </div>

          <div class="bg-slate-50 p-3 rounded border border-slate-300 text-xs font-mono space-y-2">
            <div class="font-bold text-slate-900">Equivalence Volumes & Formulas:</div>
            <div class="grid grid-cols-3 gap-2">
              <div>V₂ (for HCl) = <strong>${v2.toFixed(2)} mL</strong></div>
              <div>V₄ (Total NaOH) = <strong>${v4.toFixed(2)} mL</strong></div>
              <div>V₃ (for CH₃COOH) = <strong>${v3} mL</strong></div>
            </div>
            <div class="border-t border-slate-300 pt-2 space-y-1">
              <div>1. HCl: N₁ = (0.10 × ${v2.toFixed(2)}) / 40.0 = <strong>${n1.toFixed(4)} N</strong>; Strength = ${n1.toFixed(4)} × 36.5 = <strong>${str1.toFixed(4)} g/L</strong></div>
              <div>2. CH₃COOH: N₃ = (0.10 × ${v3}) / 40.0 = <strong>${n3.toFixed(4)} N</strong>; Strength = ${n3.toFixed(4)} × 60.05 = <strong>${str3.toFixed(4)} g/L</strong></div>
            </div>
          </div>

          <div class="border-t border-slate-400 pt-2 text-xs">
            <span class="font-bold text-slate-900">Result:</span>
            <span>Strength of HCl = <strong>${str1.toFixed(4)} g/L</strong>; Strength of CH₃COOH = <strong>${str3.toFixed(4)} g/L</strong>.</span>
          </div>
        </div>
      `;
    }

    // EXP 4 Section
    if (selected === 'all' || selected === 'pot') {
      const v1 = parseFloat(resPotV1.textContent) || 10.0;
      const n2 = parseFloat(resPotN2.textContent) || 0.05;
      const ironStr = parseFloat(resPotIronStr.textContent) || 2.7925;
      const n1 = parseFloat(potNormKmno4.value) || 0.10;

      let potRowsHtml = '';
      potData.forEach((row, i) => {
        let dv = '-', de = '-', deriv = '-';
        if (i > 0) {
          const deltaV = row.v - potData[i - 1].v;
          const deltaE = row.e - potData[i - 1].e;
          dv = deltaV.toFixed(1);
          de = deltaE.toFixed(0);
          deriv = deltaV > 0 ? (deltaE / deltaV).toFixed(1) : '-';
        }
        potRowsHtml += `
          <tr>
            <td class="border border-slate-400 p-1 text-center">${i + 1}</td>
            <td class="border border-slate-400 p-1 text-center">${row.v.toFixed(1)}</td>
            <td class="border border-slate-400 p-1 text-center">${row.e.toFixed(0)}</td>
            <td class="border border-slate-400 p-1 text-center">${dv}</td>
            <td class="border border-slate-400 p-1 text-center">${de}</td>
            <td class="border border-slate-400 p-1 text-center font-bold">${deriv}</td>
          </tr>
        `;
      });

      html += `
        <div class="sheet-section border border-slate-400 rounded p-4 space-y-4">
          <div class="border-b border-slate-400 pb-2">
            <h3 class="text-sm font-bold uppercase text-slate-900 font-serif">EXPERIMENT 4: POTENTIOMETRIC TITRATION OF Fe²⁺ USING STANDARD KMnO₄</h3>
            <p class="text-xs text-slate-700">Principle: Redox titration monitored by Pt-SCE cell with ΔE/ΔV first derivative inflection analysis.</p>
          </div>

          <div>
            <h4 class="text-xs font-bold text-slate-800 uppercase mb-1">Observation & Derivative Table:</h4>
            <div class="max-h-48 overflow-y-auto border border-slate-400">
              <table class="w-full text-[11px] border-collapse font-mono">
                <thead>
                  <tr class="bg-slate-100 border-b border-slate-400">
                    <th class="border border-slate-400 p-1 text-center">#</th>
                    <th class="border border-slate-400 p-1 text-center">Vol KMnO₄ (mL)</th>
                    <th class="border border-slate-400 p-1 text-center">EMF (mV)</th>
                    <th class="border border-slate-400 p-1 text-center">ΔV</th>
                    <th class="border border-slate-400 p-1 text-center">ΔE</th>
                    <th class="border border-slate-400 p-1 text-center">ΔE/ΔV (mV/mL)</th>
                  </tr>
                </thead>
                <tbody>${potRowsHtml}</tbody>
              </table>
            </div>
          </div>

          <div class="bg-slate-50 p-3 rounded border border-slate-300 text-xs font-mono space-y-2">
            <div class="font-bold text-slate-900">Calculations:</div>
            <div>• Volume of Fe²⁺ taken (V₂) = 20.0 mL</div>
            <div>• Equivalence Volume (V₁) from (ΔE/ΔV)ₘₐₓ = <strong>${v1.toFixed(2)} mL</strong></div>
            <div>• Normality of Fe²⁺: N₂ = (N₁ × V₁) / 20.0 = (${n1.toFixed(2)} × ${v1.toFixed(2)}) / 20.0 = <strong>${n2.toFixed(4)} N</strong></div>
            <div>• Amount of Iron in 1 Litre = N₂ × 55.85 = ${n2.toFixed(4)} × 55.85 = <strong>${ironStr.toFixed(4)} g/L</strong></div>
          </div>

          <div class="border-t border-slate-400 pt-2 text-xs">
            <span class="font-bold text-slate-900">Result:</span>
            <span>Normality of Fe²⁺ = <strong>${n2.toFixed(4)} N</strong>; Concentration of Iron = <strong>${ironStr.toFixed(4)} g/L</strong>.</span>
          </div>
        </div>
      `;
    }

    sheetDynamicBody.innerHTML = html;
  }

});
