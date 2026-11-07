import '@tilcayo/styles/index.css'
import { useState } from 'react'
import { Pagination } from '@tilcayo/ui'

const projects = ['Design system', 'Marketing site', 'Mobile app', 'Brand refresh', 'Documentation', 'Customer portal']

export default function PaginationExample() {
  const [page, setPage] = useState(1)
  const pageSize = 2
  return <div className="tl-stack"><ul style={{ margin: 0, paddingLeft: 20 }}>{projects.slice((page - 1) * pageSize, page * pageSize).map(name => <li key={name}>{name}</li>)}</ul><Pagination page={page} totalPages={Math.ceil(projects.length / pageSize)} onChange={setPage} /></div>
}
