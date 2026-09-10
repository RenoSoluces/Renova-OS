import { ButtonHTMLAttributes, ReactNode } from 'react'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'accent' | 'danger'
  size?: 'sm' | 'md' | 'lg'
  block?: boolean
  children?: ReactNode
}

export function Button({ variant = 'primary', size = 'md', block, children, className = '', ...rest }: ButtonProps) {
  const cls = `btn btn-${variant} ${size === 'sm' ? 'btn-sm' : size === 'lg' ? 'btn-lg' : ''} ${block ? 'btn-block' : ''} ${className}`
  return <button className={cls} {...rest}>{children}</button>
}
