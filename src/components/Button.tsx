import { forwardRef, type ComponentProps } from "preact/compat";

type ButtonVariant = "primary" | "secondary" | "danger";

interface ButtonProps {
  variant?: ButtonVariant;
}

const variantStyles: Record<ButtonVariant, string> = {
  primary: "bg-blue-600 hover:bg-blue-700 has-checked:bg-blue-700 text-white",
  secondary: "bg-gray-200 hover:bg-gray-300 has-checked:bg-gray-300 text-gray-800",
  danger: "bg-red-600 hover:bg-red-700 has-checked:bg-red-700 text-white",
};

export function Button({
  variant = "secondary",
  className = "",
  ...props
}: ButtonProps & ComponentProps<"button">) {
  return (
    <button
      className={`px-4 py-2 rounded-md font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-nowrap ${variantStyles[variant]} ${className}`}
      {...props}
    />
  );
}

export const RadioButton = forwardRef<HTMLInputElement, ButtonProps & ComponentProps<"input">>(
  (
    {
      variant = "secondary",
      className = "",
      children,
      ...props
    }: ButtonProps & ComponentProps<"input">,
    ref,
  ) => {
    return (
      <label
        className={`appearance-none px-4 py-2 rounded-md font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-nowrap ${variantStyles[variant]} ${className}`}
      >
        <input type="radio" className="invisible absolute inset-0" ref={ref} {...props} />
        <span className="contents absolute">{children}</span>
      </label>
    );
  },
);

export const RadioButtonCompact = forwardRef<
  HTMLInputElement,
  ButtonProps & ComponentProps<"input">
>(
  (
    {
      variant = "secondary",
      className = "",
      children,
      ...props
    }: ButtonProps & ComponentProps<"input">,
    ref,
  ) => {
    return (
      <label
        className={`appearance-none px-3 py-1.5 font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-nowrap border-r border-gray-400/30 last:border-r-0 first:rounded-l-md last:rounded-r-md ${variantStyles[variant]} ${className}`}
      >
        <input type="radio" className="invisible absolute inset-0" ref={ref} {...props} />
        <span className="contents absolute">{children}</span>
      </label>
    );
  },
);

interface ButtonGroupProps extends ComponentProps<"div"> {
  compact?: boolean;
}

export function ButtonGroup({ className = "", children, ...props }: ButtonGroupProps) {
  return (
    <div className={`inline-flex shadow-sm ${className}`} role="group" {...props}>
      {children}
    </div>
  );
}
