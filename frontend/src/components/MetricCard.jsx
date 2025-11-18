import PropTypes from 'prop-types'

const formatValue = (value) => {
  if (typeof value !== 'number') return value
  if (Math.abs(value) >= 100) return value.toFixed(1)
  if (Math.abs(value) >= 10) return value.toFixed(2)
  return value.toFixed(2)
}

function MetricCard({ label, value, unit, change, badge }) {
  const changeIsPositive = typeof change === 'string' ? change.includes('+') : change > 0

  return (
    <div className="card-glass p-4 h-100">
      <p className="text-uppercase small text-muted fw-semibold mb-1">{label}</p>
      <div className="d-flex align-items-baseline gap-2">
        <span className="display-6 mb-0">{formatValue(value)}</span>
        {unit && <span className="text-secondary">{unit}</span>}
      </div>
      {change && (
        <p className={`small mb-2 ${changeIsPositive ? 'text-success' : 'text-danger'}`}>{change}</p>
      )}
      {badge && (
        <span className="badge rounded-pill text-bg-light text-dark fw-normal">{badge}</span>
      )}
    </div>
  )
}

MetricCard.propTypes = {
  label: PropTypes.string.isRequired,
  value: PropTypes.oneOfType([PropTypes.number, PropTypes.string]).isRequired,
  unit: PropTypes.string,
  change: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
  badge: PropTypes.string,
}

export default MetricCard
