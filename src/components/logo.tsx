import Image from 'next/image';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import logoColor from '@/pic/logo-lawslane-transparent-color.png';
import logoWhite from '@/pic/logo-lawslane-transparent-white.png';

type LogoProps = {
  className?: string;
  href: string;
  variant?: 'color' | 'white';
  showText?: boolean;
};

export default function Logo({ className, href, variant = 'color', showText = true }: LogoProps) {
  const logoSrc = variant === 'color' ? logoColor : logoWhite;

  return (
    <Link href={href} className={cn('flex items-center gap-2', className)}>
      <Image
        src={logoSrc}
        alt="Lawslane Logo"
        width={150}
        height={40}
        className="h-8 w-auto"
        priority
      />
      {showText && <span className="text-xl font-bold font-headline">Lawslane</span>}
    </Link>
  );
}
