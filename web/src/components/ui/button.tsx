import * as React from "react"
import { Button as AstryxButton } from "@astryxdesign/core/Button"

type ButtonVariant =
  | "default"
  | "destructive"
  | "outline"
  | "secondary"
  | "ghost"
  | "link"

type ButtonSize = "default" | "sm" | "lg" | "icon"

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  as?: React.ComponentProps<typeof AstryxButton>["as"]
  href?: string
  label?: string
  size?: ButtonSize
  variant?: ButtonVariant
  width?: React.ComponentProps<typeof AstryxButton>["width"]
}

function getAccessibleLabel(node: React.ReactNode): string | undefined {
  if (typeof node === "string" || typeof node === "number") {
    return String(node)
  }
  if (Array.isArray(node)) {
    const label = node.map(getAccessibleLabel).filter(Boolean).join(" ").trim()
    return label || undefined
  }
  if (React.isValidElement<{ children?: React.ReactNode }>(node)) {
    return getAccessibleLabel(node.props.children)
  }
  return undefined
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      "aria-label": ariaLabel,
      as,
      children,
      className,
      disabled,
      href,
      label: labelProp,
      size = "default",
      title,
      variant = "default",
      width,
      ...props
    },
    ref,
  ) => {
    const label = labelProp ?? ariaLabel ?? getAccessibleLabel(children) ?? title ?? "Action"

    return (
      <AstryxButton
        aria-label={ariaLabel}
        as={as}
        className={className}
        href={href}
        isDisabled={disabled}
        isIconOnly={size === "icon"}
        label={label}
        ref={ref}
        size={size === "default" || size === "icon" ? "md" : size}
        tooltip={title}
        variant={
          variant === "default"
            ? "primary"
            : variant === "outline" || variant === "secondary"
              ? "secondary"
              : variant === "link"
                ? "ghost"
                : variant
        }
        width={width}
        {...props}
      >
        {children}
      </AstryxButton>
    )
  },
)
Button.displayName = "Button"

export { Button }
