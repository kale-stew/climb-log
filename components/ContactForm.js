import { useState } from 'react'
import styled from '@emotion/styled'
import { GiMountainRoad } from 'react-icons/gi'
import { CONTACT_ENDPOINT } from '../utils/constants'

const StyledForm = styled.form`
  display: flex;
  flex-direction: column;
  margin: 0 auto;
  @media (max-width: 1024px) {
    max-width: 90vw;
  }
`

const SmallInput = styled.input`
  padding: 0.4rem 0.75rem;
  font-size: 0.9rem;
  border-radius: 5px;
  &:focus {
    outline: none;
    border: 1px solid var(--color-green);
    box-shadow: 0 0 10px var(--color-offwhite);
  }
`

const TextInput = styled.textarea`
  font-size: 0.9rem;
  font-family: 'Open Sans', sans-serif;
  margin-top: 0.3rem;
  padding: 0.4rem 0.75rem;
  background-color: transparent;
  color: var(--color-text-secondary);
  border: 1px solid var(--color-bg-tertiary);
  border-radius: 5px;
  &:focus {
    outline: none;
    border: 1px solid var(--color-green);
    box-shadow: 0 0 10px var(--color-offwhite);
  }
  @media (max-width: 1024px) {
    max-width: 90vw;
  }
`

const SubmitButton = styled.button`
  margin: 1rem auto;
  max-width: 420px;
  border: 1px solid var(--color-bg-tertiary);
  &:hover {
    background-color: var(--color-text-accent);
    border: 1px solid var(--color-text-accent);
  }
`

const ThankYouWrapper = styled.div`
  max-width: max-content;
  display: flex;
  flex-direction: column;
  text-align: center;
  margin: 0 auto;
  @media (max-width: 1024px) {
    max-width: 90vw;
  }
`

const ContactForm = () => {
  const [status, setStatus] = useState()
  const handleSubmit = (e) => {
    e.preventDefault()
    const inputs = e.target.elements
    const injectedData = {}
    const data = {}
    for (let i = 0; i < inputs.length; i++) {
      if (inputs[i].name) {
        data[inputs[i].name] = inputs[i].value
      }
    }
    Object.assign(data, injectedData)

    fetch(CONTACT_ENDPOINT, {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    })
      .then((response) => {
        // Check for likely spam/bot request, validate via captcha
        if (response.status === 422) {
          Object.keys(injectedData).forEach((key) => {
            const el = document.createElement('input')
            el.type = 'hidden'
            el.name = key
            el.value = injectedData[key]
            e.target.appendChild(el)
          })

          e.target.submit()
          throw new Error('Please finish the captcha challenge')
        }

        if (response.status !== 200) {
          throw new Error(response.statusText)
        }
        return response.json()
      })
      .then(() => setStatus("I'll get back to you soon."))
      .catch((err) => setStatus(err.toString()))
  }

  if (status) {
    return (
      <ThankYouWrapper>
        <h3>
          <i>Thank you!</i>
        </h3>
        <GiMountainRoad size="3rem" style={{ margin: '0 auto 1rem auto' }} />
        <div>{status}</div>
      </ThankYouWrapper>
    )
  }

  return (
    <StyledForm
      action={CONTACT_ENDPOINT}
      onSubmit={handleSubmit}
      method="POST"
      target="_blank"
    >
      <SmallInput type="text" placeholder="Your Name" name="name" required />
      <SmallInput type="email" placeholder="your@email.com" name="email" required />
      <TextInput placeholder="Your message" name="message" required />
      <SubmitButton type="submit"> Send a message </SubmitButton>
    </StyledForm>
  )
}

export default ContactForm
