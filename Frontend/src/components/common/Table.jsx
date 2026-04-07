export default function Table({ children, className = '' }) {
  return (
    <div className="table-container">
      <table className={`table ${className}`}>
        {children}
      </table>
    </div>
  )
}

export function TableHead({ children }) {
  return <thead>{children}</thead>
}

export function TableBody({ children }) {
  return <tbody className="divide-y divide-gray-200 bg-white">{children}</tbody>
}

export function TableRow({ children, onClick, className = '' }) {
  return (
    <tr 
      onClick={onClick} 
      className={`${onClick ? 'cursor-pointer' : ''} ${className}`}
    >
      {children}
    </tr>
  )
}

export function TableCell({ children, className = '' }) {
  return <td className={className}>{children}</td>
}

export function TableHeaderCell({ children, className = '' }) {
  return <th className={className}>{children}</th>
}
