import { keyframes } from '@emotion/react'

export const appear = keyframes`
0% {
  transform: translate(0, -20px);
  opacity: 0;
}
100% {
  transform: translate(0, 6px);
  opacity: 1;
}
`

export const bounce = keyframes`
0% {
  transform: translate(0);
}
25% {
  transform: translate(0, -4px);
}
75% {
  transform: translate(0, 8px);
}
100% {
  transform: translate(0);
}
`

export const shakeLeft = keyframes`
  0% {
    transform: translate(1px);
  }
  50% {
    transform: translate(-6px);
  }
  100% {
    transform: translate(0px);
  }
`

export const shakeRight = keyframes`
0% {
  transform: translate(-1px);
}
50% {
  transform: translate(6px);
}
100% {
  transform: translate(0px);
}
`

export const spin = keyframes`
0% {
  transform: rotate(-120deg);
}
50% {
  transform: rotate(90deg);
}
100% {
  transform: rotate(0deg);
}
`
