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
      className={`px-4 py-2 rounded-md font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${variantStyles[variant]} ${className}`}
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
        className={`appearance-none px-4 py-2 rounded-md font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${variantStyles[variant]} ${className}`}
      >
        <input type="radio" className="invisible absolute inset-0" ref={ref} {...props} />
        <span className="contents absolute">{children}</span>
      </label>
    );
  },
);
