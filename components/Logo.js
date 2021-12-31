import Image from 'next/image'
import DarkSvg from '../public/dark-logo.svg'
import LightSvg from '../public/light-logo.svg'

export default function Logo({ theme }) {
  return theme === 'dark' ? (
    <Image src={DarkSvg} layout="intrinsic" />
  ) : (
    <Image src={LightSvg} layout="intrinsic" />
  )
}
