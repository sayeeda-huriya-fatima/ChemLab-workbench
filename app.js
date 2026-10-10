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


});
