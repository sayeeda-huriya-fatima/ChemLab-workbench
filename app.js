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


});
