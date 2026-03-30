// js/assessment/cat-data.js
// Pure data — zero side effects

export const QUESTIONS = {
    Q1: {
        id: "Q1", title: "The Starting Line",
        question: "You receive ₹50,000 to address a social issue you care about. What is your immediate first step?",
        options: [
            { key: "A", text: "Research root causes and analyze existing public policies.", scores: { learner: 2, explorer: 1 }, next: "Q2" },
            { key: "B", text: "Mobilize volunteers and directly deliver services to those in need.", scores: { explorer: 2, builder: 1 }, next: "Q4" },
            { key: "C", text: "Map a revenue model so ₹50k acts as seed capital, not a one-time donation.", scores: { builder: 2, catalyst: 1 }, next: "Q6" }
        ]
    },
    Q2: {
        id: "Q2", title: "The Hard Metric",
        question: "When evaluating a social initiative, which metric is most difficult to accurately measure and attribute?",
        options: [
            { key: "A", text: "Operational burn rate and overhead.", scores: { explorer: 1 }, next: "Q12" },
            { key: "B", text: "Long-term social impact and causation.", scores: { learner: 3, builder: 1 }, next: "Q12" },
            { key: "C", text: "Employee and volunteer retention.", scores: { explorer: 1 }, next: "Q12" }
        ]
    },
    Q4: {
        id: "Q4", title: "Low Participation Mystery",
        question: "You organize a community recycling program, but participation is near zero. What is the most likely systemic reason?",
        options: [
            { key: "A", text: "The community simply does not care about the environment.", scores: { explorer: 2 }, next: "Q12" },
            { key: "B", text: "There is hidden friction — inconvenient bin placement or missing incentives.", scores: { builder: 3, learner: 1 }, next: "Q12" }
        ]
    },
    Q6: {
        id: "Q6", title: "The Investor Dilemma",
        question: "A corporate investor offers funding to scale nationally but demands you cut your community-engagement program to increase margins. Your immediate thought?",
        options: [
            { key: "A", text: "Accept the funds — scaling the core product helps more people overall.", scores: { builder: 1, learner: 1 }, next: "Q12" },
            { key: "B", text: "Reject the funds — mission drift is unacceptable.", scores: { learner: 1, explorer: 1 }, next: "Q12" },
            { key: "C", text: "Negotiate a hybrid model, proving community engagement lowers customer churn.", scores: { catalyst: 3, builder: 1 }, next: "Q12" }
        ]
    },
    Q12: {
        id: "Q12", title: "Unit Economics",
        question: "How would you primarily measure the success of a social enterprise beyond quarterly revenue?",
        options: [
            { key: "A", text: "Customer acquisition cost relative to lifetime value.", scores: { builder: 2 }, next: "Q14" },
            { key: "B", text: "Long-term social impact causality chains.", scores: { catalyst: 3 }, next: "Q14" }
        ]
    },
    Q14: {
        id: "Q14", title: "The Survival Trade-Off",
        question: "A supply chain shock doubles costs. You have 3 months of runway. What is your primary move?",
        options: [
            { key: "A", text: "Double the price — revenue survival comes first.", scores: { explorer: 1, builder: 1 }, next: null },
            { key: "B", text: "Pivot to tiered pricing to cross-subsidize impact access.", scores: { catalyst: 3, builder: 2 }, next: null }
        ]
    }
};

export const LEVELS = {
    Explorer: { icon: "🌱", tagline: "Passion meets Potential", desc: "You're naturally curious and driven by purpose. Your workspace will focus on foundational concepts and exploration." },
    Learner:  { icon: "📖", tagline: "Theoretical Bridge", desc: "You think in frameworks and root causes. Your workspace will emphasize analytical depth and causal reasoning." },
    Builder:  { icon: "🔨", tagline: "Operational Engine", desc: "You focus on execution and resource optimization. Your workspace will center on operational constraints." },
    Catalyst: { icon: "🚀", tagline: "Systemic Architect", desc: "You design self-sustaining ecosystems. Your workspace will tackle systemic leverage points." }
};
