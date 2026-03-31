# Orion Decision Assessment - Test Cases

## Overview
The Orion assessment has 4 classification levels:
- **Explorer** 🌱: Curious, purpose-driven, foundational thinker
- **Learner** 📖: Framework-focused, analytical, causal reasoning
- **Builder** 🔨: Execution-oriented, resource optimization, operational focus
- **Catalyst** 🚀: Systemic architect, self-sustaining ecosystems, leverage points

---

## TEST CASE 1: Social Impact Decision-Maker
**Scenario**: User is evaluating a ₹50,000 fund for a social issue.

### Sublevel 1: Beginner
**Profile**: Completely new to social impact, follows intuition, seeks immediate visible results.
- **Q1 Response**: B (Mobilize volunteers and deliver services directly)
  - Reasoning: Wants to see immediate visible impact
  - Scores: explorer: 2, builder: 1
- **Q4 Response**: A (Community doesn't care about environment)
  - Reasoning: Blames external factors, lacks systemic thinking
  - Scores: explorer: 2
- **Q12 Response**: A (Customer acquisition cost vs lifetime value)
  - Reasoning: Falls back to basic business metrics
  - Scores: builder: 2
- **Q14 Response**: A (Double the price for survival)
  - Reasoning: Short-term survival thinking
  - Scores: explorer: 1, builder: 1

**Total Scores**: Explorer: 6 | Builder: 4 | Learner: 0 | Catalyst: 0
**Classification**: **EXPLORER** 🌱

**Workspace Entry** — What the user types as their first decision idea:
```
"We have ₹50k to tackle plastic waste in our city. I want to start by finding 
passionate volunteers who care about this. Let's build teams in different neighborhoods, 
give them collection kits, and create a reward system—maybe badges, maybe small incentives. 
The goal is to show people that change is possible and get them excited to participate. 
Once we build momentum with a core group, we can expand. I'm less worried about perfect 
metrics right now—I just want to see if we can spark a movement."
```

**Workspace UI for Explorer:**
- 🎯 Emphasis on community pathways & volunteer networks
- 🌍 Impact visualization: reach & engagement graphs
- 💬 Suggestion: "Find 5 passionate early adopters"
- 📊 Right panel shows: Engagement trends, community sentiment

---

### Sublevel 2: Intermediate
**Profile**: Some social impact experience, analytical approach, seeks sustainable models.
- **Q1 Response**: A (Research root causes and analyze policies)
  - Reasoning: Starts with understanding, not action
  - Scores: learner: 2, explorer: 1
- **Q2 Response**: B (Long-term social impact and causation)
  - Reasoning: Understands measurement complexity
  - Scores: learner: 3, builder: 1
- **Q12 Response**: B (Long-term social impact causality chains)
  - Reasoning: Thinks beyond quarterly metrics
  - Scores: catalyst: 3
- **Q14 Response**: B (Tiered pricing to cross-subsidize)
  - Reasoning: Balances sustainability with impact
  - Scores: catalyst: 3, builder: 2

**Total Scores**: Learner: 5 | Catalyst: 6 | Builder: 3 | Explorer: 1
**Classification**: **CATALYST** 🚀 (slight edge over learner due to Q12 & Q14 pivots)

**Workspace Entry** — What the user types:
```
"The plastic waste challenge isn't about willpower—citizens and waste workers 
both want solutions. I think the real issue is information asymmetry and misaligned 
incentives.

Research question: If waste workers knew they could earn ₹2/kg for sorted plastic, 
and recyclers knew they could get clean feedstock at ₹4/kg, would the system 
self-organize?

My theory: I don't need to build infrastructure. I need to be the 
information broker:
1. Survey waste workers: What would their collection rate be at different price points?
2. Survey recyclers: What's their willingness to pay for sorted vs. mixed plastic?
3. Test with 50-100 waste workers in 1 neighborhood for 8 weeks
4. Measure: Collection rates, waste worker income, plastic sorted, buyer satisfaction

If the data shows economic viability, then I can approach a scaling partner 
(municipality, waste management company) with proof that this is sustainable.

This isn't about growing a program—it's about proving a model exists."
```

**Workspace UI for Intermediate Catalyst:**
- 📊 Research framework: Survey design, data collection templates
- 🔬 Hypothesis validation: Test design, success criteria  
- 📈 Data dashboard: Collection rates, income trends, sorting efficiency
- 💡 Right panel: Insights, anomalies, next experiment recommendation

### Sublevel 3: Pro
**Profile**: Experienced practitioner, balanced approach, values both impact and sustainability, navigates trade-offs wisely.
- **Q1 Response**: C (Map revenue model, use capital as seed)
  - Reasoning: Thinks long-term scalability
  - Scores: builder: 2, catalyst: 1
- **Q6 Response**: C (Negotiate hybrid model, prove community engagement lowers churn)
  - Reasoning: Finds win-win solutions, understands system dynamics
  - Scores: catalyst: 3, builder: 1
- **Q12 Response**: B (Social impact causality chains)
  - Reasoning: Measures what matters
  - Scores: catalyst: 3
- **Q14 Response**: B (Tiered pricing model)
  - Reasoning: Systemic thinking under pressure
  - Scores: catalyst: 3, builder: 2

**Total Scores**: Catalyst: 10 | Builder: 5 | Learner: 0 | Explorer: 0
**Classification**: **CATALYST** 🚀

---

### Sublevel 4: Grandmaster
**Profile**: Strategic visionary, systems architecture expert, makes decisions that fundamentally reshape ecosystems while building lasting institutions.
- **Q1 Response**: C (Map revenue model, use capital as seed)
  - Reasoning: Seed capital = systems leverage
  - Scores: builder: 2, catalyst: 1
- **Q6 Response**: C (Negotiate hybrid model)
  - Reasoning: Refuses binary choices, architectures win-win
  - Scores: catalyst: 3, builder: 1
- **Q12 Response**: B (Social impact causality chains)
  - Reasoning: Measures system health, not just revenue
  - Scores: catalyst: 3
- **Q14 Response**: B (Tiered pricing)
  - Reasoning: Designs sustainable resilience model
  - Scores: catalyst: 3, builder: 2

**Total Scores**: Catalyst: 10 | Builder: 5 | Learner: 0 | Explorer: 0
**Classification**: **CATALYST** 🚀

**Workspace Entry** — What the grandmaster types:
```
"Plastic waste: I see a three-layer system failure.

LAYER 1 (Individual): Citizens want to be responsible. Waste workers need money.
LAYER 2 (Economic): No financial incentive connects them. Recyclers can't process 
mixed plastic economically.
LAYER 3 (Institutional): Cities treat waste as a cost center, not a resource opportunity.

My move with ₹50k: 
Don't build a program. Design the incentive that makes the system self-heal.

If I create a closed-loop economics:
- Pay waste workers ₹2/kg for sorted plastic (their motivation)
- Aggregate material, sell at ₹4/kg to recyclers (my revenue)
- Surplus funds reinvestment or expansion (system health)

This works because I'm not fighting the system—I'm reorganizing it around economic 
self-interest. The waste worker doesn't do it for 'social impact'—they do it because 
it pays better than mixed collection. That's resilience.

Success metrics: NOT 'how many people participated,' but 'does this persist without me?'
If yes, I've designed architecture. If no, I've designed a program.

If it works in one zone, I can franchise this model to NGOs in 20 cities—each with 
their own waste networks—within 18 months. That's how you go from ₹50k to systemic change."
```

**Note**: Grandmaster differs from Pro in articulating the *institutional layer* and showing comfort with franchising/delegation (letting the system replicate itself vs. direct control).

**Workspace UI for Grandmaster:**
- 🌐 Multi-layer system diagram: Individual + Economic + Institutional dynamics
- 🎯 Leverage point ranking: "Waste worker incentive = 9/10 impact"
- 📢 Replication strategy: Franchise model, documentation, partner activation
- 🧠 Right panel: Institutional barriers, policy opportunities, ecosystem dependencies

---

## TEST CASE 2: Operational Excellence Seeker
**Scenario**: User prioritizes efficiency, metrics, and scalable operations.

### Sublevel 1: Beginner
**Profile**: New to operations, sees only surface metrics, follows templates.
- **Q1 Response**: B (Mobilize and deliver services)
  - Reasoning: Action bias, no planning phase
  - Scores: explorer: 2, builder: 1
- **Q4 Response**: A (Community doesn't care)
  - Reasoning: Blames people, not systems
  - Scores: explorer: 2
- **Q12 Response**: A (Customer acquisition cost vs lifetime value)
  - Reasoning: Basic business metrics feel safe
  - Scores: builder: 2
- **Q14 Response**: A (Double the price)
  - Reasoning: Immediate survival, no long-term model
  - Scores: explorer: 1, builder: 1

**Total Scores**: Explorer: 5 | Builder: 4 | Learner: 0 | Catalyst: 0
**Classification**: **EXPLORER** 🌱

**Workspace Entry** — What the user types:
```
"Plastic waste is a huge problem and I'm excited to do something about it with ₹50k. 
My first instinct is to dive in and start collecting plastic with a team of volunteers. 
Let's create collection stations in 3-4 neighborhoods and see how much we can gather.

I want to be visible, energetic, and show the community that we care. Maybe we create 
a brand—colorful bins, social media posts, call it 'Plastic Warriors' or something. 
The goal is to get people talking about it and feeling like they're part of something.

Once we've proven we can collect, we'll figure out what to do with it. Let's build 
momentum first and iterate as we learn."
```

**Workspace UI for Explorer (Operations):**
- 🎯 Community activation checklist: Volunteers, stations, social campaigns
- 🌍 Geographic reach map: Neighborhoods covered
- 💪 Engagement metrics: Volunteers recruited, social reach
- 📊 Right panel: Participation trends, community sentiment

### Sublevel 2: Intermediate
**Profile**: Learning operations, understands some friction points, starting to think systematically.
- **Q1 Response**: C (Map revenue model as seed capital)
  - Reasoning: Thinks capital efficiency
  - Scores: builder: 2, catalyst: 1
- **Q4 Response**: B (Hidden friction — inconvenient placement, missing incentives)
  - Reasoning: Diagnoses operational friction
  - Scores: builder: 3, learner: 1
- **Q12 Response**: A (Customer acquisition cost)
  - Reasoning: Sticks to operational metrics
  - Scores: builder: 2
- **Q14 Response**: A (Double the price)
  - Reasoning: Quick cost recovery
  - Scores: explorer: 1, builder: 1

**Total Scores**: Builder: 9 | Learner: 1 | Catalyst: 1 | Explorer: 1
**Classification**: **BUILDER** 🔨

**Workspace Entry** — What the user types:
```
"Plastic collection is operationally inefficient. Let me map the real bottleneck.

The issue isn't motivation—it's friction. Here's what I see:
- Lack of convenient collection points (setup cost: minimal)
- No incentive for waste workers (cost: small but impactful)
- Contaminated collection reduces recycler demand (quality issue)
- Logistics: How do we transport collected plastic to buyers?

With ₹50k, here's my operational plan:
1. Set up 5 collection kiosks at high-traffic locations (₹15k)
2. Partner with 20 waste workers, pay ₹1.5/kg (₹20k for 8 weeks)
3. Establish logistics partnership with 1 recycler (₹5k initial)
4. Track: Cost per kg collected, collection rate at each site, worker retention

Success = Collecting 2+ tons/month at <₹3/kg cost. If we hit that, the model scales."
```

**Workspace UI for Intermediate Builder:**
**Workspace Entry** — What the user types:
```
"The plastic problem is an operational one, but I need to think about sustainability 
from day 1.

Current model: Manual collection + worker incentives works, but only if I keep paying. 
Red flag.

Better model: Make the economics self-sustaining.
- Pay waste workers ₹1.80/kg for sorted plastic
- Aggregate and sell to recyclers at ₹3.50-4/kg
- Margin covers operations + waste worker payment indefinitely

The ₹50k goes toward:
1. Infrastructure (kiosks, sorting): ₹20k
2. Worker incentive for testing (₹1.80/kg): ₹20k over 3 months
3. Operations/logistics: ₹10k

After 3 months, the model should be self-funding. If margin >₹1/kg, we scale to 
10 neighborhoods without additional funding.

Metrics I care about:
- Net margin per kg over 3 months (must be +₹1)
- Worker sustainability: Do they stay when I reduce incentives to ₹1.50/kg?
- Quality: Is recycler satisfied with sorted plastic?

Think of this as building the operational backbone for scale."
```

**Workspace UI for Pro Builder:**
- 💰 Sustainability model: Costs, revenue, margins, breakeven timeline
- 📊 Scaling blueprint: 1-neighborhood→10-neighborhood expansion plan
- 🤝 Stakeholder economics: Worker incentives, recycler pricing, operational costs
- 📈 Right panel: Financial projections, sustainability risk factors, scaling potential Operational KPI dashboard: Collections/day, cost per kg, worker efficiency
- 🗺️ Logistics network: Collection points, transport routes, buyer locations
- 💰 Unit economics: Revenue per kg vs. cost per kg
- 📈 Right panel: Bottleneck identification, efficiency trends, ROI

### Sublevel 3: Pro
**Profile**: Expert operator, understands leverage points, balances efficiency with resilience.
- **Q1 Response**: C (Map revenue model)
  - Reasoning: Capital multiplication strategy
  - Scores: builder: 2, catalyst: 1
- **Q4 Response**: B (Hidden friction in system design)
  - Reasoning: Root-cause operational thinking
  - Scores: builder: 3, learner: 1
**Workspace Entry** — What the grandmaster types:
```
"Plastic collection is a systems design problem dressed as an operations problem.

Most operators think: 'Build process, optimize it, scale it.'
I think: 'Who needs to change behavior for this to work?'

Answer: 3 groups
1. Waste workers (need earning opportunity)
2. Waste buyers/recyclers (need quality feedstock)
3. Citizens (need frictionless participation)

System design: Create economic incentive such that all 3 profit.
- Worker earns ₹2/kg
- Recycler saves cost on sorting (gets ₹3.50/kg value)
- Citizen gets feeling of environmental action (intangible)

The architecture: Self-sustaining incentive loop
Waste worker profit → Consistent quality → Recycler willingness → Higher price → 
Worker motivation stays high

Initial ₹50k:
- ₹25k to test worker incentive + infrastructure (1 zone, 8 weeks)
- ₹20k to establish agreements with 2-3 recyclers
- ₹5k to documentation & process design

Success metric: Does the system persist without me?
If margin is positive by week 8, it's architecture, not a program.

Then: Partner with 5 NGOs in different cities. Each has their own waste worker networks. 
I provide the playbook and margin-sharing model. This scales 100x while I scale team 3x."
```

**Workspace UI for Grandmaster:**
- 🏗️ System architecture diagram: Incentive flows, actor dynamics, feedback loops
- 🎯 Leverage point map: Which variable moves all 3 actors?
- 📋 Franchise model: Standardization for 10+ city partners
- 🌐 Right panel: Systemic health metrics, replication readiness, institutional partnerships*Q6 Response**: C (Negotiate hybrid—prove community engagement reduces churn)
  - Reasoning: Uses data to defend operations & mission
  - Scores: catalyst: 3, builder: 1
- **Q14 Response**: B (Tiered pricing)
  - Reasoning: Sophisticated pricing engineer
  - Scores: catalyst: 3, builder: 2

**Total Scores**: Builder: 8 | Catalyst: 7 | Learner: 1 | Explorer: 0
**Classification**: **BUILDER** 🔨 (or toss-up with CATALYST depending on rounding)

---

### Sublevel 4: Grandmaster
**Profile**: Operations visionary, treats organization as a system, orchestrates scaling with precision.
- **Q1 Response**: C (Map revenue model)
  - Reasoning: Systems-level capital deployment
  - Scores: builder: 2, catalyst: 1
- **Q4 Response**: B (System friction diagnosis)
  - Reasoning: Operations are systems problems
  - Scores: builder: 3, learner: 1
- **Q6 Response**: C (Negotiate hybrid with data backing)
  - Reasoning: Uses operations as proof, scalable foundation
  - Scores: catalyst: 3, builder: 1
- **Q12 Response**: B (Causality chains)
  - Reasoning: Measures operational health, not just cost
  - Scores: catalyst: 3
- **Q14 Response**: B (Tiered pricing architecture)
  - Reasoning: Designs multi-tier resilience
  - Scores: catalyst: 3, builder: 2

**Total Scores**: Builder: 8 | Catalyst: 10 | Learner: 1 | Explorer: 0
**Classification**: **CATALYST** 🚀 (systems thinking elevates beyond pure builder mindset)

---

## TEST CASE 3: Analytical Deep-Diver
**Scenario**: User prioritizes understanding, research, intellectual rigor over quick action.

### Sublevel 1: Beginner
**Profile**: Academic mindset, analysis paralysis, overthinks before acting.
- **Q1 Response**: A (Research root causes and analyze policies)
  - Reasoning: Needs to understand fully before moving
  - Scores: learner: 2, explorer: 1
- **Q2 Response**: B (Long-term social impact and causation)
  - Reasoning: Intellectually drawn to hard problems
  - Scores: learner: 3, builder: 1
- **Q6 Response**: B (Reject the funds—mission drift unacceptable)
  - Reasoning: Ideological purity over pragmatism
  - Scores: learner: 1, explorer: 1
- **Q14 Response**: A (Double the price)
  - Reasoning: Falls back to quick survival mode
  - Scores: explorer: 1, builder: 1

**Total Scores**: Learner: 6 | Builder: 2 | Explorer: 3 | Catalyst: 0
**Classification**: **LEARNER** 📖

**Workspace Entry** — What the user types:
```
"Before I spend a single rupee on plastic waste initiatives, I need to understand 
the problem deeply.

Key research questions:
1. What percentage of plastic waste actually comes from consumer behavior vs. 
   industrial packaging?
2. Have municipal collection efforts been tried before in this city? What failed?
3. What does current policy say about waste management responsibilities?
4. What do peer-reviewed studies say about incentive structures for waste collection?

I'm going to spend the first ₹10-15k on research: Literature review, interviews 
with 20 waste workers, 20 citizens, and 5 municipal officials. This will take 
6-8 weeks.

Only after I have robust causal clarity will I design an intervention. Without 
understanding root causes, I'm just guessing."
```

**Workspace UI for Beginner Learner:**
- 📚 Research roadmap: Literature review, interview templates, causal map templates
- 🔬 Study design: Sample size calculator, bias mitigation strategies
- 📝 Right panel: Research gaps, framework recommendations, causal hierarchy

### Sublevel 2: Intermediate
**Profile**: Research-informed, starting to see tradeoffs, applying frameworks intelligently.
- **Q1 Response**: A (Research and analyze policies)
  - Reasoning: Evidence-based foundation
  - Scores: learner: 2, explorer: 1
- **Q2 Response**: B (Long-term impact causation)
  - Reasoning: Pursues hard metrics
  - Scores: learner: 3, builder: 1
- **Q6 Response**: C (Negotiate hybrid—prove community engagement value)
  - Reasoning: Uses research to solve dilemma
  - Scores: catalyst: 3, builder: 1
- **Q12 Response**: B (Causality chains)
  - Reasoning: Framework-driven metrics
  - Scores: catalyst: 3

**Total Scores**: Learner: 5 | Catalyst: 6 | Builder: 2 | Explorer: 1
**Classification**: **CATALYST** 🚀 (research + pragmatism = systems thinking)

**Workspace Entry** — What the user types:
```
"I've done enough research to know: The problem isn't lack of awareness—it's 
misaligned incentives between waste workers, waste buyers, and citizens.

My hypothesis: 
If waste workers can earn ₹2/kg for sorted plastic, collection behavior will change. 
If recyclers can source clean feedstock at ₹3.50/kg, they'll fund the difference.

Testing strategy with ₹50k:
1. Literature review + framework building (₹5k, 2 weeks): Map all actors, incentive structures, 
   feedback loops
2. Field research (₹10k, 4 weeks): Validate willingness-to-pay with 5-10 waste workers 
   and 2-3 recyclers
3. Pilot test (₹25k, 6 weeks): Run the model in 1 neighborhood, measure collection 
   rates, earnings, cost
4. Analysis + documentation (₹10k, 2 weeks): Write up findings, create replication toolkit

Success metric: Does empirical data match my hypothesis? If yes, I have a scalable model."
```

**Workspace UI for Intermediate Catalyst:**
- 📊 Research+action hybrid: Causal framework + data validation
- 🧪 Program-theory model: Assumptions, indicators, validation tests
- 📈 Pilot monitoring: Real-time data collection, hypothesis tracking
- 💡 Right panel: Causal insights emerging from data, framework updates

### Sublevel 3: Pro
**Profile**: Research-driven strategist, applies rigorous frameworks, sees connections across domains.
- **Q1 Response**: A (Research and analyze)
  - Reasoning: Strong epistemic foundation
  - Scores: learner: 2, explorer: 1
- **Q2 Response**: B (Causality chains—hardest metric)
  - Reasoning: Intellectually rigorous
  - Scores: learner: 3, builder: 1
- **Q6 Response**: C (Negotiate—data-backed hybrid)
  - Reasoning: Research argues for both scaling AND mission
  - Scores: catalyst: 3, builder: 1
- **Q12 Response**: B (Causality chains)
  - Reasoning: Measurement framework focus
  - Scores: catalyst: 3
- **Q14 Response**: B (Tiered pricing strategy)
  - Reasoning: Systems & research-informed resilience
  - Scores: catalyst: 3, builder: 2

**Total Scores**: Catalyst: 9 | Learner: 5 | Builder: 4 | Explorer: 1
**Classification**: **CATALYST** 🚀

---

### Sublevel 4: Grandmaster
**Profile**: Research visionary, intellectual leader, identifies domain blind spots, authors new frameworks, thinks 10 years ahead.
- **Q1 Response**: A (Research—find root causes)
  - Reasoning: Establishes epistemic foundation for all future decisions
  - Scores: learner: 2, explorer: 1
- **Q2 Response**: B (Causality is the hard metric)
  - Reasoning: Articulates the deepest challenge
  - Scores: learner: 3, builder: 1
- **Q4 Response**: B (System friction diagnosis + research)
  - Reasoning: Designs research to overcome friction
  - Scores: builder: 3, learner: 1
- **Q6 Response**: C (Negotiate with rigorous proof model)
  - Reasoning: Research backs a new institutional model
  - Scores: catalyst: 3, builder: 1
- **Q12 Response**: B (Causality frameworks)
  - Reasoning: Authors measurement standards
  - Scores: catalyst: 3
- **Q14 Response**: B (Tiered pricing + resilience logic)
  - Reasoning: Systems research into sustainable supply chains
  - Scores: catalyst: 3, builder: 2

**Total Scores**: Catalyst: 9 | Learner: 5 | Builder: 7 | Explorer: 1
**Classification**: **CATALYST** 🚀 (catalyst + learner hybrid—rare archetype of research-driven architect)

---

## Summary Table

| Test Case | Sublevel | Key Path | Total Scores | Classification | Workspace Focus |
|-----------|----------|----------|--------------|-----------------|-----------------|
| **1: Social Impact** | Beginner | Q1(B)→Q4(A)→Q12(A)→Q14(A) | E:6, B:4 | EXPLORER | Passion & Purpose |
| | Intermediate | Q1(A)→Q2(B)→Q12(B)→Q14(B) | C:6, L:5 | CATALYST | Systemic Leverage |
| | Pro | Q1(C)→Q6(C)→Q12(B)→Q14(B) | C:10, B:5 | CATALYST | Ecosystem Design |
| | Grandmaster | Q1(C)→Q6(C)→Q12(B)→Q14(B) | C:10, B:5 | CATALYST | Strategic Vision |
| **2: Operations** | Beginner | Q1(B)→Q4(A)→Q12(A)→Q14(A) | E:5, B:4 | EXPLORER | Quick Wins |
| | Intermediate | Q1(C)→Q4(B)→Q12(A)→Q14(A) | B:9, L:1 | BUILDER | Efficiency |
| | Pro | Q1(C)→Q4(B)→Q6(C)→Q14(B) | B:8, C:7 | BUILDER/CATALYST | Operational Scaling |
| | Grandmaster | Q1(C)→Q4(B)→Q6(C)→Q12(B)→Q14(B) | B:8, C:10 | CATALYST | Systemic Operations |
| **3: Analytics** | Beginner | Q1(A)→Q2(B)→Q6(B)→Q14(A) | L:6, E:3, B:2 | LEARNER | Frameworks |
| | Intermediate | Q1(A)→Q2(B)→Q6(C)→Q12(B) | C:6, L:5 | CATALYST | Research-to-Scale |
| | Pro | Q1(A)→Q2(B)→Q6(C)→Q12(B)→Q14(B) | C:9, L:5, B:4 | CATALYST | Strategic Analysis |
| | Grandmaster | Q1(A)→Q2(B)→Q4(B)→Q6(C)→Q12(B)→Q14(B) | C:9, L:5, B:7 | CATALYST | Research-Architect |

---

## Testing Execution Steps

### For Each Test Case:

1. **Clear browser cache** (localStorage) to reset any prior assessment data
2. **Start fresh assessment** at `/onboarding.html`
3. **Follow the exact response sequence** for each sublevel
4. **Verify each response** triggers correct scoring highlights (glow effect)
5. **Confirm final classification** matches expected level
6. **Check workspace assignment** — each classification level gets appropriate UI/features

### What to Verify:

✅ All answer selections register (visual glow feedback)
✅ Correct score accumulation after each response
✅ Final classification matches prediction
✅ Classification icon & tagline display correctly
✅ Workspace is created with correct classification
✅ User is redirected to main app post-assessment
✅ Classification persists in database (Firebase)
✅ Dashboard shows correct user level icon

---

## Edge Cases to Test

1. **Highest Score Tie** — If Explorer = Builder = 5, which wins?
   - Likely system default (first in alphabetical or score comparison logic)
2. **Skipped Questions** — Path C in Q1 skips Q2, Q4. Verify scoring still accumulates correctly.
3. **Back Navigation** — Ensure previous answers persist when going back.
4. **No Answer Selected** — Can user proceed without selecting?
5. **Performance at Scale** — Test with 100+ rapid assessments.

---

