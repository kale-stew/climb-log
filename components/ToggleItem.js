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
  animation: ${appear} 0.4s ease-in-out;
  @media (max-width: 1024px) {
    font-size: 14px;
  }
`

const ToggleItem = ({ children, item }) => {
  const [isToggled, setToggleState] = useState(false)

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
            <SingleLine>
              <strong>Brand: </strong>
              {item.brand}
            </SingleLine>
            {item.product_str && (
              <SingleLine>
                <strong>Product Name: </strong>
                {item.product_str}
              </SingleLine>
            )}
            {item.color && (
              <SingleLine>
                <strong>Color: </strong>
                {item.color}
              </SingleLine>
            )}
          </div>
        </Details>
      ) : null}
    </ListItem>
  )
}

export default ToggleItem
