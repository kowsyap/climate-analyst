import PropTypes from 'prop-types'

function InsightCard({ title, detail, impact }) {
  return (
    <div className="card-glass p-4 h-100">
      <p className="text-uppercase small text-muted fw-semibold mb-2">{impact}</p>
      <h3 className="h6 mb-2">{title}</h3>
      <p className="mb-0 text-secondary">{detail}</p>
    </div>
  )
}

InsightCard.propTypes = {
  title: PropTypes.string.isRequired,
  detail: PropTypes.string.isRequired,
  impact: PropTypes.string,
}

export default InsightCard
