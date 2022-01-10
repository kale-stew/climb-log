import styled from '@emotion/styled'
import { useState } from 'react'
import { FiArrowDown, FiArrowRight } from 'react-icons/fi'
import { formatDate } from '../utils/helpers'

import utilStyles from '../styles/utils.module.css'

const ListItem = styled.li`
  list-style: none;
  padding: 0;
  display: flex;
  flex-direction: column;
`

const SingleLine = styled.span`
  display: flex;
  flex-direction: row;
  align-items: center;
  gap: 1ch;
`

const Details = styled.div`
  height: min-content;
  margin: 0 0 1rem 2rem;
  font-size: 14.5px;
  display: flex;
  flex-direction: row;
  padding: 0.5rem 0;
`

const ToggleItem = ({ children, item }) => {
  const [isToggled, setToggleState] = useState(false)

  return (
    <ListItem onClick={() => setToggleState(!isToggled)}>
      <SingleLine>
        {isToggled ? <FiArrowDown /> : <FiArrowRight />}
        {children}
      </SingleLine>
      {isToggled ? (
        <Details>
          {item.img ? (
            <img src={item.img} height={75} alt={`A stock photo of ${children}.`} />
          ) : null}
          <div
            className={utilStyles.vertical}
            style={{ alignItems: 'flex-start', marginLeft: '1rem' }}
          >
            <SingleLine>
              <strong>Date Acquired:</strong>
              {formatDate(item.acquired_on)}
            </SingleLine>
            <SingleLine>
              <strong>Brand:</strong>
              {item.brand}
            </SingleLine>
            {item.product_str && (
              <SingleLine>
                <strong>Product Name:</strong>
                {item.product_str}
              </SingleLine>
            )}
          </div>
        </Details>
      ) : null}
    </ListItem>
  )
}

export default ToggleItem
