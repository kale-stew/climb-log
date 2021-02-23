import React from 'react'
import ReactDOM from 'react-dom'

import './index.css'

import { Header, Table } from './components'
import { Climbs } from './data'

ReactDOM.render(
  <React.StrictMode>
    <>
      <Header title="Climb Log" />
      <Table climbs={Climbs} />
    </>
  </React.StrictMode>,
  document.getElementById('root')
)
