"use client"

import * as React from "react"
import { Dialog as AstryxDialog } from "@astryxdesign/core/Dialog"
import { Heading } from "@astryxdesign/core/Heading"
import { HStack, VStack } from "@astryxdesign/core/Layout"
import { Text } from "@astryxdesign/core/Text"

import { cn } from "@/lib/utils"
import styles from "./dialog.module.css"

type DialogContextValue = {
  descriptionId: string
  open: boolean
  setOpen: (open: boolean) => void
  titleId: string
}

const DialogContext = React.createContext<DialogContextValue | null>(null)

function useDialogContext(): DialogContextValue {
  const context = React.useContext(DialogContext)
  if (!context) {
    throw new Error("Dialog components must be used inside Dialog")
  }
  return context
}

type DialogProps = {
  children: React.ReactNode
  defaultOpen?: boolean
  onOpenChange?: (open: boolean) => void
  open?: boolean
}

function Dialog({
  children,
  defaultOpen = false,
  onOpenChange,
  open: controlledOpen,
}: DialogProps) {
  const [uncontrolledOpen, setUncontrolledOpen] = React.useState(defaultOpen)
  const reactId = React.useId()
  const open = controlledOpen ?? uncontrolledOpen

  const setOpen = React.useCallback(
    (nextOpen: boolean) => {
      if (controlledOpen === undefined) {
        setUncontrolledOpen(nextOpen)
      }
      onOpenChange?.(nextOpen)
    },
    [controlledOpen, onOpenChange],
  )

  const value = React.useMemo(
    () => ({
      descriptionId: `${reactId}-description`,
      open,
      setOpen,
      titleId: `${reactId}-title`,
    }),
    [open, reactId, setOpen],
  )

  return <DialogContext.Provider value={value}>{children}</DialogContext.Provider>
}

type ClickableChildProps = {
  onClick?: React.MouseEventHandler<HTMLElement>
}

const DialogTrigger = React.forwardRef<
  HTMLButtonElement,
  React.ButtonHTMLAttributes<HTMLButtonElement> & { asChild?: boolean }
>(({ asChild = false, children, onClick, ...props }, ref) => {
  const { setOpen } = useDialogContext()

  if (asChild && React.isValidElement<ClickableChildProps>(children)) {
    return React.cloneElement(children, {
      onClick: (event) => {
        children.props.onClick?.(event)
        if (!event.defaultPrevented) {
          setOpen(true)
        }
      },
    })
  }

  return (
    <button
      {...props}
      onClick={(event) => {
        onClick?.(event)
        if (!event.defaultPrevented) {
          setOpen(true)
        }
      }}
      ref={ref}
      type={props.type ?? "button"}
    >
      {children}
    </button>
  )
})
DialogTrigger.displayName = "DialogTrigger"

type DialogContentProps = React.HTMLAttributes<HTMLDivElement> & {
  maxHeight?: number | string
  purpose?: "required" | "form" | "info"
  width?: number | string
}

const DialogContent = React.forwardRef<HTMLDivElement, DialogContentProps>(
  (
    {
      children,
      className,
      maxHeight = "min(88vh, 52rem)",
      purpose = "form",
      width = "min(92vw, 42rem)",
      ...props
    },
    ref,
  ) => {
    const { descriptionId, open, setOpen, titleId } = useDialogContext()

    return (
      <AstryxDialog
        aria-describedby={descriptionId}
        aria-labelledby={titleId}
        isOpen={open}
        maxHeight={maxHeight}
        onOpenChange={setOpen}
        padding={0}
        purpose={purpose}
        width={width}
      >
        <div className={cn(styles.content, className)} ref={ref} {...props}>
          {children}
        </div>
      </AstryxDialog>
    )
  },
)
DialogContent.displayName = "DialogContent"

const DialogClose = React.forwardRef<
  HTMLButtonElement,
  React.ButtonHTMLAttributes<HTMLButtonElement> & { asChild?: boolean }
>(({ asChild = false, children, onClick, ...props }, ref) => {
  const { setOpen } = useDialogContext()

  if (asChild && React.isValidElement<ClickableChildProps>(children)) {
    return React.cloneElement(children, {
      onClick: (event) => {
        children.props.onClick?.(event)
        if (!event.defaultPrevented) {
          setOpen(false)
        }
      },
    })
  }

  return (
    <button
      {...props}
      onClick={(event) => {
        onClick?.(event)
        if (!event.defaultPrevented) {
          setOpen(false)
        }
      }}
      ref={ref}
      type={props.type ?? "button"}
    >
      {children}
    </button>
  )
})
DialogClose.displayName = "DialogClose"

function DialogHeader({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return <VStack className={className} gap={1} {...props} />
}

const DialogTitle = React.forwardRef<
  HTMLHeadingElement,
  Omit<React.ComponentPropsWithoutRef<typeof Heading>, "level">
>(({ className, children, ...props }, ref) => {
  const { titleId } = useDialogContext()
  return (
    <Heading className={className} id={titleId} level={2} ref={ref} {...props}>
      {children}
    </Heading>
  )
})
DialogTitle.displayName = "DialogTitle"

const DialogDescription = React.forwardRef<
  HTMLParagraphElement,
  Omit<React.ComponentPropsWithoutRef<typeof Text>, "color" | "type">
>(({ className, children, ...props }, ref) => {
  const { descriptionId } = useDialogContext()
  return (
    <Text
      className={className}
      color="secondary"
      id={descriptionId}
      ref={ref}
      type="body"
      {...props}
    >
      {children}
    </Text>
  )
})
DialogDescription.displayName = "DialogDescription"

function DialogFooter({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return <HStack className={className} gap={2} justify="end" wrap="wrap" {...props} />
}

export {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
}
