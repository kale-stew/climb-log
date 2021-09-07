import React from 'react'
import styled from 'styled-components'

const ColorPill = styled.div`
  font-size: 9px;
  padding: 0.2rem;
  max-width: 4rem;
  border-radius: 3px;
  color: ${(props) => props.color || 'goldenrod'};
  border: 2px solid ${(props) => props.color};
`

const Pill = ({ state }) => {
  const selectColors = {
    arizona: 'red', // red
    california: 'goldenrod', // gold
    colorado: 'peru', // orange
    oregon: '', // purple
    utah: '', // yellow
    washington: 'violet', // pink
    'new mexico': '', //
  }

  return <ColorPill color={selectColors.state}>{state}</ColorPill>
}

export default Pill
