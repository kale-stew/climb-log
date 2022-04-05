import styled from '@emotion/styled'

export const FilterButton = styled.button`
  background-color: ${(p) => `var(--color-card-${p.color})`};
  color: var(--color-white);
  width: max-content;
  font-weight: 500;
  font-size: 14px;
  &:hover {
    box-shadow: 0 10px 20px var(--color-bg-tertiary), 0 6px 6px var(--color-bg-tertiary);
  }
  ${(p) => (p.isSelected ? 'border: 2px solid var(--color-text-tertiary);' : null)};
`

export const FilterWrapper = styled.div`
  max-width: 70%;
  margin: 0.5rem auto;
  text-align: center;
  @media (max-width: 1024px) {
    max-width: 100%;
  }
`
