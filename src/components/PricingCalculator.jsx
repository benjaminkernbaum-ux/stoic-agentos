import { useState, useMemo, useCallback, useRef, useEffect } from 'react';
import './PricingCalculator.css';

/* ── Plan definitions ── */
const PLANS = {
  free:       { name: 'Free',       price: 0,  label: '$0',     period: 'forever',  features: ['Up to 5 agents', '10K observations/mo', '1 team member'] },
  pro:        { name: 'Pro',        price: 29, label: '$29',    period: '/month',   features: ['Up to 25 agents', '100K observations/mo', '5 team members', 'Priority support'] },
  team:       { name: 'Team',       price: 79, label: '$79',    period: '/month',   features: ['Up to 100 agents', 'Unlimited observations', '15 team members', 'SSO & audit logs'] },
  enterprise: { name: 'Enterprise', price: -1, label: 'Custom', period: '',         features: ['Unlimited agents', 'Unlimited observations', 'Unlimited members', 'Dedicated support', 'SLA & on-prem'] },
};

/* ── Determine recommended plan ── */
function recommendPlan(agents, observations, members) {
  if (agents <= 5  && observations <= 10000  && members <= 1)  return 'free';
  if (agents <= 25 && observations <= 100000 && members <= 5)  return 'pro';
  if (agents <= 100 && members <= 15)                          return 'team';
  return 'enterprise';
}

/* ── Competitor cost formulas ── */
function calcLangSmith(observations, members) {
  return members * 39 + (observations / 1000) * 0.50;
}
function calcBraintrust() {
  return 249;
}
function calcLangfuse() {
  return 29;
}

/* ── Format number with commas ── */
function fmt(n) {
  if (n >= 1000) {
    return n.toLocaleString('en-US');
  }
  return String(n);
}
function fmtObs(n) {
  if (n >= 1000) return `${(n / 1000).toLocaleString('en-US')}K`;
  return String(n);
}
function fmtPrice(n) {
  return `$${Math.round(n).toLocaleString('en-US')}`;
}

/* ── Observation steps (non-linear for better UX) ── */
const OBS_STEPS = [
  1000, 2000, 5000, 10000, 20000, 50000, 100000, 200000, 300000, 500000,
];

export default function PricingCalculator() {
  const [agents, setAgents]       = useState(10);
  const [obsIndex, setObsIndex]   = useState(3); // 10K default
  const [members, setMembers]     = useState(3);

  const observations = OBS_STEPS[obsIndex] ?? 10000;

  /* ── Slider background fill (webkit workaround) ── */
  const agentsRef  = useRef(null);
  const obsRef     = useRef(null);
  const membersRef = useRef(null);

  const updateSliderFill = useCallback((el, min, max, value) => {
    if (!el) return;
    const pct = ((value - min) / (max - min)) * 100;
    el.style.background = `linear-gradient(90deg, #9b59ff 0%, #00d4ff ${pct}%, rgba(255,255,255,0.06) ${pct}%)`;
  }, []);

  useEffect(() => {
    updateSliderFill(agentsRef.current,  1, 200, agents);
    updateSliderFill(obsRef.current,     0, OBS_STEPS.length - 1, obsIndex);
    updateSliderFill(membersRef.current, 1, 30, members);
  }, [agents, obsIndex, members, updateSliderFill]);

  /* ── Computed values ── */
  const plan = useMemo(() => recommendPlan(agents, observations, members), [agents, observations, members]);
  const planData = PLANS[plan];

  const langSmithCost  = useMemo(() => calcLangSmith(observations, members), [observations, members]);
  const braintrustCost = useMemo(() => calcBraintrust(), []);
  const langfuseCost   = useMemo(() => calcLangfuse(), []);

  // Max competitor cost for savings comparison
  const maxCompetitor = Math.max(langSmithCost, braintrustCost, langfuseCost);
  const stoicPrice    = planData.price < 0 ? 0 : planData.price;
  const savings       = Math.max(0, langSmithCost - stoicPrice);
  const isHighSavings = savings > 200;
  const isEnterprise  = plan === 'enterprise';

  return (
    <div className="pricing-calc">
      {/* Header */}
      <div className="pricing-calc-header">
        <h3 className="pricing-calc-title">Calculate Your Cost</h3>
        <p className="pricing-calc-subtitle">
          Drag the sliders to see your recommended plan and savings
        </p>
      </div>

      {/* Sliders */}
      <div className="pricing-calc-sliders">
        {/* Agents slider */}
        <div className="pricing-calc-slider-group">
          <div className="pricing-calc-slider-label">
            <span className="pricing-calc-slider-name">
              <span className="pricing-calc-slider-icon">🤖</span>
              Active Agents
            </span>
            <span className="pricing-calc-slider-value">{fmt(agents)}</span>
          </div>
          <input
            ref={agentsRef}
            type="range"
            className="pricing-calc-range"
            min={1}
            max={200}
            step={1}
            value={agents}
            onChange={(e) => setAgents(Number(e.target.value))}
          />
          <div className="pricing-calc-slider-scale">
            <span>1</span>
            <span>50</span>
            <span>100</span>
            <span>150</span>
            <span>200</span>
          </div>
        </div>

        {/* Observations slider */}
        <div className="pricing-calc-slider-group">
          <div className="pricing-calc-slider-label">
            <span className="pricing-calc-slider-name">
              <span className="pricing-calc-slider-icon">📊</span>
              Observations / Month
            </span>
            <span className="pricing-calc-slider-value">{fmtObs(observations)}</span>
          </div>
          <input
            ref={obsRef}
            type="range"
            className="pricing-calc-range"
            min={0}
            max={OBS_STEPS.length - 1}
            step={1}
            value={obsIndex}
            onChange={(e) => setObsIndex(Number(e.target.value))}
          />
          <div className="pricing-calc-slider-scale">
            <span>1K</span>
            <span>10K</span>
            <span>100K</span>
            <span>500K</span>
          </div>
        </div>

        {/* Team members slider */}
        <div className="pricing-calc-slider-group">
          <div className="pricing-calc-slider-label">
            <span className="pricing-calc-slider-name">
              <span className="pricing-calc-slider-icon">👥</span>
              Team Members
            </span>
            <span className="pricing-calc-slider-value">{fmt(members)}</span>
          </div>
          <input
            ref={membersRef}
            type="range"
            className="pricing-calc-range"
            min={1}
            max={30}
            step={1}
            value={members}
            onChange={(e) => setMembers(Number(e.target.value))}
          />
          <div className="pricing-calc-slider-scale">
            <span>1</span>
            <span>10</span>
            <span>20</span>
            <span>30</span>
          </div>
        </div>
      </div>

      {/* Results grid */}
      <div className="pricing-calc-results">
        {/* Recommended plan */}
        <div className="pricing-calc-plan">
          <div className="pricing-calc-plan-label">✦ Recommended Plan</div>
          <div className="pricing-calc-plan-name">{planData.name}</div>
          <div className="pricing-calc-plan-price">{planData.label}</div>
          <div className="pricing-calc-plan-period">{planData.period}</div>
          <ul className="pricing-calc-plan-features">
            {planData.features.map((f, i) => (
              <li key={i}>{f}</li>
            ))}
          </ul>
        </div>

        {/* Competitors */}
        <div className="pricing-calc-competitors">
          <div className="pricing-calc-competitor">
            <div className="pricing-calc-competitor-info">
              <span className="pricing-calc-competitor-name">LangSmith</span>
              <span className="pricing-calc-competitor-detail">
                ${39}/seat + $0.50/1K traces
              </span>
            </div>
            <div>
              <div className="pricing-calc-competitor-price">{fmtPrice(langSmithCost)}</div>
              <div className="pricing-calc-competitor-period">/month</div>
            </div>
          </div>

          <div className="pricing-calc-competitor">
            <div className="pricing-calc-competitor-info">
              <span className="pricing-calc-competitor-name">Braintrust</span>
              <span className="pricing-calc-competitor-detail">Pro tier flat rate</span>
            </div>
            <div>
              <div className="pricing-calc-competitor-price">{fmtPrice(braintrustCost)}</div>
              <div className="pricing-calc-competitor-period">/month</div>
            </div>
          </div>

          <div className="pricing-calc-competitor">
            <div className="pricing-calc-competitor-info">
              <span className="pricing-calc-competitor-name">Langfuse</span>
              <span className="pricing-calc-competitor-detail">Core, up to 100K traces</span>
            </div>
            <div>
              <div className="pricing-calc-competitor-price">{fmtPrice(langfuseCost)}</div>
              <div className="pricing-calc-competitor-period">/month</div>
            </div>
          </div>
        </div>
      </div>

      {/* Savings banner */}
      {!isEnterprise && (
        <div className={`pricing-calc-savings ${isHighSavings ? 'high-savings' : ''}`}>
          <span className="pricing-calc-savings-icon">💰</span>
          <span className="pricing-calc-savings-text">
            You save{' '}
            <span className="pricing-calc-savings-amount">{fmtPrice(savings)}/month</span>
            {' '}vs LangSmith
          </span>
        </div>
      )}

      {/* Enterprise CTA */}
      {isEnterprise && (
        <div className="pricing-calc-enterprise">
          <div className="pricing-calc-enterprise-title">Need Enterprise Scale?</div>
          <div className="pricing-calc-enterprise-desc">
            Custom pricing for {fmt(agents)} agents, {fmtObs(observations)} observations, and {fmt(members)} team members
          </div>
          <button className="pricing-calc-enterprise-btn" onClick={() => window.location.href = 'mailto:hello@stoicagentos.com?subject=Enterprise%20Inquiry&body=Hi%20Stoic%20AgentOS%20team%2C%0A%0AI%E2%80%99m%20interested%20in%20an%20Enterprise%20plan%20for%20my%20team.%0A%0AThank%20you!'}>
            Contact Sales →
          </button>
        </div>
      )}

      {/* Disclaimer */}
      <p className="pricing-calc-disclaimer">
        Competitor prices are estimates based on published pricing as of 2026. Actual costs may vary.
      </p>
    </div>
  );
}
