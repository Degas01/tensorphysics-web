import { TensorPhysicsLogo } from "./TensorPhysicsLogo";

/** Official lockup (Hex Tensor + wordmark). Height drives the size. */
export function Lockup({ height = 22, className }: { height?: number; className?: string }) {
  return <TensorPhysicsLogo variant="full" theme="dark" height={height} className={className} />;
}

/** Symbol only. */
export function LogoMark({ size = 26, className }: { size?: number; className?: string }) {
  return <TensorPhysicsLogo variant="mark" theme="dark" height={size} className={className} />;
}
