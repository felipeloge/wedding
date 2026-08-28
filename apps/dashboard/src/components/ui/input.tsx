import * as React from 'react'
import { cn } from '../../lib/utils'

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {}

const Input = React.forwardRef<HTMLInputElement, InputProps>(({ className, type, ...props }, ref) => (
  <input
    type={type}
    ref={ref}
    className={cn(
      'flex h-9 w-full border border-border bg-white px-3 py-2 font-body text-sm text-text placeholder:text-text-muted/50 focus:border-primary focus:ring-0 focus:outline-none transition-colors disabled:opacity-50 disabled:cursor-not-allowed',
      className,
    )}
    {...props}
  />
))
Input.displayName = 'Input'

export { Input }
