import Image from "next/image";

interface V4LogoProps {
  className: string;
  preload?: boolean;
}

export function V4Logo({ className, preload = false }: V4LogoProps) {
  return (
    <Image
      className={className}
      src="/images/brand/v4-aero-consulting-metallic.webp"
      alt="V4 Aero Consulting"
      width={2172}
      height={724}
      sizes="160px"
      quality={100}
      preload={preload}
    />
  );
}
