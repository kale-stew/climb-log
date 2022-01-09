import styled from '@emotion/styled'
import { useState, useEffect } from 'react'
import { BsMoonStars, BsSun } from 'react-icons/bs'

import styles from './Footer.module.css'

const ToggleButton = styled.button`
  --toggle-width: 40px;
  --toggle-height: 20px;
  position: relative;
  display: flex;
  align-items: center;
  justify-content: space-around;
  font-size: 1.5rem;
  padding: 1.5rem;
  margin-bottom: 1rem;
  width: var(--toggle-width);
  height: var(--toggle-height);
  border: 1px solid var(--color-text-primary);
  border-radius: 50%;
  cursor: pointer;
  background: var(--color-bg-primary);
  color: var(--color-text-primary);
  transition: background 0.25s ease-in-out, box-shadow 0.25s ease-in-out;
  &:focus {
    outline-offset: 5px;
  }
  &:focus:not(:focus-visible) {
    outline: none;
  }
  &:hover {
    background: var(--color-bg-tertiary);
  }
`

const TogglePoint = styled.span`
  position: absolute;
  transition: transform 0.25s ease-in-out;
  transform: ${(p) =>
    p.activeTheme === 'dark'
      ? 'translate3d(calc(var(--toggle-width) - var(--toggle-height)), 0, 0)'
      : 'none'};
`

const ThemeToggle = () => {
  const [activeTheme, setActiveTheme] = useState(document.body.dataset.theme)
  const inactiveTheme = activeTheme === 'light' ? 'dark' : 'light'
  useEffect(() => {
    document.body.dataset.theme = activeTheme
    window.localStorage.setItem('theme', activeTheme)
  }, [activeTheme])

  return (
    <div className={styles.toggleWrapper}>
      <ToggleButton
        aria-label={`Change to ${inactiveTheme} mode`}
        title={`Change to ${inactiveTheme} mode`}
        type="button"
        onClick={() => setActiveTheme(inactiveTheme)}
      >
        <TogglePoint activeTheme={activeTheme} />
        <span>{activeTheme === 'dark' && <BsMoonStars />}</span>
        <span>{activeTheme === 'light' && <BsSun />}</span>
      </ToggleButton>
    </div>
  )
}

export default ThemeToggle
