import PropTypes from 'prop-types'
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'

function TrendChart({ title, subtitle, data, dataKey = 'value', color = '#0d6efd', actions }) {
  return (
    <div className="card-glass p-4 h-100">
      <div className="d-flex justify-content-between align-items-center mb-3 gap-3 flex-wrap">
        <div>
          <h3 className="h6 mb-0">{title}</h3>
          {subtitle && <p className="text-muted small mb-0">{subtitle}</p>}
        </div>
        <div className="d-flex align-items-center gap-2">
          {actions}
        </div>
      </div>
      <div style={{ width: '100%', height: 240 }}>
        <ResponsiveContainer>
          <LineChart data={data}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(15,23,42,0.08)" />
            <XAxis dataKey="label" stroke="#94a3b8" />
            <YAxis stroke="#94a3b8" />
            <Tooltip
              contentStyle={{
                borderRadius: '0.75rem',
                border: '1px solid rgba(15,23,42,0.1)',
              }}
            />
            <Line
              type="monotone"
              dataKey={dataKey}
              stroke={color}
              strokeWidth={3}
              dot={false}
              animationDuration={800}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}

TrendChart.propTypes = {
  title: PropTypes.string.isRequired,
  subtitle: PropTypes.string,
  data: PropTypes.arrayOf(PropTypes.object).isRequired,
  dataKey: PropTypes.string,
  color: PropTypes.string,
  actions: PropTypes.node,
}

export default TrendChart
