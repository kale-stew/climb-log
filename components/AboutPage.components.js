import styled from '@emotion/styled'

export const AboutWrapper = styled.div`
  max-width: 550px;
  h2 {
    margin-top: 3rem;
  }
  p {
    text-align: left;
  }

  @media (max-width: 1024px) {
    flex-direction: column;
    padding: 0 1.75rem;
    align-items: center;
    max-width: 95vw;
    p,
    h2 {
      text-align: center;
    }
    li {
      text-align: left;
    }
  }
`

export const FormCaption = styled.p`
  margin: 0 auto 1rem auto;
  font-size: 0.9rem;
  text-align: center;

  @media (max-width: 1024px) {
    max-width: 60vw;
  }
`
