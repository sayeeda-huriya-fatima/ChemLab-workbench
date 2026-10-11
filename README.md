# ChemLab Workbench

An interactive engineering chemistry laboratory calculator and virtual workbench for B.Tech practical experiments.

## Supported Experiments
* **Experiment 01: EDTA Water Hardness Engine**
  * Calculates Total, Permanent, and Temporary hardness (mg/L or ppm CaCO₃ equivalents).
  * Real-time water hardness classification.
  * Colorimetric indicator transition from wine red to sky blue.
* **Experiment 02: Conductometric Titration (HCl vs NaOH)**
  * Real-time conductance plotting with OLS regression lines.
  * Equivalence point (V₂) intersection calculation.
  * Computes Normality and Strength (g/L) of HCl.
* **Experiment 03: Conductometric Titration (Mixture of Acids: HCl + CH₃COOH vs NaOH)**
  * Dual inflection point fitting for strong and weak acid neutralization.
  * Calculates individual normalities and concentrations (g/L) for both acids.
* **Experiment 04: Potentiometric Titration of Fe²⁺ using KMnO₄**
  * Sigmoidal EMF curve and first derivative (ΔE/ΔV) curve.
  * Peak spike identification for equivalence volume.
  * Computes Normality of Fe²⁺ and Iron strength (g/L).

## Running the Application
Open `index.html` directly in any modern browser, or run a local server:
```bash
python3 -m http.server 8000
```
