import styled from '@emotion/styled'
import { useState, useEffect } from 'react'
import { BsMoonStars, BsSun } from 'react-icons/bs'
import { bounce, spin } from '../styles/animations'

const ToggleButton = styled.button`
  background: transparent;
  color: var(--color-text-primary);
  width: 34px;
  height: 17px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.4rem;
  padding: 1.22rem;
  margin: 0;
  cursor: pointer;
  transition: background 0.25s ease-in-out;
  &:hover {
    color: var(--color-text-primary);
    background-color: transparent;
    transform-origin: none;
  }
`

const MoonSpan = styled.span`
  &:hover {
    animation: ${bounce} 0.75s ease-in-out;
  }
`

const SunSpan = styled.span`
  margin: 0;
  padding: 0;
  &:hover {
    animation: ${spin} 0.6s ease-in-out;
  }
`

const ThemeToggle = () => {
  const [activeTheme, setActiveTheme] = useState(document.body.dataset.theme)
  const inactiveTheme = activeTheme === 'light' ? 'dark' : 'light'
  useEffect(() => {
    document.body.dataset.theme = activeTheme
    window.localStorage.setItem('theme', activeTheme)
  }, [activeTheme])

  return (
    <ToggleButton
      aria-label={`Switch to ${inactiveTheme} mode`}
      title={`Switch to ${inactiveTheme} mode`}
      type="button"
      onClick={() => setActiveTheme(inactiveTheme)}
    >
      <MoonSpan>{activeTheme === 'dark' && <BsMoonStars />}</MoonSpan>
      <SunSpan>{activeTheme === 'light' && <BsSun />}</SunSpan>
    </ToggleButton>
  )
}

export default ThemeToggle
