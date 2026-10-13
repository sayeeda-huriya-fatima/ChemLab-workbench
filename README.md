# ChemLab Workbench

An interactive calculation workbench and virtual simulator for B.Tech Engineering Chemistry laboratory practicals.

Designed to eliminate manual calculation errors, plot titration curves with regression extrapolation, and generate print-ready observation record sheets formatted for university lab submissions.

---

## Supported Experiments

### 1. EDTA Method for Water Hardness
* **Principle:** Complexometric titration using standard $0.01\text{ M}$ Disodium EDTA and Eriochrome Black T (EBT) indicator buffered at $\text{pH } 10$ ($NH_4Cl + NH_4OH$).
* **Equations:**
  $$\text{Total Hardness} = \left(\frac{V_2}{V_1}\right) \times 1000\text{ mg/L (ppm CaCO}_3\text{ eq)}$$
  $$\text{Permanent Hardness} = \left(\frac{V_3}{V_1}\right) \times 1000\text{ mg/L (ppm CaCO}_3\text{ eq)}$$
  $$\text{Temporary Hardness} = \text{Total Hardness} - \text{Permanent Hardness}$$
* **Interactive Simulator:** Visual indicator transition modeling the displacement:
  $$\underset{\text{Wine Red}}{[\text{Ca/Mg-EBT}]} + \text{EDTA} \longrightarrow \underset{\text{Colorless}}{[\text{Ca/Mg-EDTA}]} + \underset{\text{Sky Blue}}{\text{Free EBT}}$$

---

### 2. Conductometric Titration (Strong Acid: $\text{HCl}$ vs $\text{NaOH}$)
* **Principle:** Monitors electrolytic conductance during neutralization. Fast $H^+$ ions ($\lambda^\circ = 349.8\text{ S}\cdot\text{cm}^2/\text{mol}$) are replaced by slower $Na^+$ ($\lambda^\circ = 50.1$), giving a linear drop to equivalence point $V_2$. After neutralization, excess $OH^-$ ($\lambda^\circ = 198.6$) causes conductance to rise steeply, forming a characteristic V-curve.
* **Calculations:**
  - Independent linear regressions on descending arm ($y = m_1x + c_1$) and ascending arm ($y = m_2x + c_2$).
  - Equivalence volume at intersection:
    $$V_2 = \frac{c_2 - c_1}{m_1 - m_2}$$
  - Normality and strength of $\text{HCl}$:
    $$N_1 = \frac{N_2 \times V_2}{40.0}, \quad \text{Strength} = N_1 \times 36.5\text{ g/L}$$

---

### 3. Conductometric Titration (Acid Mixture: $\text{HCl} + \text{CH}_3\text{COOH}$ vs $\text{NaOH}$)
* **Principle:** Fractional neutralization. Strong $\text{HCl}$ suppresses the ionization of weak acetic acid by common ion effect ($H^+$). $\text{HCl}$ is neutralized first ($0 \rightarrow V_2$), followed by acetic acid buffering ($V_2 \rightarrow V_4$), followed by excess base rise ($> V_4$).
* **Calculations:**
  - Piecewise 3-regime linear regression determining $V_2$ ($\text{HCl}$) and $V_4$ (total base).
  - Volume consumed by acetic acid: $V_3 = V_4 - V_2$.
  - Strengths:
    $$\text{HCl: } N_1 = \frac{N_2 \times V_2}{40.0}, \quad \text{Strength} = N_1 \times 36.5\text{ g/L}$$
    $$\text{CH}_3\text{COOH: } N_3 = \frac{N_2 \times V_3}{40.0}, \quad \text{Strength} = N_3 \times 60.05\text{ g/L}$$

---

### 4. Potentiometric Titration ($\text{Fe}^{2+}$ vs $\text{KMnO}_4$)
* **Principle:** Redox titration monitored using a Platinum indicator electrode and Saturated Calomel Electrode (SCE) reference cell in acidic medium ($H_2SO_4$):
  $$5\text{Fe}^{2+} + \text{MnO}_4^- + 8\text{H}^+ \longrightarrow 5\text{Fe}^{3+} + \text{Mn}^{2+} + 4\text{H}_2\text{O}$$
* **Calculations:**
  - Discrete first derivative calculation: $\left(\frac{\Delta E}{\Delta V}\right)_i = \frac{E_i - E_{i-1}}{V_i - V_{i-1}}$.
  - Equivalence volume $V_1$ at peak derivative maximum.
  - Iron concentration:
    $$N_2 = \frac{N_1 \times V_1}{20.0}, \quad \text{Concentration} = N_2 \times 55.85\text{ g/L}$$

---

## Key Features

* **Spreadsheet Import:** Paste two columns directly from Excel or Google Sheets (tab or comma separated) to fill data tables instantly.
* **Inline Data Editing:** Edit volumes and readings directly inside table cells with instant curve updating.
* **Outlier Highlighting:** Flags erratic readings that deviate significantly from regression lines or inverted potential values.
* **Observation Sheet Export:** Generates clean, printable A4 observation sheets formatted for lab records (includes initial/final burette columns, concordant values, and calculation steps).
* **Graph Export:** Download clean PNG figures of titration curves for inclusion in digital lab records.
* **Virtual Titration Simulation:** Step-by-step titration simulation with animated burette, spinning stir bar, and live digital readout.
* **Viva Practice:** 20 high-frequency viva voce questions covering indicators, buffer choices, ion mobilities, and electrode pairs.

---

## Technical Details

* **Client-Side Numerical Regressions:** Ordinary least squares (OLS) linear regressions fit descending and ascending branches, computing $R^2$ goodness-of-fit and closed-form algebraic intersections.
* **Discrete Numerical Differentiation:** Finite-difference derivative evaluation for potentiometric inflection peaks.
* **Zero External Backend:** Pure client-side HTML5/CSS/JavaScript with zero build step required. Runs directly in any web browser.
* **Offline Fallback:** Contains a native HTML5 2D Canvas renderer that plots scatter curves and trendlines even without external chart libraries.

---

## Running the Application

Open `index.html` directly in any web browser, or serve locally using Python:

```bash
python3 -m http.server 8000
```

Open `http://localhost:8000` in your browser.
