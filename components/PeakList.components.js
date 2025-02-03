import styled from '@emotion/styled'

export const CompletedCount = styled.span`
  margin: 0 auto 1rem auto;
  font-weight: 600;
  background-color: var(--color-bg-tertiary);
  color: var(--color-white);
  width: max-content;
  padding: 0.25em 0.4em;
  border-radius: 5px;
`

export const PeakCard = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  align-self: center;
  border-radius: 5px;
  margin: 0.5rem 0;
  width: 350px;
  font-weight: 600;
  ${(p) =>
    p.isCompleted
      ? `border: 2px solid var(--color-bg-secondary);
        background-image: linear-gradient(to bottom, var(--color-card-bg), var(--color-card-${
          p.color
        })),
        url(${p.img ? p.img : '/photos/desktop_lander_T.jpg'});
        height: auto;
        color: var(--color-white);
        background-size: cover;
        padding: 0 1rem 2rem 1rem;
        @media (max-width: 1024px) {
          max-height: 25vh;
        }
        h2 {
          font-weight: 600;
        }`
      : `padding: 0 1rem;
        border: 2px solid var(--color-card-${p.color})`};
  @media (max-width: 1024px) {
    width: inherit;
    padding: auto 0.5em;
  }
`

export const RankNumber = styled.span`
  font-size: 12px;
  font-weight: 500;
  color: ${(p) => (p.isCompleted ? 'var(--color-white)' : 'var(--color-text-tertiary)')};
`
