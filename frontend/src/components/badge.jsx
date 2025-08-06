import * as React from "react"

function Badge({ className, variant = "secondary", ...props }) {
  const baseClasses = "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
  
  const variantClasses = {
    secondary: "border-transparent bg-secondary text-secondary-foreground hover:bg-secondary/80",
  }

  return (
    <div className={`${baseClasses} ${variantClasses[variant]} ${className}`} {...props} />
  )
}

export { Badge }