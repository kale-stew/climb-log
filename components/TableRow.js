import React from 'react'
import Pill from './Pill'
import {
  addCommas,
  feetToMeters,
  findMatchingSlug,
  milesToKilometers,
} from '../utils/helpers'

export default function TableRow({ id, title, data, metric }) {
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
        <Pill state={data} />
      </td>
    )
  }

  return <td key={id}>{data}</td>
}
