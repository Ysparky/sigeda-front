import { createLink, type LinkComponent } from '@tanstack/react-router'
import type { ComponentProps } from 'react'
import { cn } from '@/lib/utils'

export function EnlaceExterno({ className, ...props }: ComponentProps<'a'>) {
  return <a {...props} className={cn('font-medium text-primary underline-offset-4 hover:underline', className)} />
}

const EnlaceDelRouter = createLink(EnlaceExterno)

export const Enlace: LinkComponent<typeof EnlaceExterno> = (props) => <EnlaceDelRouter {...props} />
