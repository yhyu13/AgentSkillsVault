---
name: earnings-models
description: Revenue build-up, margin analysis, EPS estimation — building bottom-up earnings models for equity research.
---

> Revenue build-up, margin analysis, EPS estimation — building bottom-up earnings models for equity research.

## When to Activate

- Building or updating a financial earnings model
- Revenue modeling by segment, geography, or product line
- Gross margin and operating margin analysis
- EPS estimation and consensus comparison
- Earnings revision analysis and estimate changes
- Quarterly earnings preview or review
- Sensitivity analysis on key earnings drivers

## Core Concepts

### Revenue Modeling Approaches

**Top-down revenue model:**
```
Total Addressable Market (TAM)
x Market Share (%)
= Estimated Revenue
```
Useful for: New markets, high-level validation, investor presentations.

**Bottom-up revenue model (preferred for precision):**

| Approach | Formula | Best for |
|----------|---------|----------|
| Volume x Price | Units sold x ASP | Manufacturing, consumer goods |
| Subscribers x ARPU | Subs x monthly revenue per user | SaaS, telecom, media |
| Segment build | Revenue by business unit/geography | Diversified companies |
| Same-store + new | SSS growth + new store contribution | Retail, restaurants |
| Backlog/pipeline | Opening backlog + new orders - revenue recognized | Project-based, defense |
| Capacity-driven | Capacity x utilization x yield x price | Airlines, hotels, semiconductors |

**Segment-level build:**
- Model each business segment separately with segment-specific drivers
- Geographic breakdown when FX exposure or growth rates differ materially
- Product line breakdown when margin profiles differ
- Cross-check: Sum of segments must reconcile to consolidated (eliminate intercompany)

### Gross Margin Analysis

**COGS drivers to model:**
- Raw material costs (commodity exposure, hedging, pass-through ability)
- Direct labor (wage inflation, automation, geographic mix)
- Manufacturing overhead (fixed vs. variable, capacity utilization impact)
- Freight and logistics
- Product mix effect (high-margin vs. low-margin product shift)

**Gross margin bridge:**
```
Prior period gross margin                    XX.X%
+/- Volume/leverage effect                   +X.X%
+/- Price effect (pricing actions)           +X.X%
+/- Input cost changes                       -X.X%
+/- Product/geographic mix                   +X.X%
+/- FX impact                               -X.X%
+/- Other (productivity, one-offs)           +X.X%
= Current period gross margin                XX.X%
```

### Operating Expense Modeling

**SG&A components:**
- Sales: Headcount x comp, commissions (% of revenue), travel
- Marketing: As % of revenue or absolute spend (discretionary)
- G&A: Corporate overhead, legal, audit, insurance — relatively fixed
- Stock-based compensation: Model separately (non-cash but real dilution)

**Operating leverage concept:**
```
Operating leverage = % change in EBIT / % change in Revenue
```
- OL > 1: Margin expansion as revenue grows (high fixed costs)
- OL = 1: Margins stable (variable cost structure)
- OL < 1: Margin compression (unusual — costs growing faster than revenue)

**R&D:** Model as % of revenue or absolute spend based on management guidance and competitive dynamics. Capitalize vs. expense distinction matters for comparability.

### Below-the-Line Items

**Depreciation & Amortization:**
- D&A as % of revenue or tied to capex (D&A often lags capex by useful life)
- Amortization of acquired intangibles: Schedule from acquisition disclosures
- Important for EBITDA-to-EBIT bridge

**Interest expense:**
```
Interest expense = Average debt balance x Weighted average interest rate
```
- Model floating rate debt separately from fixed rate
- Incorporate expected debt issuances/repayments

**Tax rate:**
- Effective tax rate (ETR) from guidance or historical average
- Discrete items can cause volatility (one-time benefits, provisions)
- Deferred tax considerations for timing differences
- Country mix effect for multinationals

### Share Count and EPS

**Basic vs. diluted shares:**
- Basic: Weighted average shares outstanding
- Diluted: Add dilutive effect of options (treasury stock method), convertibles (if-converted), RSUs

**Treasury Stock Method for options:**
```
Dilutive shares = In-the-money options - (Options x Exercise price / Current stock price)
```

**EPS calculation:**
```
Basic EPS = Net income / Weighted average basic shares
Diluted EPS = (Net income + convertible interest after tax) / Diluted shares
```

**Adjusted EPS:** Exclude non-recurring items, amortization of acquired intangibles, SBC (varies by convention). Always state adjustment basis clearly.

### Consensus and Revision Analysis

**Consensus comparison:**
- Compare your estimates to consensus (mean and median of analyst estimates)
- Focus on: Revenue, EBITDA, EBIT, EPS — both quarterly and annual
- Identify where you are above/below and articulate the driver

**Estimate revision signals:**
- Rising estimates + rising price = positive momentum
- Falling estimates + rising price = potential risk
- Track breadth: % of analysts revising up vs. down
- Earnings surprise history: Does the company consistently beat/miss?

## Methodology

### Building an Earnings Model Step by Step

1. **Gather historical data**: 3-5 years of quarterly and annual financials from filings (10-K, 10-Q, annual reports)
2. **Identify reporting segments**: Understand segment definitions, intersegment eliminations
3. **Revenue build**: Choose modeling approach per segment, identify key drivers
4. **Gross margin**: Historical trend, COGS component analysis, management guidance
5. **OpEx build**: SG&A as fixed/variable split, R&D trajectory, other operating items
6. **D&A schedule**: Link to PP&E and intangible asset schedules
7. **Interest and other**: Debt schedule, investment income, FX gains/losses, equity method income
8. **Tax rate**: Effective rate guidance, discrete item normalization
9. **Share count**: Current shares + anticipated buybacks - option dilution
10. **EPS**: Calculate basic and diluted, GAAP and adjusted
11. **Sanity check**: Compare to consensus, validate with management guidance, cross-check growth rates

### Quarterly Earnings Preview

1. Review management guidance and recent commentary
2. Check channel data, industry data, competitor results
3. Update model for any new information
4. Identify key debates (bull vs. bear thesis drivers)
5. Set expectations for key metrics: Revenue, GM%, EBIT, EPS
6. Flag potential surprises (upside/downside risks)

### Post-Earnings Model Update

1. Compare actuals to estimates on every line item
2. Analyze the variance: What drove the beat/miss?
3. Update forward estimates incorporating new information
4. Assess guidance changes and management commentary
5. Revise price target if warranted
6. Communicate thesis impact: Does the investment case change?

## Templates

### Income Statement Model

```
(EUR m)                    FY-2A    FY-1A    FYE     FY+1E    FY+2E
Revenue
  Segment A                _____    _____    _____    _____    _____
  Segment B                _____    _____    _____    _____    _____
  Eliminations             _____    _____    _____    _____    _____
Total Revenue              _____    _____    _____    _____    _____
  yoy growth                ____%    ____%    ____%    ____%    ____%

COGS                       _____    _____    _____    _____    _____
Gross Profit               _____    _____    _____    _____    _____
  Gross margin              ____%    ____%    ____%    ____%    ____%

SG&A                       _____    _____    _____    _____    _____
R&D                        _____    _____    _____    _____    _____
Other operating            _____    _____    _____    _____    _____
EBIT                       _____    _____    _____    _____    _____
  EBIT margin               ____%    ____%    ____%    ____%    ____%

D&A (memo)                 _____    _____    _____    _____    _____
EBITDA                     _____    _____    _____    _____    _____
  EBITDA margin              ____%    ____%    ____%    ____%    ____%

Interest expense           _____    _____    _____    _____    _____
Other non-operating        _____    _____    _____    _____    _____
Pre-tax income             _____    _____    _____    _____    _____
Tax                        _____    _____    _____    _____    _____
  ETR                        ____%    ____%    ____%    ____%    ____%
Net income                 _____    _____    _____    _____    _____

Diluted shares (m)         _____    _____    _____    _____    _____
Diluted EPS                _____    _____    _____    _____    _____
Consensus EPS              _____    _____    _____    _____    _____
Delta to consensus          ____%    ____%    ____%    ____%    ____%
```

### Revenue Bridge

```
Segment: _______________

Prior year revenue:                  € _______
  Organic volume growth       ____%  € _______
  Pricing impact              ____%  € _______
  Mix effect                  ____%  € _______
  FX translation              ____%  € _______
  M&A / divestitures          ____%  € _______
Current year revenue:                € _______
  Total reported growth:      ____%
  Organic growth:             ____%
```

## Quality Gate

- [ ] Revenue is modeled bottom-up with identifiable drivers per segment
- [ ] Gross margin assumptions are supported by COGS component analysis
- [ ] SG&A is split into fixed and variable components
- [ ] D&A is linked to PP&E schedule or guided rate
- [ ] Interest expense reflects current and projected debt levels
- [ ] Tax rate is informed by guidance and normalized for discrete items
- [ ] Share count reflects buybacks, issuances, and option dilution
- [ ] Model reconciles: Sum of segments = consolidated (after eliminations)
- [ ] Estimates are compared to consensus with variance explained
- [ ] Sensitivity table shows EPS impact of key driver changes
