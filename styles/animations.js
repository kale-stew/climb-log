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

export const fadeIn = keyframes`
  0% {
    opacity: 0;
  }
  100% {
    opacity: 1;
  }
`

export const shake = keyframes`
  0% {
    transform: translate(1px, 1px) rotate(0deg);
  }
  20% {
    transform: translate(-1px, -2px) rotate(-1deg);
  }
  40% {
    transform: translate(-3px, 0px) rotate(1deg);
  }
  60% {
    transform: translate(3px, 2px) rotate(0deg);
  }
  80% {
    transform: translate(1px, -1px) rotate(1deg);
  }
  100% {
    transform: translate(-1px, 2px) rotate(-1deg);
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
