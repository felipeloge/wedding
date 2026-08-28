import * as React from 'react'
import { cn } from '../../lib/utils'

export interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {}

const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, ...props }, ref) => (
    <textarea
      ref={ref}
      className={cn(
        'flex w-full border border-border bg-white px-3 py-2 font-body text-sm text-text placeholder:text-text-muted/50 focus:border-primary focus:ring-0 focus:outline-none transition-colors disabled:opacity-50 disabled:cursor-not-allowed resize-none',
        className,
      )}
      {...props}
    />
  ),
)
Textarea.displayName = 'Textarea'

export { Textarea }
