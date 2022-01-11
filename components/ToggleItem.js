import { appear } from '../styles/animations'
import { formatDate } from '../utils/helpers'
import { useState } from 'react'
import { FiArrowDown } from 'react-icons/fi'
import { HiMinusSm } from 'react-icons/hi'
import styled from '@emotion/styled'
import utilStyles from '../styles/utils.module.css'

const ListItem = styled.li`
  list-style: none;
  padding: 0;
  display: flex;
  flex-direction: column;
  cursor: pointer;
`

const SingleLine = styled.span`
  display: inline;
  word-wrap: break-word;
  line-height: 1.3;
`

const Details = styled.div`
  height: min-content;
  margin: 0 0 1rem 1.25rem;
  display: flex;
  flex-direction: row;
  padding: 0.5rem 0;
  max-width: 35vw;
  animation: ${appear} 0.4s ease-in-out;
  @media (max-width: 1024px) {
    font-size: 14px;
    max-width: 50vw;
  }
`

const ToggleItem = ({ children, item }) => {
  const [isToggled, setToggleState] = useState(false)
  const isRetired = item.category === 'Retired'

  return (
    <ListItem onClick={() => setToggleState(!isToggled)}>
      <SingleLine>
        {isToggled ? (
          <FiArrowDown style={{ paddingTop: '0.15em' }} />
        ) : (
          <HiMinusSm style={{ paddingTop: '0.25em' }} />
        )}
        {` ${children}`}
      </SingleLine>
      {isToggled ? (
        <Details>
          {item.img ? (
            <img
              height={'50vh'}
              src={`/gear/${item.img}`}
              alt={`A stock photo of ${children}.`}
            />
          ) : null}
          <div
            className={utilStyles.vertical}
            style={{ alignItems: 'flex-start', marginLeft: '1rem' }}
          >
            <SingleLine>
              <strong>Date Acquired: </strong>
              {formatDate(item.acquired_on)}
            </SingleLine>
            {isRetired && (
              <SingleLine>
                <strong>Date Retired: </strong>
                {formatDate(item.retired_on)}
              </SingleLine>
            )}
            {!isRetired && (
              <SingleLine>
                <strong>Brand: </strong>
                {item.brand}
              </SingleLine>
            )}
            {item.product_str && !isRetired && (
              <SingleLine>
                <strong>Product Name: </strong>
                {item.product_str}
              </SingleLine>
            )}
            {item.color && !isRetired && (
              <SingleLine>
                <strong>Color: </strong>
                {item.color}
              </SingleLine>
            )}
            {isRetired && (
              <SingleLine>
                <strong>What Happened: </strong>
                {item.more_info}
              </SingleLine>
            )}
          </div>
        </Details>
      ) : null}
    </ListItem>
  )
}

export default ToggleItem
