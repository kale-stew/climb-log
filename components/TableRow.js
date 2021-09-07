import React from 'react'
import styled from 'styled-components'
import {
  addCommas,
  feetToMeters,
  findMatchingSlug,
  milesToKilometers,
} from '../utils/helpers'

const Pill = styled.div`
  font-size: 9px;
  padding: 0.25em 1em;
  border-radius: 3px;
  color: ${(props) => props.color};
  border: 2px solid ${(props) => props.color};
`

const ColorPill = ({ state }) => {
  const selectColors = {
    arizona: '', // red
    california: '', // gold
    colorado: '#F37610', // orange
    oregon: '', // purple
    utah: '', // yellow
    washington: '', // pink
    'new mexico': '', //
  }

  console.log(state, selectColors[state])

  return <Pill color={selectColors[state]}>{state}</Pill>
}

const TableRow = ({ id, title, data, metric }) => {
  if (title == 'distance') {
    // Return either metric or imperial stats
    return (
      <td key={id}>
        {metric ? data && `${milesToKilometers(data)} km` : data && `${data} mi`}
      </td>
    )
  } else if (title == 'gain') {
    return (
      <td key={id}>
        {metric ? data && `${feetToMeters(data)} m` : data && `${addCommas(data)} ft`}
      </td>
    )
  } else if (title == 'title' && findMatchingSlug(data)) {
    // Link to full page report if it exists
    return (
      <td key={id}>
        <a href={`/${findMatchingSlug(data)}`} alt={`View trip report from ${data}`}>
          {data}
        </a>
      </td>
    )
  } else if (title == 'state') {
    return (
      <td key={id}>
        <ColorPill state={data} />
      </td>
    )
  }

  return <td key={id}>{data}</td>
}

export default TableRow
